import {Dictionary, Pair} from "../../Model";

export const SET_PAIRS = 'SET_PAIRS';
export const SET_CURRENT_PAIR = 'SET_CURRENT_PAIR';
export const SET_PAIRS_LIST = 'SET_PAIRS_LIST';

export const setPairsList = (pairs: string[]) => ({
    type: SET_PAIRS_LIST,
    payload: pairs
});

export const setPairs = (nameToPair: Dictionary<Pair>) => ({
    type: SET_PAIRS,
    payload: nameToPair
});

export const setCurrentPair = (pairName: string) => ({
    type: SET_CURRENT_PAIR,
    payload: pairName
});
