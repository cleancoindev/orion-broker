import ccxt from 'ccxt';

const EXCHANGES = ['binance', 'bitmax', 'kucoin'];
const SYMBOLS = ['LINK/USDT'];

const getPrecision = (exchange: string, n: number): number => {
    if (n === undefined) return n;

    if (exchange === 'bitmax') {
        const len = n.toString().length;
        return len === 1 ? 1 : len - 2;
    } else {
        return n;
    }
};

const processSymbol = async (symbol: string) => {
    let minQty: number = -1;
    let maxQty: number = -1;
    let minCost: number = -1;
    let maxCost: number = -1;
    let minPrice: number = -1;
    let maxPrice: number = -1;
    let pricePrecision: number = -1;
    let qtyPrecision: number = -1;


    const processExchange = async (exchange: string) => {
        const e = new ccxt[exchange]({verbose: false});
        const markets = await e.loadMarkets();
        const limits = markets[symbol].limits;
        console.log(e.id + ' ' + symbol + ' limits:', limits);
        const precision = markets[symbol].precision;
        console.log(e.id + ' ' + symbol + ' precision:', precision);

        // amount

        if (limits.amount.min !== undefined && (minQty === -1 || minQty < limits.amount.min)) {
            minQty = limits.amount.min;
        }

        if (limits.amount.max !== undefined && (maxQty === -1 || maxQty > limits.amount.max)) {
            maxQty = limits.amount.max;
        }

        // price

        if (limits.price.min !== undefined && (minPrice === -1 || minPrice < limits.price.min)) {
            minPrice = limits.price.min;
        }

        if (limits.price.max !== undefined && (maxPrice === -1 || maxPrice > limits.price.max)) {
            maxPrice = limits.price.max;
        }

        // cost

        if (limits.cost.min !== undefined && (minCost === -1 || minCost < limits.cost.min)) {
            minCost = limits.cost.min;
        }

        if (limits.cost.max !== undefined && (maxCost === -1 || maxCost > limits.cost.max)) {
            maxCost = limits.cost.max;
        }

        // precision

        const a = getPrecision(exchange, precision.amount);

        if (a !== undefined && (qtyPrecision === -1 || qtyPrecision > a)) {
            qtyPrecision = a;
        }

        const p = getPrecision(exchange, precision.price);

        if (p !== undefined && (pricePrecision === -1 || pricePrecision > p)) {
            pricePrecision = p;
        }
    };


    for (let e of EXCHANGES) {
        await processExchange(e);
    }

    const result = {
        'name': symbol,
        'minQty': minQty,
        'maxQty': maxQty,
        'minPrice': minPrice,
        'maxPrice': maxPrice,
        'minCost': minCost,
        'maxCost': maxCost,
        'pricePrecision': pricePrecision,
        'qtyPrecision': qtyPrecision,
        'baseAssetPrecision': 8,
        'quoteAssetPrecision': 8,
        'limitOrderThreshold': 0.001
    };

    console.log(JSON.stringify(result));
};

const init = async () => {
    for (let symbol of SYMBOLS) {
        processSymbol(symbol);
    }
}

init();
