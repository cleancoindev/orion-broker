import {createSelector} from "@reduxjs/toolkit";
import {Dictionary, getDefaultPair, Orderbook, Pair} from "../../Model";
import {CurrencyWallet} from "../reducers/wallets";
import {DEFAULT_PAIR} from "../reducers/pairs";

// pairs

export const getPairs = (store: any): Dictionary<Pair> => store.pairs.nameToPair;

export const getCurrentPairName = (store: any): string => store.pairs.currentPairName;

export const getCurrentPair = (store: any, defaultPairName?: string): Pair => store.pairs.nameToPair[store.pairs.currentPairName] || getDefaultPair(defaultPairName || DEFAULT_PAIR);

export const getAssets = (store: any): string[] => store.pairs.assets;

export const getCurrencies = (store: any): string[] => store.pairs.currencies;

export const getPairsLoaded = (store: any): boolean => store.pairs.loaded;

export const getPairsInitialized = (store: any): boolean => store.pairs.initialized;

// balances

export const getBalances = (store: any) => store.balances;

export const getBalancesLoaded = (store: any): boolean => store.balances.loaded;

// wallets

export const getLogged = (store: any): boolean => store.wallets.wallets['ETH'] !== undefined;

export const getWallets = (store: any) => store.wallets;

export const getWallet = (store: any): (CurrencyWallet | null) => {
    return store.wallets.wallets['ETH'] || null;
}

export const getWalletType = createSelector(getWallet, (wallet) => wallet?.walletType)

export const getAddress = (store: any): (string | null) => {
    const wallet: CurrencyWallet = store.wallets.wallets['ETH'];
    if (!wallet) return null;
    return wallet.address;
}
