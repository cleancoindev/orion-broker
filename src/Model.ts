import BigNumber from 'bignumber.js';
import {ExchangeConfig} from './connectors/Connectors';

export interface Dictionary<T> {
    [key: string]: T;
}

export type Balances = Dictionary<BigNumber>;

export const EXCHANGES = ['binance', 'bitmax', 'kucoin'];

export function createEmulatorExchangeConfigs() {
    const exchangeConfigs: Dictionary<ExchangeConfig> = {};
    for (const exchange of EXCHANGES) {
        exchangeConfigs[exchange] = {
            secret: '',
            key: 'emulator',
            password: ''
        };
    }
    return exchangeConfigs;
}

export enum Status {
    PREPARE = 'PREPARE', // internal broker status
    ACCEPTED = 'ACCEPTED',
    FILLED = 'FILLED',
    CANCELED = 'CANCELED',
    REJECTED = 'REJECTED',
}

export type Side = 'buy' | 'sell';

export interface Exchange {
    id: string;
    apiKey: string;
    secretKey: string;
    password: string;
    balances: Balances;
}

export interface SubOrder {
    id: number;
    symbol: string; // 'BTC-ETH'
    symbolAlias: string; // 'WBTC-ETH'
    side: Side;
    price: BigNumber;
    amount: BigNumber;
    exchange: string;
    exchangeOrderId?: string;
    timestamp: number; // receive time in millis
    status: Status;
    sentToAggregator: boolean;
}

export interface Trade {
    exchange: string;
    exchangeOrderId: string;
    price: BigNumber;
    amount: BigNumber;
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

export interface Transaction {
    transactionHash: string;
    method: 'deposit' | 'depositAsset' | 'withdraw' | 'approve' | 'lockStake' | 'requestReleaseStake';
    asset: string;
    amount: BigNumber;
    createTime: number;
    status: 'PENDING' | 'OK' | 'FAIL';
}

export interface Withdraw {
    exchangeWithdrawId: string;
    exchange: string;
    currency: string;
    amount: BigNumber;
    status: 'pending' | 'ok' | 'failed' | 'canceled';
}

export interface Liability {
    assetName: string;
    assetAddress: string; // address
    timestamp: number; // uint64 in seconds
    outstandingAmount: BigNumber; // uint192
}

export function parseLiability(data: any): Liability {
    return {
        assetName: data.assetName,
        assetAddress: data.assetAddress,
        timestamp: data.timestamp,
        outstandingAmount: new BigNumber(data.outstandingAmount),
    };
}