import {TradeOrder} from './Model';
import {httpGet} from './Api';

export class BrokerApi {

    private static brokerUrl(): string {
        return (window as any).BROKER_URL;
    }

    private static async brokerApi(url: string): Promise<any> {
        const mainUrl = this.brokerUrl() + url;

        try {
            let dataString = await httpGet(mainUrl);
            return JSON.parse(dataString);
        } catch (e) {
            console.error(e);
            throw new Error('HTTP Error');
        }
    }

    static async getBalances(): Promise<any> {
        return this.brokerApi('/api/balance');
    }

    static async getTradeHistory(): Promise<TradeOrder[]> {
        return this.brokerApi('/api/orderhistory');
    }
}