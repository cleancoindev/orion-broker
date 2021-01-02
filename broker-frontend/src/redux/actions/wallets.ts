export const CLEAR_WALLETS = 'CLEAR_WALLETS';
export const SET_WALLET = 'SET_WALLET';
export const DISCONNECT_WALLETS = 'DISCONNECT_WALLETS';

export const clearWallets = () => ({
    type: CLEAR_WALLETS,
});

export const disconnectWallets = () => ({
    type: DISCONNECT_WALLETS,
});

export const setWallet = (currency: string, walletType: string, address: string) => ({
    type: SET_WALLET,
    payload: {currency, address, walletType}
});
