import {BlockchainOrder, Dictionary, Side, Status} from '../Model';
import BigNumber from 'bignumber.js';

export interface BrokerHub {
    onReconnect: () => void;

    onCreateSubOrder: (data: CreateSubOrder) => Promise<SubOrderStatus>;

    onCancelSubOrder: (id: number) => Promise<SubOrderStatus>;

    onCheckSubOrder: (id: number) => Promise<SubOrderStatus>;

    onSubOrderStatusAccepted: (data: SubOrderStatusAccepted) => Promise<void>;

    connect(data: BrokerHubRegisterRequest): Promise<void>;

    disconnect(): Promise<void>;

    sendBalances(exchanges: Dictionary<Dictionary<string>>): Promise<void>;

    getLastBalancesJson(): string;

    sendSubOrderStatus(subOrderStatus: SubOrderStatus): Promise<void>;
}

export interface BrokerHubRegisterRequest {
    address: string;
    time: number;
    signature: string;
}

export interface BalancesRequest {
    exchanges: string; // JSON.stringify( Dictionary<Dictionary<string>> )
}

export interface CreateSubOrder {
    id: number;
    side: Side;
    symbol: string;
    exchange: string;
    price: BigNumber;
    amount: BigNumber;
    currentDiv?: BigNumber;
    sellPrice?: BigNumber;
    buyPrice?: BigNumber;
}

export function isSwapOrder(order: CreateSubOrder): boolean {
    return order.hasOwnProperty('currentDiv') && order.hasOwnProperty('sellPrice') && order.hasOwnProperty('buyPrice');
}

export interface CancelSubOrder {
    id: number;
}

export interface SubOrderStatus {
    id: number;
    status: Status;
    filledAmount: string;
    blockchainOrder?: BlockchainOrder;
}

export interface SubOrderStatusAccepted {
    id: number;
    status: Status;
}
