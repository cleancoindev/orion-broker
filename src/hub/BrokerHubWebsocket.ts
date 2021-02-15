import {log} from '../log';
import {
    BalancesRequest,
    BrokerHub,
    BrokerHubRegisterRequest,
    CreateSubOrder,
    SubOrderStatus,
    SubOrderStatusAccepted,
    isSwapOrder
} from './BrokerHub';
import {Settings} from '../Settings';
import {Dictionary, Status, OrderType} from '../Model';
import BigNumber from 'bignumber.js';
import io from 'socket.io-client';

export function parseCreateSubOrder(request: any): CreateSubOrder {
    return {
        id: request.id,
        side: request.hasOwnProperty('sellPrice') ? 'sell' : 'buy',
        symbol: request.symbol, //TODO: pair to symbol
        pair: request.pair,
        exchange: request.exchange.toLowerCase(),
        price: new BigNumber(request.price),
        amount: new BigNumber(request.amount),
        ...isSwapOrder(request) ? {
            sellPrice: new BigNumber(request.sellPrice),
            buyPrice: new BigNumber(request.buyPrice),
            currentDev: new BigNumber(request.currentDev),
            orderType: OrderType.SWAP
        } : {orderType: OrderType.SUB}
    };
}

function parseSubOrderStatusAccepted(data: any): SubOrderStatusAccepted {
    return {
        id: data.id,
        status: Status[data.status]
    };
}

export class BrokerHubWebsocket implements BrokerHub {
    private settings: Settings;
    private socket: SocketIOClient.Socket;
    private globalReconnectTimeoutId: NodeJS.Timeout;

    onCreateSubOrder: (data: CreateSubOrder) => Promise<SubOrderStatus>;

    onCancelSubOrder: (id: number) => Promise<SubOrderStatus | null>;

    onCheckSubOrder: (id: number) => Promise<SubOrderStatus>;

    onSubOrderStatusAccepted: (data: SubOrderStatusAccepted) => Promise<void>;

    onReconnect: () => void;

    private lastBalancesJson = '{}';

    getLastBalancesJson(): string {
        return this.lastBalancesJson;
    }

    constructor(settings: Settings) {
        this.settings = settings;
    }

    async connect(registerRequest: BrokerHubRegisterRequest): Promise<void> {
        if (this.socket) {
            await this.disconnect();
        }

        log.log('Try to connect to aggregator ' + this.settings.orionAggregatorUrl);

        this.socket = io(this.settings.orionAggregatorUrl, {
            path: this.settings.orionAggregatorPath,
            transports: ['websocket'],
        });

        this.socket.on('error', (error: any) => { // Fired upon a connection error.
            log.error('Connection error:', error);
        });

        this.socket.on('reconnect', (attempt: number) => { // Fired upon an attempt to reconnect.
            log.log('Reconnect #' + attempt);
        });

        this.socket.on('reconnect_attempt', (attempt: number) => { // Fired upon an attempt to reconnect.
            log.log('Reconnect attempt #' + attempt);
        });

        this.socket.on('reconnect_error', (error: any) => { // Fired upon a reconnection attempt error.
            log.error('Reconnect error:', error);
        });

        this.socket.on('reconnect_failed', (error: any) => { // Fired when couldn’t reconnect within reconnectionAttempts.
            log.error('Reconnect failed:', error);
        });

        this.socket.on('connect', () => {
            log.log('Connected to aggregator');
            this.register(registerRequest);
        });

        this.socket.on('disconnect', (reason: string) => {
            log.log('Disconnected from aggregator by reason "' + reason + '"');
            if (reason === 'io server disconnect') { // The server has forcefully disconnected the socket with socket.disconnect()
                clearTimeout(this.globalReconnectTimeoutId);

                this.globalReconnectTimeoutId = setTimeout(() => {
                    this.onReconnect();
                }, 1000);
            }
        });

        this.socket.on('register_accepted', (data: any) => {
            log.log('Registered in the aggregator');
            log.debug('Receive register_accepted', data);
            this.lastBalancesJson = '{}';
        });

        this.socket.on('suborder_status_accepted', async (data: any) => {
            try {
                log.debug('Receive suborder_status_accepted', data);
                const request = parseSubOrderStatusAccepted(data);
                log.debug('Received suborder_status_accepted after parse', request);
                await this.onSubOrderStatusAccepted(request);
            } catch (error) {
                log.error('Status accepted error:', error);
            }
        });

        this.socket.on('suborder', async (data: any) => {
            try {
                log.debug('Receive suborder', data);
                const request = parseCreateSubOrder(data);

                if( request.currentDev && request.currentDev.lt(0))
                    return log.debug('Order with negative dev: ', request);

                log.debug('Received suborder after parse', request);
                log.log('Receive suborder ' + request.id + ' ' + request.side + ' ' + request.amount + ' ' + request.pair + ' on ' + request.exchange);
                const subOrderStatus = await this.onCreateSubOrder(request);
                await this.sendSubOrderStatus(subOrderStatus);
            } catch (error) {
                log.error('Create suborder error:', error);
            }
        });

        this.socket.on('cancel_suborder', async (data: any) => {
            try {
                log.debug('Receive cancel_suborder', data);
                const subOrderId = data.id;
                log.debug('Received cancel_suborder after parse', subOrderId);
                log.log('Receive cancel suborder ' + subOrderId);
                const subOrderStatus = await this.onCancelSubOrder(subOrderId);
                if (subOrderStatus) {
                    await this.sendSubOrderStatus(subOrderStatus);
                }
            } catch (error) {
                log.error('Cancel suborder error:', error);
            }
        });

        this.socket.on('check_suborder', async (data: any) => {
            try {
                log.debug('Receive check_suborder', data);
                const subOrderId = data.id;
                log.debug('Received check_suborder after parse', subOrderId);
                const subOrderStatus = await this.onCheckSubOrder(data.id);
                await this.sendSubOrderStatus(subOrderStatus);
            } catch (error) {
                log.error('Check suborder error:', error);
            }
        });
    }

    async disconnect(): Promise<void> {
        if (this.socket !== null) {
            try {
                this.socket.disconnect();
            } catch (e) {
                log.error('Error when disconnect:', e);
            }
            this.socket = null;
        }
        log.log('Disconnect from aggregator');
    }

    private async send(method: string, data: any): Promise<boolean> {
        try {
            log.debug('Send ' + method, data);
            this.socket.emit(method, data);
            return true;
        } catch (e) {
            log.error('Send message error:', e);
            return false;
        }
    }

    private async register(data: BrokerHubRegisterRequest): Promise<void> {
        await this.send('register', data);
    }

    async sendBalances(exchanges: Dictionary<Dictionary<string>>): Promise<void> {
        const json = JSON.stringify(exchanges);
        const data: BalancesRequest = {
            exchanges: json
        };
        log.log('Send balances');
        if (await this.send('balances', data)) {
            this.lastBalancesJson = json;
        }
    }

    async sendSubOrderStatus(subOrderStatus: SubOrderStatus): Promise<void> {
        await this.send('suborder_status', subOrderStatus);
    }
}

