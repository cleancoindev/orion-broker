import {combineReducers} from "redux";
import orderbookReducer from "./orderbook"
import balancesReducer from "./balances";
import {pairsReducer} from "./pairs";
import uiReducer from "./ui";

export default combineReducers({
    orderbook: orderbookReducer,
    balances: balancesReducer,
    pairs: pairsReducer,
    ui: uiReducer,
});
