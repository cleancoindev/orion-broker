import {BrokerHub, CreateSubOrder, SubOrderStatus, SubOrderStatusAccepted,} from "./hub/BrokerHub";
import {Db, DbSubOrder} from "./db/Db";
import {log} from "./log";
import {Balances, BlockchainOrder, Dictionary, Status, SubOrder, Trade} from "./Model";
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

        brokerHub.onCreateSubOrder = this.onCreateSubOrder.bind(this);
        brokerHub.onCancelSubOrder = this.onCancelSubOrder.bind(this);
        brokerHub.onCheckSubOrder = this.onCheckSubOrder.bind(this);
        brokerHub.onSubOrderStatusAccepted = this.onSubOrderStatusAccepted.bind(this);
    }

    onSubOrderStatusAccepted = async (data: SubOrderStatusAccepted): Promise<void> => {
        const id = data.id;

        const dbSubOrder: DbSubOrder = await this.db.getSubOrderById(id);

        if (!dbSubOrder) {
            throw new Error(`Suborder ${id} not found`);
        }

        const isStatusFinal = dbSubOrder.status !== Status.PREPARE && dbSubOrder.status !== Status.ACCEPTED;
        if (dbSubOrder.status === data.status && isStatusFinal) {
            dbSubOrder.sentToAggregator = true;
            await this.db.updateSubOrder(dbSubOrder);
            this.webUI.sendToFrontend(dbSubOrder);
        }
    }

    async onCheckSubOrder(id: number): Promise<SubOrderStatus> {
        const dbSubOrder: DbSubOrder = await this.db.getSubOrderById(id);

        if (!dbSubOrder) {
            return {
                id: id,
                status: null,
                filledAmount: '0'
            }
        }

        const trades: Trade[] = dbSubOrder.exchangeOrderId ? (await this.db.getSubOrderTrades(dbSubOrder.exchange, dbSubOrder.exchangeOrderId)) : [];

        if (trades.length > 1) {
            throw new Error('Cant support multiple trades yet');
        }

        const blockchainOrder: BlockchainOrder = trades.length === 0 ? undefined : (await this.orionBlockchain.signTrade(dbSubOrder, trades[0]));

        return {
            id: id,
            status: dbSubOrder.status,
            filledAmount: dbSubOrder.filledAmount.toString(),
            blockchainOrder: blockchainOrder
        }
    }

    async onCreateSubOrder(request: CreateSubOrder): Promise<SubOrderStatus> {
        const oldSubOrder = await this.db.getSubOrderById(request.id);

        if (oldSubOrder) {
            log.log('Suborder ' + request.id + ' already created');
            return this.onCheckSubOrder(request.id);
        }

        const dbSubOrder: DbSubOrder = {
            id: request.id,
            symbol: request.symbol,
            side: request.side,
            price: request.price,
            amount: request.amount,
            exchange: request.exchange,
            timestamp: Date.now(),
            status: Status.PREPARE,
            filledAmount: new BigNumber(0),
            sentToAggregator: false
        }
        await this.db.insertSubOrder(dbSubOrder);

        log.log('Suborder inserted');

        const subOrder: SubOrder = await this.connector.submitSubOrder(request.exchange, dbSubOrder.id, dbSubOrder.symbol, dbSubOrder.side, dbSubOrder.amount, dbSubOrder.price);

        dbSubOrder.exchangeOrderId = subOrder.exchangeOrderId;
        dbSubOrder.timestamp = subOrder.timestamp;
        dbSubOrder.status = subOrder.status;
        await this.db.updateSubOrder(dbSubOrder);

        log.log('Suborder updated ', JSON.stringify(dbSubOrder));

        this.webUI.sendToFrontend(dbSubOrder);

        return this.onCheckSubOrder(dbSubOrder.id);
    };

    async onCancelSubOrder(id: number): Promise<SubOrderStatus> {
        const dbSubOrder: DbSubOrder = await this.db.getSubOrderById(id);

        if (!dbSubOrder) throw new Error('Cant find suborder ' + dbSubOrder.id);

        if (dbSubOrder.status === Status.PREPARE) {
            // todo
        } else if (dbSubOrder.status === Status.ACCEPTED) {
            const cancelResult = await this.connector.cancelSubOrder(dbSubOrder);

            if (!cancelResult) throw new Error('Cant cancel suborder ' + dbSubOrder.id);

            dbSubOrder.status = Status.CANCELED;

            await this.db.updateSubOrder(dbSubOrder);
            this.webUI.sendToFrontend(dbSubOrder);

        } else {
            log.log('Cant cancel suborder in status ' + dbSubOrder.status);
        }

        return this.onCheckSubOrder(dbSubOrder.id);
    };

    sendUpdateBalance(balances: Dictionary<ExchangeResolve<Balances>>): Promise<void> {
        const exchanges: Dictionary<Dictionary<string>> = {};

        for (let exchange in balances) {
            const exchangeBalances: ExchangeResolve<Balances> = balances[exchange];
            if (exchangeBalances.error) {
                log.error(exchange + ' balances', exchangeBalances.error);
            } else {
                exchanges[exchange] = {};
                for (let currency in exchangeBalances.result) {
                    const v = exchangeBalances.result[currency];
                    exchanges[exchange][currency] = v.toString();
                }
            }
        }
        this.webUI.lastBalancesJson = JSON.stringify(exchanges);
        return this.brokerHub.sendBalances(exchanges);
    }

    startUpdateBalances(): void {
        setInterval(async () => {
            try {
                const balances = await this.connector.getBalances()
                await this.sendUpdateBalance(balances);
            } catch (e) {
                log.error('Balances', e)
            }
        }, 10000);
    }

    startCheckSubOrders(): void {
        setInterval(async () => {
            try {
                const openSubOrders = await this.db.getSubOrdersToCheck();
                await this.connector.checkSubOrders(openSubOrders);
            } catch (e) {
                log.error('Sub Orders check', e)
            }
        }, this.settings.production ? 10000 : 3000);
    }

    async connectToOrion(): Promise<void> {
        if (this.settings.privateKey) {
            this.orionBlockchain = new OrionBlockchain(this.settings);
            try {
                await this.brokerHub.connect({address: this.orionBlockchain.address});
            } catch (e) {
                log.error('Failed to connect to aggregator ', e);
            }
            this.startUpdateBalances();
            this.startCheckSubOrders();
        }
    }

    // TRADE

    async onTrade(trade: Trade): Promise<void> {
        try {
            const dbSubOrder: DbSubOrder = await this.db.getSubOrder(trade.exchange, trade.exchangeOrderId);

            if (!dbSubOrder) {
                throw new Error(`Suborder ${trade.exchangeOrderId} in ${trade.exchange} not found`);
            }

            if (!dbSubOrder.amount.eq(trade.amount)) {
                throw new Error('Partially trade not supported yet');
            }

            dbSubOrder.filledAmount = trade.amount;
            dbSubOrder.status = Status.FILLED;

            await this.db.insertTrade(trade);
            await this.db.updateSubOrder(dbSubOrder);

            log.log('Check suborder', dbSubOrder);

            await this.brokerHub.sendSubOrderStatus(await this.onCheckSubOrder(dbSubOrder.id));
            this.webUI.sendToFrontend(dbSubOrder);
        } catch (e) {
            log.error("Error during Trade callback", e);
        }
    }
}