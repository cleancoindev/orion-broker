import {Connectors, ExchangeConfig} from "../src/connectors/Connectors";
import {Dictionary, OrderType, Side, Status, Trade} from "../src/Model";
import BigNumber from "bignumber.js";

test("connector test", async () => {
    const exchanges: Dictionary<ExchangeConfig> = {
        poloniex: {
            secret: "",
            key: "",
        },
        bittrex: {
            secret: "",
            key: "",
        },
    };

    const connector = new Connectors({'BTC': "1"}, false);
    connector.updateExchanges(exchanges)

    await expect(connector.getBalances()).resolves.toEqual( {
        poloniex: { exchangeId: 'poloniex', result: { BTC: new BigNumber(1) } },
        bittrex: { exchangeId: 'bittrex', result: { BTC: new BigNumber(1) } }
    })

    const exchangeId = "bittrex"
    const symbol = "ETH-BTC"
    const subOrdId = "1"
    const orderType = OrderType.LIMIT
    const side = Side.BUY
    const subOrdQty = new BigNumber(1)
    const price = new BigNumber(1)

    const order = await connector.createOrder(subOrdId, orderType, exchangeId, symbol, side, subOrdQty, price);

    expect(order).toEqual({
        subOrdId: subOrdId,
        exchange: exchangeId,
        exchangeOrdId: expect.anything(),
        symbol: symbol,
        side: side,
        price: price,
        qty: subOrdQty,
        ordType: orderType,
        timestamp: expect.anything(),
        status: Status.NEW
    })

    connector.orderWatcher((trade: Trade) => {
        expect(trade).toEqual({
            exchange: exchangeId,
            exchangeOrdId: order.exchangeOrdId,
            tradeId: expect.anything(),
            price: price,
            qty: subOrdQty,
            status: Status.FILLED,
            timestamp: expect.anything()
        })
    })

    await expect(connector.checkUpdates([order])).resolves.toBeUndefined()

    await expect(connector.cancelOrder(order)).resolves.toBeTruthy()
})