import {Dictionary, OrderType, Side} from "../Model";
import {Connectors, ExchangeConfig} from "./Connectors";
import BigNumber from "bignumber.js";

// tsc && node dist/connectors/test.js

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

const connector = new Connectors(exchanges, {'BTC': "1"}, false);

async function start() {
    console.log(await connector.getBalances());
    connector.orderWatcher(trade => {
        console.log('TRADE', trade);
    })
    const order = await connector.createOrder("1", OrderType.LIMIT, "bittrex", "ETH-BTC", Side.BUY, new BigNumber(1), new BigNumber(1));
    console.log(order);

    console.log(await connector.cancelOrder(order));
}

start();
