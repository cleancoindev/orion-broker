import BigNumber from "bignumber.js";
import {convertCurrency} from "./Utils";

export interface Dictionary<T> {
    [key: string]: T;
}

export interface NumberFormat {
    name: string;
    minQty: number; // validating order amount
    maxQty: number;
    minPrice: number;  // validating order price
    maxPrice: number;
    pricePrecision: number; // formatting price
    qtyPrecision: number; // formatting amount
    baseAssetPrecision: number; // fromCurrency
    quoteAssetPrecision: number; // formatting totals / toCurrency
    limitOrderThreshold: number;
}

export const DEFAULT_NUMBER_FORMAT: NumberFormat = {
    "name": "ETH-BTC",
    "minQty": 0.001,
    "maxQty": 100000.0,
    "minPrice": 1.0E-6,
    "maxPrice": 100000.0,
    "pricePrecision": 9,
    "qtyPrecision": 3,
    "baseAssetPrecision": 8,
    "quoteAssetPrecision": 8,
    "limitOrderThreshold": 0.001
}

export enum Side {
    BUY = 'buy',
    SELL = 'sell',
}

export enum OrderType {
    LIMIT = 'LIMIT',
    MARKET = 'MARKET',
}

export interface OrderbookItem {
    price: BigNumber;
    size: BigNumber;
    total: BigNumber;
    cumulativeSize: BigNumber;
    cumulativeTotal: BigNumber;
    avgPrice: BigNumber;
    deltaSize: number;
    exchanges: string[];
}

export function parseOrderbookItem(arr: any): OrderbookItem {
    const price = new BigNumber(arr[0]);
    const size = new BigNumber(arr[1]);
    return {
        price: price,
        size: size,
        total: price.multipliedBy(size),
        cumulativeSize: new BigNumber(0),
        cumulativeTotal: new BigNumber(0),
        avgPrice: new BigNumber(0),
        deltaSize: 0,
        exchanges: arr[2] as string[]
    }
}

export interface Orderbook {
    asks: OrderbookItem[];
    bids: OrderbookItem[];
    maxAskSize: BigNumber,
    maxAskTotal: BigNumber,
    maxBidSize: BigNumber,
    maxBidTotal: BigNumber,
}

export function defaultOrderbook(): Orderbook {
    return {
        asks: [],
        bids: [],
        maxAskSize: new BigNumber(0),
        maxAskTotal: new BigNumber(0),
        maxBidSize: new BigNumber(0),
        maxBidTotal: new BigNumber(0),
    }
}

export function fromMinToMax(a: OrderbookItem, b: OrderbookItem) {
    if (a.price.gt(b.price)) return 1;
    if (a.price.lt(b.price)) return -1;
    return 0;
}

export function fromMaxToMin(a: OrderbookItem, b: OrderbookItem) {
    if (a.price.gt(b.price)) return -1;
    if (a.price.lt(b.price)) return 1;
    return 0;
}

export interface OrderData {
    price: BigNumber;
    amount: BigNumber;
    total: BigNumber;
    isAsk: boolean;
}

export function orderDataEquals(a?: OrderData, b?: OrderData): boolean {
    if (!a && !b) return true;
    if (!a) return false;
    if (!b) return false;
    return a.price.eq(b.price) && a.amount.eq(b.amount) && a.total.eq(b.total);
}

export interface Pair {
    name: string;
    fromCurrency: string;
    toCurrency: string;
    lastPrice: BigNumber;
    openPrice: BigNumber;
    change24h: BigNumber;
    high: BigNumber;
    low: BigNumber;
    vol24h: BigNumber;
}

export function parsePair(arr: string[]): Pair {
    const name = arr[0]; // "ETH-BTC"
    const [fromCurrency, toCurrency] = name.split('-');
    const lastPrice = new BigNumber(arr[1]);
    const openPrice = new BigNumber(arr[2]);
    const change24h = lastPrice.div(openPrice).minus(1).multipliedBy(100);
    const high = new BigNumber(arr[3]);
    const low = new BigNumber(arr[4]);
    const vol24h = new BigNumber(arr[5]);
    return {name, fromCurrency, toCurrency, lastPrice, openPrice, change24h, high, low, vol24h};
}

export const getDefaultPair = (name: string): Pair => {
    const arr = name.split('-');
    return {
        name: name,
        fromCurrency: arr[0],
        toCurrency: arr[1],
        lastPrice: new BigNumber(0),
        openPrice: new BigNumber(0),
        change24h: new BigNumber(0),
        high: new BigNumber(0),
        low: new BigNumber(0),
        vol24h: new BigNumber(0),
    }
}

export interface Transaction {
    date: number;
    token: string;
    amount: BigNumber;
    status: string;
}

export function parseTransaction(item: any): Transaction {
    const createdAt: string = item.created_at; // "2020-04-08T12:34:39.940Z"
    return {
        date: new Date(createdAt).getTime(),
        token: convertCurrency(item.asset),
        amount: new BigNumber(item.amount),
        status: 'Filled'
    }
}

export interface TradeSubOrder {
    pair: string;
    exchange: string;
    id: number;
    amount: BigNumber;
    price: BigNumber;
    status: string;
}

function parseOrderStatus(status: string): string {
    if (status === 'FILLED_AND_SENT_TO_ORION') return 'FILLED';
    return status;
}

export function parseTradeSubOrder(item: any, pair: string): TradeSubOrder {
    return {
        pair: pair,
        exchange: item.exchange,
        id: Number(item.id),
        amount: new BigNumber(item.subOrdQty),
        price: new BigNumber(item.price),
        status: parseOrderStatus(item.status)
    }
}

export interface TradeOrder {
    status: string;
    date: number;
    id: number;
    type: string,
    pair: string;
    fromCurrency: string;
    toCurrency: string;
    amount: BigNumber;
    price: BigNumber;
    total: BigNumber;
    subOrders: TradeSubOrder[];
}

export function parseTradeOrder(item: any): TradeOrder {
    const amount = new BigNumber(item.qty);
    const price = new BigNumber(item.price);
    const [fromCurrency, toCurrency] = item.symbol.split('-');
    return {
        status: parseOrderStatus(item.status),  // 'NEW' || 'PARTIALLY_FILLED' || 'PARTIALLY_CANCELLED' || 'FILLED' || 'CANCELED'
        date: Number(item.timestamp),
        id: Number(item.ordId),
        type: item.side, // 'buy' / 'sell'
        pair: item.symbol, // 'ETH-BTC'
        fromCurrency,
        toCurrency,
        amount,
        price,
        total: amount.multipliedBy(price),
        subOrders: []
    };
}

