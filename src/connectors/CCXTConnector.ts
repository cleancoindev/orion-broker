import {Connector} from "./Connector";
import {
    Balances,
    Exchange,
    ExchangeOperation,
    Order,
    OrderBook,
    OrderType,
    Side,
    Status,
    Ticker,
    Trade
} from "../Model";
import BigNumber from "bignumber.js";

const ccxt = require('ccxt')

function toSymbol(symbol: string) {
    return symbol.split('-').join('/');
}

function fromSymbol(symbol: string) {
    return symbol.split('/').join('-');
}

function toType(type: OrderType): string {
    if (type === OrderType.LIMIT) {
        return 'limit';
    } else {
        return 'market';
    }
}

function fromType(type: string): OrderType {
    if (type === 'limit') {
        return OrderType.LIMIT;
    } else {
        return OrderType.MARKET;
    }
}

function toSide(side: Side): string {
    if (side === Side.BUY) {
        return 'buy';
    } else {
        return 'sell';
    }
}

function fromSide(type: string): Side {
    if (type === 'buy') {
        return Side.BUY;
    } else {
        return Side.SELL;
    }
}

function toNumber(x: BigNumber): number {
    return x.toNumber();
}

function fromNumber(x: number): BigNumber {
    return new BigNumber(x);
}

function fromStatus(status: string): Status {
    switch (status) {
        case 'open':
            return Status.NEW;
        case 'closed':
            return Status.FILLED;
        case 'canceled':
            return Status.CANCELED;
    }
}

export class CCXTConnector implements Connector {
    exchange: Exchange;
    callback: (trade: Trade) => void;
    ccxtExchange: any;

    constructor(exchange: Exchange) {
        this.exchange = exchange;
        const exchangeClass = ccxt[exchange.id];
        this.ccxtExchange = new exchangeClass({
            'apiKey': exchange.apiKey,
            'secret': exchange.secretKey,
        });
    }

    destroy(): void {
    }

    async checkUpdates(orders: Order[]) {
        for (let order of orders) {
            const ccxtOrder = await this.ccxtExchange.fetchOrder(order.exchangeOrdId);
            const newStatus = fromStatus(ccxtOrder.status);
            if (newStatus === Status.FILLED) {
                const trade: Trade = {
                    exchange: order.exchange,
                    exchangeOrdId: order.exchangeOrdId,
                    tradeId: order.exchangeOrdId, // todo
                    price: order.price,
                    qty: order.qty,
                    status: Status.FILLED,
                    timestamp: ccxtOrder.lastTradeTimestamp,
                }
                this.callback(trade);
            }
        }
    }

    subscribeToOrderUpdates(callback: (trade: Trade) => void): void {
        this.callback = callback;
    }

    async submitOrder(order: ExchangeOperation): Promise<Order> {
        const symbol = toSymbol(order.symbol);
        const type = toType(order.ordType);
        const side = toSide(order.side);
        const amount = toNumber(order.qty);
        const price = toNumber(order.price);

        if (type === 'market' && !this.ccxtExchange.has['createMarketOrder']) {
            throw new Error(this.exchange.id + ' allow create only limit orders');
        }

        const ccxtOrder: any = await this.ccxtExchange.createOrder(symbol, type, side, amount, price, {
            'clientOrderId': order.subOrdId,
        });

        const result: Order = {
            subOrdId: order.subOrdId,
            symbol: order.symbol,
            side: order.side,
            price: order.price,
            qty: order.qty,
            exchangeOrdId: ccxtOrder.id,
            ordType: OrderType.LIMIT,
            exchange: this.exchange.id,
            timestamp: ccxtOrder.timestamp,
            status: fromStatus(ccxtOrder.status),
        }

        return result;
    }

    async cancelOrder(order: Order): Promise<boolean> {
        try {
            await this.ccxtExchange.cancelOrder(order.exchangeOrdId, toSymbol(order.symbol));
            return true;
        } catch (e) {
            return false;
        }
    }

    async getBalances(): Promise<Balances> {
        const balances: any = await this.ccxtExchange.fetchBalance();
        const result: Balances = {};
        for (let currency in balances.free) {
            result[currency] = new BigNumber(balances.free[currency]);
        }
        return result;
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
}