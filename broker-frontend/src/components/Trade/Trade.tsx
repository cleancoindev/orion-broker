import React, {useEffect, useState} from 'react';
import {TradeHistory} from "./TradeHistory/TradeHistory";
import {TradeOrder, Dictionary, parseTradeOrder} from "../../Model";
import {useSelector} from "react-redux";
import {getCurrentTradeTab} from "../../redux/selectors";
import styles from "./Trade.module.css"
import cn from "classnames";
import {DashboardTotalBalance} from '../Dashboard/DashboardTotalBalance/DashboardTotalBalance';
import BigNumber from 'bignumber.js';
import {BrokerApi} from '../../BrokerApi';

export default function Trade() {
    const currentTradeTab = useSelector(getCurrentTradeTab);
    const [items, setItems] = useState([] as TradeOrder[]);
    const [profits, setProfits] = useState({} as Dictionary<Dictionary<BigNumber>>);
    const [isLoading, setIsLoading] = useState(true);

    const getData = () => {
        setIsLoading(true);
        BrokerApi.getTradeHistory()
            .then((data) => {
                let newProfits: Dictionary<Dictionary<BigNumber>> = {};

                console.log('Trade History Json', data)
                const orders: TradeOrder[] = [];

                for (let item of data) {
                    const order = parseTradeOrder(item);

                    orders.push(order);
                    if (order.status === "FILLED") {
                        const profit = order.total.multipliedBy(0.02);
                        if (!newProfits[order.toCurrency]) {
                            newProfits[order.toCurrency] = {};
                        }

                        if (!newProfits[order.toCurrency][order.exchange]) {
                            newProfits[order.toCurrency] = {
                                [order.exchange]: new BigNumber(0),
                            }
                        }
                        newProfits[order.toCurrency][order.exchange] = newProfits[order.toCurrency][order.exchange].plus(profit);
                    }
                }

                setItems(orders);
                setProfits(newProfits);
                setIsLoading(false);
            })
            .catch(error => console.error('Trade History', error))
    }

    useEffect(() => {
        const interval = setInterval(() => getData(), 10000);

        getData();

        return () => clearInterval(interval);
    }, []);

    return (
        <div className={cn(styles.root, styles[currentTradeTab])}>
            <div className={styles.colLeft}>
                <div className={styles.tradeBuySell}>
                    <DashboardTotalBalance balances={profits} />
                </div>
            </div>
            <div className={styles.colMiddle}>
                <div className={styles.tradeHistoryRow}>
                    <TradeHistory items={items} isLoading={isLoading}/>
                </div>
            </div>
        </div>
    );
}
