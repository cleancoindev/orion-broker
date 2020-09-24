import BigNumber from "bignumber.js";
import {DEFAULT_NUMBER_FORMAT, Dictionary, NumberFormat, Pair} from "./Model";

export const EXCHANGES = ['poloniex', 'bittrex', 'binance', 'bitmax', 'coinex', 'kucoin'];

export const ROUND_DOWN = 1;

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

export function capitalize(s: string): string {
    return s.substr(0, 1).toUpperCase() + s.substr(1).toLowerCase();
}

export function statusToText(status: string): string {
    switch (status.toUpperCase()) {
        case 'NEW':
            return "New";
        case 'PARTIALLY_FILLED':
            return 'Partial';
        case 'FILLED':
            return 'Filled';
        case 'PARTIALLY_CANCELLED':
        case 'CANCELED':
            return 'Canceled';
        default:
            return status;
    }
}

export function convertCurrency(name: string): string {
    switch (name.toUpperCase()) {
        case 'WBTC':
            return 'BTC';
        case 'WETH':
            return 'ETH';
        case 'WXRP':
            return 'XRP';
        default:
            return name.toUpperCase();
    }
}

export function convertCurrency2(name: string): string {
    switch (name.toUpperCase()) {
        case 'BTC':
            return 'WBTC';
        case 'XRP':
            return 'WXRP';
        default:
            return name.toUpperCase();
    }
}

export const stringToNum = (s: string, maxDecimals: number) => {
    const n = s.replace(/,/g, '.').replace(/[^0-9\.]/g, '');
    const arr = n.split('.');
    if (arr.length === 2) {
        return arr[0] + '.' + arr[1].substring(0, maxDecimals);
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

export function formatNumber(n: BigNumber, toFixed = 4): string {
    if (!n) return '0';
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

export function getFullName(currency: string): string {
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
        default:
            return currency;
    }
}

export function getColorIcon(currency: string): string {
    return 'icon-color-' + currency.toLowerCase();
}

export function getExchangeIcon(exchangeName: string): string {
    return 'icon-' + exchangeName.toLowerCase();
}

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

export function httpGet(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onload = function (e) {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    resolve(xhr.responseText);
                } else {
                    reject(xhr.statusText);
                }
            }
        }
        xhr.onerror = function (e) {
            reject(xhr.statusText);
        };
        xhr.send(null);
    })
}

export function httpPost(url: string, data: any): Promise<string> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url, true);
        xhr.setRequestHeader("Content-type", "application/json");
        xhr.onload = function (e) {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    resolve(xhr.responseText);
                } else {
                    reject(xhr.statusText);
                }
            }
        }
        xhr.onerror = function (e) {
            reject(xhr.statusText);
        };
        xhr.send(JSON.stringify(data));
    })
}
