import {BlockchainOrder, Dictionary, OrderType, Side, Status} from "../Model";
import BigNumber from "bignumber.js";
import {DbOrder} from "../db/Db";

export interface BrokerHub {
    onCreateOrder: (data: CreateOrderRequest) => Promise<DbOrder>;

    onCancelOrder: (data: CancelOrderRequest) => Promise<DbOrder>;

    onOrderStatusResponse: (data: OrderStatusResponse) => Promise<void>;

    connect(): Promise<void>;

    disconnect(): Promise<void>;

    register(data: BrokerHubRegisterRequest): Promise<void>;

    sendBalances(address: string, exchanges: Dictionary<Dictionary<string>>): Promise<void>;

    sendTrade(tradeRequest: TradeRequest): Promise<void>;
}

export interface BrokerHubRegisterRequest {
    address: string;
    publicKey: string;
    signature: string;
}

export interface BalancesRequest {
    exchanges: Dictionary<Dictionary<string>>;
}

export interface CreateOrderRequest {
    side: Side;
    symbol: string;
    exchange: string;
    ordType: OrderType;
    price: BigNumber;
    subOrdQty: BigNumber;
    ordId: string;
    subOrdId: string;
    clientOrdId: string;
}

export interface CancelOrderRequest {
    subOrdId: string;
}

export interface OrderStatusResponse {
    subOrdId: string;
    status: Status;
}

export interface TradeRequest {
    id: string;
    subOrdId: string;
    clientOrdId: string;
    status: Status;
    blockchainOrder?: BlockchainOrder;

    ordId: string; // deprecated
    tradeId: string; // deprecated
    timestamp: number; // deprecated
}