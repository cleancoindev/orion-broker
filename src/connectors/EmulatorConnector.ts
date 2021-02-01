import {Connector, ExchangeWithdrawStatus} from './Connector';
import {Balances, Exchange, SendOrder, Side, Status, SubOrder, ITrade, Withdraw, Trade} from '../Model';
import {v1 as uuid} from 'uuid';
import BigNumber from 'bignumber.js';
import ccxt from "ccxt";
import {log} from "../log";

export class EmulatorConnector implements Connector {
    readonly exchange: Exchange;
    private readonly balances: Balances;
    private onTrade: (trade: Trade) => void;

    constructor(exchange: Exchange) {
        this.exchange = exchange;
        this.balances = exchange.balances;
    }

    destroy(): void {
    }

    async submitSubOrder(subOrderId: number, symbol: string, side: Side, amount: BigNumber, price: BigNumber, type: string): Promise<SendOrder> {
        return {
            exchangeOrderId: uuid().toString(),
            timestamp: Date.now(),
            status: Status.ACCEPTED
        };
    }

    async cancelSubOrder(subOrder: SubOrder): Promise<boolean> {
        return true;
    }

    async getBalances(): Promise<Balances> {
        return this.balances;
    }

    setOnTradeListener(onTrade: (trade: Trade) => void): void {
        this.onTrade = onTrade;
    }

    // async checkSubOrders(subOrders: SubOrder[]): Promise<void> {
    //     for (const subOrder of subOrders) {
    //         this.onTrade({
    //             exchange: this.exchange.id,
    //             exchangeOrderId: subOrder.exchangeOrderId,
    //             price: subOrder.price,
    //             amount: subOrder.amount,
    //         });
    //     }
    // }

    async checkTrades(trades: Trade[]): Promise<void> {
        for (const trade of trades) {
            this.onTrade(trade);
        }
    }


    async checkWithdraws(withdraws: Withdraw[]): Promise<ExchangeWithdrawStatus[]> {
        const result: ExchangeWithdrawStatus[] = [];
        for (const withdraw of withdraws) {
            result.push({
                exchangeWithdrawId: withdraw.exchangeWithdrawId,
                status: 'ok'
            });
        }
        return result;
    }

    hasWithdraw(): boolean {
        return this.exchange.id !== 'bitmax';
    }

    async withdraw(currency: string, amount: BigNumber, address: string): Promise<string | undefined> {
        return uuid().toString();
    }

}
