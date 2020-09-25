import {BrokerHub, BrokerHubRegisterRequest} from "./BrokerHub";
import {log} from "../log";
import {Settings} from "../Settings";
import {DbOrder} from "../db/Db";

const fetch = require("node-fetch");

export class BrokerHubRest implements BrokerHub {
    private settings: Settings;

    onCreateOrder: (data: any) => Promise<DbOrder>;

    onCancelOrder: (data: any) => Promise<DbOrder>;

    constructor(settings: Settings, app: any /* express app */) {
        this.settings = settings;

        app.post('/api/order', async (req, res) => {
            try {
                const order = await this.onCreateOrder(req.body);
                res.send(order);
            } catch (error) {
                log.error(error);
                res.status(400);
                res.send({code: 1000, msg: error.message});
            }
        });

        app.delete('/api/order', async (req, res) => {
            try {
                const order = await this.onCancelOrder(req.body);
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
            .then(response => {
                log.log('Raw response ', response);
                return response.json();
            });
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

    async sendBalances(data: any): Promise<void> {
        return this.send(this.settings.orionUrl + '/balance', data)
            .catch((error) => {
                log.error('Error on broker/balance: ', error.message);
            });
    }

    async sendTrade(data: any): Promise<void> {
        log.log('Sending Trade', JSON.stringify(data));

        return this.send(this.settings.orionBlockchainUrl + '/trade', data)
            .then((response) => {
                log.log('Sending Trade Response', JSON.stringify(response));
                if (!response.ok) {
                    throw Error(response.statusText);
                }
                return response;
            })
            .catch((error) => {
                log.log('Sending Trade Error', JSON.stringify(error));
                throw error;
            });
    }
}