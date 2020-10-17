import {Db, DbOrder} from "../src/db/Db";
import {OrderType, Side, Status, Trade} from "../src/Model";
import BigNumber from "bignumber.js";
import {v1 as uuid} from "uuid";

export async function createTestDatabase(): Promise<Db> {
    const db = new Db(true);
    await expect(db.init()).resolves.toBeUndefined()
    return db
}

const dbOrder: DbOrder = {
    exchange: "bittrex",
    exchangeOrdId: '1',
    ordId: "1",
    subOrdId: "1",
    symbol: "ETH-BTC",
    side: Side.BUY,
    ordType: OrderType.LIMIT,
    price: new BigNumber(100),
    qty: new BigNumber(1),
    timestamp: Date.now(),
    status: Status.PREPARE,
    clientOrdId: "1",
    filledQty: new BigNumber(0),
    totalCost: new BigNumber(0),
};

test("orders", async () => {
    const db = await createTestDatabase()

    await expect(db.getAllOrders()).resolves.toEqual([]);
    await expect(db.insertOrder(dbOrder)).resolves.toBe(1)
    await expect(db.getAllOrders()).resolves.toEqual([dbOrder]);

    let otherOrder = Object.assign({}, dbOrder)
    otherOrder.symbol = "BTC-ETH";

    await expect(db.updateOrder(otherOrder)).resolves.toBeUndefined();
    await expect(db.getAllOrders()).resolves.toEqual([otherOrder]);

    // Unique test
    await expect(db.insertOrder(dbOrder)).rejects.toThrowError()

    // Same exchangeOrdId but on different exchange
    otherOrder = Object.assign({}, dbOrder)
    otherOrder.ordId = "2"
    otherOrder.subOrdId = "2"
    otherOrder.clientOrdId = "2"
    otherOrder.exchange = "poloniex"
    otherOrder.exchangeOrdId = "1"
    await expect(db.insertOrder(otherOrder)).resolves.toBe(2)

    await expect(db.close()).resolves.toBeUndefined()
});

test("recreating tables", async () => {
    const db = await createTestDatabase()

    await expect(db.createTables()).rejects.toThrowError()

    await expect(db.close()).resolves.toBeUndefined()
})

test("get order", async () => {
    const db = await createTestDatabase()

    await expect(db.insertOrder(dbOrder)).resolves.toBe(1)
    await expect(db.getOrder(dbOrder.exchange, dbOrder.exchangeOrdId)).resolves.toEqual(dbOrder)
    await expect(db.getOrder("something", dbOrder.exchangeOrdId)).resolves.toBeUndefined()

    await expect(db.close()).resolves.toBeUndefined()
})

test("in transaction", async () => {
    const db = await createTestDatabase()

    await expect(db.inTransaction(async () => {
        await db.insertOrder(dbOrder)
    })).resolves.toBeUndefined()

    await expect(db.inTransaction(async () => {
        await expect(db.close()).resolves.toBeUndefined()
    })).rejects.toThrowError()

    // Already closed
    await expect(db.close()).rejects.toThrowError()
})

test("trades", async () => {
    const db = await createTestDatabase()

    const trade: Trade = {
        exchange: 'bittrex',
        exchangeOrdId: '123',
        tradeId: uuid().toString(),
        price: new BigNumber(100.500),
        qty: new BigNumber(200.700),
        status: Status.NEW,
        timestamp: Date.now(),
    };

    await expect(db.insertTrade(trade)).resolves.toBe(1)
    await expect(db.insertTrade(trade)).rejects.toThrowError()

    let otherTrade = Object.assign({}, trade)
    otherTrade.tradeId = uuid().toString()
    await expect(db.insertTrade(otherTrade)).resolves.toBe(2)
    console.log(await db.getOrderTrades(trade.exchange, trade.exchangeOrdId))

    await expect(db.close()).resolves.toBeUndefined()
});