import {CommandConfig, DataType, printHelp, processLine} from "./cmd";
import BigNumber from "bignumber.js";
import {v1 as uuid} from "uuid";
import {log} from "./log";
import {OrionBlockchain, OrionBlockchainSettings} from "./OrionBlockchain";
import {Db, DbOrder} from "./db";
import {Balances, Dictionary, Order, OrderType, Side, Status, Trade} from "./connectors/Model";
import {Connectors, ExchangeConfig, ExchangeResolve} from "./connectors/Connectors";
import {UI} from "./ui";

const fetch = require("node-fetch");

const crypto = require('crypto');
const Cryptr = require('cryptr');
const fs = require('fs');
const express = require('express');
const WebSocket = require('ws');
const bodyParser = require('body-parser');

// LOAD CONFIG

interface Settings extends OrionBlockchainSettings {
    orionUrl: string;
    orionBlockchainUrl: string;
    callbackUrl: string;
    matcherAddress: string;
    privateKey: string;
    httpPort: number;
    wsPort: number;
    passwordHash: string;
    passwordSalt: string;
    production: boolean,
    exchanges: Dictionary<ExchangeConfig>
}

const configPath = './config.json';
const settings: Settings = JSON.parse(fs.readFileSync(configPath));

let cryptr: any = null; // Crypt

function encrypt(s: string): string {
    return cryptr.encrypt(s);
}

function decrypt(s: string): string {
    return cryptr.decrypt(s)
}

async function saveSettings(): Promise<void> {
    const exchanges: Dictionary<ExchangeConfig> = {};
    for (let exchange in settings.exchanges) {
        exchanges[exchange] = {
            key: settings.exchanges[exchange].key,
            secret: encrypt(settings.exchanges[exchange].secret),
        }
    }
    const privateKey = settings.privateKey ? encrypt(settings.privateKey) : '';
    const data = {
        ...settings,
        privateKey,
        exchanges
    }
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
}

function decryptSettings(): void {
    const exchanges: Dictionary<ExchangeConfig> = {};
    for (let exchange in settings.exchanges) {
        exchanges[exchange] = {
            key: settings.exchanges[exchange].key,
            secret: decrypt(settings.exchanges[exchange].secret),
        }
    }
    settings.exchanges = exchanges;
    settings.privateKey = settings.privateKey ? decrypt(settings.privateKey) : '';
}

let orionBlockchain: (OrionBlockchain | null) = null;

// INIT CONNECTORS

const emulatorBalances: Dictionary<string> = JSON.parse(fs.readFileSync('./emulator_balances.json'));

const exchangeConfigs: Dictionary<ExchangeConfig> = {};
export const EXCHANGES = ['poloniex', 'bittrex', 'binance', 'bitmax', 'coinex', 'kucoin'];

if (!settings.production) {
    for (let exchange of EXCHANGES) {
        exchangeConfigs[exchange] = {
            secret: "",
            key: "emulator",
        }
    }
}

const connector: Connectors = new Connectors(exchangeConfigs, emulatorBalances, settings.production);

connector.orderWatcher(orderChanged);

// INIT APP

const db = new Db();
db.init();

const app = express();

app.use(bodyParser.json());

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-compress");
    next();
});

function initHttpServer(): void {
    app.use('/host.js', function (req, res) {
        var fileContent = `var BROKER_URL = "${settings.callbackUrl}"; // GENERATED `;
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Content-Length', fileContent.length);
        res.send(fileContent);
    });
    app.us

    app.use(express.static('broker-frontend/build'));
    app.use('/stats', express.static('broker-frontend/build'));
    app.use('/dashboard', express.static('broker-frontend/build'));

    app.listen(settings.httpPort, function () {
        log.log('Broker app listening on http://localhost:' + settings.httpPort);
    });
}

// INIT WEBSOCKET

let frontendWs = undefined;

function initWs(): void {
    const wss = new WebSocket.Server({port: settings.wsPort});
    log.log("Broker websocket on ws://localhost:" + settings.wsPort);

    wss.on('connection', ws => {
        log.log("Receive webscoket connection");
        frontendWs = ws;

        ws.on('message', (message: string) => {
        });
    });
}

