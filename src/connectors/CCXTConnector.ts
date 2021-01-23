import {Connector, ExchangeCancelOrderResponse, ExchangeWithdrawLimit, ExchangeWithdrawStatus} from './Connector';
import {Balances, Exchange, Side, Status, SubOrder, Trade, Withdraw} from '../Model';
import BigNumber from 'bignumber.js';
import ccxt from 'ccxt';
import {log} from '../log';
import {tokens} from '../main';
import {v1 as uuid} from 'uuid';

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
        const options: any = {
            'apiKey': exchange.apiKey,
            'secret': exchange.secretKey,
        };
        if (exchange.id === 'kucoin') {
            options.password = exchange.password;
        }
        this.ccxtExchange = new exchangeClass(options);
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    destroy(): void {
    }

    /**
     * https://github.com/ccxt/ccxt/wiki/Manual#placing-orders
     * https://github.com/ccxt/ccxt/wiki/Manual#limit-orders
     * @throws if error
     */
    async submitSubOrder(subOrderId: number, symbol: string, side: Side, amount: BigNumber, price: BigNumber): Promise<SubOrder> {
        const ccxtOrder: ccxt.Order = await this.ccxtExchange.createOrder(
            toSymbol(symbol),
            'limit',
            side,
            toNumber(amount),
            toNumber(price),
            {'clientOrderId': subOrderId}
        );
        log.debug(this.exchange.id + ' submit order response: ', ccxtOrder);

        return {
            id: subOrderId,
            symbol: symbol,
            side: side,
            price: price,
            amount: amount,
            exchange: this.exchange.id,
            exchangeOrderId: ccxtOrder.id,
            timestamp: ccxtOrder.timestamp || Date.now(),
            status: Status.ACCEPTED, // todo: OPTIMIZATION some exchanges can return Status.FILLED right here - we need to be able to handle it
            sentToAggregator: false
        };
    }

    /**
     * https://github.com/ccxt/ccxt/wiki/Manual#canceling-orders
     */
    async cancelSubOrder(subOrder: SubOrder): Promise<ExchangeCancelOrderResponse> {
        try {
            const ccxtOrder: ccxt.Order = await this.ccxtExchange.cancelOrder(subOrder.exchangeOrderId, toSymbol(subOrder.symbol));
            log.debug(this.exchange.id + ' cancel order response: ', ccxtOrder);
            // todo: KUCOIN return success result for cancel closed (filled) order
            let filledAmount: BigNumber = fromNumber(ccxtOrder.filled);
            if (filledAmount.isNaN()) filledAmount = new BigNumber(0);
            return {
                success: true,
                filledAmount: filledAmount,
            };
        } catch (e) {
            // todo: retry if error not final
            log.error(this.exchange.id + ' cancel order error:', e);
            return {success: false, filledAmount: new BigNumber(0)};
        }
    }

    /**
     * https://github.com/ccxt/ccxt/wiki/Manual#querying-account-balance
     * @throws if error
     */
    async getBalances(): Promise<Balances> {
        const balances: ccxt.Balances = await this.ccxtExchange.fetchBalance();
        const result: Balances = {};
        for (const currency in tokens.nameToAddress) {
            if (balances.free.hasOwnProperty(currency)) {
                result[currency] = new BigNumber(balances.free[currency]);
            }
        }
        return result;
    }

    setOnTradeListener(onTrade: (trade: Trade) => void): void {
        this.onTrade = onTrade;
    }

    /**
     * https://github.com/ccxt/ccxt/wiki/Manual#querying-orders
     * https://github.com/ccxt/ccxt/wiki/Manual#personal-trades
     * @throws if error
     */
    async checkSubOrders(subOrders: SubOrder[]): Promise<void> {
        for (const subOrder of subOrders) {
            const ccxtOrder: ccxt.Order = await this.ccxtExchange.fetchOrder(subOrder.exchangeOrderId, toSymbol(subOrder.symbol));
            log.debug(this.exchange.id + ' check order response: ', ccxtOrder);
            const newStatus = fromStatus(ccxtOrder.status);
            if (newStatus === Status.FILLED) {
                this.onTrade({
                    exchange: subOrder.exchange,
                    exchangeOrderId: subOrder.exchangeOrderId,
                    price: subOrder.price,
                    amount: subOrder.amount,
                });
            }
        }
    }

    hasWithdraw(): boolean {
        return this.ccxtExchange.hasWithdraw;
    }

    getWithdrawLimit(currency: string): Promise<ExchangeWithdrawLimit> {
        switch (this.exchange.id) {
            case 'kucoin':
                return this.getKucoinWithdrawLimit(currency);
            case 'binance':
                return this.getBinanceWithdrawLimit(currency);
            default:
                throw new Error('Unsupported withdraw limit for ' + this.exchange.id);
        }
    }

    private getKucoinWithdrawLimit = async (currency: string): Promise<ExchangeWithdrawLimit> => {
        await this.ccxtExchange.loadMarkets();
        const cur: any = this.ccxtExchange.currencies[currency];
        const info: any = cur.info;
        return {
            min: new BigNumber(info.withdrawalMinSize),
            fee: new BigNumber(info.withdrawalMinFee)
        };
    };

    private getBinanceWithdrawLimit = async (currency: string): Promise<ExchangeWithdrawLimit> => {
        // https://binance-docs.github.io/apidocs/spot/en/#all-coins-39-information-user_data
        const arr: any[] = await this.ccxtExchange.sapiGetCapitalConfigGetall();
        log.debug('binance sapiGetCapitalConfigGetall', arr);
        const coinInfo: any = arr.find(info => info.coin === currency);
        if (!coinInfo) throw new Error('no binance coinInfo for ' + currency);
        const network: any = coinInfo.networkList.find(n => n.network === 'ETH');
        if (!network) throw new Error('no binance ETH network for coinInfo for ' + currency);
        return {
            min: new BigNumber(network.withdrawFee),
            fee: new BigNumber(network.withdrawMin)
        };
    };

    /**
     * https://github.com/ccxt/ccxt/wiki/Manual#withdraw
     * @return exchange withdrawal id / undefined if error
     */
    async withdraw(currency: string, amount: BigNumber, address: string): Promise<string | undefined> {
        try {
            if (this.exchange.id === 'kucoin') {
                // NOTE: in kucoin withdrawing is allowed only from the main account,
                // need to inner transfer from trade account to main account
                // https://docs.kucoin.com/#inner-transfer
                const transferResponse = await this.ccxtExchange.privatePostAccountsInnerTransfer({
                    clientOid: uuid().toString(),
                    currency: toCurrency(currency),
                    from: 'trade',
                    to: 'main',
                    amount: amount.toString()
                });
                log.debug(this.exchange.id + ' inner transfer response: ', transferResponse);
            }

            const response = await this.ccxtExchange.withdraw(toCurrency(currency), toNumber(amount), address);
            log.debug(this.exchange.id + ' withdraw response:', response);
            return response.id;
        } catch (e) {
            log.error(this.exchange.id + ' withdraw error:', e);
            return undefined;
        }
    }

    /**
     * https://github.com/ccxt/ccxt/wiki/Manual#withdrawals
     * @throws if error
     */
    async checkWithdraws(withdraws: Withdraw[]): Promise<ExchangeWithdrawStatus[]> {
        const result: ExchangeWithdrawStatus[] = [];

        const transactions: ccxt.Transaction[] = await this.ccxtExchange.fetchWithdrawals(); // todo: paging
        log.debug(this.exchange.id + ' checkWithdraws response: ', transactions);

        for (const withdraw of withdraws) {
            const tx = transactions.find(t => t.id === withdraw.exchangeWithdrawId);

            if (!tx) {
                log.error('No exchange transaction for withdraw ' + withdraw.exchangeWithdrawId);
            } else {
                let status: string = tx.status;

                // NOTE: kucoin workaround: cctx set tx.status = 'ok' when kucoin internal status is 'PROCESSING'
                if (this.exchange.id === 'kucoin' && tx.info) {
                    if (tx.info.status === 'PROCESSING') {
                        status = 'pending';
                    }
                }

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