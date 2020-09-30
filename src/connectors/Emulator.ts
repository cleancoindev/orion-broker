import {Connector} from "./Connector";
import {Balances, Exchange, ExchangeOperation, Order, OrderBook, Status, Ticker, Trade} from "../Model";
import {v1 as uuid} from "uuid";
import {log} from "../log";

export class EmulatorConnector implements Connector {
    exchange: Exchange;
    balances: Balances;
    callback: (trade: Trade) => void;

    constructor(exchange: Exchange) {
        this.exchange = exchange;
        this.balances = exchange.balances;
    }

    subscribeToOrderUpdates(callback: (trade: Trade) => void): void {
        this.callback = callback;
    }

    async submitOrder(order: ExchangeOperation): Promise<Order> {
        const newOrder: Order = {
            subOrdId: order.subOrdId,
            exchange: this.exchange.id,
            exchangeOrdId: uuid().toString(),
            symbol: order.symbol,
            side: order.side,
            price: order.price,
            qty: order.qty,
            ordType: order.ordType,
            timestamp: new Date().getTime(),
            status: Status.NEW
        }
        return newOrder;
    }

    async cancelOrder(order: Order): Promise<boolean> {
        return true;
    }

    async getBalances(): Promise<Balances> {
        return this.balances;
    }

    getOpenOrders(pair: string): Promise<Order[]> {
        throw new Error("Unsupported");
    }

    getOrderBook(pair: string): Promise<OrderBook> {
        throw new Error("Unsupported");
    }

    getOrderHistory(pair: string, startTime: number, endTime: number): Promise<Order[]> {
        throw new Error("Unsupported");
    }

    getOrderStatus(id: string): Promise<Order> {
        throw new Error("Unsupported");
    }

    getTicker(pair: string): Promise<Ticker> {
        throw new Error("Unsupported");
    }

    destroy(): void {

    }

    async checkUpdates(orders: Order[]): Promise<void> {
        for (let order of orders) {
            log.log('emulator.checkUpdates', order);
            const trade: Trade = {
                exchange: this.exchange.id,
                exchangeOrdId: order.exchangeOrdId,
                tradeId: uuid().toString(),
                price: order.price,
                qty: order.qty,
                status: Status.FILLED,
                timestamp: new Date().getTime(),
            }
            this.callback(trade);
        }
    }
}