import {createEmulatorExchangeConfigs, Dictionary, Status, Trade} from "../src/Model";
import {Connectors, ExchangeConfig} from "../src/connectors/Connectors";
import {WebUI} from "../src/ui/WebUI";
import {SettingsManager} from "../src/Settings";
import express from "express";
import {Broker} from "../src/Broker";
import {BrokerHubEmulator} from "./BrokerHubEmulator";
import {createTestDatabase} from "./Db.test";
import {Db} from "../src/db/Db";
import {v1 as uuid} from "uuid";
import BigNumber from "bignumber.js";
import {log} from "../src/log";
import {parseCreateOrderRequest} from "../src/hub/BrokerHubRest";

async function createBroker(db: Db): Promise<Broker> {
    // mock config.json
    JSON.parse = jest.fn(JSON.parse).mockImplementationOnce(() => ({
        "orionUrl": "http://localhost:9090/backend",
        "transport": "rest",
        "orionBlockchainUrl": "http://localhost:3001",
        "callbackUrl": "http://localhost:4000",
        "matcherAddress": "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        "privateKey": "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        "httpPort": 4000,
        "wsPort": 4001,
        "production": false,
    }))

    const settingsManger = new SettingsManager('./config.json');
    const settings = settingsManger.settings;

    const emulatorBalances: Dictionary<string> = {
        "BTC": "20",
        "ETH": "500",
        "XRP": "100000",
        "WAVES": "100000",
        "USDT": "100000",
        "EGLD": "1000000",
        "ORN": "1000000"
    }
    const exchangeConfigs: Dictionary<ExchangeConfig> = createEmulatorExchangeConfigs();
    const connector: Connectors = new Connectors(emulatorBalances, false);
    connector.updateExchanges(exchangeConfigs);

    const app = express();
    const webUI = new WebUI(db, settings, app);
    // TODO test broker hub?
    const brokerHub: BrokerHubEmulator = new BrokerHubEmulator(settings)

    const broker = new Broker(settings, brokerHub, db, webUI, connector)

    broker.startCheckOrders = jest.fn().mockImplementation(() => {
    })
    broker.startUpdateBalances = jest.fn().mockImplementation(() => {
    })

    await broker.connectToOrion()

    return broker
}

function mockLog() {
    log.log = jest.fn(log.log).mockImplementation(console.log)
    log.error = jest.fn(log.error).mockImplementation(console.error)
}

const data = {
    "symbol": "ORN-USDT",
    "side": "sell",
    "subOrdId": "158503",
    "price": 5,
    "exchange": "bitmax",
    "subOrdQty": 10,
    "ordId": "158502",
    "ordType": "LIMIT"
}

function mockTradeObject(exchangeOrdId: string, qty: number): Trade {
    return {
        exchange: data.exchange,
        exchangeOrdId: exchangeOrdId,
        tradeId: uuid(),
        price: new BigNumber(data.price),
        qty: new BigNumber(qty),
        status: Status.FILLED,
        timestamp: Date.now()
    }
}

test("order creation", async () => {
    const db = await createTestDatabase()
    const broker = await createBroker(db)
    const connector = broker.connector

    const qty = new BigNumber(data.subOrdQty)
    const price = new BigNumber(data.price)

    const order = await broker.onCreateOrder(parseCreateOrderRequest(data))
    // duplicate testing
    await expect(broker.onCreateOrder(parseCreateOrderRequest(data))).resolves.toStrictEqual(order)
    await expect(db.getAllOrders()).resolves.toEqual([order])
    await expect(db.getOpenOrders()).resolves.toEqual([order])

    const trade: Trade = mockTradeObject(order.exchangeOrdId, data.subOrdQty)
    await broker.orderChanged(trade)
    await expect(db.getOrder(order.exchange, order.exchangeOrdId)).resolves.toEqual({
        ...order,
        status: Status.FILLED,
        filledQty: qty,
        totalCost: qty.multipliedBy(price)
    })

    await broker.onOrderStatusResponse({subOrdId: order.subOrdId, status: Status.FILLED});
    await expect(db.getOrder(order.exchange, order.exchangeOrdId)).resolves.toEqual({
        ...order,
        status: Status.FILLED_AND_SENT_TO_ORION,
        filledQty: qty,
        totalCost: qty.multipliedBy(price)
    })

    // duplicate testing
    await broker.orderChanged(trade)
    await expect(db.getOrderTrades(order.exchange, order.exchangeOrdId)).resolves.toEqual([trade])


    // console.log(broker)

})

test("order partially filled", async () => {
    const db = await createTestDatabase()
    const broker = await createBroker(db)
    const connector = broker.connector

    const order = await broker.onCreateOrder(parseCreateOrderRequest(data))

    const trade: Trade = mockTradeObject(order.exchangeOrdId, data.subOrdQty / 2)

    const qty = new BigNumber(data.subOrdQty)
    const price = new BigNumber(data.price)

    await broker.orderChanged(trade)
    await expect(db.getOrder(order.exchange, order.exchangeOrdId)).resolves.toEqual({
        ...order,
        status: Status.PARTIALLY_FILLED,
        filledQty: qty.dividedBy(2),
        totalCost: qty.dividedBy(2).multipliedBy(price)
    })

    const trade2: Trade = Object.assign({}, trade)
    trade2.tradeId = uuid()
    await broker.orderChanged(trade2)
    await expect(db.getOrder(order.exchange, order.exchangeOrdId)).resolves.toEqual({
        ...order,
        status: Status.FILLED,
        filledQty: qty,
        totalCost: qty.multipliedBy(price)
    })
    await broker.onOrderStatusResponse({subOrdId: order.subOrdId, status: Status.FILLED});
    await expect(db.getOrder(order.exchange, order.exchangeOrdId)).resolves.toEqual({
        ...order,
        status: Status.FILLED_AND_SENT_TO_ORION,
        filledQty: qty,
        totalCost: qty.multipliedBy(price)
    })
})

test("order canceled", async () => {
    const db = await createTestDatabase()
    const broker = await createBroker(db)
    const connector = broker.connector

    await expect(broker.onCancelOrder({subOrdId: "0"})).rejects.toThrowError()

    const order = await broker.onCreateOrder(parseCreateOrderRequest(data))

    await expect(broker.onCancelOrder({subOrdId: data.subOrdId})).resolves.toEqual({
        ...order,
        status: Status.CANCELED
    })

    // Canceling a canceled order should not emit exceptions?
    await expect(broker.onCancelOrder({subOrdId: data.subOrdId})).resolves.toEqual({
        ...order,
        status: Status.CANCELED
    })
})

test("order filled but canceled", async () => {
    const db = await createTestDatabase()
    const broker = await createBroker(db)
    const connector = broker.connector

    const order = await broker.onCreateOrder(parseCreateOrderRequest(data))
    const trade: Trade = mockTradeObject(order.exchangeOrdId, data.subOrdQty)

    await broker.orderChanged(trade)

    await expect(broker.onCancelOrder({subOrdId: data.subOrdId})).rejects.toThrowError()
})


test("order partially filled but canceled", async () => {
    const db = await createTestDatabase()
    const broker = await createBroker(db)
    const connector = broker.connector

    const order = await broker.onCreateOrder(parseCreateOrderRequest(data))
    const trade: Trade = mockTradeObject(order.exchangeOrdId, data.subOrdQty / 2)

    await broker.orderChanged(trade)

    await expect(broker.onCancelOrder({subOrdId: data.subOrdId})).rejects.toThrowError()
})