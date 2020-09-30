import {BrokerHub, BrokerHubRegisterRequest, parseCreateOrderRequest} from "./hub/BrokerHub";
import {Db, DbOrder} from "./db/Db";
import {log} from "./log";
import {Balances, calculateTradeStatus, Dictionary, Order, Status, Trade} from "./Model";
import BigNumber from "bignumber.js";
import {WebUI} from "./ui/WebUI";
import {Connectors, ExchangeResolve} from "./connectors/Connectors";
import {OrionBlockchain} from "./OrionBlockchain";
import {Settings} from "./Settings";

export class Broker {
    settings: Settings;
    brokerHub: BrokerHub;
    db: Db;
    webUI: WebUI;
    connector: Connectors;
    orionBlockchain: OrionBlockchain;

    constructor(settings: Settings, brokerHub: BrokerHub, db: Db, webUI: WebUI, connector: Connectors) {
        this.settings = settings;
        this.brokerHub = brokerHub;
        this.db = db;
        this.webUI = webUI;
        this.connector = connector;

        // CREATE ORDER

        brokerHub.onCreateOrder = async (data: any) => {
            log.log('/api/order receive ', JSON.stringify(data));

            const request = parseCreateOrderRequest(data);

            log.log('/api/order parsed request ', JSON.stringify(request));

            const oldOrder = await db.getOrderBySubOrdId(request.subOrdId);

            if (oldOrder) {
                log.log('Order ' + request.subOrdId + ' already created');
                return oldOrder;
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

            webUI.sendToFrontend(dbOrder);

            return dbOrder;
        };

        // CANCEL ORDER

        brokerHub.onCancelOrder = async (data: any) => {
            log.log('DELETE /api/order receive ', JSON.stringify(data));

            const subOrdId: string = data.subOrdId;

            const order: DbOrder = await db.getOrderBySubOrdId(subOrdId);

            if (!order) throw new Error('Cant find order ' + order.subOrdId);

            if (order.status === Status.PREPARE || order.status === Status.CANCELED) {
                // nothing to do
            } else if (order.status === Status.NEW) {
                const cancelResult = await connector.cancelOrder(order);

                if (!cancelResult) throw new Error('Cant cancel order ' + order.subOrdId);

                order.status = Status.CANCELED;

                await db.updateOrder(order);
                webUI.sendToFrontend(order);

            } else {
                throw new Error('Cant cancel order in status ' + order.status);
            }

            return order;
        };

        brokerHub.onOrderStatusResponse = async (data: any) => {
            // todo
        }
    }

    register(): void {
        const body: BrokerHubRegisterRequest = {
            address: this.orionBlockchain.address,
            publicKey: this.orionBlockchain.address,
            signature: ''
        };

        log.log('Registering in Orion Blockchain');
        this.brokerHub.register(body);
    }

    sendUpdateBalance(balances: Dictionary<ExchangeResolve<Balances>>): Promise<void> {
        // log.log('Get balances and send to Orion Blockchain');

        const body: any = {
            address: this.orionBlockchain.address,
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
        this.webUI.lastBalancesJson = JSON.stringify(body);
        return this.brokerHub.sendBalances(body);
    }

    startUpdateBalances(): void {
        setInterval(() => {
            this.connector.getBalances().then(balances => {
                this.sendUpdateBalance(balances)
            }).catch(e => {
                log.error('Balances', e)
            });
        }, 10000);
    }

    startCheckOrders(): void {
        setInterval(async () => {
            try {
                // log.log('Check orders status');
                const openOrders = await this.db.getOrdersToCheck();
                await this.connector.checkUpdates(openOrders);
            } catch (e) {
                log.error('Orders check', e)
            }
        }, this.settings.production ? 10000 : 3000);
    }

    async connectToOrion(): Promise<void> {
        if (this.settings.privateKey) {
            this.orionBlockchain = new OrionBlockchain(this.settings);
            try {
                await this.brokerHub.connect();
                this.register();
            } catch (e) {
                log.error('Cant register broker ', e);
            }
            this.startUpdateBalances();
            this.startCheckOrders();
        }
    }

    // TRADE

    async orderChanged(trade: Trade): Promise<void> {
        try {
            const dbOrder: DbOrder = await this.db.getOrder(trade.exchange, trade.exchangeOrdId);

            if (!dbOrder) {
                throw new Error(`Order ${trade.exchangeOrdId} in ${trade.exchange} not found`);
            }

            const signedTrade = await this.orionBlockchain.signTrade(dbOrder, trade);
            await this.brokerHub.sendTrade(signedTrade); // send signed trade to orion-blockchain

            dbOrder.filledQty = dbOrder.filledQty.plus(trade.qty);
            const tradeCost = trade.price.multipliedBy(trade.qty);
            dbOrder.totalCost = dbOrder.totalCost.plus(tradeCost);

            dbOrder.status = calculateTradeStatus(dbOrder.qty, dbOrder.filledQty);

            if (dbOrder.status === Status.FILLED) {
                dbOrder.status = Status.FILLED_AND_SENT_TO_ORION;
            }
            await this.db.inTransaction(async () => {
                await this.db.insertTrade(trade);
                await this.db.updateOrder(dbOrder);
            })

            this.webUI.sendToFrontend(dbOrder);
        } catch (e) {
            log.error("Error during Trade callback", e);
        }
    }
}