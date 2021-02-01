import {Status, SubOrder, Trade, Transaction, Withdraw} from '../Model';
import BigNumber from 'bignumber.js';
import sqlite3 from 'sqlite3';
import {log} from '../log';
import {createConnection, Connection, Repository, In, EntityManager} from 'typeorm';

import fs from 'fs';

function mapValue(x: any): any {
    if (typeof x === 'number') {
        return x;
    } else if (typeof x === 'boolean') {
        return x ? 1 : 0;
    } else {
        return x.toString();
    }
}

function mapObject(object: any) {
    const fields: string[] = [];
    const values: any[] = [];
    for (const field in object) {
        if (object.hasOwnProperty(field)) {
            fields.push(field);
            const value = mapValue(object[field]);
            values.push(value);
        }
    }
    const quests = fields.map(f => '?');
    const update = fields.map(f => f + '=?');
    return {fields: fields.join(','), quests: quests.join(','), values: values, update: update.join(',')};
}

export class Db {
    // private db: sqlite3.Database;
    private db: Connection;

    constructor(private isInMemory: boolean = false) {
    }

    async init() {
        let databaseExists = false;
        if (!this.isInMemory) {
            databaseExists = fs.existsSync('./data/broker.db');
        }

        await this.connectToDatabase();

        if (!databaseExists) {
            await this.createTables();
        }
    }

    async connectToDatabase(): Promise<void> {
        this.db = await createConnection({
            migrationsRun: true,
            type: 'sqlite',
            database: './data/broker.db',
            migrations: [
                'src/migration/**/*.ts'
            ],
            entities: [SubOrder, Trade],
            synchronize: false,
            logging: false,
        });

    }

    async close(): Promise<void> {
        return this.db.close();
    }

    async createTables(): Promise<void> {
        return this.db.synchronize();
    }

    getRepository(T): Repository<any> {
        return this.db.getRepository(T);
    }

    async insertTrade(trade: Trade): Promise<number> {
        const {id} = await this.db.getRepository(Trade).create(trade);
        return id;
    }

    async inTransaction(fn: () => Promise<void>): Promise<void> {
        return new Promise((resolve, reject) => {
            const qr = this.db.createQueryRunner();
            qr.startTransaction().then(async () => {
                try {
                    await fn();
                } catch (e) {
                    log.error(e);
                    qr.rollbackTransaction().then().catch((err) => {
                        reject(err);
                    });
                    return;
                }
                await qr.commitTransaction();
            })
                .catch((err) => reject(err));
        });
    }

    async getTransactionManager(): Promise<EntityManager> {
        return new Promise((resolve, reject) => {
            try {
                this.db.transaction(async entityManager => {
                    resolve(entityManager);
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    async insertSubOrder(subOrder: SubOrder): Promise<number> {
        const {id} = await this.db.getRepository(SubOrder).create(subOrder);
        return id;
    }

    async updateSubOrder(subOrder: SubOrder): Promise<SubOrder> {
        return this.db.getRepository(SubOrder).save(subOrder);
    }

    async getSubOrder(exchange: string, exchangeOrderId: string): Promise<SubOrder | undefined> {
        const
            where = {exchange, exchangeOrderId},
            relations = ['order', 'order.trades'],
            [trade]: Trade[] = await this.db.getRepository(Trade).find({where, relations})
        ;
        return trade ? trade.order : undefined;
    }

    async getSubOrderById(subOrderId: number): Promise<SubOrder | undefined> {
        return this.db.getRepository(SubOrder).findOne({id: subOrderId}, {relations: ['trades']});
    }

    async getAllSubOrders(): Promise<SubOrder[]> {
        return this.db.getRepository(SubOrder).find();
    }

    async getSubOrderTrades(exchange: string, exchangeOrderId: string): Promise<Trade[]> {
        return this.db.getRepository(Trade).find();
    }

    async getOpenSubOrders(): Promise<SubOrder[]> {
        return this.db.getRepository(SubOrder).find({
            where: {
                status: In(['ACCEPTED'])
            },
            order: {
                'timestamp': 'ASC'
            }
        });
    }

    async getSubOrdersToResend(): Promise<SubOrder[]> {
        return this.db.getRepository(SubOrder).find({
            where: {
                sentToAggregator: false,
                status: In(['FILLED', 'CANCELED', 'REJECTED'])
            },
        });
    }

    async getSubOrdersToCheck(): Promise<SubOrder[]> {
        return this.db.getRepository(SubOrder).find({
            where: {
                status: In(['ACCEPTED'])
            }
        });
    }

    async getTradesToCheck(): Promise<Trade[]> {
        return this.db.getRepository(Trade).find({
            where: {
                status: 'pending'
            }
        });
    }

    async getWithdrawsToCheck(assetName?: string): Promise<Withdraw[]> {
        return this.db.getRepository(Withdraw).find({
            where: {
                status: 'pending',
                ...assetName ? {currency: assetName} : null
            }
        });
    }

    async insertWithdraw(withdraw: Withdraw): Promise<void> {
        await this.db.getRepository(Withdraw).save(withdraw);
    }

    async updateWithdrawStatus(exchangeWithdrawId: string, status: string): Promise<void> {
        await this.db.getRepository(Withdraw).update({exchangeWithdrawId}, {
            status: status as 'pending' | 'ok' | 'failed' | 'canceled'
        });
    }

    async insetTransaction(transaction: Transaction): Promise<void> {
        await this.db.getRepository(Transaction).save(transaction);
    }

    async updateTransactionStatus(hash: string, status: string): Promise<void> {
        await this.db.getRepository(Transaction).update({transactionHash: hash}, {
            status: status as 'PENDING' | 'OK' | 'FAIL'
        });
    }

    async getPendingTransactions(assetName?: string): Promise<Transaction[]> {
        return this.db.getRepository(Transaction).find({
            where: {
                status: 'PENDING',
                ...assetName ? {asset: assetName} : null
            }
        });
    }
}
