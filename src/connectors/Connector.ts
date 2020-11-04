import {Balances, Exchange, Side, SubOrder, Trade} from "../Model";
import BigNumber from "bignumber.js";

export interface Connector {
    exchange: Exchange;

    submitSubOrder(subOrderId: number, symbol: string, side: Side, amount: BigNumber, price: BigNumber): Promise<SubOrder>;

    cancelSubOrder(subOrder: SubOrder): Promise<boolean>;

    getBalances(): Promise<Balances>;

    setOnTradeListener(onTrade: (trade: Trade) => void): void;

    checkSubOrders(subOrders: SubOrder[]): Promise<void>;

    destroy(): void;
}