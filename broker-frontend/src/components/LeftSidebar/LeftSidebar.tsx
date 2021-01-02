import React, {FC} from 'react';
import {useHistory, useLocation} from "react-router-dom";
import {Icon, Sidebar} from "@orionprotocol/orion-ui-kit";
import {useDispatch, useSelector} from "react-redux";
import {hidePairSelector, togglePairSelector} from "../../redux/actions";
import {getCurrentPair} from "../../redux/selectors";
import styles from "./LeftSidebar.module.css";

type Props = {
    onDisconnectWallet: () => void;
};

const MobileSidebar: FC = () => {
    const dispatch = useDispatch();
    const currentPair = useSelector(getCurrentPair);
    const location = useLocation();

    return <>
        <div className={styles.selector}>
            {
                location.pathname.indexOf('/stats') > -1 && (
                    <div className={styles.selectorInner}
                         onClick={() => dispatch(togglePairSelector())}>
                        {currentPair.fromCurrency} <span
                        className={styles.slash}>/</span> {currentPair.toCurrency}
                        <Icon icon="dropdown"/>
                    </div>
                )
            }
        </div>
    </>
}

export const LeftSidebar: FC<Props> = () => {
    const dispatch = useDispatch();
    const location = useLocation();
    const history = useHistory()

    const onClose = () => {
        dispatch(hidePairSelector());
    }

    const link = (path: TemplateStringsArray) => () => history.push(path[0])

    return <Sidebar onClose={onClose} mobile={<MobileSidebar/>} buttons={[
        {
            name: 'trading_terminal',
            selected: location.pathname.indexOf('/stats') > -1,
            icon: 'terminal',
            onClick: link`/`
        },
        {
            name: 'dashboard',
            selected: location.pathname === '/dashboard',
            icon: 'dashboard',
            onClick: link`/dashboard`
        },
    ]}/>
}
