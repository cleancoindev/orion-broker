import {log} from "../log";
import {BrokerHub, BrokerHubRegisterRequest} from "./BrokerHub";
import {Settings} from "../Settings";
import {DbOrder} from "../db/Db";

const Stomp = require('stompjs');
const SockJS = require('sockjs-client');

export class BrokerHubWebsocket implements BrokerHub {
    private settings: Settings;
    private socket: WebSocket;
    private stomp: any; // Stomp.Client

    onCreateOrder: (data: any) => Promise<DbOrder>;

    onCancelOrder: (data: any) => Promise<DbOrder>;

    constructor(settings: Settings) {
        this.settings = settings;
    }

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.stomp) {
                this.disconnect();
            }

            const brokerId = '1';
            const password = 'password is not used by now';

            log.log('Try to connect hub ws', this.settings.orionUrl);

            this.socket = new SockJS(this.settings.orionUrl);
            this.stomp = Stomp.over(this.socket);
            this.stomp.connect(brokerId, password, (frame) => {
                log.log('Connected to hub ws:', frame);

                this.stomp.subscribe('/order', async (data) => {
                    try {
                        const order = await this.onCreateOrder(data);
                        await this.send('order_response', {success: order});
                    } catch (error) {
                        log.error(error);
                        await this.send('order_response', {error: error.message});
                    }
                });

                this.stomp.subscribe('/cancel_order', async (data) => {
                    try {
                        const order = await this.onCancelOrder(data);
                        await this.send('cancel_order_response', {success: order});
                    } catch (error) {
                        log.error(error);
                        await this.send('cancel_order_response', {error: error.message});
                    }
                });

                resolve();
            });
        });
    }

    async disconnect(): Promise<void> {
        if (this.stomp !== null) {
            this.stomp.disconnect();
            this.stomp = null;
        }
        log.log("Disconnected from hub ws");
    }

    private async send(method: string, data: any): Promise<void> {
        try {
            this.stomp.send(method, {}, JSON.stringify(data));
        } catch (e) {
            log.error(e);
        }
    }

    async register(data: BrokerHubRegisterRequest): Promise<void> {
        await this.send('register', data);
    }

    async sendBalances(data: any): Promise<void> {
        await this.send('balance', data);
    }

    async sendTrade(data: any): Promise<void> {
        await this.send('order_status', data);
    }
}


