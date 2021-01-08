import {Connector, ExchangeWithdrawStatus} from './Connector';
import {Balances, Exchange, Side, Status, SubOrder, Trade, Withdraw} from '../Model';
import {v1 as uuid} from 'uuid';
import BigNumber from 'bignumber.js';

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

    async submitSubOrder(subOrderId: number, symbol: string, side: Side, amount: BigNumber, price: BigNumber): Promise<SubOrder> {
        return {
            id: subOrderId,
            exchange: this.exchange.id,
            exchangeOrderId: uuid().toString(),
            symbol: symbol,
            symbolAlias: symbol,
            side: side,
            price: price,
            amount: amount,
            timestamp: Date.now(),
            status: Status.ACCEPTED,
            sentToAggregator: false
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

    async checkSubOrders(subOrders: SubOrder[]): Promise<void> {
        for (const subOrder of subOrders) {
            this.onTrade({
                exchange: this.exchange.id,
                exchangeOrderId: subOrder.exchangeOrderId,
                price: subOrder.price,
                amount: subOrder.amount,
            });
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