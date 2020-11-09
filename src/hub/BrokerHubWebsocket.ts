import {log} from "../log";
import {
    BalancesRequest,
    BrokerHub,
    BrokerHubRegisterRequest,
    CancelSubOrder,
    CreateSubOrder,
    SubOrderStatus,
    SubOrderStatusAccepted
} from "./BrokerHub";
import {Settings} from "../Settings";
import {DbSubOrder} from "../db/Db";
import {Dictionary, Status} from "../Model";
import BigNumber from "bignumber.js";
import io from "socket.io-client";

export function parseCreateSubOrder(request: any): CreateSubOrder {
    return {
        id: request.id,
        side: request.side,
        symbol: request.symbol,
        exchange: request.exchange.toLowerCase(),
        price: new BigNumber(request.price),
        amount: new BigNumber(request.amount),
    }
}

function parseCancelSubOrder(request: any): CancelSubOrder {
    return {
        id: request.id
    }
}

function parseSubOrderStatusAccepted(data: any): SubOrderStatusAccepted {
    return {
        id: data.id,
        status: Status[data.status]
    }
}

function subOrderToStatus(order: DbSubOrder): SubOrderStatus {
    return {
        id: order.id,
        status: order.status,
        filledAmount: order.filledAmount.toString()
    };
}

export class BrokerHubWebsocket implements BrokerHub {
    private settings: Settings;
    private socket: SocketIOClient.Socket;

    onCreateSubOrder: (data: CreateSubOrder) => Promise<DbSubOrder>;

    onCancelSubOrder: (data: CancelSubOrder) => Promise<DbSubOrder>;

    onCheckSubOrder: (id: number) => Promise<SubOrderStatus>;

    onSubOrderStatusAccepted: (data: SubOrderStatusAccepted) => Promise<void>;

    constructor(settings: Settings) {
        this.settings = settings;
    }

    async connect(registerRequest: BrokerHubRegisterRequest): Promise<void> {
        if (this.socket) {
            await this.disconnect();
        }

        log.log('Try to connect to aggregator', this.settings.orionUrl);

        this.socket = io(this.settings.orionUrl, {
            transports: ['websocket'],
        });

        this.socket.on('connect', () => {
            log.log('Connected to aggregator');
            this.register(registerRequest);
        });

        this.socket.on('disconnect', () => {
            log.log('Disconnected from aggregator');
        });

        this.socket.on('register_accepted', (data: any) => {
            log.log('Receive register_accepted', data);
        });

        this.socket.on('suborder_status_accepted', async (data: any) => {
            try {
                log.log('Receive suborder_status_accepted', data);
                await this.onSubOrderStatusAccepted(parseSubOrderStatusAccepted(data));
            } catch (error) {
                log.error(error);
            }
        });

        this.socket.on('suborder', async (data: any) => {
            try {
                log.log('Receive suborder', data);
                const createdSubOrder = await this.onCreateSubOrder(parseCreateSubOrder(data));
                await this.sendSubOrderStatus(subOrderToStatus(createdSubOrder));
            } catch (error) {
                log.error(error);
            }
        });

        this.socket.on('cancel_suborder', async (data: any) => {
            try {
                log.log('Receive cancel_suborder', data);
                const cancelledSubOrder = await this.onCancelSubOrder(parseCancelSubOrder(data));
                await this.sendSubOrderStatus(subOrderToStatus(cancelledSubOrder));
            } catch (error) {
                log.error(error);
            }
        });

        this.socket.on('check_suborder', async (data: any) => {
            try {
                log.log('Receive check_suborder', data);
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
        log.log("Disconnect from aggregator");
    }

    private async send(method: string, data: any): Promise<void> {
        try {
            log.log('Send ' + method);
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
        }
        return this.send('balances', data);
    }

    async sendSubOrderStatus(subOrderStatus: SubOrderStatus): Promise<void> {
        return this.send('suborder_status', subOrderStatus);
    }
}

