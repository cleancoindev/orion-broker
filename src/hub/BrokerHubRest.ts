import {
    BrokerHub,
    BrokerHubRegisterRequest,
    CancelOrderRequest,
    CreateOrderRequest,
    OrderStatusResponse,
    TradeRequest
} from "./BrokerHub";
import {log} from "../log";
import {Settings} from "../Settings";
import {DbOrder} from "../db/Db";
import {Dictionary, OrderType, Side} from "../Model";
import BigNumber from "bignumber.js";

import fetch from "node-fetch";
import {Express} from "express";

export function parseCreateOrderRequest(request: any): CreateOrderRequest {
    return {
        side: request.side == 'sell' ? Side.SELL : Side.BUY,
        symbol: request.symbol,
        exchange: request.exchange,
        ordType: request.ordType ? (OrderType[request.ordType] as OrderType) : OrderType.LIMIT,
        price: new BigNumber(request.price),
        subOrdQty: new BigNumber(request.subOrdQty),
        ordId: request.ordId,
        subOrdId: request.subOrdId,
        clientOrdId: request.clientOrdId || '',
    }
}

function parseCancelOrderRequest(request: any): CancelOrderRequest {
    return {
        subOrdId: request.subOrdId
    }
}

/**
 * @deprecated use BrokerHubWebsocket
 */
export class BrokerHubRest implements BrokerHub {
    private settings: Settings;

    onCreateOrder: (data: CreateOrderRequest) => Promise<DbOrder>;

    onCancelOrder: (data: CancelOrderRequest) => Promise<DbOrder>;

    onOrderStatusResponse: (data: OrderStatusResponse) => Promise<void>;

    constructor(settings: Settings, app: Express) {
        this.settings = settings;

        app.post('/api/order', async (req, res) => {
            try {
                log.log('/api/order receive ', JSON.stringify(req.body));
                const request = parseCreateOrderRequest(req.body);
                const order = await this.onCreateOrder(request);
                res.send(order);
            } catch (error) {
                log.error(error);
                res.status(400);
                res.send({code: 1000, msg: error.message});
            }
        });

        app.delete('/api/order', async (req, res) => {
            try {
                log.log('DELETE /api/order receive ', JSON.stringify(req.body));
                const order = await this.onCancelOrder(parseCancelOrderRequest(req.body));
                res.send(order);
            } catch (error) {
                log.error(error);
                res.status(400);
                res.send({code: 1000, msg: error.message});
            }
        });
    }

    async connect(): Promise<void> {

    }

    async disconnect(): Promise<void> {

    }

    private send(url: string, data: any): Promise<any> {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        const body = JSON.stringify(data);

        return fetch(url, {method: 'POST', body, headers})
            .then(response => response.json());
    }

    async register(data: BrokerHubRegisterRequest): Promise<void> {
        (data as any).callbackUrl = this.settings.callbackUrl + '/api';

        return this.send(this.settings.orionUrl + '/register', data)
            .then((result) => {
                if (result.status === 'REGISTERED') {
                    log.log('Broker has been registered with id: ', result.broker);
                } else {
                    log.log("Broker connected:", JSON.stringify(result));
                }
            })
            .catch((error) => {
                log.log('Error on broker/register: ', error.message);
            });
    }

    async sendBalances(address: string, exchanges: Dictionary<Dictionary<string>>): Promise<void> {
        (exchanges as any).address = address;

        return this.send(this.settings.orionUrl + '/balance', exchanges)
            .catch((error) => {
                log.error('Error on broker/balance: ', error.message);
            });
    }

    async sendTrade(tradeRequest: TradeRequest): Promise<void> {
        log.log('Sending Trade', JSON.stringify(tradeRequest));

        return this.send(this.settings.orionBlockchainUrl + '/trade', tradeRequest)
            .then((response) => {
                log.log('Sending Trade Response', JSON.stringify(response));
                return this.onOrderStatusResponse({subOrdId: tradeRequest.subOrdId, status: tradeRequest.status});
            })
            .catch((error) => {
                log.log('Sending Trade Error', JSON.stringify(error));
                throw error;
            });
    }
}