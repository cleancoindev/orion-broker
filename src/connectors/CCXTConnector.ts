import {Connector} from "./Connector";
import {Balances, Exchange, Side, Status, SubOrder, Trade} from "../Model";
import BigNumber from "bignumber.js";
import ccxt from "ccxt";

function toSymbol(symbol: string) {
    return symbol.split('-').join('/');
}

function fromSymbol(symbol: string) {
    return symbol.split('/').join('-');
}

function toNumber(x: BigNumber): number {
    return x.toNumber();
}

function fromNumber(x: number): BigNumber {
    return new BigNumber(x);
}

function fromStatus(status: string): Status {
    switch (status) {
        case 'open':
            return Status.NEW;
        case 'closed':
            return Status.FILLED;
        case 'canceled':
            return Status.CANCELED;
        default:
            throw new Error('Unknown ccxt status ' + status);
    }
}

export class CCXTConnector implements Connector {
    readonly exchange: Exchange;
    private readonly ccxtExchange: ccxt.Exchange;
    private onTrade: (trade: Trade) => void;

    constructor(exchange: Exchange) {
        this.exchange = exchange;
        const exchangeClass = ccxt[exchange.id];
        this.ccxtExchange = new exchangeClass({
            'apiKey': exchange.apiKey,
            'secret': exchange.secretKey,
        });
    }

    destroy(): void {
    }

    async submitSubOrder(subOrderId: number, symbol: string, side: Side, amount: BigNumber, price: BigNumber): Promise<SubOrder> {
        const ccxtOrder: ccxt.Order = await this.ccxtExchange.createOrder(
            toSymbol(symbol),
            'limit',
            side,
            toNumber(amount),
            toNumber(price),
            {'clientOrderId': subOrderId}
        );

        return {
            id: subOrderId,
            symbol: symbol,
            side: side,
            price: price,
            amount: amount,
            exchange: this.exchange.id,
            exchangeOrderId: ccxtOrder.id,
            timestamp: ccxtOrder.timestamp,
            status: fromStatus(ccxtOrder.status),
        };
    }

    async cancelSubOrder(subOrder: SubOrder): Promise<boolean> {
        try {
            await this.ccxtExchange.cancelOrder(subOrder.exchangeOrderId, toSymbol(subOrder.symbol));
            return true;
        } catch (e) {
            return false;
        }
    }

    async getBalances(): Promise<Balances> {
        const balances: ccxt.Balances = await this.ccxtExchange.fetchBalance();
        const result: Balances = {};
        for (let currency in balances.free) {
            result[currency] = new BigNumber(balances.free[currency]);
        }
        return result;
    }

    setOnTradeListener(onTrade: (trade: Trade) => void): void {
        this.onTrade = onTrade;
    }

    async checkSubOrders(subOrders: SubOrder[]) {
        for (let subOrder of subOrders) {
            const ccxtOrder: ccxt.Order = await this.ccxtExchange.fetchOrder(subOrder.exchangeOrderId, toSymbol(subOrder.symbol));
            const newStatus = fromStatus(ccxtOrder.status);
            if (newStatus === Status.FILLED) {
                this.onTrade({
                    exchange: subOrder.exchange,
                    exchangeOrderId: subOrder.exchangeOrderId,
                    price: subOrder.price,
                    amount: subOrder.amount,
                    timestamp: ccxtOrder.lastTradeTimestamp,
                });
            }
        }
    }
}