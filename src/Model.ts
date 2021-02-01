import BigNumber from 'bignumber.js';
import {ExchangeConfig} from './connectors/Connectors';
import {
    PrimaryGeneratedColumn,
    PrimaryColumn,
    Column,
    Entity,
    OneToMany,
    JoinColumn,
    ManyToOne,
    Index
} from 'typeorm';

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

export enum OrderType {
    SUB = 'SUB',
    SWAP = 'SWAP'
}

export type TradeType = 'limit' | 'market';

export type Side = 'buy' | 'sell';

export type TradeStatus = 'pending' | 'ok' | 'failed' | 'canceled';

export interface Exchange {
    id: string;
    apiKey: string;
    secretKey: string;
    password: string;
    balances: Balances;
}

export interface SendOrder {
    exchangeOrderId: string;
    timestamp: number;
    status: Status;
}

export interface SubOrder {
    id: number;
    symbol: string; // 'BTC-ETH'
    side: Side;
    price: BigNumber;
    amount: BigNumber;
    exchange: string;
    exchangeOrderId?: string;
    timestamp: number; // receive time in millis
    status: Status;
    sentToAggregator: boolean;
}

export interface ITrade {
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

@Entity({name:'subOrders'})
export class SubOrder {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 255 })
    symbol: string;

    @Column({ length: 255 })
    exchange: string;

    @Column('decimal', { precision: 18, scale: 8 })
    price: BigNumber;

    @Column('decimal', { precision: 18, scale: 8, nullable: true })
    currentDev: BigNumber;

    @Column('decimal', { precision: 18, scale: 8, nullable: true })
    sellPrice: BigNumber;

    @Column('decimal', { precision: 18, scale: 8, nullable: true })
    buyPrice: BigNumber;

    @Column('decimal', { precision: 18, scale: 8 })
    amount: BigNumber;

    @Column('decimal', { precision: 18, scale: 8, nullable: true })
    filledAmount: BigNumber;

    @Column()
    side: Side;

    @Column()
    orderType: OrderType;

    @Column()
    status: Status;

    @Column({default: false})
    sentToAggregator: boolean;

    @Column({ type: 'datetime' })
    timestamp: number;

    @OneToMany(type => Trade, trade => trade.order )
    trades: Trade[];
}

@Entity({name:'trades'})
@Index(['exchange', 'exchangeOrderId'], { unique: true })
export class Trade {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 255 })
    exchange: string;

    @Column({ length: 255 })
    exchangeOrderId: string;

    @Column({ length: 255 })
    symbol: string;

    @Column({ length: 255 })
    symbolAlias: string;

    @Column('decimal', { precision: 18, scale: 8 })
    price: BigNumber;

    @Column('decimal', { precision: 18, scale: 8 })
    amount: BigNumber;

    @Column()
    side: Side;

    @Column()
    type: TradeType;

    @Column()
    status: TradeStatus;

    @Column({ type: 'datetime' })
    timestamp: number;

    @ManyToOne(type => SubOrder, order => order.trades)
        // @JoinColumn({ name: "orderId"})
    order: SubOrder;
}

@Entity()
export class Transaction {

    @PrimaryColumn({ type: 'varchar', length: 255 })
    transactionHash: string;

    @Column({ length: 255 })
    method: 'deposit' | 'depositAsset' | 'withdraw' | 'approve' | 'lockStake' | 'requestReleaseStake';

    @Column({ length: 255 })
    asset: string;

    @Column('decimal', { precision: 18, scale: 8 })
    amount: BigNumber;

    @Column({ type: 'datetime' })
    createTime: number;

    @Column({ length: 255 })
    status: 'PENDING' | 'OK' | 'FAIL';
}

@Entity()
export class Withdraw {

    @PrimaryColumn({ type: 'varchar', length: 255 })
    exchangeWithdrawId: string;

    @Column({ length: 255 })
    exchange: string;

    @Column({ length: 255 })
    currency: string;

    @Column('decimal', { precision: 18, scale: 8 })
    amount: BigNumber;

    @Column({ type: 'datetime' })
    createTime: number;

    @Column({ length: 255 })
    status: 'pending' | 'ok' | 'failed' | 'canceled';
}
