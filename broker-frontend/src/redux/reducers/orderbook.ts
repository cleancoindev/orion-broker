import {defaultOrderbook, Dictionary, fromMaxToMin, Orderbook, OrderbookItem} from "../../Model";
import {CLEAR_ORDERBOOK, SET_AGGREGATE_BY_DECIMALS, SET_ASKS_BIDS} from "../actions";
import BigNumber from "bignumber.js";
import {ROUND_DOWN} from "../../Utils";

interface OrderbookState {
    isLoading: boolean;
    orderbook: Orderbook;
    aggregated: Orderbook;
    aggregateByDecimals: number;
    minDecimals: number;
}

const initialState: OrderbookState = {
    isLoading: true,
    orderbook: defaultOrderbook(),
    aggregated: defaultOrderbook(),
    aggregateByDecimals: -1,
    minDecimals: 0
};

function aggregateExchanges(a: string[], b: string[]) {
    for (let exchange of b) {
        if (a.indexOf(exchange) === -1) {
            a.push(exchange);
        }
    }
    return a;
}

function aggregateItems(items: OrderbookItem[], decimals: number): OrderbookItem[] {
    const result: Dictionary<OrderbookItem> = {};

    for (let item of items) {
        const price = item.price.toFixed(decimals, ROUND_DOWN);
        let aggregatedItem = result[price];

        if (aggregatedItem) {
            aggregatedItem.size = aggregatedItem.size.plus(item.size);
            aggregatedItem.total = aggregatedItem.total.plus(item.total);
            aggregatedItem.exchanges = aggregateExchanges(aggregatedItem.exchanges, item.exchanges);
        } else {
            result[price] = {
                price: new BigNumber(price),
                size: item.size,
                total: item.total,
                cumulativeSize: new BigNumber(0),
                cumulativeTotal: new BigNumber(0),
                avgPrice: new BigNumber(0),
                deltaSize: 0,
                exchanges: item.exchanges
            }
        }
    }

    return Object.values(result).sort(fromMaxToMin);
}

function aggregateOrderbook(orderbook: Orderbook, decimals: number): Orderbook {
    const asks = aggregateItems(orderbook.asks, decimals);
    const bids = aggregateItems(orderbook.bids, decimals);

    const [maxAskSize, maxAskTotal] = calculateAsks(asks);
    const [maxBidSize, maxBidTotal] = calculateBids(bids);

    return {asks, bids, maxAskSize, maxAskTotal, maxBidSize, maxBidTotal};
}

function calculateDelta(oldItems: OrderbookItem[], newItems: OrderbookItem[]): OrderbookItem[] {
    if (!oldItems.length) return newItems;

    const oldPriceToSize: Dictionary<BigNumber> = {};
    for (let item of oldItems) {
        oldPriceToSize[item.price.toString()] = item.size;
    }

    for (let newItem of newItems) {
        const oldItemSize = oldPriceToSize[newItem.price.toString()];

        if (oldItemSize) {
            if (newItem.size.gt(oldItemSize)) {
                newItem.deltaSize = 1;
            } else if (newItem.size.lt(oldItemSize)) {
                newItem.deltaSize = -1;
            }
        } else if (newItem.size.gt(0)) {
            newItem.deltaSize = 1;
        }
    }

    return newItems;
}

function calculateAsks(items: OrderbookItem[]): [BigNumber, BigNumber] {
    let maxSize = new BigNumber(0);
    let maxTotal = new BigNumber(0);
    let cumulativePrice = new BigNumber(0);

    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        item.cumulativeSize = item.size.plus(i < items.length - 1 ? items[i + 1].cumulativeSize : new BigNumber(0));
        item.cumulativeTotal = item.total.plus(i < items.length - 1 ? items[i + 1].cumulativeTotal : new BigNumber(0));

        cumulativePrice = cumulativePrice.plus(item.price);
        item.avgPrice = cumulativePrice.dividedBy(items.length - i);

        if (item.size.gt(maxSize)) {
            maxSize = item.size;
        }
        if (item.total.gt(maxTotal)) {
            maxTotal = item.total;
        }
    }

    return [maxSize, maxTotal];
}

function calculateBids(items: OrderbookItem[]): [BigNumber, BigNumber] {
    let maxSize = new BigNumber(0);
    let maxTotal = new BigNumber(0);
    let cumulativePrice = new BigNumber(0);

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        item.cumulativeSize = item.size.plus(i > 0 ? items[i - 1].cumulativeSize : new BigNumber(0));
        item.cumulativeTotal = item.total.plus(i > 0 ? items[i - 1].cumulativeTotal : new BigNumber(0));

        cumulativePrice = cumulativePrice.plus(item.price);
        item.avgPrice = cumulativePrice.dividedBy(i + 1);

        if (item.size.gt(maxSize)) {
            maxSize = item.size;
        }
        if (item.total.gt(maxTotal)) {
            maxTotal = item.total;
        }
    }

    return [maxSize, maxTotal];
}

function aggregate(orderbook: Orderbook, aggregateByDecimals: number): Orderbook {
    if (aggregateByDecimals === -1) {
        return orderbook;
    } else {
        const aggregated = aggregateOrderbook(orderbook, aggregateByDecimals);

        aggregated.asks = calculateDelta(aggregated.asks, aggregated.asks);
        aggregated.bids = calculateDelta(aggregated.bids, aggregated.bids);

        return aggregated;
    }
}

// TODO fix any in action
const orderbookReducer = (state = initialState, action: any): OrderbookState => {
    switch (action.type) {
        case CLEAR_ORDERBOOK:
            return {
                isLoading: true,
                orderbook: defaultOrderbook(),
                aggregated: defaultOrderbook(),
                aggregateByDecimals: -1,
                minDecimals: 0
            };

        case SET_ASKS_BIDS: {
            const asks = calculateDelta(state.orderbook.asks, action.payload.asks);
            const bids = calculateDelta(state.orderbook.bids, action.payload.bids);

            const [maxAskSize, maxAskTotal] = calculateAsks(asks);
            const [maxBidSize, maxBidTotal] = calculateBids(bids);

            const orderbook: Orderbook = {asks, bids, maxAskSize, maxAskTotal, maxBidSize, maxBidTotal};

            const aggregateByDecimals = state.aggregateByDecimals;
            const aggregated = aggregate(orderbook, aggregateByDecimals);

            const maxPrice = asks.length ? asks[0].price : new BigNumber(0);
            let minDecimals = 0;
            if (maxPrice.gt(0)) {
                while (new BigNumber(0.1).pow(minDecimals).gt(maxPrice) && minDecimals < 8) {
                    minDecimals++;
                }
            }

            return {
                isLoading: false,
                orderbook,
                aggregated,
                aggregateByDecimals,
                minDecimals: minDecimals
            };
        }

        case SET_AGGREGATE_BY_DECIMALS:
            const aggregateByDecimals = action.payload;
            const aggregated = aggregate(state.orderbook, aggregateByDecimals);

            return {
                ...state,
                aggregated,
                aggregateByDecimals
            }

        default: {
            return state;
        }
    }
}

export default orderbookReducer;
