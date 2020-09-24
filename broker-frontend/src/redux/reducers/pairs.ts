import {Dictionary, Pair} from "../../Model";
import {SET_ASSETS, SET_PAIRS} from "../actions";

export const DEFAULT_PAIR = 'ORN-USDT';
export const DEFAULT_PAIRS_LIST = ['XRP-BTC', 'ORN-USDT', 'BTC-USDT', 'ETH-USDT', 'XRP-USDT', 'ETH-BTC', 'EGLD-USDT'];

const initialState = {
    nameToPair: {} as Dictionary<Pair>,
    currentPairName: DEFAULT_PAIR,
    currencies: ['ETH', 'BTC', 'XRP', 'USDT', 'EGLD', 'ORN'],
    assets: DEFAULT_PAIRS_LIST,
    initialized: false,
    loaded: false
}

export const pairsReducer = (state = initialState, action: any) => {
    switch (action.type) {
        case SET_ASSETS:
            const assets: string[] = action.payload;
            const currencies: string[] = [];
            assets.forEach(asset => {
                const [a, b] = asset.split('-');
                if (currencies.indexOf(a) === -1) currencies.push(a);
                if (currencies.indexOf(b) === -1) currencies.push(b);
            });
            return {
                ...state,
                assets: assets,
                currencies: currencies,
                initialized: true
            };

        case SET_PAIRS:
            for (let key in action.payload) {
                state.nameToPair[key] = action.payload[key];
            }
            state.loaded = true;
            return state;

        default: {
            return state;
        }
    }
}