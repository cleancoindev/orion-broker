import {Status, SubOrder, Trade, Transaction, Withdraw} from "../Model";
import BigNumber from "bignumber.js";
import sqlite3 from "sqlite3";
import {log} from "../log";

import fs from 'fs';

export interface DbSubOrder extends SubOrder {
    filledAmount: BigNumber;
}

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
    for (let field in object) {
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

function parseSubOrder(row: any): DbSubOrder {
    return {
        id: row.id,
        symbol: row.symbol,
        side: row.side,
        price: new BigNumber(row.price),
        amount: new BigNumber(row.amount),
        exchange: row.exchange,
        exchangeOrderId: row.exchangeOrderId,
        timestamp: row.timestamp,
        status: Status[row.status] as Status,
        filledAmount: new BigNumber(row.filledAmount),
        sentToAggregator: row.sentToAggregator == 1
    }
}

function parseTrade(row: any): Trade {
    return {
        exchange: row.exchange,
        exchangeOrderId: row.exchangeOrderId,
        price: new BigNumber(row.price),
        amount: new BigNumber(row.amount),
        timestamp: row.timestamp,
    }
}

function parseWithdraw(row: any): Withdraw {
    return {
        exchangeWithdrawId: row.exchangeWithdrawId,
        exchange: row.exchange,
        currency: row.currency,
        amount: new BigNumber(row.amount),
        status: row.status
    }
}

function parseTransaction(row: any): Transaction {
    return {
        transactionHash: row.transactionHash,
        method: row.method,
        asset: row.asset,
        amount: new BigNumber(row.amount),
        createTime: row.createTime,
        status: row.status
    }
}

export class Db {
    private db: sqlite3.Database;

    constructor(private isInMemory: boolean = false) {
    }

    async init() {
        let databaseExists = false
        if (!this.isInMemory) {
            databaseExists = fs.existsSync('./broker.db');
        }

        await this.connectToDatabase();

        if (!databaseExists) {
            await this.createTables();
        }
    }

    async connectToDatabase(): Promise<void> {
        return new Promise((resolve, reject) => {
            const filename = this.isInMemory ? ':memory:' : './broker.db'
            this.db = new sqlite3.Database(filename, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve()
                }
            });
        });
    }

    async close(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    reject(err)
                } else {
                    resolve();
                }
            });
        });
    }

    async createTables(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run(
                    `CREATE TABLE "trades"
                     (
                         "id"              LONG PRIMARY KEY,
                         "exchange"        VARCHAR(255)   NOT NULL,
                         "exchangeOrderId" VARCHAR(255)   NOT NULL,
                         "price"           DECIMAL(18, 8) NOT NULL,
                         "amount"          DECIMAL(18, 8) NOT NULL,
                         "timestamp"       DATETIME       NOT NULL
                     );`,
                    [],
                    function (err) {
                        if (err) {
                            reject(err)
                        }
                    }
                );

                this.db.run(
                    `CREATE TABLE "transactions"
                     (
                         "transactionHash" VARCHAR(255)   NOT NULL,
                         "method"          VARCHAR(255)   NOT NULL,
                         "asset"           VARCHAR(255)   NOT NULL,
                         "amount"          DECIMAL(18, 8) NOT NULL,
                         "createTime"       DATETIME       NOT NULL,
                         "status"          VARCHAR(255)   NOT NULL
                     );`,
                    [],
                    function (err) {
                        if (err) {
                            reject(err)
                        }
                    }
                );

                this.db.run(
                    `CREATE TABLE "withdraws"
                     (
                         "exchangeWithdrawId" VARCHAR(255)   NOT NULL,
                         "exchange"           VARCHAR(255)   NOT NULL,
                         "currency"           VARCHAR(255)   NOT NULL,
                         "amount"             DECIMAL(18, 8) NOT NULL,
                         "status"             VARCHAR(255)   NOT NULL
                     );`,
                    [],
                    function (err) {
                        if (err) {
                            reject(err)
                        }
                    }
                );

                this.db.run(
                    `CREATE TABLE "subOrders"
                     (
                         "id"               LONG PRIMARY KEY,
                         "symbol"           VARCHAR(255)   NOT NULL,
                         "side"             VARCHAR(255)   NOT NULL,
                         "price"            DECIMAL(18, 8) NOT NULL,
                         "amount"           DECIMAL(18, 8) NOT NULL,
                         "exchange"         VARCHAR(255)   NOT NULL,
                         "exchangeOrderId"  VARCHAR(255)   NULL,
                         "timestamp"        DATETIME       NOT NULL,
                         "status"           VARCHAR(255)   NOT NULL,
                         "filledAmount"     DECIMAL(18, 8) NOT NULL,
                         "sentToAggregator" TINYINT        NOT NULL,
                         UNIQUE ("exchange", "exchangeOrderId")
                     );`,
                    [],
                    function (err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    }
                )
            })
        })
    }

    async insertTrade(trade: Trade): Promise<number> {
        return new Promise((resolve, reject) => {

            const t = mapObject(trade);

            this.db.run(`INSERT INTO trades (${t.fields})
                         VALUES (${t.quests})`, t.values, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    async inTransaction(fn: () => Promise<void>): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.serialize(async () => {
                this.db.run('BEGIN TRANSACTION', [], (err) => {
                    if (err) {
                        log.error(err);
                        reject(err)
                    }
                });

                try {
                    await fn();
                } catch (e) {
                    log.error(e);
                    this.db.run('ROLLBACK', [], () => {
                        reject(e)
                    });
                    return;
                }

                this.db.run('COMMIT', [], (err) => {
                    if (err) {
                        log.error(err);
                        reject(err)
                    } else {
                        resolve()
                    }
                });
            });
        });
    }

    async insertSubOrder(subOrder: DbSubOrder): Promise<number> {
        return new Promise((resolve, reject) => {
            const t = mapObject(subOrder);

            this.db.run(`INSERT INTO subOrders (${t.fields})
                         VALUES (${t.quests})`, t.values, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    async updateSubOrder(subOrder: DbSubOrder): Promise<void> {
        return new Promise((resolve, reject) => {
            const t = mapObject(subOrder);

            this.db.run(`UPDATE subOrders
                         SET ${t.update}
                         WHERE id = ?`, t.values.concat([subOrder.id]), function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async getSubOrder(exchange: string, exchangeOrderId: string): Promise<DbSubOrder | undefined> {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM subOrders WHERE exchange = ? AND exchangeOrderId = ?', [exchange, exchangeOrderId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row ? parseSubOrder(row) : undefined);
                }
            });
        });
    }

    async getSubOrderById(subOrderId: number): Promise<DbSubOrder | undefined> {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM subOrders WHERE id = ?', [subOrderId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row ? parseSubOrder(row) : undefined);
                }
            });
        });
    }

    async getAllSubOrders(): Promise<DbSubOrder[]> {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT DISTINCT * FROM subOrders ORDER BY timestamp', [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(parseSubOrder));
                }
            });
        });
    }

    async getSubOrderTrades(exchange: string, exchangeOrderId: string): Promise<Trade[]> {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT DISTINCT * FROM trades WHERE exchange = ? AND exchangeOrderId = ? ORDER BY timestamp', [exchange, exchangeOrderId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(parseTrade));
                }
            });
        });
    }

    async getOpenSubOrders(): Promise<DbSubOrder[]> {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT DISTINCT * FROM subOrders WHERE status = "ACCEPTED" ORDER BY timestamp', [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(parseSubOrder));
                }
            });
        });
    }

    async getSubOrdersToCheck(): Promise<DbSubOrder[]> {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM subOrders WHERE sentToAggregator = 0', [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(parseSubOrder));
                }
            });
        });
    }

    async getWithdrawsToCheck(): Promise<Withdraw[]> {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM withdraws WHERE status = "pending"', [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(parseWithdraw));
                }
            });
        });
    }

    async insetTransaction(transaction: Transaction): Promise<void> {
        return new Promise((resolve, reject) => {
            const t = mapObject(transaction);

            this.db.run(`INSERT INTO transactions (${t.fields})
                         VALUES (${t.quests})`, t.values, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async updateTransactionStatus(hash: string, status: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(`UPDATE transactions
                         SET status = ?
                         WHERE transactionhash = ?`, [status, hash], function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async getPendingTransactions(): Promise<Transaction[]> {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM transactions WHERE status = "PENDING" ORDER BY createTime', [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(parseTransaction));
                }
            });
        });
    }
}
