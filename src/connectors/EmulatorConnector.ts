import {Connector, ExchangeWithdrawLimit, ExchangeWithdrawStatus} from './Connector';
import {Balances, Exchange, Side, Status, SubOrder, Trade, Withdraw} from '../Model';
import {v1 as uuid} from 'uuid';
import BigNumber from 'bignumber.js';

export class EmulatorConnector implements Connector {
    readonly exchange: Exchange;
    private readonly balances: Balances;
    private onTrade: (trade: Trade) => void;
    private cancelledSubOrderIds: number[] = [];

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
            side: side,
            price: price,
            amount: amount,
            timestamp: Date.now(),
            status: Status.ACCEPTED,
            sentToAggregator: false
        };
    }

    async cancelSubOrder(subOrder: SubOrder): Promise<void> {
        this.cancelledSubOrderIds.push(subOrder.id);
    }

    async getBalances(): Promise<Balances> {
        return this.balances;
    }

    setOnTradeListener(onTrade: (trade: Trade) => void): void {
        this.onTrade = onTrade;
    }

    async checkSubOrders(subOrders: SubOrder[]): Promise<void> {
        for (const subOrder of subOrders) {
            const isCancelled = this.cancelledSubOrderIds.indexOf(subOrder.id) > -1;
            this.onTrade({
                exchange: this.exchange.id,
                exchangeOrderId: subOrder.exchangeOrderId,
                price: subOrder.price,
                amount: isCancelled ? (subOrder.amount.eq(14) ? subOrder.amount.multipliedBy(0.5) : new BigNumber(0)) : subOrder.amount,
                status: isCancelled ? Status.CANCELED : Status.FILLED
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

    async getWithdrawLimit(currency: string): Promise<ExchangeWithdrawLimit> {
        throw {
            fee: new BigNumber(0.05),
            min: new BigNumber(0.1),
        };
    }

    async withdraw(currency: string, amount: BigNumber, address: string): Promise<string | undefined> {
        return uuid().toString();
    }

}