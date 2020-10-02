import {Order, OrderType, Side, Status, Trade} from "../Model";
import BigNumber from "bignumber.js";
import {log} from "../log";

const sqlite3 = require('sqlite3')
const fs = require('fs');

export interface DbOrder extends Order {
    exchange: string;
    exchangeOrdId: string;
    ordId: string;
    subOrdId: string;
    symbol: string; // 'BTC-ETH'
    side: Side;
    ordType: OrderType;
    price: BigNumber;
    qty: BigNumber;
    timestamp: number;
    status: Status;
    clientOrdId: string;
    filledQty: BigNumber;
    totalCost: BigNumber;
}

function mapValue(x: any): any {
    if (typeof x === 'number' || typeof x === 'boolean') {
        return x;
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

function parseOrder(row: any): DbOrder {
    return {
        exchange: row.exchange,
        exchangeOrdId: row.exchangeOrdId,
        ordId: row.ordId,
        subOrdId: row.subOrdId,
        symbol: row.symbol,
        side: row.side == 'sell' ? Side.SELL : Side.BUY,
        ordType: OrderType[row.ordType] as OrderType,
        price: new BigNumber(row.price),
        qty: new BigNumber(row.qty),
        timestamp: row.timestamp,
        status: Status[row.status] as Status,
        clientOrdId: row.clientOrdId,
        filledQty: new BigNumber(row.filledQty),
        totalCost: new BigNumber(row.totalCost),
    }
}

function parseTrade(row: any): Trade {
    return {
        exchange: row.exchange,
        exchangeOrdId: row.exchangeOrdId,
        tradeId: row.tradeId,
        price: new BigNumber(row.price),
        qty: new BigNumber(row.qty),
        status: Status[row.status] as Status,
        timestamp: row.timestamp,
    }
}

export class Db {
    private db: any; // sqlite3.Database

    constructor() {
    }

    async init() {
        const databaseExists = fs.existsSync('./broker.db');

        await this.connectToDatabase();

        if (!databaseExists) {
            await this.createTables();
        }
    }

    async connectToDatabase(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database('./broker.db', (err) => {
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
                    reject()
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
                         "id"            INTEGER PRIMARY KEY,
                         "exchange"      VARCHAR(255)   NOT NULL,
                         "exchangeOrdId" VARCHAR(255)   NOT NULL,
                         "tradeId"       VARCHAR(255)   NOT NULL,
                         "price"         DECIMAL(18, 8) NOT NULL,
                         "qty"           DECIMAL(18, 8) NOT NULL,
                         "status"        VARCHAR(255)   NOT NULL,
                         "timestamp"     DATETIME       NOT NULL
                     );`,
                    [],
                    function (err) {
                    }
                );

                this.db.run(
                    `CREATE TABLE "orders"
                     (
                         "id"            INTEGER PRIMARY KEY,
                         "exchange"      VARCHAR(255)   NOT NULL,
                         "exchangeOrdId" VARCHAR(255)   NOT NULL,
                         "ordId"         VARCHAR(255)   NOT NULL,
                         "subOrdId"      VARCHAR(255)   NOT NULL,
                         "symbol"        VARCHAR(255)   NOT NULL,
                         "side"          VARCHAR(255)   NOT NULL,
                         "ordType"       VARCHAR(255)   NOT NULL,
                         "price"         DECIMAL(18, 8) NOT NULL,
                         "qty"           DECIMAL(18, 8) NOT NULL,
                         "timestamp"     DATETIME       NOT NULL,
                         "status"        VARCHAR(255)   NOT NULL,
                         "clientOrdId"   VARCHAR(255)   NOT NULL,
                         "filledQty"     DECIMAL(18, 8) NOT NULL,
                         "totalCost"     DECIMAL(18, 8) NOT NULL
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

    async insertTrade(trade: Trade): Promise<void> {
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
                this.db.run('BEGIN TRANSACTION', [], () => {
                });
                try {
                    await fn();
                } catch (e) {
                    log.error(e);
                    this.db.run('ROLLBACK', [], () => {
                    });
                    reject();
                    return;
                }
                this.db.run('COMMIT', [], () => {
                });
                resolve();
            });
        });
    }

    async insertOrder(order: DbOrder): Promise<void> {
        return new Promise((resolve, reject) => {
            const t = mapObject(order);

            this.db.run(`INSERT INTO orders (${t.fields})
                         VALUES (${t.quests})`, t.values, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    async updateOrder(order: DbOrder): Promise<void> {
        return new Promise((resolve, reject) => {
            const t = mapObject(order);

            this.db.run(`UPDATE orders
                         SET ${t.update}
                         WHERE subOrdId = ?`, t.values.concat([order.subOrdId]), function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async getOrder(exchange: string, exchangeOrdId: string): Promise<DbOrder | undefined> {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM orders WHERE exchange = ? AND exchangeOrdId = ?', [exchange, exchangeOrdId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row ? parseOrder(row) : undefined);
                }
            });
        });
    }

    async getOrderBySubOrdId(subOrdId: string): Promise<DbOrder | undefined> {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM orders WHERE subOrdId = ?', [subOrdId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row ? parseOrder(row) : undefined);
                }
            });
        });
    }

    async getAllOrders(): Promise<DbOrder[]> {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT DISTINCT * FROM orders ORDER BY timestamp', [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(parseOrder));
                }
            });
        });
    }

    async getOrderTrades(exchange: string, exchangeOrdId: string): Promise<Trade[]> {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT DISTINCT * FROM trades WHERE exchange = ? AND exchangeOrdId = ? ORDER BY timestamp', [exchange, exchangeOrdId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(parseTrade));
                }
            });
        });
    }

    async getOpenOrders(): Promise<DbOrder[]> {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT DISTINCT * FROM orders WHERE status = "NEW" OR status = "PARTIALLY_FILLED" ORDER BY timestamp', [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(parseOrder));
                }
            });
        });
    }

    async getOrdersToCheck(): Promise<DbOrder[]> {
        // todo: status != "FILLED" is temporary, to support current stage
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM orders WHERE status != "FILLED_AND_SENT_TO_ORION" AND status != "CANCELED" AND status != "FILLED"', [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(parseOrder));
                }
            });
        });
    }
}
