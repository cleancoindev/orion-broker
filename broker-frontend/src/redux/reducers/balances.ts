import {Dictionary} from "../../Model";
import {CLEAR_BALANCES, DISCONNECT_WALLETS, SET_BALANCES} from "../actions";
import BigNumber from "bignumber.js";

const initialState = {
    wallet: {} as Dictionary<BigNumber>,
    contract: {} as Dictionary<BigNumber>,
    inOrder: {} as Dictionary<BigNumber>,
    loaded: false
}

const mergeBalances = (oldBalances: Dictionary<BigNumber>, newBalances: Dictionary<BigNumber>): Dictionary<BigNumber> => {
    for (let key in newBalances) {
        if (newBalances.hasOwnProperty(key)) {
            oldBalances[key] = newBalances[key];
        }
    }
    return oldBalances;
}

const balancesReducer = (state = initialState, action: any) => {
    switch (action.type) {
        case CLEAR_BALANCES:
        case DISCONNECT_WALLETS:
            return {
                wallet: {},
                contract: {},
                inOrder: {},
                loaded: false
            };

        case SET_BALANCES: {
            return {
                wallet: mergeBalances(state.wallet, action.balances.wallet),
                contract: mergeBalances(state.contract, action.balances.contract),
                inOrder: mergeBalances(state.inOrder, action.balances.inOrder),
                loaded: true
            };
        }

        default: {
            return state;
        }
    }
}

export default balancesReducer;
