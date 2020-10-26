import {log} from "../log";
import {
    BalancesRequest,
    BrokerHub,
    BrokerHubRegisterRequest,
    CancelOrderRequest,
    CreateOrderRequest,
    OrderStatusResponse,
    TradeRequest
} from "./BrokerHub";
import {Settings} from "../Settings";
import {DbOrder} from "../db/Db";
import {Dictionary, OrderType, Side, Status} from "../Model";
import BigNumber from "bignumber.js";
import Stomp, {Message} from 'stompjs';
import SockJS from 'sockjs-client';
import jsrsasign from 'jsrsasign';
import fetch from "node-fetch";
import Signature = jsrsasign.KJUR.crypto.Signature;
import ECDSA = jsrsasign.KJUR.crypto.ECDSA;
import {privateToPublic} from 'ethereumjs-util';

const X_RESPONSE_STATUS_NOT_FINAL = 10;
const X_RESPONSE_STATUS_FINAL = 20;
const X_RESPONSE_STATUS_NOT_FATAL_ERROR = 30;
const X_RESPONSE_STATUS_FATAL_ERROR = 40;

const BROKER_ID = '0x69ae0b74d23a741a25a6e997de6418f374a0cf4d';

function parseCreateOrderRequest(request: any): CreateOrderRequest {
    return {
        subOrdId: request.subOrderId,
        ordId: request.orderId,
        clientOrdId: request.clientOrderId,
        symbol: request.symbol,
        side: request.side.toLowerCase() == 'sell' ? Side.SELL : Side.BUY,
        price: new BigNumber(request.price),
        exchange: request.exchange,
        subOrdQty: new BigNumber(request.ordQty),
        ordType: request.ordType ? (OrderType[request.ordType] as OrderType) : OrderType.LIMIT,
    }
}

function parseCancelOrderRequest(request: any): CancelOrderRequest {
    return {
        subOrdId: request.subOrderId
    }
}

function parseOrderStatusResponse(data: any): OrderStatusResponse {
    return {
        subOrdId: data.subOrderId,
        status: Status[data.status]
    }
}

function orderToTradeRequest(order: DbOrder): TradeRequest {
    return {
        id: 'undefined',
        tradeId: 'undefined',
        subOrdId: order.subOrdId,
        clientOrdId: order.clientOrdId,
        status: order.status,
        ordId: order.ordId,
        timestamp: order.timestamp
    };
}

export class BrokerHubWebsocket implements BrokerHub {
    private settings: Settings;
    private socket: WebSocket;
    private stomp: Stomp.Client;
    private keyPair: ECDSA;

    onCreateOrder: (data: CreateOrderRequest) => Promise<DbOrder>;

    onCancelOrder: (data: CancelOrderRequest) => Promise<DbOrder>;

    onOrderStatusResponse: (data: OrderStatusResponse) => Promise<void>;

    constructor(settings: Settings) {
        this.settings = settings;
    }

    private sign(data: any): string {
        const sig = new Signature({alg: 'SHA1withECDSA'});
        sig.init(this.keyPair);
        const json = typeof data === 'string' ? data : JSON.stringify(data, Object.keys(data).sort());
        sig.updateString(json);
        return sig.sign();
    }

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.stomp) {
                this.disconnect();
            }

            const brokerId = BROKER_ID;
            const bufferKey = Buffer.from(this.settings.privateKey.substr(2), "hex");
            this.keyPair = new ECDSA();
            this.keyPair.setPublicKeyHex(privateToPublic(bufferKey).toString('hex'));
            this.keyPair.setPrivateKeyHex(this.settings.privateKey);

            fetch(this.settings.orionUrl + '/broker-hub/auth/broker/' + brokerId, {method: 'POST'}).then(async authResponse => {
                const authPayload = await authResponse.text();
                log.log('authPayload=' + authPayload);
                const sign = this.sign(authPayload);
                log.log('sign=' + sign);
                log.log('Try to connect hub ws', this.settings.orionUrl + '/ws');

                this.socket = new SockJS(this.settings.orionUrl + '/ws');
                this.stomp = Stomp.over(this.socket);
                this.stomp.connect(
                    {
                        'x-broker-id': brokerId,
                        'x-auth-payload': authPayload,
                        'x-sign': sign
                    },
                    (frame) => {
                        log.log('Connected to hub ws:', frame);

                        this.stomp.subscribe('/broker/register_response', async (data: Message) => {
                            log.log('Register response', data.body);
                        });

                        this.stomp.subscribe('/broker/trade', async (data: Message) => {
                            try {
                                log.log('Order status response', data.body);
                                await this.onOrderStatusResponse(parseOrderStatusResponse(JSON.parse(data.body)));
                            } catch (error) {
                                log.error(error);
                            }
                        });

                        this.stomp.subscribe('/broker/suborder', async (message: Message) => {
                            let body: any;

                            try {
                                log.log('Suborder from ws', message.body);

                                const actionHeader = message.headers['x-action'];
                                body = JSON.parse(message.body);

                                switch (actionHeader) {
                                    case 'execute':
                                        const createdOrder = await this.onCreateOrder(parseCreateOrderRequest(body));
                                        await this.sendTrade(orderToTradeRequest(createdOrder));
                                        break;
                                    case 'cancel':
                                        const cancelledOrder = await this.onCancelOrder(parseCancelOrderRequest(body));
                                        await this.sendTrade(orderToTradeRequest(cancelledOrder));
                                        break;
                                    default:
                                        throw new Error('Unknown suborder header ' + actionHeader);
                                }
                            } catch (error) {
                                log.error(error);
                                await this.send('/broker/suborder', {'x-response-status': X_RESPONSE_STATUS_NOT_FATAL_ERROR}, {
                                    subOrderId: body ? body.subOrderId : 0,
                                    error: error.message
                                });
                            }
                        });

                        resolve();
                    },
                    error => {
                        log.error(error);
                    }
                );
            });
        });
    }

    async disconnect(): Promise<void> {
        if (this.stomp !== null) {
            this.stomp.disconnect(() => {
            });
            this.stomp = null;
        }
        log.log("Disconnected from hub ws");
    }

    private async send(method: string, headers: {}, data: any): Promise<void> {
        try {
            headers['x-sign'] = this.sign(data);
            headers['x-broker-id'] = BROKER_ID;
            this.stomp.send(method, headers, JSON.stringify(data));
        } catch (e) {
            log.error(e);
        }
    }

    async register(data: BrokerHubRegisterRequest): Promise<void> {
        await this.send('/broker/register', {}, data);
    }

    async sendBalances(address: string, exchanges: Dictionary<Dictionary<string>>): Promise<void> {
        const data: BalancesRequest = {
            exchanges
        }
        log.log('send balances');
        await this.send('/broker-hub/balance', {'x-action': 'update'}, data);
    }

    async sendTrade(tradeRequest: TradeRequest): Promise<void> {
        const status = tradeRequest.blockchainOrder ? X_RESPONSE_STATUS_FINAL : X_RESPONSE_STATUS_NOT_FINAL;
        await this.send('/broker-hub/trade', {'x-response-status': status}, tradeRequest);
    }
}

