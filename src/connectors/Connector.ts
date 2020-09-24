import {Balances, Exchange, ExchangeOperation, Order, OrderBook, Ticker, Trade} from "../Model";

export interface Connector {
    exchange: Exchange;

    submitOrder(order: ExchangeOperation): Promise<Order>;

    cancelOrder(order: Order): Promise<boolean>;

    getBalances(): Promise<Balances>;

    getTicker(pair: string): Promise<Ticker>;

    getOrderBook(pair: string): Promise<OrderBook>;

    getOrderStatus(id: string): Promise<Order>;

    getOrderHistory(pair: string, startTime: number, endTime: number): Promise<Order[]>

    getOpenOrders(pair: string): Promise<Order[]>;

    subscribeToOrderUpdates(callback: (trade: Trade) => void): void;

    checkUpdates(orders: Order[]): Promise<void>;

    destroy(): void;
}