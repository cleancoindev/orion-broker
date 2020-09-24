import {Dictionary} from "../../Model";
import {CLEAR_BALANCES, SET_BALANCES} from "../actions";
import BigNumber from "bignumber.js";

const initialState = {
    wallet: {} as Dictionary<BigNumber>,
    contract:  {} as Dictionary<BigNumber>,
    loaded: false
}

const mergeBalances = (oldBalances: Dictionary<BigNumber>, newBalances: Dictionary<BigNumber>): Dictionary<BigNumber> => {
    for (let key in newBalances) {
        oldBalances[key] = newBalances[key];
    }
    return oldBalances;
}

const balancesReducer = (state = initialState, action: any) => {
    switch (action.type) {
        case CLEAR_BALANCES:
            return {
                wallet: {},
                contract: {},
                loaded: false
            };

        case SET_BALANCES: {
            return {
                wallet: mergeBalances(state.wallet, action.balances.wallet),
                contract: mergeBalances(state.contract, action.balances.contract),
                loaded: true
            };
        }

        default: {
            return state;
        }
    }
}

export default balancesReducer;
