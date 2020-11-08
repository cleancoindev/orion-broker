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
            secret: '',
            key: 'emulator',
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

export type Side = 'buy' | 'sell';

export interface Exchange {
    id: string;
    apiKey: string;
    secretKey: string;
    balances: Balances;
}

export interface SubOrder {
    id: number;
    symbol: string; // 'BTC-ETH'
    side: Side;
    price: BigNumber;
    amount: BigNumber;
    exchange: string;
    exchangeOrderId?: string;
    timestamp: number; // create time on exchange
    status: Status;
}

export interface Trade {
    exchange: string;
    exchangeOrderId: string;
    price: BigNumber;
    amount: BigNumber;
    timestamp: number; // lastTradeTimestamp
}

export function calculateTradeStatus(orderAmount: BigNumber, filledAmount: BigNumber): Status {
    if (filledAmount.isZero()) {
        return Status.NEW;
    } else if (filledAmount.lt(orderAmount)) {
        return Status.PARTIALLY_FILLED;
    } else {
        return Status.FILLED;
    }
}

export interface BlockchainOrder {
    id: string; // hash of BlockchainOrder (it's not part of order structure in smart-contract)

    senderAddress: string; // address
    matcherAddress: string; // address
    baseAsset: string; // address
    quoteAsset: string; // address
    matcherFeeAsset: string; // address
    amount: number; // uint64
    price: number; // uint64
    matcherFee: number; // uint64
    nonce: number; // uint64
    expiration: number; // uint64
    buySide: number; // uint8, 1=buy, 0=sell
    signature: string; // bytes
}