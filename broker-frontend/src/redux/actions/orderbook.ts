import {OrderbookItem} from "../../Model";

export const CLEAR_ORDERBOOK = 'CLEAR_ORDERBOOK';
export const SET_ASKS_BIDS = 'SET_ASKS_BIDS';
export const SET_AGGREGATE_BY_DECIMALS = 'SET_AGGREGATE_BY_DECIMALS';

export const clearOrderbook = () => ({type: CLEAR_ORDERBOOK});

export const setAggregateByDecimals = (decimals: number) => ({type: SET_AGGREGATE_BY_DECIMALS, payload: decimals});

export const setAsksBids = (asks: OrderbookItem[], bids: OrderbookItem[]) => ({
    type: SET_ASKS_BIDS,
    payload: {asks, bids}
});
