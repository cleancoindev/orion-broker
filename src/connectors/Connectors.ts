import {Connector, ExchangeWithdrawStatus} from "./Connector";
import {Balances, Dictionary, Exchange, Side, SubOrder, Trade, Withdraw} from "../Model";
import BigNumber from "bignumber.js";
import {EmulatorConnector} from "./EmulatorConnector";
import {CCXTConnector} from "./CCXTConnector";
import {log} from "../log";

export interface ExchangeConfig {
    secret: string;
    key: string;
}

export interface ExchangeResolve<T> {
    exchangeId: string;
    result?: T;
    error?: any;
}

export class Connectors {
    private readonly emulatorBalances: Dictionary<string>;
    private readonly isProduction: boolean;

    private exchangesIds: string[] = [];
    private exchanges: Dictionary<Exchange> = {};
    private connectors: Dictionary<Connector> = {};
    private onTrade: (trade: Trade) => void = null;

    constructor(emulatorBalances: Dictionary<string>, isProduction: boolean) {
        this.emulatorBalances = emulatorBalances;
        this.isProduction = isProduction;
    }

    private createBalances(): Dictionary<BigNumber> {
        const balances: Balances = {}
        if (!this.isProduction) {
            for (let currency in this.emulatorBalances) {
                balances[currency] = new BigNumber(this.emulatorBalances[currency]);
            }
        }
        return balances;
    }

    updateExchanges(exchangeConfigs: Dictionary<ExchangeConfig>) {
        for (let id in exchangeConfigs) {
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
            balances: this.createBalances()
        };
        this.exchanges[id] = exchange;
        this.connectors[id] = this.isProduction ? new CCXTConnector(exchange) : new EmulatorConnector(exchange);
        if (this.onTrade) {
            this.connectors[id].setOnTradeListener(this.onTrade);
        }
    }

    private static resolve<T>(data: T, exchange: string): ExchangeResolve<T> {
        return {
            exchangeId: exchange,
            result: data
        }
    }

    private static reject<T>(data: any, exchange: string): ExchangeResolve<T> {
        return {
            exchangeId: exchange,
            error: data
        }
    }

    private async execute<T>(fn: (Connector) => Promise<T>, exchanges: string[]): Promise<Dictionary<ExchangeResolve<T>>> {
        const promises: Promise<ExchangeResolve<T>>[] = [];

        for (let exchange of exchanges) {
            const connector = this.connectors[exchange];

            if (!connector) {
                log.error('No connector for ' + exchange)
            } else {
                promises.push(
                    fn(connector)
                        .then(data => Connectors.resolve(data, exchange))
                        .catch(error => Connectors.reject(error, exchange))
                )
            }
        }

        const result: Dictionary<ExchangeResolve<T>> = {};
        (await Promise.all(promises)).forEach(response => result[response.exchangeId] = response);
        return result;
    }

    async submitSubOrder(exchangeId: string, subOrderId: number, symbol: string, side: Side, amount: BigNumber, price: BigNumber): Promise<SubOrder> {
        const connector = this.connectors[exchangeId];
        if (!connector) throw new Error("Cant find exchange " + exchangeId);
        return connector.submitSubOrder(subOrderId, symbol, side, amount, price);
    }

    async cancelSubOrder(order: SubOrder): Promise<boolean> {
        const connector = this.connectors[order.exchange];
        if (!connector) throw new Error("Cant find exchange " + order.exchange);
        return connector.cancelSubOrder(order);
    }

    async getBalances(): Promise<Dictionary<ExchangeResolve<Balances>>> {
        return this.execute((connector: Connector) => connector.getBalances(), this.exchangesIds);
    }

    async checkSubOrders(subOrders: SubOrder[]): Promise<void> {
        const byExchanges = {};
        for (let subOrder of subOrders) {
            if (!byExchanges[subOrder.exchange]) {
                byExchanges[subOrder.exchange] = [];
            }
            byExchanges[subOrder.exchange].push(subOrder);
        }

        for (let exchange in byExchanges) {
            const connector = this.connectors[exchange];
            await connector.checkSubOrders(byExchanges[exchange]);
        }
    }

    async checkWithdraws(withdraws: Withdraw[]): Promise<ExchangeWithdrawStatus[]> {
        const byExchanges = {};
        for (let withdraw of withdraws) {
            if (!byExchanges[withdraw.exchange]) {
                byExchanges[withdraw.exchange] = [];
            }
            byExchanges[withdraw.exchange].push(withdraw);
        }

        let result = [];
        for (let exchange in byExchanges) {
            const connector = this.connectors[exchange];
            const exchangeResult = await connector.checkWithdraws(byExchanges[exchange]);
            result = result.concat(exchangeResult);
        }
        return result;
    }

    async withdraw(exchange: string, currency: string, amount: BigNumber, address: string): Promise<string | undefined> {
        const connector = this.connectors[exchange];
        if (!connector) throw new Error("Cant find exchange " + exchange);
        return connector.withdraw(currency, amount, address);
    }

    setOnTradeListener(onTrade: (trade: Trade) => void): void {
        this.onTrade = onTrade;
        for (let exchange of this.exchangesIds) {
            const connector = this.connectors[exchange];
            connector.setOnTradeListener(onTrade);
        }
    }
}