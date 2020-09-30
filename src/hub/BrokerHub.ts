import {OrderType, Side} from "../Model";
import BigNumber from "bignumber.js";
import {DbOrder} from "../db/Db";

export interface BrokerHub {
    onCreateOrder: (data: any) => Promise<DbOrder>;

    onCancelOrder: (data: any) => Promise<DbOrder>;

    onOrderStatusResponse: (data: any) => Promise<void>;

    connect(): Promise<void>;

    disconnect(): Promise<void>;

    register(data: BrokerHubRegisterRequest): Promise<void>;

    sendBalances(data: any): Promise<void>;

    sendTrade(data: any): Promise<void>;
}

export interface BrokerHubRegisterRequest {
    address: string;
    publicKey: string;
    signature: string;
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

export function parseCreateOrderRequest(request: any): CreateOrderRequest {
    return {
        side: request.side == 'sell' ? Side.SELL : Side.BUY,
        symbol: request.symbol,
        exchange: request.exchange,
        ordType: request.ordType ? (OrderType[request.ordType] as OrderType) : OrderType.LIMIT,
        price: new BigNumber(request.price),
        subOrdQty: new BigNumber(request.subOrdQty),
        ordId: request.ordId,
        subOrdId: request.subOrdId,
        clientOrdId: request.clientOrdId || '',
    }
}

export interface CancelOrderRequest {
    subOrdId: string;
}