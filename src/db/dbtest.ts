import {Db} from "./Db"
import BigNumber from "bignumber.js";
import {OrderType, Side, Status} from "../Model";

async function init() {
    const db = new Db();
    await db.init();
    await db.insertTrade({
        exchange: 'bittrex',
        exchangeOrdId: '123',
        tradeId: '12345',
        price: new BigNumber(100.500),
        qty: new BigNumber(200.700),
        status: Status.NEW,
        timestamp: Date.now(),
    });
    await db.insertTrade({
        exchange: 'bittrex',
        exchangeOrdId: '124',
        tradeId: '12345',
        price: new BigNumber(100.500),
        qty: new BigNumber(200.700),
        status: Status.NEW,
        timestamp: Date.now(),
    });

    await db.insertOrder({
        exchange: 'bittrex',
        exchangeOrdId: '124',
        ordId: '777',
        subOrdId: '666',
        symbol: 'ETH-BTC',
        side: Side.SELL,
        ordType: OrderType.LIMIT,
        price: new BigNumber(100.500),
        qty: new BigNumber(200.700),
        status: Status.NEW,
        timestamp: Date.now(),
        clientOrdId: '2222',
        filledQty: new BigNumber(0),
        totalCost: new BigNumber(0.987654321)
    });

    await db.insertOrder({
        exchange: 'bittrex',
        exchangeOrdId: '125',
        ordId: '778',
        subOrdId: '667',
        symbol: 'ETH-BTC',
        side: Side.SELL,
        ordType: OrderType.LIMIT,
        price: new BigNumber(100.500),
        qty: new BigNumber(0.02),
        status: Status.FILLED,
        timestamp: Date.now(),
        clientOrdId: '2224',
        filledQty: new BigNumber(0),
        totalCost: new BigNumber(0.987654321)
    });

    await db.updateOrder({
        exchange: 'bittrex',
        exchangeOrdId: '124',
        ordId: '777',
        subOrdId: '666',
        symbol: 'ORN-USDT',
        side: Side.BUY,
        ordType: OrderType.LIMIT,
        price: new BigNumber(100.500),
        qty: new BigNumber(200.700),
        status: Status.FILLED,
        timestamp: Date.now(),
        clientOrdId: '2222',
        filledQty: new BigNumber(0),
        totalCost: new BigNumber(0.987654321),
    });

    console.log(await db.getOrderTrades('bittrex', '123'));
    console.log(await db.getAllOrders());
    console.log(await db.getOpenOrders());
    console.log(await db.getOrderBySubOrdId('666'));
    console.log(await db.getOrder('bittrex', '124'));
}

init();

// tsc && node dist/dbtest.js