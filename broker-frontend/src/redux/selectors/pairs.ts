import {Dictionary, getDefaultPair, Pair} from "../../Model";
import {DEFAULT_PAIR} from "../reducers/pairs";

export const getPairs = (store: any): Dictionary<Pair> => store.pairs.nameToPair;

export const getCurrentPairName = (store: any): string => store.pairs.currentPairName;

export const getCurrentPair = (store: any): Pair => store.pairs.nameToPair[store.pairs.currentPairName] || getDefaultPair(store.pairs.currentPairName || DEFAULT_PAIR);

export const getCurrencies = (store: any): string[] => store.pairs.currencies;

export const getFromCurrencies = (store: any): string[] => store.pairs.fromCurrencies;

export const getToCurrencies = (store: any): string[] => store.pairs.toCurrencies;

export const getPairsLoaded = (store: any): boolean => store.pairs.loaded;

export const getPairsInitialized = (store: any): boolean => store.pairs.initialized;