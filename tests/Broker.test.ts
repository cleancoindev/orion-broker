import {createEmulatorExchangeConfigs, Dictionary, Status, Trade} from "../src/Model";
import {Connectors, ExchangeConfig} from "../src/connectors/Connectors";
import {WebUI} from "../src/ui/WebUI";
import {SettingsManager} from "../src/Settings";
import express from "express";
import {Broker} from "../src/Broker";
import {BrokerHubEmulator} from "./BrokerHubEmulator";
import {createTestDatabase} from "./Db.test";
import {Db} from "../src/db/Db";
import BigNumber from "bignumber.js";
import {log} from "../src/log";
import {parseCreateSubOrder} from "../src/hub/BrokerHubWebsocket";

async function createBroker(db: Db): Promise<Broker> {
    // mock config.json
    JSON.parse = jest.fn(JSON.parse).mockImplementationOnce(() => ({
        "orionUrl": "http://localhost:9090/backend",
        "callbackUrl": "http://localhost:4000",
        "matcherAddress": "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        "privateKey": "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        "httpPort": 4000,
        "wsPort": 4001,
        "production": false,
    }))

    const settingsManger = new SettingsManager('./data/config.json');
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

    broker.startCheckSubOrders = jest.fn().mockImplementation(() => {
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
    "id": 158503,
    "side": "sell",
    "symbol": "ORN-USDT",
    "exchange": "bitmax",
    "price": 5,
    "amount": 10,
}

function mockTradeObject(exchangeOrderId: string, amount: number): Trade {
    return {
        exchange: data.exchange,
        exchangeOrderId: exchangeOrderId,
        price: new BigNumber(data.price),
        amount: new BigNumber(amount),
    }
}

test("order creation", async () => {
    const db = await createTestDatabase()
    const broker = await createBroker(db)
    const connector = broker.connector

    const amount = new BigNumber(data.amount)
    const price = new BigNumber(data.price)

    const orderStatus = await broker.onCreateSubOrder(parseCreateSubOrder(data))
    const order = await db.getSubOrderById(data.id)
// duplicate testing
    await expect(broker.onCreateSubOrder(parseCreateSubOrder(data))).resolves.toStrictEqual(orderStatus)
    await expect(db.getAllSubOrders()).resolves.toEqual([order])
    await expect(db.getOpenSubOrders()).resolves.toEqual([order])

    const trade: Trade = mockTradeObject(order.exchangeOrderId, data.amount)
    await broker.onTrade(trade)
    await expect(db.getSubOrder(order.exchange, order.exchangeOrderId)).resolves.toEqual({
        ...order,
        status: Status.FILLED,
        filledAmount: amount,
        sentToAggregator: false
    })

    await broker.onSubOrderStatusAccepted({id: order.id, status: Status.FILLED});
    await expect(db.getSubOrder(order.exchange, order.exchangeOrderId)).resolves.toEqual({
        ...order,
        status: Status.FILLED,
        filledAmount: amount,
        sentToAggregator: true
    })

    // duplicate testing
    await broker.onTrade(trade)
    await expect(db.getSubOrderTrades(order.exchange, order.exchangeOrderId)).resolves.toEqual([trade])


    // console.log(broker)

})


test("order canceled", async () => {
    const db = await createTestDatabase()
    const broker = await createBroker(db)
    const connector = broker.connector

    await expect(broker.onCancelSubOrder(0)).rejects.toThrowError()

    const order = await broker.onCreateSubOrder(parseCreateSubOrder(data))

    await expect(broker.onCancelSubOrder(data.id)).resolves.toEqual({
        ...order,
        status: Status.CANCELED
    })

    // Canceling a canceled order should not emit exceptions?
    await expect(broker.onCancelSubOrder(data.id)).resolves.toEqual({
        ...order,
        status: Status.CANCELED
    })
})

test("order filled but canceled", async () => {
    const db = await createTestDatabase()
    const broker = await createBroker(db)
    const connector = broker.connector

    await broker.onCreateSubOrder(parseCreateSubOrder(data))
    const order = await db.getSubOrderById(data.id)
    const trade: Trade = mockTradeObject(order.exchangeOrderId, data.amount)

    await broker.onTrade(trade)

    await expect(broker.onCancelSubOrder(data.id)).resolves.toBeDefined()
})


test("order partially filled but canceled", async () => {
    const db = await createTestDatabase()
    const broker = await createBroker(db)
    const connector = broker.connector

    await broker.onCreateSubOrder(parseCreateSubOrder(data))
    const order = await db.getSubOrderById(data.id)
    const trade: Trade = mockTradeObject(order.exchangeOrderId, data.amount / 2)

    await broker.onTrade(trade)

    await expect(broker.onCancelSubOrder(data.id)).resolves.toBeDefined()
})