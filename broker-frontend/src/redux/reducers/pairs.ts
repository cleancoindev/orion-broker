import {Dictionary, Pair} from "../../Model";
import {SET_CURRENT_PAIR, SET_PAIRS, SET_PAIRS_LIST} from "../actions";

export const DEFAULT_PAIR = 'ORN-USDT';

interface PairsState {
    nameToPair: Dictionary<Pair>;
    currentPairName: string;
    currencies: string[];
    fromCurrencies: string[];
    toCurrencies: string[];
    pairs: string[];
    initialized: boolean;
    loaded: boolean;
}

const initialState: PairsState = {
    nameToPair: {},
    currentPairName: DEFAULT_PAIR,
    currencies: [], // 'ETH', 'USDT', 'ORN'
    fromCurrencies: [], // 'ETH', 'ORN'
    toCurrencies: [], // 'USDT'
    pairs: [], // 'ORN-USDT', 'ETH-USDT'
    initialized: false,
    loaded: false
}

export const pairsReducer = (state = initialState, action: any) => {
    switch (action.type) {
        case SET_CURRENT_PAIR:
            return {
                ...state,
                currentPairName: action.payload,
                initialized: true
            };

        case SET_PAIRS_LIST:
            const pairs: string[] = action.payload;
            const currencies: string[] = [];
            const fromCurrencies: string[] = [];
            const toCurrencies: string[] = [];
            pairs.forEach(pair => {
                const [a, b] = pair.split('-');
                if (currencies.indexOf(a) === -1) currencies.push(a);
                if (currencies.indexOf(b) === -1) currencies.push(b);

                if (fromCurrencies.indexOf(a) === -1) fromCurrencies.push(a);
                if (toCurrencies.indexOf(b) === -1) toCurrencies.push(b);
            });
            return {
                ...state,
                pairs: pairs,
                currencies,
                fromCurrencies,
                toCurrencies
            };

        case SET_PAIRS:
            state.loaded = true;
            return {
                ...state,
                nameToPair: {
                    ...state.nameToPair,
                    ...action.payload,
                }
            };

        default: {
            return state;
        }
    }
}