function sendToFrontend(data: DbOrder): void {
    try {
        if (frontendWs) {
            frontendWs.send(JSON.stringify(data));
        }
    } catch (e) {
        log.error(e);
    }
}

// REGISTER BROKER

function register(): void {
    const headers = {
        'Content-Type': 'application/json'
    };

    let body = JSON.stringify({
        "address": orionBlockchain.address,
        "publicKey": orionBlockchain.address,
        "callbackUrl": settings.callbackUrl + '/api',
        "signature": ""
    });

    log.log('Registering in Orion Blockchain')
    fetch(`${settings.orionUrl}/register`, {method: 'POST', body, headers})
        .then((response) => {
            return response.json()
        })
        .then((result) => {
            if (result.status === 'REGISTERED') {
                log.log('Broker has been registered with id: ', result.broker);
            } else {
                log.log("Broker connected:", JSON.stringify(result));
            }
        })
        .catch((error) => {
            log.log('Error on broker/register: ', error.message);
        });
}

// SEND BALANCE UPDATES

let lastBalancesJson: string = '{}';

if (!settings.production) {
    const dict = {};
    for (let exchange of EXCHANGES) {
        dict[exchange] = emulatorBalances;
    }
    lastBalancesJson = JSON.stringify(dict);
}

function sendUpdateBalance(balances: Dictionary<ExchangeResolve<Balances>>): Promise<void> {
    // log.log('Get balances and send to Orion Blockchain');

    const body: any = {
        address: orionBlockchain.address,
    }
    for (let exchange in balances) {
        const exchangeBalances: ExchangeResolve<Balances> = balances[exchange];
        if (!exchangeBalances.error) {
            body[exchange] = {};
            for (let currency in exchangeBalances.result) {
                const v = exchangeBalances.result[currency];
                body[exchange][currency] = v.toString();
            }
        }
    }
    lastBalancesJson = JSON.stringify(body);

    return (fetch(`${settings.orionUrl}/balance`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: lastBalancesJson
    }).then((r1) => {
        //log.log('Balance updated: ', bodyToSend, r1.json());
    }).catch((error) => {
        log.error('Error on broker/balance: ', error.message);
    }));
}

function startUpdateBalances(): void {
    setInterval(() => {
        connector.getBalances().then(balances => {
            sendUpdateBalance(balances)
        }).catch(e => {
            log.error('Balances', e)
        });
    }, 10000);
}

function startCheckOrders(): void {
    setInterval(async () => {
        try {
            // log.log('Check orders status');
            const openOrders = await db.getOrdersToCheck();
            await connector.checkUpdates(openOrders);
        } catch (e) {
            log.error('Orders check', e)
        }
    }, settings.production ? 10000 : 3000);
}

// GET ORDERS

app.get('/api/openorders', async (req, res) => {
    try {
        res.send(await db.getOpenOrders());
    } catch (error) {
        log.error(error);
        res.status(400);
        res.send({code: 1000, msg: error.message});
    }
});

app.get('/api/orderhistory', async (req, res) => {
    try {
        res.send(await db.getAllOrders());
    } catch (error) {
        log.error(error);
        res.status(400);
        res.send({code: 1000, msg: error.message});
    }
});

app.get('/api/balance', async (req, res) => {
    try {
        res.send(lastBalancesJson);
    } catch (error) {
        log.error(error);
        res.status(400);
        res.send({code: 1000, msg: error.message});
    }
});

// ORDER

interface CreateOrderRequest {
    side: Side;
    symbol: string;
    exchange: string;
    ordType: OrderType;
    price: BigNumber;
    subOrdQty: BigNumber;
    ordId: string;
    subOrdId: string;
    clientOrdId: string;
}

function parseCreateOrderRequest(request: any): CreateOrderRequest {
    return {
        side: request.side == 'sell' ? Side.SELL : Side.BUY,
        symbol: request.symbol,
        exchange: request.exchange,
        ordType: request.ordType ? (OrderType[request.ordType] as OrderType) : OrderType.LIMIT,
        price: new BigNumber(request.price),
        subOrdQty: new BigNumber(request.subOrdQty),
        ordId: request.ordId,
        subOrdId: request.subOrdId,
        clientOrdId: request.clientOrdId || '',
    }
}

