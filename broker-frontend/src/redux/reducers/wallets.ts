export interface CurrencyWallet {
    walletType: string;
    address: string;
}

const initialState = {
    wallets: {}
}

const walletsReducer = (state = initialState, action: any) => {
    switch (action.type) {

        default: {
            return state;
        }
    }
}

export default walletsReducer;
