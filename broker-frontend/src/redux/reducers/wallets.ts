import {Dictionary} from "../../Model";
import {CLEAR_WALLETS, DISCONNECT_WALLETS, SET_WALLET} from "../actions";
import Web3 from "web3";
import {Api} from "../../Api";
import {OrionBlockchain} from "../../OrionBlockchain";

export interface CurrencyWallet {
    walletType: string;
    address: string;
}

const getInitWallets = (): Dictionary<CurrencyWallet> => {
    const wallets: Dictionary<CurrencyWallet> = {};
    const isWidget = window.location.pathname.indexOf('/widget') === 0;
    if (!isWidget && localStorage.getItem('ETH_connected') === 'true') {
        const walletType = localStorage.getItem('ETH_walletType');
        if (!walletType) return {};
        const address = localStorage.getItem('ETH_address');
        if (!address) return {};
        wallets['ETH'] = {walletType, address: Web3.utils.toChecksumAddress(address)}
    }
    return wallets;
}

const initialState = {
    wallets: getInitWallets()
}

const walletsReducer = (state = initialState, action: any) => {
    switch (action.type) {
        case DISCONNECT_WALLETS:
        case CLEAR_WALLETS:
            localStorage.removeItem('ETH_connected');
            localStorage.removeItem('ETH_walletType');
            localStorage.removeItem('ETH_address');
            state.wallets = {};
            return state;

        case SET_WALLET:
            const walletType = action.payload.walletType;
            const address = Web3.utils.toChecksumAddress(action.payload.address);

            localStorage.setItem('ETH_connected', 'true');
            localStorage.setItem('ETH_walletType', walletType);
            localStorage.setItem('ETH_address', address);
            state.wallets['ETH'] = {walletType, address}

            if (Api.orionBlockchain) {
                Api.orionBlockchain.destroy();
            }
            Api.orionBlockchain = new OrionBlockchain(address, walletType);
            Api.orionBlockchain.subscribeBalanceUpdates(Api.onWalletBalanceChange);
            return state;

        default: {
            return state;
        }
    }
}

export default walletsReducer;
