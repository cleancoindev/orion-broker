import BigNumber from "bignumber.js";

export interface Dictionary<T> {
    [key: string]: T;
}

export type Balances = Dictionary<BigNumber>;

export enum Status {
    PREPARE = 'PREPARE',
    NEW = 'NEW',
    PARTIALLY_FILLED = 'PARTIALLY_FILLED',
    FILLED = 'FILLED',
    FILLED_AND_SENT_TO_ORION = 'FILLED_AND_SENT_TO_ORION',
    CANCELED = 'CANCELED',
}

export enum Side {
    BUY = 'buy',
    SELL = 'sell',
}

export enum OrderType {
    LIMIT = 'LIMIT',
    MARKET = 'MARKET',
}

export interface Exchange {
    id: string;
    apiKey: string;
    secretKey: string;
    balances: Balances;
}

export interface ExchangeOperation {
    subOrdId: string;
    ordType: OrderType;
    symbol: string; // 'BTC-ETH'
    side: Side;
    price: BigNumber;
    qty: BigNumber;
}

export interface Order extends ExchangeOperation {
    exchangeOrdId: string;
    exchange: string;
    timestamp: number;
    status: Status;
}

export interface OrderBook {
    bids: ExchangeOperation[];
    asks: ExchangeOperation[];
}

export interface Ticker {
    last: BigNumber;
    ask: BigNumber;
    bid: BigNumber;
    pair: string;
}

export interface Trade {
    exchange: string;
    exchangeOrdId: string;
    tradeId: string;
    price: BigNumber;
    qty: BigNumber;
    status: Status;
    timestamp: number;
}