app.post('/api/order', async (req, res) => {
    try {
        log.log('/api/order receive ', JSON.stringify(req.body));

        const request = parseCreateOrderRequest(req.body);

        log.log('/api/order parsed request ', JSON.stringify(request));

        const oldOrder = await db.getOrderBySubOrdId(request.subOrdId);

        if (oldOrder) {
            log.log('Order ' + request.subOrdId + ' already created');
            res.send(oldOrder);
            return;
        }

        const dbOrder: DbOrder = {
            exchange: request.exchange,
            exchangeOrdId: '',
            ordId: request.ordId,
            subOrdId: request.subOrdId,
            symbol: request.symbol,
            side: request.side,
            ordType: request.ordType,
            price: request.price,
            qty: request.subOrdQty,
            timestamp: Date.now(),
            status: Status.PREPARE,
            clientOrdId: request.clientOrdId,
            filledQty: new BigNumber(0),
            totalCost: new BigNumber(0),
        }
        await db.insertOrder(dbOrder);

        log.log('/api/order order inserted');

        const order: Order = await connector.createOrder(request.subOrdId, request.ordType, request.exchange, request.symbol, request.side, request.subOrdQty, request.price);

        dbOrder.exchangeOrdId = order.exchangeOrdId;
        dbOrder.timestamp = order.timestamp;
        dbOrder.status = order.status;
        await db.updateOrder(dbOrder);

        log.log('/api/order order updated ', JSON.stringify(dbOrder));

        sendToFrontend(dbOrder);

        res.send(dbOrder);

    } catch (error) {
        log.error(error);
        res.status(400);
        res.send({code: 1000, msg: error.message});
    }
});

// CANCELORDER

interface CancelOrderRequest {
    subOrdId: string;
}

app.delete('/api/order', async (req, res) => {
    try {
        log.log('DELETE /api/order receive ', JSON.stringify(req.body));

        const subOrdId: string = req.body.subOrdId;

        const order: DbOrder = await db.getOrderBySubOrdId(subOrdId);

        if (!order) throw new Error('Cant find order ' + order.subOrdId);

        if (order.status === Status.PREPARE || order.status === Status.CANCELED) {
            // nothing to do
        } else if (order.status === Status.NEW) {
            const cancelResult = await connector.cancelOrder(order);

            if (!cancelResult) throw new Error('Cant cancel order ' + order.subOrdId);

            order.status = Status.CANCELED;

            await db.updateOrder(order);
            sendToFrontend(order);

        } else {
            throw new Error('Cant cancel order in status ' + order.status);
        }

        res.send(order);

    } catch (error) {
        log.error(error);
        res.status(400);
        res.send({code: 1000, msg: error.message});
    }
});

// TRADE

async function orderChanged(trade: Trade): Promise<void> {
    try {
        const dbOrder: DbOrder = await db.getOrder(trade.exchange, trade.exchangeOrdId);

        if (!dbOrder) {
            throw new Error(`Order ${trade.exchangeOrdId} in ${trade.exchange} not found`);
        }

        await orionBlockchain.sendTrade(dbOrder, trade); // send Trade to orion-blockchain

        dbOrder.filledQty = dbOrder.filledQty.plus(trade.qty);
        const tradeCost = trade.price.multipliedBy(trade.qty);
        dbOrder.totalCost = dbOrder.totalCost.plus(tradeCost);

        dbOrder.status = calculateTradeStatus(dbOrder.qty, dbOrder.filledQty);

        if (dbOrder.status === Status.FILLED) {
            dbOrder.status = Status.FILLED_AND_SENT_TO_ORION;
        }
        await db.inTransaction(async () => {
            await db.insertTrade(trade);
            await db.updateOrder(dbOrder);
        })

        sendToFrontend(dbOrder);
    } catch (e) {
        log.error("Error during Trade callback", e);
    }
}

function calculateTradeStatus(ordQty: BigNumber, filledQty: BigNumber): Status {
    if (filledQty.isZero()) {
        return Status.NEW;
    } else if (filledQty.lt(ordQty)) {
        return Status.PARTIALLY_FILLED;
    } else {
        return Status.FILLED;
    }
}

