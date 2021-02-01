import {Connector, ExchangeWithdrawStatus} from './Connector';
import {Balances, Dictionary, Exchange, Side, SubOrder, Trade, Withdraw, SendOrder} from '../Model';
import BigNumber from 'bignumber.js';
import {EmulatorConnector} from './EmulatorConnector';
import {CCXTConnector} from './CCXTConnector';
import {log} from '../log';

export interface ExchangeConfig {
    secret: string;
    key: string;
    password: string;
}

export interface ExchangeResolve<T> {
    exchangeId: string;
    result?: T;
    error?: any;
}

export class Connectors {
    private readonly emulatorBalances: Dictionary<string>;
    private readonly isProduction: boolean;

    public readonly exchangesIds: string[] = [];
    private exchanges: Dictionary<Exchange> = {};
    private connectors: Dictionary<Connector> = {};
    private onTrade: (trade: Trade) => void = null;

    constructor(emulatorBalances: Dictionary<string>, isProduction: boolean) {
        this.emulatorBalances = emulatorBalances;
        this.isProduction = isProduction;
    }

    private createBalances(): Dictionary<BigNumber> {
        const balances: Balances = {};
        if (!this.isProduction) {
            for (const currency in this.emulatorBalances) {
                balances[currency] = new BigNumber(this.emulatorBalances[currency]);
            }
        }
        return balances;
    }

    updateExchanges(exchangeConfigs: Dictionary<ExchangeConfig>) {
        for (const id in exchangeConfigs) {
            this.updateExchange(id, exchangeConfigs[id]);
        }
    }

    updateExchange(id: string, exchangeConfig: ExchangeConfig) {
        if (this.exchangesIds.indexOf(id) === -1) {
            this.exchangesIds.push(id);
        } else {
            this.connectors[id].destroy();
        }
        const exchange: Exchange = {
            id: id,
            apiKey: exchangeConfig.key,
            secretKey: exchangeConfig.secret,
            password: exchangeConfig.password,
            balances: this.createBalances()
        };
        this.exchanges[id] = exchange;
        this.connectors[id] = this.isProduction ? new CCXTConnector(exchange) : new EmulatorConnector(exchange);
        if (this.onTrade) {
            this.connectors[id].setOnTradeListener(this.onTrade);
        }
    }

    removeExchange(id: string) {
        const index = this.exchangesIds.indexOf(id);
        if (index > -1) {
            this.exchangesIds.splice(index, 1);
            this.connectors[id].destroy();
            delete this.connectors[id];
            delete this.exchanges[id];
        }
    }

    private static resolve<T>(data: T, exchange: string): ExchangeResolve<T> {
        return {
            exchangeId: exchange,
            result: data
        };
    }

    private static reject<T>(data: any, exchange: string): ExchangeResolve<T> {
        return {
            exchangeId: exchange,
            error: data
        };
    }

    private async execute<T>(fn: (Connector) => Promise<T>, exchanges: string[]): Promise<Dictionary<ExchangeResolve<T>>> {
        const promises: Promise<ExchangeResolve<T>>[] = [];

        for (const exchange of exchanges) {
            const connector = this.connectors[exchange];

            if (!connector) {
                log.error('No connector for ' + exchange);
            } else {
                promises.push(
                    fn(connector)
                        .then(data => Connectors.resolve(data, exchange))
                        .catch(error => Connectors.reject(error, exchange))
                );
            }
        }

        const result: Dictionary<ExchangeResolve<T>> = {};
        (await Promise.all(promises)).forEach(response => result[response.exchangeId] = response);
        return result;
    }

    getConnector(exchangeId: string): Connector {
        const connector = this.connectors[exchangeId];
        if (!connector) throw new Error('Cant find exchange ' + exchangeId);
        return connector;
    }

    async submitSubOrder(exchangeId: string, subOrderId: number, symbol: string, side: Side, amount: BigNumber, price: BigNumber): Promise<SubOrder> {
        return this.getConnector(exchangeId).submitSubOrder(subOrderId, symbol, side, amount, price);
    }

    async submitSubOrder(exchangeId: string, subOrderId: number, symbol: string, side: Side, amount: BigNumber, price: BigNumber, type = 'limit'): Promise<SendOrder> {
        const connector = this.connectors[exchangeId];
        if (!connector) throw new Error('Cant find exchange ' + exchangeId);
        return connector.submitSubOrder(subOrderId, symbol, side, amount, price, type);
    }

    async cancelSubOrder(order: SubOrder): Promise<void> {
        return this.getConnector(order.exchange).cancelSubOrder(order);
    }

    async getBalances(): Promise<Dictionary<ExchangeResolve<Balances>>> {
        return this.execute((connector: Connector) => connector.getBalances(), this.exchangesIds);
    }

    // async checkSubOrders(subOrders: SubOrder[]): Promise<void> {
    //     const byExchanges = {};
    //     for (const subOrder of subOrders) {
    //         if (!byExchanges[subOrder.exchange]) {
    //             byExchanges[subOrder.exchange] = [];
    //         }
    //         byExchanges[subOrder.exchange].push(subOrder);
    //     }
    //
    //     for (const exchange in byExchanges) {
    //         const connector = this.connectors[exchange];
    //         await connector.checkSubOrders(byExchanges[exchange]);
    //     }
    // }

    async checkTrades(trades: Trade[]): Promise<void> {
        const byExchanges = {};
        for (const trade of trades) {
            if (!byExchanges[trade.exchange]) {
                byExchanges[trade.exchange] = [];
            }
            byExchanges[trade.exchange].push(trade);
        }

        for (const exchange in byExchanges) {
            const connector = this.connectors[exchange];
            await connector.checkTrades(byExchanges[exchange]);
        }
    }

    async checkWithdraws(withdraws: Withdraw[]): Promise<ExchangeWithdrawStatus[]> {
        const byExchanges = {};
        for (const withdraw of withdraws) {
            if (!byExchanges[withdraw.exchange]) {
                byExchanges[withdraw.exchange] = [];
            }
            byExchanges[withdraw.exchange].push(withdraw);
        }

        let result = [];
        for (const exchange in byExchanges) {
            const connector = this.connectors[exchange];
            const exchangeResult = await connector.checkWithdraws(byExchanges[exchange]);
            result = result.concat(exchangeResult);
        }
        return result;
    }

    hasWithdraw(exchange: string): boolean {
        return this.getConnector(exchange).hasWithdraw();
    }

    async withdraw(exchange: string, currency: string, amount: BigNumber, address: string): Promise<string | undefined> {
        return this.getConnector(exchange).withdraw(currency, amount, address);
    }

    setOnTradeListener(onTrade: (trade: Trade) => void): void {
        this.onTrade = onTrade;
        for (const exchange of this.exchangesIds) {
            const connector = this.connectors[exchange];
            connector.setOnTradeListener(onTrade);
        }
    }
}
