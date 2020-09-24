import {Dictionary, NumberFormat, Pair} from "../../Model";
import {PromptPopupProps} from "../../components/PromptPopup/PromptPopup";

export const CLEAR_BALANCES = 'CLEAR_BALANCES';
export const SET_BALANCES = 'SET_BALANCES';

export const clearBalances = () => ({type: CLEAR_BALANCES});

export const setBalances = (balances: any) => ({
    type: SET_BALANCES,
    balances
});


export const SET_PAIRS = 'SET_PAIRS';
export const SET_ASSETS = 'SET_ASSETS';

export const setAssets = (assets: string[]) => ({
    type: SET_ASSETS,
    payload: assets
});

export const setPairs = (nameToPair: Dictionary<Pair>) => ({
    type: SET_PAIRS,
    payload: nameToPair
});

export const SHOW_PROMPT = 'SHOW_PROMPT';
export const HIDE_PROMPT = 'HIDE_PROMPT';

export const HIDE_ALL_POPUPS = 'HIDE_ALL_POPUPS';

export const SHOW_NOTIFY = 'SHOW_NOTIFY';
export const HIDE_NOTIFY = 'HIDE_NOTIFY';

export const SET_NUMBER_FORMAT = 'SET_NUMBER_FORMAT';

export const hideNotify = () => ({
    type: HIDE_NOTIFY,
});

export const hideAllPopups = () => ({
    type: HIDE_ALL_POPUPS,
});

export const showNotify = (text: string) => ({
    type: SHOW_NOTIFY,
    payload: text
});

export const showPrompt = (props: PromptPopupProps) => ({
    type: SHOW_PROMPT,
    payload: props
});

export const setNumberFormat = (numberFormat: Dictionary<NumberFormat>) => ({
    type: SET_NUMBER_FORMAT,
    payload: numberFormat
});
