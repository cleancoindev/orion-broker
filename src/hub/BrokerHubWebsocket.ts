import {log} from "../log";
import {
    BalancesRequest,
    BrokerHub,
    BrokerHubRegisterRequest,
    CancelSubOrder,
    CreateSubOrder,
    SubOrderStatus,
    SubOrderStatusResponse
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

function parseSubOrderStatusResponse(data: any): SubOrderStatusResponse {
    return {
        id: data.id,
        status: Status[data.status]
    }
}

function subOrderToStatus(order: DbSubOrder): SubOrderStatus {
    return {
        id: order.id,
        status: order.status,
    };
}

export class BrokerHubWebsocket implements BrokerHub {
    private settings: Settings;
    private socket: SocketIOClient.Socket;

    onCreateSubOrder: (data: CreateSubOrder) => Promise<DbSubOrder>;

    onCancelSubOrder: (data: CancelSubOrder) => Promise<DbSubOrder>;

    onSubOrderStatusResponse: (data: SubOrderStatusResponse) => Promise<void>;

    constructor(settings: Settings) {
        this.settings = settings;
    }

    async connect(): Promise<void> {
        if (this.socket) {
            await this.disconnect();
        }

        log.log('Try to connect hub ws', this.settings.orionUrl);

        this.socket = io(this.settings.orionUrl, {
            transports: ['websocket'],
        });

        this.socket.on('connect', () => {
            log.log('Connected to hub ws');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from hub ws');
            this.socket = null;
        });

        this.socket.on('register_response', (data: any) => {
            log.log('Register response', data);
        });

        this.socket.on('suborder_status_response', async (data: any) => {
            try {
                log.log('Suborder status response', data);
                await this.onSubOrderStatusResponse(parseSubOrderStatusResponse(data));
            } catch (error) {
                log.error(error);
            }
        });

        this.socket.on('suborder', async (data: any) => {
            log.log('Suborder from ws', data);
            const createdSubOrder = await this.onCreateSubOrder(parseCreateSubOrder(data));
            await this.sendSubOrderStatus(subOrderToStatus(createdSubOrder));
        });

        this.socket.on('cancel_suborder', async (data: any) => {
            log.log('Cancel Suborder from ws', data);
            const cancelledSubOrder = await this.onCancelSubOrder(parseCancelSubOrder(data));
            await this.sendSubOrderStatus(subOrderToStatus(cancelledSubOrder));
        });
    }

    async disconnect(): Promise<void> {
        if (this.socket !== null) {
            this.socket.disconnect();
            this.socket = null;
        }
        log.log("Disconnected from hub ws");
    }

    private async send(method: string, data: any): Promise<void> {
        try {
            this.socket.emit(method, data);
        } catch (e) {
            log.error(e);
        }
    }

    async register(data: BrokerHubRegisterRequest): Promise<void> {
        await this.send('register', data);
    }

    async sendBalances(exchanges: Dictionary<Dictionary<string>>): Promise<void> {
        const data: BalancesRequest = {
            exchanges
        }
        log.log('send balances');
        await this.send('balances', data);
    }

    async sendSubOrderStatus(subOrderStatus: SubOrderStatus): Promise<void> {
        await this.send('suborder_status', subOrderStatus);
    }
}

