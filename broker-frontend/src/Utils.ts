import BigNumber from "bignumber.js";
import {DEFAULT_NUMBER_FORMAT, Dictionary, NumberFormat, Pair, Transaction} from "./Model";
import {STATUS_TYPE} from "@orionprotocol/orion-ui-kit";

export const EXCHANGES = ['poloniex', 'bittrex', 'binance', 'bitmax', 'coinex', 'kucoin'];

export function getColorIcon(currency: string): string {
    return 'icon-color-' + currency.toLowerCase();
}

export function getCurrencyFullName(currency: string): string {
    switch (currency) {
        case 'ETH':
            return 'Ethereum';
        case 'BTC':
            return 'Bitcoin';
        case 'XRP':
            return 'Ripple';
        case 'ORN':
            return 'Orion';
        case 'EGLD':
            return 'Elrond';
        case 'LINK':
            return 'Chainlink';
        default:
            return currency;
    }
}

export const CURRENCY_DEFAULT_COLOR: string = '#39ff00';

export function getCurrencyColor(currency: string): string {
    const COLORS: Dictionary<string> = {
        'ETH': '#8800FF',
        'BTC': '#F7931A',
        'XRP': '#F54562',
        'USDT': '#39ff00',
        'ORN': '#00BBFF',
        'LINK': '#ffe700',
    }
    return COLORS[currency] || CURRENCY_DEFAULT_COLOR;
}

export const ROUND_DOWN = BigNumber.ROUND_DOWN;

export const DAY = 1000 * 60 * 60 * 24;

export function getLastMonth(): Date {
    const date = new Date();
    date.setTime(date.getTime() - 30 * DAY);
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
}

export function getTomorrow(): Date {
    const date = new Date();
    date.setTime(date.getTime() + DAY);
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
}

export function getDateTime(date: Date): number {
    if (!date.getTime) return 0; // NOTE: check for invalid date
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date.getTime();
}

export function wait(millis: number): Promise<void> {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve(), millis)
    })
}

export function capitalize(s: string): string {
    return s.substr(0, 1).toUpperCase() + s.substr(1).toLowerCase();
}

export function statusToText(status: string): string {
    if (!status) return 'New';
    switch (status.toUpperCase()) {
        case 'NEW':
            return "New";
        case 'ACCEPTED':
            return "Accepted";
        case 'ROUTED':
            return "Routed";
        case 'PARTIALLY_FILLED':
            return 'Partial';
        case 'FILLED':
            return 'Filled';
        case 'CONFIRMED':
            return 'Confirmed';
        case 'TX_PENDING':
            return 'Tx Pending';
        case 'PARTIALLY_CANCELLED':
            return 'Part. Canceled';
        case 'CANCELED':
            return 'Canceled';
        case 'PARTIALLY_REJECTED':
            return 'Part. Rejected';
        case 'REJECTED':
            return 'Rejected';
        default:
            return status;
    }
}

export const stringToNum = (s: string, maxDecimals: number) => {
    const n = s.replace(/,/g, '.').replace(/[^0-9\.]/g, '');
    const arr = n.split('.');
    if (arr.length === 2) {
        if (maxDecimals === 0) {
            return arr[0];
        } else {
            return arr[0] + '.' + arr[1].substring(0, maxDecimals);
        }
    } else {
        return n;
    }
}

export const stringToPrice = (s: string, pairName: string, numberFormat: Dictionary<NumberFormat>) => {
    const config = getPairNumberFormat(pairName, numberFormat);
    return stringToNum(s, config.pricePrecision);
}

export const stringToAmount = (s: string, pairName: string, numberFormat: Dictionary<NumberFormat>) => {
    const config = getPairNumberFormat(pairName, numberFormat);
    return stringToNum(s, config.qtyPrecision);
}

export const stringToTotal = (s: string, pairName: string, numberFormat: Dictionary<NumberFormat>) => {
    const config = getPairNumberFormat(pairName, numberFormat);
    const min = Math.min(
        config.quoteAssetPrecision,
        config.pricePrecision + config.qtyPrecision
    )
    return stringToNum(s, min);
}

export function getPairNumberFormat(pairName: string, numberFormat: Dictionary<NumberFormat>) {
    return numberFormat[pairName] || numberFormat['ETH-BTC'] || DEFAULT_NUMBER_FORMAT;
}

export function formatPairAmount(n: BigNumber, pairName: string, numberFormat: Dictionary<NumberFormat>): string {
    if (n.isNaN()) return '0';
    const config = getPairNumberFormat(pairName, numberFormat);
    return n.toFixed(config.qtyPrecision, ROUND_DOWN);
}

