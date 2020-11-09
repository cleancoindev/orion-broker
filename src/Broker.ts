import {BrokerHub, CancelSubOrder, CreateSubOrder, SubOrderStatus, SubOrderStatusAccepted,} from "./hub/BrokerHub";
import {Db, DbSubOrder} from "./db/Db";
import {log} from "./log";
import {Balances, calculateTradeStatus, Dictionary, Status, SubOrder, Trade} from "./Model";
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

        brokerHub.onCreateSubOrder = this.onCreateSubOrder
        brokerHub.onCancelSubOrder = this.onCancelSubOrder
        brokerHub.onCheckSubOrder = this.onCheckSubOrder
        brokerHub.onSubOrderStatusAccepted = this.onSubOrderStatusAccepted;
    }

    onSubOrderStatusAccepted = async (data: SubOrderStatusAccepted): Promise<void> => {
        const id = data.id;

        const dbSubOrder: DbSubOrder = await this.db.getSubOrderById(id);

        if (!dbSubOrder) {
            throw new Error(`Sub order ${id} not found`);
        }

        if (dbSubOrder.status === Status.FILLED && data.status === Status.FILLED) {
            dbSubOrder.status = Status.FILLED_AND_SENT_TO_ORION;
            await this.db.updateSubOrder(dbSubOrder);
            this.webUI.sendToFrontend(dbSubOrder);
        }
    }

    onCheckSubOrder = async (id: number): Promise<SubOrderStatus> => {
        const dbSubOrder: DbSubOrder = await this.db.getSubOrderById(id);

        if (!dbSubOrder) {
            return {
                id: id,
                status: null,
                filledAmount: '0'
            }
        }

        const trades: Trade[] = await this.db.getSubOrderTrades(dbSubOrder.exchange, dbSubOrder.exchangeOrderId);

        return {
            id: id,
            status: dbSubOrder.status,
            filledAmount: dbSubOrder.filledAmount.toString(),
            // todo: blockchain order
        }
    }

    onCreateSubOrder = async (request: CreateSubOrder): Promise<DbSubOrder> => {
        log.log('/api/order parsed request ', JSON.stringify(request));

        const oldSubOrder = await this.db.getSubOrderById(request.id);

        if (oldSubOrder) {
            log.log('Sub Order ' + request.id + ' already created');
            return oldSubOrder;
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
        }
        await this.db.insertSubOrder(dbSubOrder);

        log.log('/api/order order inserted');

        const subOrder: SubOrder = await this.connector.submitSubOrder(request.exchange, dbSubOrder.id, dbSubOrder.symbol, dbSubOrder.side, dbSubOrder.amount, dbSubOrder.price);

        dbSubOrder.exchangeOrderId = subOrder.exchangeOrderId;
        dbSubOrder.timestamp = subOrder.timestamp;
        dbSubOrder.status = subOrder.status;
        await this.db.updateSubOrder(dbSubOrder);

        log.log('/api/order order updated ', JSON.stringify(dbSubOrder));

        this.webUI.sendToFrontend(dbSubOrder);

        return dbSubOrder;
    };

    onCancelSubOrder = async (data: CancelSubOrder): Promise<DbSubOrder> => {
        log.log('DELETE /api/order receive ', JSON.stringify(data));

        const id: number = data.id;

        const subOrder: DbSubOrder = await this.db.getSubOrderById(id);

        if (!subOrder) throw new Error('Cant find sub order ' + subOrder.id);

        if (subOrder.status === Status.PREPARE || subOrder.status === Status.CANCELED) {
            // nothing to do
        } else if (subOrder.status === Status.NEW) {
            const cancelResult = await this.connector.cancelSubOrder(subOrder);

            if (!cancelResult) throw new Error('Cant cancel sub order ' + subOrder.id);

            subOrder.status = Status.CANCELED;

            await this.db.updateSubOrder(subOrder);
            this.webUI.sendToFrontend(subOrder);

        } else {
            throw new Error('Cant cancel sub order in status ' + subOrder.status);
        }

        return subOrder;
    };

    sendUpdateBalance(balances: Dictionary<ExchangeResolve<Balances>>): Promise<void> {
        // log.log('Get balances and send to Orion Blockchain');

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
                throw new Error(`Sub Order ${trade.exchangeOrderId} in ${trade.exchange} not found`);
            }

            dbSubOrder.filledAmount = trade.amount;
            dbSubOrder.status = calculateTradeStatus(dbSubOrder.amount, dbSubOrder.filledAmount);

            await this.db.inTransaction(async () => {
                await this.db.insertTrade(trade);
                await this.db.updateSubOrder(dbSubOrder);
            });

            log.log('Check sub order', dbSubOrder);

            if (this.settings.sendPartialTrades || (dbSubOrder.status === Status.FILLED)) {
                const blockchainOrder = await this.orionBlockchain.signTrade(dbSubOrder, trade);
                await this.brokerHub.sendSubOrderStatus({
                    id: dbSubOrder.id,
                    status: dbSubOrder.status,
                    filledAmount: dbSubOrder.filledAmount.toString(),
                    blockchainOrder
                });
            }

            this.webUI.sendToFrontend(dbSubOrder);
        } catch (e) {
            log.error("Error during Trade callback", e);
        }
    }
}