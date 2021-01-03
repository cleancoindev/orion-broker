import {Orderbook} from "../../Model";

export const getOrderbook = (store: any): Orderbook => store.orderbook.orderbook;

export const getActualOrderbook = (store: any): Orderbook => store.orderbook.aggregateByDecimals > -1 ? store.orderbook.aggregated : store.orderbook.orderbook;

export const checkIfOrderbookIsLoading = (store: any): Orderbook => store.orderbook.isLoading;

export const getAggregateByDecimals = (store: any): number => store.orderbook.aggregateByDecimals;

export const getOrderbookMinDecimals = (store: any): number => store.orderbook.minDecimals;