// START

function start(): void {
    ui.showMain();
    initWs();
    initHttpServer()
    connectToOrion();
}

function connectToOrion(): void {
    if (settings.privateKey) {
        orionBlockchain = new OrionBlockchain(settings);
        try {
            register();
        } catch (e) {
            log.error('Cant register broker ', e);
        }
        startUpdateBalances();
        startCheckOrders();
    }
}

function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex')
}

const ui = new UI();

ui.isProduction = settings.production;

log.writer = (s: string) => {
    if (ui.history) {
        ui.history.add(s);
    }
}

ui.onCreatePassword = async password => {
    cryptr = new Cryptr(password);
    settings.passwordSalt = uuid().toString();
    settings.passwordHash = hashPassword(password + settings.passwordSalt);
    await saveSettings();
    start();
};

ui.onLoginPassword = password => {
    const hash = hashPassword(password + settings.passwordSalt);
    if (settings.passwordHash === hash) {
        cryptr = new Cryptr(password);

        decryptSettings();
        start();
        return true;
    }
    return false;
}

const commandConfigs: CommandConfig[] = [
    {
        name: 'connect',
        help: 'Connect to exchange',
        params: [
            {
                name: 'exchange',
                fieldName: 'exchange',
                type: DataType.EXCHANGE
            },
        ],
        asks: [
            {
                askText: (state: any) => 'Please enter api key for ' + state.exchange,
                fieldName: 'apiKey',
                type: DataType.EXCHANGE_API_KEY
            },
            {
                askText: (state: any) => 'Please enter private key for ' + state.exchange,
                fieldName: 'privateKey',
                type: DataType.EXCHANGE_PRIVATE_KEY
            }
        ],
        after: (state: any) => {
            settings.exchanges[state.exchange] = {
                key: state.apiKey,
                secret: state.privateKey,
            }
            connector.updateExchange(state.exchange, settings.exchanges[state.exchange]);
            saveSettings();
            return state.exchange + ' connected';
        }
    },
    {
        name: 'privatekey',
        help: 'Set a blockchain private key',
        params: [
            {
                name: 'private_key',
                fieldName: 'privateKey',
                type: DataType.BLOCKCHAIN_PRIVATE_KEY
            },
        ],
        asks: [],
        after: (state: any) => {
            settings.privateKey = state.privateKey;
            saveSettings();
            connectToOrion();
            return 'private key saved';
        }
    },
    {
        name: 'ip',
        help: 'Set server IP',
        params: [
            {
                name: 'ip',
                fieldName: 'ip',
                type: DataType.URL
            },
        ],
        asks: [],
        after: (state: any) => {
            settings.callbackUrl = 'http://' + state.ip + ':' + settings.httpPort;
            saveSettings();
            return 'url saved, changes will take effect after restarting the app';
        }
    },
    {
        name: 'emulator',
        help: 'Turn on/off emulator',
        params: [
            {
                name: 'flag',
                fieldName: 'flag',
                type: DataType.BOOL
            },
        ],
        asks: [],
        after: (state: any) => {
            settings.production = state.flag === 'off';
            saveSettings();
            return 'mode saved, changes will take effect after restarting the app';
        }
    },
    {
        name: 'help',
        help: 'List available commands',
        params: [],
        asks: [],
        after: (state: any) => {
            return printHelp(commandConfigs);
        }
    },
    {
        name: 'exit',
        help: 'Exit the app',
        params: [],
        asks: [],
        after: (state: any) => {
            return process.exit();
        }
    }
];

ui.onCmd = line => processLine(line, commandConfigs);
ui.onMain = () => ui.log.add(printHelp(commandConfigs));

if (settings.passwordHash) {
    const arg = process.argv.slice(2).find(arg => arg.startsWith('-p'));
    const password = arg ? arg.substring(2) : undefined;

    if (password) {
        if (!ui.onLoginPassword(password)) {
            console.log('Invalid password');
            process.exit();
        }
    } else {
        ui.showLogin();
    }

} else {
    ui.showHello();
}
