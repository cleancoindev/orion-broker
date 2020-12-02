import {Connector, ExchangeWithdrawStatus} from './Connector';
import {Balances, Exchange, Side, Status, SubOrder, Trade, Withdraw} from '../Model';
import BigNumber from 'bignumber.js';
import ccxt from 'ccxt';
import {log} from '../log';

function toCurrency(currency: string) {
    return currency;
}

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
            return Status.ACCEPTED;
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

    // eslint-disable-next-line @typescript-eslint/no-empty-function
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
            sentToAggregator: false
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
        for (const currency in balances.free) {
            result[currency] = new BigNumber(balances.free[currency]);
        }
        return result;
    }

    setOnTradeListener(onTrade: (trade: Trade) => void): void {
        this.onTrade = onTrade;
    }

    async checkSubOrders(subOrders: SubOrder[]): Promise<void> {
        for (const subOrder of subOrders) {
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

    /**
     * @return exchange withdrawal id / undefined if error
     */
    async withdraw(currency: string, amount: BigNumber, address: string): Promise<string | undefined> {
        try {
            const response = await this.ccxtExchange.withdraw(toCurrency(currency), toNumber(amount), address);
            return response.id;
        } catch (e) {
            return undefined;
        }
    }

    async checkWithdraws(withdraws: Withdraw[]): Promise<ExchangeWithdrawStatus[]> {
        const result: ExchangeWithdrawStatus[] = [];

        const transactions: ccxt.Transaction[] = await this.ccxtExchange.fetchWithdrawals(); // todo: paging

        for (const withdraw of withdraws) {
            const tx = transactions.find(t => t.id === withdraw.exchangeWithdrawId);

            if (!tx) {
                log.error('No exchange transaction for withdraw ' + withdraw.exchangeWithdrawId);
            } else {
                const status: string = tx.status;

                if (status === 'ok' || status === 'failed' || status === 'canceled') {
                    result.push({
                        exchangeWithdrawId: withdraw.exchangeWithdrawId,
                        status: status,
                    });
                } else if (tx.status === 'pending') {
                    // nothing to do
                } else {
                    log.error('Unknown exchange transaction status ' + tx.status);
                }
            }
        }

        return result;
    }
}