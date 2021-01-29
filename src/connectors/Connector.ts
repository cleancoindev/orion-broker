import {Balances, Exchange, Side, SubOrder, Trade, Withdraw} from '../Model';
import BigNumber from 'bignumber.js';

export interface Connector {
    exchange: Exchange;

    submitSubOrder(subOrderId: number, symbol: string, side: Side, amount: BigNumber, price: BigNumber): Promise<SubOrder>;

    cancelSubOrder(subOrder: SubOrder): Promise<void>;

    getBalances(): Promise<Balances>;

    setOnTradeListener(onTrade: (trade: Trade) => void): void;

    checkSubOrders(subOrders: SubOrder[]): Promise<void>;

    hasWithdraw(): boolean;

    withdraw(currency: string, amount: BigNumber, address: string): Promise<string | undefined>;

    checkWithdraws(withdraws: Withdraw[]): Promise<ExchangeWithdrawStatus[]>;

    getWithdrawLimit(currency: string): Promise<ExchangeWithdrawLimit>;

    destroy(): void;
}

export interface ExchangeWithdrawLimit {
    min: BigNumber;
    fee: BigNumber;
}

export interface ExchangeWithdrawStatus {
    exchangeWithdrawId: string;
    status: 'ok' | 'failed' | 'canceled';
}
