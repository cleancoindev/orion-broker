import {Db} from "../src/db/Db";
import {Status, Trade, SubOrder} from "../src/Model";
import BigNumber from "bignumber.js";
import {v1 as uuid} from "uuid";

export async function createTestDatabase(): Promise<Db> {
    const db = new Db(true);
    await expect(db.init()).resolves.toBeUndefined()
    return db
}

const dbOrder: SubOrder = Object.assign(new SubOrder(), {
    exchange: "bittrex",
    exchangeOrderId: '1',
    id: 1,
    symbol: "ETH-BTC",
    side: 'buy',
    price: new BigNumber(100),
    amount: new BigNumber(1),
    timestamp: Date.now(),
    status: Status.PREPARE,
    filledAmount: new BigNumber(0),
    sentToAggregator: false
});

test("orders", async () => {
    const db = await createTestDatabase()

    await expect(db.getAllSubOrders()).resolves.toEqual([]);
    await expect(db.insertSubOrder(dbOrder)).resolves.toBe(1)
    await expect(db.getAllSubOrders()).resolves.toEqual([dbOrder]);

    let otherOrder = Object.assign({}, dbOrder)
    otherOrder.symbol = "BTC-ETH";
    otherOrder.sentToAggregator = true;

    await expect(db.updateSubOrder(otherOrder)).resolves.toBeUndefined();
    await expect(db.getAllSubOrders()).resolves.toEqual([otherOrder]);

    // Unique test
    await expect(db.insertSubOrder(dbOrder)).rejects.toThrowError()

    // Same exchangeOrdId but on different exchange
    otherOrder = Object.assign({}, dbOrder)
    otherOrder.id = 2
    otherOrder.exchange = "poloniex"
    otherOrder.exchangeOrderId = "1"
    await expect(db.insertSubOrder(otherOrder)).resolves.toBe(2)

    await expect(db.close()).resolves.toBeUndefined()
});

test("recreating tables", async () => {
    const db = await createTestDatabase()

    await expect(db.createTables()).rejects.toThrowError()

    await expect(db.close()).resolves.toBeUndefined()
})

test("get order", async () => {
    const db = await createTestDatabase()

    await expect(db.insertSubOrder(dbOrder)).resolves.toBe(1)
    await expect(db.getSubOrder(dbOrder.exchange, dbOrder.exchangeOrderId)).resolves.toEqual(dbOrder)
    await expect(db.getSubOrder("something", dbOrder.exchangeOrderId)).resolves.toBeUndefined()

    await expect(db.close()).resolves.toBeUndefined()
})

test("in transaction", async () => {
    const db = await createTestDatabase()

    await expect(db.inTransaction(async () => {
        await db.insertSubOrder(dbOrder)
    })).resolves.toBeUndefined()

    await expect(db.inTransaction(async () => {
        await expect(db.close()).resolves.toBeUndefined()
    })).rejects.toThrowError()

    // Already closed
    await expect(db.close()).rejects.toThrowError()
})

test("trades", async () => {
    const db = await createTestDatabase()

    const trade: Trade = Object.assign(new Trade(), {
        exchange: 'bittrex',
        exchangeOrderId: '123',
        price: new BigNumber(100.500),
        amount: new BigNumber(200.700),
    });

    await expect(db.insertTrade(trade)).resolves.toBe(1)

    let otherTrade = Object.assign({}, trade)
    otherTrade.exchangeOrderId = uuid().toString()
    await expect(db.insertTrade(otherTrade)).resolves.toBe(2)
    console.log(await db.getSubOrderTrades(trade.exchange, trade.exchangeOrderId))

    await expect(db.close()).resolves.toBeUndefined()
});
