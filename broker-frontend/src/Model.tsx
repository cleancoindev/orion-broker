import BigNumber from "bignumber.js";

export interface Dictionary<T> {
    [key: string]: T;
}

export interface BlockchainInfo {
    chainId: number;
    chainName: string;
    exchangeContractAddress: string;
    matcherAddress: string;
    minOrnFee: BigNumber;
    assetToAddress: Dictionary<string>;
    assetToDecimals: Dictionary<number>;
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
    type: string;
    date: number;
    token: string;
    amount: BigNumber;
    status: string;
    transactionHash: string;
    user: string;
}

export function parseTransaction(item: any): Transaction {
    const createdAt: number = item.createdAt;
    return {
        type: item.type,
        date: createdAt * 1000,
        token: item.asset,
        amount: new BigNumber(item.amountNumber),
        status: 'Done',
        transactionHash: item.transactionHash,
        user: item.user,
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

export function parseTradeSubOrder(item: any, pair: string): TradeSubOrder {
    return {
        pair: pair,
        exchange: item.exchange,
        id: Number(item.id),
        amount: new BigNumber(item.subOrdQty),
        price: new BigNumber(item.price),
        status: item.status || 'NEW', // todo: backend
    }
}

export interface TradeOrder {
    status: string;
    date: number;
    clientOrdId: string;
    id: number;
    type: string,
    pair: string;
    fromCurrency: string;
    toCurrency: string;
    amount: BigNumber;
    price: BigNumber;
    total: BigNumber;
    subOrders: TradeSubOrder[];
    exchange: string;
}

export function parseTradeOrder(item: any): TradeOrder {
    const amount = new BigNumber(item.amount);
    const price = new BigNumber(item.price);
    const [fromCurrency, toCurrency] = item.symbol.split('-');
    const subOrders = item.subOrders ? item.subOrders.map((sub: any) => parseTradeSubOrder(sub, item.symbol)) : [];
    return {
        status: item.status,  // 'NEW' || 'PARTIALLY_FILLED' || 'PARTIALLY_CANCELLED' || 'FILLED' || 'CANCELED'
        date: Number(item.timestamp),
        clientOrdId: item.clientOrdId,
        id: Number(item.id),
        type: item.side, // 'buy' / 'sell'
        pair: item.symbol, // 'ETH-BTC'
        fromCurrency,
        toCurrency,
        amount,
        price,
        total: amount.multipliedBy(price),
        subOrders,
        exchange: getExchangeBySubOrders(subOrders)
    };
}

function getExchangeBySubOrders(subOrders: TradeSubOrder[]): string {
    if (!subOrders.length) return '-';

    const arr = [];
    for (let subOrder of subOrders) {
        if (arr.indexOf(subOrder.exchange) === -1) {
            arr.push(subOrder.exchange);
        }
    }
    return arr.length === 1 ? arr[0] : 'Multi';
}

export function isOrderOpen(order: TradeOrder): boolean {
    return order.status === 'NEW' || order.status === 'ACCEPTED';
}

function getSwapStatusByOrders(orders: TradeOrder[]): string {
    if (!orders.length) return 'NEW';

    let allFilled = true;
    let hasFilled = false;
    let allCanceled = true;
    let hasCanceled = false;
    let allRejected = true;
    let hasRejected = false;
    for (let order of orders) {
        if (order.status !== 'SETTLED') allFilled = false;
        if (order.status === 'SETTLED') hasFilled = true;

        if (order.status !== 'CANCELED') allCanceled = false;
        if (order.status === 'CANCELED') hasCanceled = true;

        if (order.status !== 'REJECTED') allRejected = false;
        if (order.status === 'REJECTED') hasRejected = true;
    }
    if (allFilled) return 'FILLED';
    if (allCanceled) return 'CANCELED';
    if (allRejected) return 'REJECTED';
    if (hasCanceled) return 'PARTIALLY_CANCELED';
    if (hasRejected) return 'PARTIALLY_REJECTED';
    if (hasFilled) return 'PARTIALLY_FILLED';
    return 'NEW';
}

export interface SwapOrder {
    status: string;
    date: number;
    id: string;
    pair: string;
    fromCurrency: string;
    toCurrency: string;
    price: BigNumber;
    amount: BigNumber;
    orders: TradeOrder[];
}

export function parseSwapOrder(item: any): SwapOrder {
    const orders = item.orders ? item.orders.map(parseTradeOrder) : [];
    const status = getSwapStatusByOrders(orders);

    const price0 = orders.length > 0 ? orders[0].price : new BigNumber(0);
    const price1 = orders.length > 1 ? orders[1].price : new BigNumber(1);
    const price = price0.dividedBy(price1);
    const amount = new BigNumber(item.srcAmount);

    const [fromCurrency, toCurrency] = item.symbol.split('-');
    return {
        status: status,
        date: Number(item.time),
        id: item.id,
        pair: item.symbol, // 'ETH-BTC'
        fromCurrency,
        toCurrency,
        price,
        amount,
        orders
    };
}