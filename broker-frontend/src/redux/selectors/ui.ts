import {createSelector} from "@reduxjs/toolkit";
import {UiState} from "../reducers/ui";

export const getUi = (store: any): UiState => {
    return store.ui;
};

export const getPairSelectorVisible = createSelector(getUi, (ui) => ui.isSelectPair);

export const getAddWalletVisible = createSelector(getUi, (ui) => ui.isAddWalletPopup);

export const getPromptProps = createSelector(getUi, (ui) => ui.promptProps);

export const getNotifyText = createSelector(getUi, (ui) => ui.notifyText);

export const getFavoritePairs = createSelector(getUi, (ui) => ui.favoritePairs);

export const getCurrentPairIsFavorite = (store: any) => store.ui.favoritePairs.indexOf(store.pairs.currentPairName) > -1;

export const getCurrentTradeTab = createSelector(getUi, (ui) => ui.currentTradeTab);

export const getBuySellOrderData = createSelector(getUi, (ui) => ui.buySellOrderData);

export const getBuySellSide = createSelector(getUi, (ui) => ui.buySellSide);

export const getBuySellType = createSelector(getUi, (ui) => ui.buySellType);

export const getNumberFormat = createSelector(getUi, (ui) => ui.numberFormat);

export const getPopups = createSelector(getUi, (ui) => ui.popups);
