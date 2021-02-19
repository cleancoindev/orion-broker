import {Connector, ExchangeWithdrawLimit, ExchangeWithdrawStatus} from './Connector';
// import {Balances, Exchange, Side, Status, SubOrder, Trade, Withdraw} from '../Model';
// import {Connector, ExchangeWithdrawStatus} from './Connector';
import {Balances, Exchange, OrderType, SendOrder, Side, Status, SubOrder, Trade, Withdraw} from '../Model';
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

    amountToPrecision(amount: BigNumber, symbol: string, mode: 'floor' | 'ceil' | 'round' = 'round'): BigNumber {
        return amount;
    }

    priceToPrecision(price: BigNumber, symbol: string, mode: 'floor' | 'ceil' | 'round' = 'round'): BigNumber {
        return price;
    }

    async submitSubOrder(subOrderId: number, symbol: string, side: Side, amount: BigNumber, price: BigNumber, type: string, params: any): Promise<SendOrder> {
        return {
            exchangeOrderId: uuid().toString(),
            timestamp: Date.now(),
            amount,
            price,
            status: Status.ACCEPTED
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

    // async checkSubOrders(subOrders: SubOrder[]): Promise<void> {
    //     for (const subOrder of subOrders) {
    //         const isCancelled = this.cancelledSubOrderIds.indexOf(subOrder.id) > -1;
    //         this.onTrade({
    //             exchange: this.exchange.id,
    //             exchangeOrderId: subOrder.exchangeOrderId,
    //             price: subOrder.price,
    //             amount: isCancelled ? (subOrder.amount.eq(14) ? subOrder.amount.multipliedBy(0.5) : new BigNumber(0)) : subOrder.amount,
    //             status: isCancelled ? Status.CANCELED : Status.FILLED
    //         });
    //     }
    // }

    async checkTrades(trades: Trade[]): Promise<void> {
        for (const trade of trades) {
            const
                isCancelled = this.cancelledSubOrderIds.indexOf(trade.order.id) > -1,
                // amount = isCancelled ? (trade.amount.eq(14) ? trade.amount.multipliedBy(0.5) : new BigNumber(0)) : trade.amount,
                amount = trade.side === (trade.symbol ==='USDT-DAI' ? 'sell' : 'buy') && trade.order.orderType === OrderType.SWAP && trade.type === 'limit' ? trade.amount.multipliedBy(0.5) :  trade.amount,
                status = isCancelled ? 'canceled' : 'ok'
            ;

            this.onTrade(Object.assign(trade, {amount, status}));
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
        return {
            fee: currency === 'ETH' ? new BigNumber(0.05) : new BigNumber(6),
            min: currency === 'ETH' ? new BigNumber(0.1) : new BigNumber(10),
        };
    }

    async withdraw(currency: string, amount: BigNumber, address: string): Promise<string | undefined> {
        return uuid().toString();
    }

}
