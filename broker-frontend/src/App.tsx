import React, {FC, useContext, useEffect} from "react";

import {Redirect, Route, Switch, useHistory, useLocation} from "react-router-dom";
import {
    clearOrderbook,
    disconnectWallets,
    hidePairSelector,
    removeSnackbar,
    setAsksBids,
    setCurrentPair,
    setPairs,
} from "./redux/actions";
import Dashboard from "./components/Dashboard/Dashboard";
import Trade from "./components/Trade/Trade";
import {formatPairPrice} from "./Utils";
import {Dictionary, Pair, parseOrderbookItem, parsePair} from "./Model";
import {Snackbars, THEME, Theme} from "@orionprotocol/orion-ui-kit";
import WebsocketHeartbeatJs from "./WebsocketHeartbeatJs";
import {useDispatch, useSelector} from "react-redux";
import {
    getCurrentPairName,
    getNumberFormat,
    getSnackbars,
} from "./redux/selectors";
import styles from "./App.module.css";
import cn from "classnames";
import {LeftSidebar} from "./components/LeftSidebar/LeftSidebar";

let orderBookWebSocket: any = null;
let priceWebSocket: any = null;
let pairsWebSocket: any = null;
let lastBalancesAddressSended: string = '';

export const App: FC = () => {
    const dispatch = useDispatch();
    const history = useHistory();
    const location = useLocation();
    const {theme} = useContext(Theme);

    const snackbars = useSelector(getSnackbars);
    const onCloseSnackbar = (id: string) => dispatch(removeSnackbar({id}));

    const numberFormat = useSelector(getNumberFormat);
    const currentPairName = useSelector(getCurrentPairName);

    /**
     * @param symbol    "ETH-BTC"
     */
    const loadOrderbook = (symbol: string) => {
        if (priceWebSocket !== null) {
            priceWebSocket.onmessage = null;
            priceWebSocket.close();
            priceWebSocket = null;
        }

        priceWebSocket = new WebsocketHeartbeatJs({
            url: process.env.REACT_APP_PRICE_FEED_WS + '/ticker/' + symbol
        });

        priceWebSocket.onmessage = (data: any) => {
            if (data.data === 'pong') return;
            const ticketsData: any[] = JSON.parse(data.data);
            const pair = parsePair(ticketsData[1]);
            dispatch(setPairs({
                [pair.name]: pair
            }));
        }

        if (orderBookWebSocket !== null) {
            orderBookWebSocket.onmessage = null;
            orderBookWebSocket.close();
            orderBookWebSocket = null;
        }

        orderBookWebSocket = new WebsocketHeartbeatJs({
            url: process.env.REACT_APP_AGGREGATOR_WS! + '/' + symbol
        });

        orderBookWebSocket.onmessage = (data: any) => {
            if (data.data === 'pong') return;
            const orderbookData: any = JSON.parse(data.data);
            // console.log('WS ORDERBOOK', orderbookData);

            dispatch(setAsksBids(
                orderbookData.asks.map(parseOrderbookItem),
                orderbookData.bids.map(parseOrderbookItem)
            ));
        }
    };

    const setPairsWebsocket = () => {
        pairsWebSocket = new WebsocketHeartbeatJs({
            url: process.env.REACT_APP_PRICE_FEED_WS! + '/allTickers'
        });
        pairsWebSocket.onmessage = (data: any) => {
            if (data.data === 'pong') return;
            const ticketsData: any[] = JSON.parse(data.data);
            // console.log('tickets', ticketsData);
            const newNameToPair: Dictionary<Pair> = {};
            for (let i = 1; i < ticketsData.length; i++) {
                const arr: string[] = ticketsData[i];
                const pair = parsePair(arr);
                newNameToPair[pair.name] = pair;
            }
            dispatch(setPairs(newNameToPair));
        }
    }

    const onDisconnectWallet = () => {
        lastBalancesAddressSended = '';
        dispatch(disconnectWallets());
        if (location.pathname !== '/widget') {
            history.push('/trade/' + currentPairName);
        }
    }

    useEffect(() => {
        loadOrderbook(currentPairName);
        setPairsWebsocket();
    }, []);

    const changeCurrentPair = (pairName: string) => {
        console.log('changeCurrentPair', pairName)
        dispatch(hidePairSelector());

        if (currentPairName !== pairName) {
            dispatch(setCurrentPair(pairName));
            dispatch(clearOrderbook());
            loadOrderbook(pairName);
        }
        history.push('/trade/' + pairName);
    }

    return (
        <div className={cn(styles.mainContainer, {"dark": theme === THEME.DARK})}>
            <LeftSidebar onDisconnectWallet={onDisconnectWallet}/>
            <div className={styles.main}>
                <Switch>
                    <Route path="/dashboard">
                        <Dashboard
                            onSetCurrentPair={changeCurrentPair}
                            onDisconnectClick={onDisconnectWallet}/>
                    </Route>
                    <Route path="/stats">
                        <Trade/>
                    </Route>
                    <Redirect from="/" to={`/stats`}/>
                </Switch>
            </div>

            <Snackbars snackbars={snackbars} onClose={onCloseSnackbar}/>
        </div>
    );
}