export function formatPairPrice(n: BigNumber, pairName: string, numberFormat: Dictionary<NumberFormat>): string {
    if (n.isNaN()) return '0';
    const config = getPairNumberFormat(pairName, numberFormat);
    return n.toFixed(config.pricePrecision, ROUND_DOWN);
}

export function formatToCurrency(n: BigNumber, pairName: string, numberFormat: Dictionary<NumberFormat>): string {
    const config = getPairNumberFormat(pairName, numberFormat);
    return n.toFixed(config.quoteAssetPrecision, ROUND_DOWN);
}

export function formatFromCurrency(n: BigNumber, pairName: string, numberFormat: Dictionary<NumberFormat>): string {
    const config = getPairNumberFormat(pairName, numberFormat);
    return n.toFixed(config.baseAssetPrecision, ROUND_DOWN);
}

export function formatPairTotal(n: BigNumber, pairName: string, numberFormat: Dictionary<NumberFormat>): string {
    if (n.isNaN()) return '0';
    const config = getPairNumberFormat(pairName, numberFormat);
    const min = Math.min(
        config.quoteAssetPrecision,
        config.pricePrecision + config.qtyPrecision
    )
    return n.toFixed(min, ROUND_DOWN);
}

export function formatVol(n: BigNumber): string {
    if (n.gte(1000000000)) {
        return n.dividedBy(1000000000).toFixed(2) + 'B';
    } else if (n.gte(1000000)) {
        return n.dividedBy(1000000).toFixed(2) + 'M';
    } else if (n.gte(1000)) {
        return n.dividedBy(1000).toFixed(2) + 'K';
    }
    return n.toFixed(2);
}

export function formatUsd(n: BigNumber): string {
    if (n.gte(1000000000)) {
        return n.dividedBy(1000000000).toFixed(2) + 'B';
    } else if (n.gte(1000000)) {
        return n.dividedBy(1000000).toFixed(2) + 'M';
    }
    return n.toFixed(2);
}

export function formatPercent(n: BigNumber): string {
    return n.toFixed(2);
}

export function formatNumber(n: BigNumber, toFixed = 8): string {
    if (n.eq(0)) return '0'
    if (n.gte(1000000000)) {
        return n.dividedBy(1000000000).toFixed(1) + 'B';
    } else if (n.gte(1000000)) {
        return n.dividedBy(1000000).toFixed(1) + 'M';
    } else if (n.gte(1000)) {
        return n.toFixed(2);
    }
    return n.toFixed(toFixed);
}

export const getStatusIconByString = (status: string | null) => {
    switch (status?.toUpperCase()) {
        case 'DONE':
        case 'FILLED':
            return STATUS_TYPE.FILLED;
        case 'PARTIALLY_FILLED':
            return STATUS_TYPE.PARTIAL;
        case 'CANCELED':
        case 'PARTIALLY_CANCELLED':
        case 'REJECTED':
        case 'PARTIALLY_REJECTED':
            return STATUS_TYPE.CANCELLED;
        default:
            return STATUS_TYPE.NEW;
    }
};

export function getUsdPrice(toCurrency: string, nameToPair: Dictionary<Pair>): BigNumber {
    if (toCurrency === 'USDT') return new BigNumber(1);
    const usdPair = nameToPair[toCurrency + '-USDT'];
    return usdPair ? usdPair.lastPrice : new BigNumber(0);
}

export function getBtcPrice(toCurrency: string, nameToPair: Dictionary<Pair>): BigNumber {
    if (toCurrency === 'BTC') return new BigNumber(1);
    let usdPair = nameToPair[toCurrency + '-BTC'];
    if (usdPair) {
        return usdPair.lastPrice;
    } else {
        usdPair = nameToPair['BTC-' + toCurrency];
        return usdPair ? new BigNumber(1).dividedBy(usdPair.lastPrice) : new BigNumber(0);
    }
}

export const getPendingTransactions = (): Transaction[] => {
    const item = localStorage.getItem('pendingTransactions');
    return item ? JSON.parse(item).map(stringToTransaction) : [];
}

function transactionToString(tx: Transaction): any {
    return {
        type: tx.type,
        date: tx.date,
        token: tx.token,
        amount: tx.amount.toString(),
        status: tx.status,
        transactionHash: tx.transactionHash,
        user: tx.user.toLowerCase(),
    }
}

function stringToTransaction(tx: any): Transaction {
    return {
        type: tx.type,
        date: tx.date,
        token: tx.token,
        amount: new BigNumber(tx.amount),
        status: tx.status,
        transactionHash: tx.transactionHash,
        user: tx.user
    }
}

export const savePendingTransactions = (txs: Transaction[]) => {
    localStorage.setItem('pendingTransactions', JSON.stringify(txs.map(transactionToString)));
}