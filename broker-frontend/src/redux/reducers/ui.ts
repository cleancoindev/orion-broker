import {Dictionary, NumberFormat, OrderData, OrderType, Side} from "../../Model";
import {PromptPopupProps} from "../../components/PromptPopup/PromptPopup";
import {
    CLOSE_POPUP,
    HIDE_ALL_POPUPS,
    HIDE_NOTIFY,
    HIDE_PROMPT,
    OPEN_POPUP,
    SET_NUMBER_FORMAT,
    SHOW_NOTIFY,
    SHOW_PROMPT,
} from "../actions";


export interface UiState {
    isSelectPair: boolean;
    isAddWalletPopup: boolean;
    promptProps?: PromptPopupProps;
    notifyText: string;
    currentTradeTab: string;
    favoritePairs: string[];
    numberFormat: Dictionary<NumberFormat>;
    popups: Dictionary<boolean>;

    buySellOrderData?: OrderData;
    buySellSide: Side,
    buySellType: OrderType,
}

const initialState: UiState = {
    isSelectPair: false,
    isAddWalletPopup: false,
    promptProps: undefined,
    notifyText: '',
    currentTradeTab: 'buySell',
    favoritePairs: (localStorage.getItem('favoritePairs') || '').split(','),
    numberFormat: {} as Dictionary<NumberFormat>,
    popups: {} as ({ [k: string]: boolean }),

    buySellSide: Side.BUY,
    buySellType: OrderType.MARKET,
}

const uiReducer = (state = initialState, action: any): UiState => {
    switch (action.type) {
        case SHOW_PROMPT:
            return {
                ...state,
                promptProps: action.payload
            };
        case HIDE_PROMPT:
            return {
                ...state,
                promptProps: undefined
            };
        case HIDE_ALL_POPUPS:
            return {
                ...state,
                isSelectPair: false,
                isAddWalletPopup: false,
                promptProps: undefined
            };
        case SHOW_NOTIFY:
            return {
                ...state,
                notifyText: action.payload
            };
        case HIDE_NOTIFY:
            return {
                ...state,
                notifyText: ''
            };

        case SET_NUMBER_FORMAT:
            return {
                ...state,
                numberFormat: action.payload
            };

        case OPEN_POPUP:
            return {
                ...state,
                popups: {
                    ...state.popups,
                    [action.payload]: true,
                }
            };

        case CLOSE_POPUP:
            return {
                ...state,
                popups: {
                    ...state.popups,
                    [action.payload]: false,
                }
            };

        default: {
            return state;
        }
    }
}

export default uiReducer;
