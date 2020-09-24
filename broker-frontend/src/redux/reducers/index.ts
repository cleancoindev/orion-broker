import {combineReducers} from "redux";
import balancesReducer from "./balances";
import {pairsReducer} from "./pairs";
import uiReducer from "./ui";
import walletsReducer from "./wallets";

export default combineReducers({
    balances: balancesReducer,
    pairs: pairsReducer,
    ui: uiReducer,
    wallets: walletsReducer,
});
