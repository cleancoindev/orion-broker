import {Connector} from "./Connector";
import {Balances, Exchange, Side, Status, SubOrder, Trade} from "../Model";
import {v1 as uuid} from "uuid";
import BigNumber from "bignumber.js";

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
        for (let subOrder of subOrders) {
            this.onTrade({
                exchange: this.exchange.id,
                exchangeOrderId: subOrder.exchangeOrderId,
                price: subOrder.price,
                amount: subOrder.amount,
                timestamp: Date.now(),
            });
        }
    }
}