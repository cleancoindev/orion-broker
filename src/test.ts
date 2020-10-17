import ccxt from 'ccxt';

const init = async () => {
    let bitfinex = new ccxt.bitfinex({verbose: false})
    // console.log(bitfinex.id, await bitfinex.loadMarkets());
    console.log(bitfinex.id, await bitfinex.fetchTicker('BTC/USD'));
};

init();