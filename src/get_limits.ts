import ccxt from 'ccxt';

const processExchange = async (exchange: string) => {
    const e = new ccxt[exchange]({verbose: false});
    const markets = await e.loadMarkets();
    for (let symbol of ['LINK/USDT']) {
        console.log(e.id + ' ' + symbol + ' limits:', markets[symbol].limits);
        console.log(e.id + ' ' + symbol + ' precision:', markets[symbol].precision);
    }
};

const init = async () => {
    for (let e of ['binance', 'bitmax', 'kucoin']) {
        await processExchange(e);
    }
};

init();