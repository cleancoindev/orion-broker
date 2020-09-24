import {Connector} from "./Connector";
import {
    Balances,
    Dictionary,
    Exchange,
    ExchangeOperation,
    Order,
    OrderBook,
    OrderType,
    Side,
    Ticker,
    Trade
} from "../Model";
import BigNumber from "bignumber.js";
import {EmulatorConnector} from "./Emulator";
import {CCXTConnector} from "./CCXTConnector";
import {log} from "../log";

export interface ExchangeConfig {
    secret: string;
    key: string;
}

export interface ExchangeResolve<T> {
    exchangeId: string;
    result?: T;
    error?: any;
}

export class Connectors {
    isProduction: boolean;
    exchangesIds: string[] = [];
    exchanges: Dictionary<Exchange> = {};
    connectors: Dictionary<Connector> = {};
    callback: (trade: Trade) => void = null;

    constructor(exchangeConfigs: Dictionary<ExchangeConfig>, emulatorBalances: Dictionary<string>, isProduction: boolean) {
        this.isProduction = isProduction;

        for (let id in exchangeConfigs) {
            const exchangeConfig = exchangeConfigs[id];
            this.exchangesIds.push(id);

            const balances: Balances = {}
            if (!isProduction) {
                for (let currency in emulatorBalances) {
                    balances[currency] = new BigNumber(emulatorBalances[currency]);
                }
            }

            const exchange: Exchange = {
                id: id,
                apiKey: exchangeConfig.key,
                secretKey: exchangeConfig.secret,
                balances: balances
            };
            this.exchanges[id] = exchange;
            this.connectors[id] = isProduction ? new CCXTConnector(exchange) : new EmulatorConnector(exchange);
        }
    }

    updateExchange(id: string, exchangeConfig: ExchangeConfig) {
        if (this.exchangesIds.indexOf(id) === -1) {
            this.exchangesIds.push(id);
        } else {
            this.connectors[id].destroy();
        }
        const exchange: Exchange = {
            id: id,
            apiKey: exchangeConfig.key,
            secretKey: exchangeConfig.secret,
            balances: {}
        };
        this.exchanges[id] = exchange;
        this.connectors[id] = this.isProduction ? new CCXTConnector(exchange) : new EmulatorConnector(exchange);
        if (this.callback) {
            this.connectors[id].subscribeToOrderUpdates(this.callback);
        }
    }

    private static resolve<T>(data: T, exchange: string): ExchangeResolve<T> {
        return {
            exchangeId: exchange,
            result: data
        }
    }

    private static reject<T>(data: any, exchange: string): ExchangeResolve<T> {
        return {
            exchangeId: exchange,
            error: data
        }
    }

    private async execute<T>(fn: (Connector) => Promise<T>, exchanges: string[]): Promise<Dictionary<ExchangeResolve<T>>> {
        const promises: Promise<ExchangeResolve<T>>[] = [];

        for (let exchange of exchanges) {
            const connector = this.connectors[exchange];

            if (!connector) {
                log.error('No connector for ' + exchange)
            } else {
                promises.push(
                    fn(connector)
                        .then(data => Connectors.resolve(data, exchange))
                        .catch(error => Connectors.reject(error, exchange))
                )
            }
        }

        const result: Dictionary<ExchangeResolve<T>> = {};
        (await Promise.all(promises)).forEach(response => result[response.exchangeId] = response);
        return result;
    }

    async createOrder(subOrdId: string, ordType: OrderType, exchangeId: string, symbol: string, side: Side, subOrdQty: BigNumber, price: BigNumber): Promise<Order> {
        const connector = this.connectors[exchangeId];
        if (!connector) throw new Error("Cant find exchange " + exchangeId);
        const order: ExchangeOperation = {subOrdId, ordType, symbol, side, price, qty: subOrdQty};
        return connector.submitOrder(order);
    }

    async cancelOrder(order: Order): Promise<boolean> {
        const connector = this.connectors[order.exchange];
        if (!connector) throw new Error("Cant find exchange " + order.exchange);
        return connector.cancelOrder(order);
    }

    async getBalances(): Promise<Dictionary<ExchangeResolve<Balances>>> {
        return this.execute((connector: Connector) => connector.getBalances(), this.exchangesIds);
    }

    async getTicker(pair: string): Promise<Dictionary<ExchangeResolve<Ticker>>> {
        return this.execute((connector: Connector) => connector.getTicker(pair), this.exchangesIds);
    }

    async getOrderBook(pair: string): Promise<Dictionary<ExchangeResolve<OrderBook>>> {
        return this.execute((connector: Connector) => connector.getOrderBook(pair), this.exchangesIds);
    }

    /**
     * @param ids   {"bittrex" -> "123"}
     */
    async getOrderStatus(ids: Dictionary<string>): Promise<Dictionary<ExchangeResolve<Order>>> {
        return this.execute((connector: Connector) => connector.getOrderStatus(ids[connector.exchange.id]), Object.keys(ids));
    }

    async getOrderHistory(pair: string, startTime: number, endTime: number): Promise<Dictionary<ExchangeResolve<Order[]>>> {
        return this.execute((connector: Connector) => connector.getOrderHistory(pair, startTime, endTime), this.exchangesIds);
    }

    async getOpenOrders(pair: string): Promise<Dictionary<ExchangeResolve<Order[]>>> {
        return this.execute((connector: Connector) => connector.getOpenOrders(pair), this.exchangesIds);
    }

    async checkUpdates(orders: Order[]): Promise<void> {
        const exchangeToOrders = {};
        for (let order of orders) {
            if (!exchangeToOrders[order.exchange]) {
                exchangeToOrders[order.exchange] = [];
            }
            exchangeToOrders[order.exchange].push(order);
        }

        for (let exchange in exchangeToOrders) {
            const connector = this.connectors[exchange];
            await connector.checkUpdates(exchangeToOrders[exchange]);
        }
    }

    orderWatcher(callback: (trade: Trade) => void): void {
        this.callback = callback;
        for (let exchange of this.exchangesIds) {
            const connector = this.connectors[exchange];
            connector.subscribeToOrderUpdates(callback);
        }
    }
}