import {Connectors, ExchangeConfig} from "../src/connectors/Connectors";
import {Dictionary, Status, Trade} from "../src/Model";
import BigNumber from "bignumber.js";

test("connector test", async () => {
    const exchanges: Dictionary<ExchangeConfig> = {
        poloniex: {
            secret: "",
            key: "",
            password: ""
        },
        bittrex: {
            secret: "",
            key: "",
            password: ""
        },
    };

    const connector = new Connectors({'BTC': "1"}, false);
    connector.updateExchanges(exchanges)

    await expect(connector.getBalances()).resolves.toEqual({
        poloniex: {exchangeId: 'poloniex', result: {BTC: new BigNumber(1)}},
        bittrex: {exchangeId: 'bittrex', result: {BTC: new BigNumber(1)}}
    })

    const exchangeId = "bittrex"
    const symbol = "ETH-BTC"
    const subOrdId = 1
    const side = 'buy'
    const amount = new BigNumber(1)
    const price = new BigNumber(1)

    const order = await connector.submitSubOrder(exchangeId, subOrdId, symbol, side, amount, price);

    expect(order).toEqual({
        id: subOrdId,
        exchange: exchangeId,
        exchangeOrderId: expect.anything(),
        symbol: symbol,
        side: side,
        price: price,
        amount: amount,
        timestamp: expect.anything(),
        status: Status.ACCEPTED,
        sentToAggregator: false,
    })

    connector.setOnTradeListener((trade: Trade) => {
        expect(trade).toEqual({
            exchange: exchangeId,
            exchangeOrderId: order.exchangeOrderId,
            price: price,
            amount: amount,
        })
    })

    await expect(connector.checkSubOrders([order])).resolves.toBeUndefined()

    await expect(connector.cancelSubOrder(order)).resolves.toBeTruthy()
})