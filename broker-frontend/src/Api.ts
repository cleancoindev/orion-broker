import {BlockchainOrder, CancelOrderRequest, OrionBlockchain} from "./OrionBlockchain";
import {
    BlockchainInfo, Dictionary,
    parseSwapOrder,
    SwapOrder,
    TradeOrder,
} from "./Model";
import BigNumber from "bignumber.js";

export interface SwapRequest {
    srcAsset: string;
    srcAmount: string;
    dstAsset: string;
    minSrcPrice: string;
    maxDstPrice: string;
    quoteAsset: string;
    address: string;
    orders: BlockchainOrder[];
}

export interface Profits {
    exchange: string;
    benefitBtc: BigNumber;
    benefitPct: BigNumber;
}

function parseProfit(exchange: string, data: any): Profits {
    return {
        exchange,
        benefitBtc: new BigNumber(data.benefitBtc),
        benefitPct: new BigNumber(data.benefitPct),
    }
}

export interface SwapMarketPrice {
    price: BigNumber;
    cost: BigNumber;
}

function parseSwapMarketPrice(data: any): SwapMarketPrice {
    return {
        price: new BigNumber(data.price),
        cost: new BigNumber(data.cost)
    }
}

export interface SwapComplexMarketPrice extends SwapMarketPrice {
    cost: BigNumber;
    price: BigNumber;
    sellSymbol: string;
    priceSell: BigNumber;
    qtySell: BigNumber;
    buySymbol: string;
    priceBuy: BigNumber;
    qtyBuy: BigNumber;
}

export class Api {

    public static blockchainInfo: BlockchainInfo;
    public static orionBlockchain: OrionBlockchain;
    public static onWalletBalanceChange: (newBalances: Dictionary<BigNumber>) => void;

    private static blockchainUrl(): string {
        return process.env.REACT_APP_ORION_BLOCKCHAIN!;
    }

    private static aggregatorUrl(): string {
        if (process.env.REACT_APP_SENTRY_ENVIRONMENT === 'staging') {
            const urlParams = new URLSearchParams(window.location.search);
            const url = urlParams.get('aggregator');
            if (url) {
                return url;
            } else {
                return process.env.REACT_APP_AGGREGATOR!;
            }
        } else {
            return process.env.REACT_APP_AGGREGATOR!;
        }
    }

    private static async blockchainApi(url: string): Promise<any> {
        const mainUrl = Api.blockchainUrl() + '/api' + url;

        try {
            let dataString = await httpGet(mainUrl);
            return JSON.parse(dataString);
        } catch (e) {
            console.error(e);
            throw new Error('HTTP Error');
        }
    }

    private static async aggregatorApi(url: string, request: any, method: string): Promise<any> {
        const mainUrl = Api.aggregatorUrl() + '/api/v1' + url;

        try {
            let dataString: string;

            if (method === 'GET') {
                dataString = await httpGet(mainUrl);
            } else {
                dataString = await httpPost(mainUrl, request, method);
            }

            if (dataString && dataString.length) {
                return JSON.parse(dataString);
            }

        } catch (e) {
            console.error(e);
            if ((typeof e === 'string') && e.match('has no access')) {
                throw new Error('You are not on the whitelist');
            } else {
                throw new Error('HTTP Error');
            }
        }
    }

    static async getPairsList(): Promise<string[]> {
        return Api.aggregatorApi('/pairs/list', {}, 'GET');
    }

    static getExchangeInfo(): Promise<any> {
        return Api.aggregatorApi('/pairs/exchangeInfo', {}, 'GET');
    }

    static async order(order: BlockchainOrder): Promise<void> {
        return await Api.aggregatorApi('/order', order, 'POST');
    }

    static async getBlockchainInfo(): Promise<BlockchainInfo> {
        const data: any = await Api.blockchainApi('/info');
        data.minOrnFee = new BigNumber(data.minOrnFee);
        return data;
    }
}

export function httpGet(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.setRequestHeader('Cache-Control', 'no-store, max-age=0');
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

function httpPost(url: string, data: any, method: string = 'POST'): Promise<string> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.setRequestHeader("Content-type", "application/json");
        xhr.onload = function (e) {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    resolve(xhr.responseText);
                } else {
                    reject(xhr.responseText);
                }
            }
        }
        xhr.onerror = function (e) {
            reject(xhr.statusText);
        };
        xhr.send(JSON.stringify(data));
    })
}
