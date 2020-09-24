import React, {FC, useContext, useEffect} from "react";

import {Redirect, Route, Switch, useHistory, useLocation} from "react-router-dom";
import {hideAllPopups, setPairs} from "./redux/actions";
import Dashboard from "./components/Dashboard/Dashboard";
import {LeftSidebar} from "./components/LeftSidebar/LeftSidebar";
import Trade from "./components//Trade/Trade";
import {Dictionary, Pair, parsePair} from "./Model";
import BigNumber from "bignumber.js";
import {PromptPopup} from "./components/PromptPopup/PromptPopup";
import {Notify} from "./components/Notify/Notify";
import {Theme, THEME} from "./components/Theme";
import WebsocketHeartbeatJs from "./WebsocketHeartbeatJs";
import {useDispatch, useSelector, useStore} from "react-redux";
import {
    getAddWalletVisible,
    getCurrentPairName,
    getCurrentTradeTab,
    getNumberFormat,
    getPairSelectorVisible,
    getPromptProps
} from "./redux/selectors";

let pairsWebSocket: any = null;
let lastBalancesAddressSended: string = '';

export const App: FC = () => {
    const dispatch = useDispatch();
    const history = useHistory();
    const location = useLocation();
    const {theme} = useContext(Theme);

    const store = useStore().getState();
    const isPairSelectorVisible = useSelector(getPairSelectorVisible);
    const isAddWalletVisible = useSelector(getAddWalletVisible);
    const promptProps = useSelector(getPromptProps);
    const currentTradeTab = useSelector(getCurrentTradeTab);
    const numberFormat = useSelector(getNumberFormat);
    const currentPairName = useSelector(getCurrentPairName);

    const onModalClick = (e?: React.MouseEvent) => {
        if (e) {
            let target: HTMLElement | null = e.target as HTMLElement;
            while (target) {
                if (target.classList.contains('tradePairSelector') || target.classList.contains('promptPopup')) {
                    return;
                }
                target = target.parentElement;
            }
        }
        dispatch(hideAllPopups());
    }

    const setPairsWebsocket = () => {
        pairsWebSocket = new WebsocketHeartbeatJs({
            url: process.env.REACT_APP_URL_WS2! + '/allTickers'
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
    }

    useEffect(() => {
        setPairsWebsocket();
    }, []);


    return (
        <div id="mainContainer"
             className={`${theme === THEME.DARK ? 'dark' : ''}  ${'tradeTab_' + currentTradeTab}`}>

            <LeftSidebar onDisconnectWallet={onDisconnectWallet}/>
            <div id="main">
                <Switch>
                    <Route path="/dashboard">
                        <Dashboard
                            />
                    </Route>
                    <Route path="/stats">
                        <Trade />
                    </Route>
                    <Redirect from="/" to={`/stats`}/>
                </Switch>
            </div>

            <div id="modalContainer"
                 className={`${isPairSelectorVisible ? 'visible-no-anim' : ''} ${isAddWalletVisible || promptProps ? 'visible' : ''}`}
                 onClick={onModalClick}>
                {
                    promptProps &&
                    <PromptPopup props={promptProps} onClose={() => onModalClick(undefined)}/>
                }
            </div>
            <Notify/>
        </div>
    );
}
