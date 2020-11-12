import {BlockchainOrder, Dictionary, Side, Status} from "../Model";
import BigNumber from "bignumber.js";

export interface BrokerHub {
    onCreateSubOrder: (data: CreateSubOrder) => Promise<SubOrderStatus>;

    onCancelSubOrder: (id: number) => Promise<SubOrderStatus>;

    onCheckSubOrder: (id: number) => Promise<SubOrderStatus>;

    onSubOrderStatusAccepted: (data: SubOrderStatusAccepted) => Promise<void>;

    connect(data: BrokerHubRegisterRequest): Promise<void>;

    disconnect(): Promise<void>;

    sendBalances(exchanges: Dictionary<Dictionary<string>>): Promise<void>;

    sendSubOrderStatus(subOrderStatus: SubOrderStatus): Promise<void>;
}

export interface BrokerHubRegisterRequest {
    address: string;
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