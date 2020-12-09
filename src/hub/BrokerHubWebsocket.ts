import {log} from '../log';
import {
    BalancesRequest,
    BrokerHub,
    BrokerHubRegisterRequest,
    CreateSubOrder,
    SubOrderStatus,
    SubOrderStatusAccepted
} from './BrokerHub';
import {Settings} from '../Settings';
import {Dictionary, Status} from '../Model';
import BigNumber from 'bignumber.js';
import io from 'socket.io-client';

export function parseCreateSubOrder(request: any): CreateSubOrder {
    return {
        id: request.id,
        side: request.side,
        symbol: request.symbol,
        exchange: request.exchange.toLowerCase(),
        price: new BigNumber(request.price),
        amount: new BigNumber(request.amount),
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

    onCancelSubOrder: (id: number) => Promise<SubOrderStatus>;

    onCheckSubOrder: (id: number) => Promise<SubOrderStatus>;

    onSubOrderStatusAccepted: (data: SubOrderStatusAccepted) => Promise<void>;

    onReconnect: () => void;

    constructor(settings: Settings) {
        this.settings = settings;
    }

    async connect(registerRequest: BrokerHubRegisterRequest): Promise<void> {
        if (this.socket) {
            await this.disconnect();
        }

        log.log('Try to connect to aggregator', this.settings.orionAggregatorUrl);

        this.socket = io(this.settings.orionAggregatorUrl, {
            path: '/broker',
            transports: ['websocket'],
        });

        this.socket.on('error', (error: any) => { // Fired upon a connection error.
            log.error('Ws error', error);
        });

        this.socket.on('reconnect', (attempt: number) => { // Fired upon an attempt to reconnect.
            log.log('Ws reconnect', attempt);
        });

        this.socket.on('reconnect_attempt', (attempt: number) => { // Fired upon an attempt to reconnect.
            log.log('Ws reconnect attempt', attempt);
        });

        this.socket.on('reconnect_error', (error: any) => { // Fired upon a reconnection attempt error.
            log.error('Ws reconnect error', error);
        });

        this.socket.on('reconnect_failed', (error: any) => { // Fired when couldn’t reconnect within reconnectionAttempts.
            log.error('Ws reconnect failed', error);
        });

        this.socket.on('connect', () => {
            log.log('Connected to aggregator');
            this.register(registerRequest);
        });

        this.socket.on('disconnect', (reason: string) => {
            log.log('Disconnected from aggregator, reason "' + reason + '"');
            if (reason === 'io server disconnect') { // The server has forcefully disconnected the socket with socket.disconnect()
                clearTimeout(this.globalReconnectTimeoutId);

                this.globalReconnectTimeoutId = setTimeout(() => {
                    this.onReconnect();
                }, 1000);
            }
        });

        this.socket.on('register_accepted', (data: any) => {
            log.log('Receive register_accepted', data);
        });

        this.socket.on('suborder_status_accepted', async (data: any) => {
            try {
                log.log('Receive suborder_status_accepted', data);
                const request = parseSubOrderStatusAccepted(data);
                log.log('Received suborder_status_accepted after parse', request);
                await this.onSubOrderStatusAccepted(request);
            } catch (error) {
                log.error(error);
            }
        });

        this.socket.on('suborder', async (data: any) => {
            try {
                log.log('Receive suborder', data);
                const request = parseCreateSubOrder(data);
                log.log('Received suborder after parse', request);
                const subOrderStatus = await this.onCreateSubOrder(request);
                await this.sendSubOrderStatus(subOrderStatus);
            } catch (error) {
                log.error(error);
            }
        });

        this.socket.on('cancel_suborder', async (data: any) => {
            try {
                log.log('Receive cancel_suborder', data);
                const subOrderId = data.id;
                log.log('Received cancel_suborder after parse', subOrderId);
                const subOrderStatus = await this.onCancelSubOrder(subOrderId);
                await this.sendSubOrderStatus(subOrderStatus);
            } catch (error) {
                log.error(error);
            }
        });

        this.socket.on('check_suborder', async (data: any) => {
            try {
                log.log('Receive check_suborder', data);
                const subOrderId = data.id;
                log.log('Received check_suborder after parse', subOrderId);
                const subOrderStatus = await this.onCheckSubOrder(data.id);
                await this.sendSubOrderStatus(subOrderStatus);
            } catch (error) {
                log.error(error);
            }
        });
    }

    async disconnect(): Promise<void> {
        if (this.socket !== null) {
            try {
                this.socket.disconnect();
            } catch (e) {
                log.error(e);
            }
            this.socket = null;
        }
        log.log('Disconnect from aggregator');
    }

    private async send(method: string, data: any): Promise<void> {
        try {
            log.log('Send ' + method, data);
            this.socket.emit(method, data);
        } catch (e) {
            log.error(e);
        }
    }

    private async register(data: BrokerHubRegisterRequest): Promise<void> {
        return this.send('register', data);
    }

    async sendBalances(exchanges: Dictionary<Dictionary<string>>): Promise<void> {
        const data: BalancesRequest = {
            exchanges: JSON.stringify(exchanges)
        };
        return this.send('balances', data);
    }

    async sendSubOrderStatus(subOrderStatus: SubOrderStatus): Promise<void> {
        return this.send('suborder_status', subOrderStatus);
    }
}

