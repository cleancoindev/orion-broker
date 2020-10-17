import BigNumber from "bignumber.js";
import {ExchangeConfig} from "./connectors/Connectors";

export interface Dictionary<T> {
    [key: string]: T;
}

export type Balances = Dictionary<BigNumber>;

export const EXCHANGES = ['poloniex', 'bittrex', 'binance', 'bitmax', 'coinex', 'kucoin'];

export function createEmulatorExchangeConfigs() {
    const exchangeConfigs: Dictionary<ExchangeConfig> = {};
    for (let exchange of EXCHANGES) {
        exchangeConfigs[exchange] = {
            secret: "",
            key: "emulator",
        }
    }
    return exchangeConfigs;
}

export enum Status {
    PREPARE = 'PREPARE',
    NEW = 'NEW',
    PARTIALLY_FILLED = 'PARTIALLY_FILLED',
    FILLED = 'FILLED',
    FILLED_AND_SENT_TO_ORION = 'FILLED_AND_SENT_TO_ORION',
    CANCELED = 'CANCELED',
    REJECTED = 'REJECTED',
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

export function calculateTradeStatus(ordQty: BigNumber, filledQty: BigNumber): Status {
    if (filledQty.isZero()) {
        return Status.NEW;
    } else if (filledQty.lt(ordQty)) {
        return Status.PARTIALLY_FILLED;
    } else {
        return Status.FILLED;
    }
}

export interface BlockchainOrder {
    senderAddress: string;
    matcherAddress: string;
    baseAsset: string;
    quoteAsset: string;
    matcherFeeAsset: string;
    amount: number;
    price: number;
    matcherFee: number;
    nonce: number;
    expiration: number;
    side: string;
    signature: string;
}