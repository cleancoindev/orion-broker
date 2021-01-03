import {ConfirmAddWalletPopupData, RemoveSnackbar, SwalPopupData} from "../reducers/ui";
import {IconType} from "@orionprotocol/orion-ui-kit";
import {Dictionary, NumberFormat, OrderData, OrderType, Side} from "../../Model";

export const REMOVE_SNACKBAR = 'REMOVE_SNACKBAR';
export const PUSH_SNACKBAR = 'PUSH_SNACKBAR';
export const OPEN_POPUP = 'OPEN_POPUP';
export const CLOSE_POPUP = 'CLOSE_POPUP';
export const SET_SWAL_POPUP_DATA = 'SWAL_POPUP_DATA';
export const SET_CONFIRM_ADD_WALLET_POPUP_DATA = 'SET_CONFIRM_ADD_WALLET_POPUP_DATA';

export const TOGGLE_PAIR_SELECTOR = 'TOGGLE_PAIR_SELECTOR';
export const HIDE_PAIR_SELECTOR = 'HIDE_PAIR_SELECTOR';

export const HIDE_ALL_POPUPS = 'HIDE_ALL_POPUPS';

export const SET_TRADE_TAB = 'SET_TRADE_TAB';

export const TOGGLE_FAVORITE_PAIR = 'TOGGLE_FAVORITE_PAIR';
export const SET_BUY_SELL_ORDER_DATA = 'SET_BUY_SELL_ORDER_DATA';
export const SET_BUY_SELL_SIDE = 'SET_BUY_SELL_SIDE';
export const SET_BUY_SELL_TYPE = 'SET_BUY_SELL_TYPE';

export const SET_NUMBER_FORMAT = 'SET_NUMBER_FORMAT';

export const hidePairSelector = () => ({
    type: HIDE_PAIR_SELECTOR,
});

export const hideAllPopups = () => ({
    type: HIDE_ALL_POPUPS,
});

export const togglePairSelector = () => ({
    type: TOGGLE_PAIR_SELECTOR,
});

export const toggleFavoritePair = (pairName: string, newIsFavorite: boolean) => ({
    type: TOGGLE_FAVORITE_PAIR,
    payload: {pairName, newIsFavorite}
});

export const setTradeTab = (tab: string) => ({
    type: SET_TRADE_TAB,
    payload: tab
});

export const setBuySellOrderData = (orderData: OrderData | undefined) => ({
    type: SET_BUY_SELL_ORDER_DATA,
    payload: orderData
});

export const setBuySellSide = (side: Side) => ({
    type: SET_BUY_SELL_SIDE,
    payload: side
});

export const setBuySellType = (type: OrderType) => ({
    type: SET_BUY_SELL_TYPE,
    payload: type
});

export const setNumberFormat = (numberFormat: Dictionary<NumberFormat>) => ({
    type: SET_NUMBER_FORMAT,
    payload: numberFormat
});

export const openPopup = (payload: string) => ({
    type: OPEN_POPUP,
    payload,
});

export const closePopup = (payload: string) => ({
    type: CLOSE_POPUP,
    payload,
});

export const setSwalPopupData = (payload: SwalPopupData) => ({
    type: SET_SWAL_POPUP_DATA,
    payload,
});

export const setConfirmAddWalletPopupData = (payload: ConfirmAddWalletPopupData) => ({
    type: SET_CONFIRM_ADD_WALLET_POPUP_DATA,
    payload,
});

export const pushSnackbar = (
    text: string,
    iconType?: IconType,
    link?: string,
    linkText?: string,
    lifeSpan = 5000,
) => ({
    type: PUSH_SNACKBAR,
    payload: {
        text,
        iconType,
        link,
        linkText,
        lifeSpan,
    },
});

export const removeSnackbar = (payload: RemoveSnackbar) => ({
    type: REMOVE_SNACKBAR,
    payload,
});
