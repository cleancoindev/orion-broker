import {Dictionary, NumberFormat, OrderData, OrderType, Side} from "../../Model";
import {
    CLOSE_POPUP,
    HIDE_ALL_POPUPS,
    HIDE_PAIR_SELECTOR,
    OPEN_POPUP,
    PUSH_SNACKBAR,
    REMOVE_SNACKBAR,
    SET_BUY_SELL_ORDER_DATA,
    SET_BUY_SELL_SIDE,
    SET_BUY_SELL_TYPE,
    SET_CONFIRM_ADD_WALLET_POPUP_DATA,
    SET_NUMBER_FORMAT,
    SET_SWAL_POPUP_DATA,
    SET_TRADE_TAB,
    TOGGLE_FAVORITE_PAIR,
    TOGGLE_PAIR_SELECTOR,
} from "../actions";
import {IconType} from "@orionprotocol/orion-ui-kit";
import {POPUP_TYPE} from "../../components/Popups/Popups.enums";

export type SwalPopupData = {
    title: string;
    text: string;
    subtext?: string;
    subtextLink?: string;
    buttonText?: string;
    shouldShowLoader?: boolean;
    onClick?: () => void;
};

export enum ConfirmAddWalletStatus {
    INITIALIZING = 'INITIALIZING',
    FAILED = 'FAILED',
}

export type ConfirmAddWalletPopupData = {
    name: string;
    description: string;
    status: ConfirmAddWalletStatus;
};

export type RemoveSnackbar = {
    id: string;
};

export type SnackbarStateItem = {
    lifeSpan?: number;
    text: string;
    link?: string;
    linkText?: string;
    iconType?: IconType;
};

export interface UiState {
    isSelectPair: boolean;
    currentTradeTab: string;
    favoritePairs: string[];
    numberFormat: Dictionary<NumberFormat>;
    currentPopup?: POPUP_TYPE;
    snackbars: (SnackbarStateItem & RemoveSnackbar)[];
    swalPopup: SwalPopupData;
    confirmAddWalletPopup: ConfirmAddWalletPopupData;
    buySellOrderData?: OrderData;
    buySellSide: Side,
    buySellType: OrderType,
}

const initialState: UiState = {
    isSelectPair: false,
    currentTradeTab: 'buySell',
    favoritePairs: (localStorage.getItem('favoritePairs') || '').split(','),
    numberFormat: {} as Dictionary<NumberFormat>,
    snackbars: [],
    swalPopup: {
        text: '',
        title: '',
        subtext: '',
        buttonText: '',
        shouldShowLoader: false,
    },
    confirmAddWalletPopup: {
        name: '',
        description: '',
        status: ConfirmAddWalletStatus.INITIALIZING,
    },
    buySellSide: Side.BUY,
    buySellType: OrderType.MARKET,
}

const uiReducer = (state = initialState, action: any): UiState => {
    switch (action.type) {
        case TOGGLE_PAIR_SELECTOR:
            return {
                ...state,
                isSelectPair: !state.isSelectPair
            };
        case HIDE_PAIR_SELECTOR:
            return {
                ...state,
                isSelectPair: false
            };
        case HIDE_ALL_POPUPS:
            return {
                ...state,
                isSelectPair: false,
                currentPopup: undefined
            };
        case SET_TRADE_TAB:
            return {
                ...state,
                currentTradeTab: action.payload
            };
        case TOGGLE_FAVORITE_PAIR:
            const {pairName, newIsFavorite} = action.payload;

            const index = state.favoritePairs.indexOf(pairName);
            const newFavoritePairs = state.favoritePairs.concat();
            if (newIsFavorite) {
                if (index === -1) {
                    newFavoritePairs.push(pairName);
                }
            } else {
                if (index > -1) {
                    newFavoritePairs.splice(index, 1);
                }
            }
            localStorage.setItem('favoritePairs', newFavoritePairs.join(','));
            return {
                ...state,
                favoritePairs: newFavoritePairs
            };

        case SET_BUY_SELL_ORDER_DATA:
            return {
                ...state,
                buySellOrderData: action.payload,
                currentTradeTab: 'buySell',
            };

        case SET_BUY_SELL_SIDE:
            return {
                ...state,
                buySellSide: action.payload,
            };

        case SET_BUY_SELL_TYPE:
            return {
                ...state,
                buySellType: action.payload,
                buySellOrderData: action.payload === OrderType.MARKET ? undefined : state.buySellOrderData
            };

        case SET_NUMBER_FORMAT:
            return {
                ...state,
                numberFormat: action.payload
            };

        case OPEN_POPUP:
            return {
                ...state,
                currentPopup: action.payload
            };

        case SET_SWAL_POPUP_DATA:
            return {
                ...state,
                swalPopup: action.payload,
            };

        case SET_CONFIRM_ADD_WALLET_POPUP_DATA:
            return {
                ...state,
                confirmAddWalletPopup: action.payload,
            };

        case CLOSE_POPUP:
            return {
                ...state,
                currentPopup: undefined
            };
        case PUSH_SNACKBAR:
            const id = new Date().getTime().toString();
            const lifeSpan = 5000;

            return {
                ...state,
                snackbars: [
                    ...state.snackbars,
                    {
                        id,
                        lifeSpan,
                        ...action.payload,
                    },
                ],
            };
        case REMOVE_SNACKBAR:
            return {
                ...state,
                snackbars: state.snackbars.filter(({id}) => {
                    return id !== action.payload.id;
                }),
            };

        default: {
            return state;
        }
    }
}

export default uiReducer;
