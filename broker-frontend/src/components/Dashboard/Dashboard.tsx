import React, {useState, useEffect} from 'react';
import styles from "./Dashboard.module.css";
import {DashboardTotalBalance} from "./DashboardTotalBalance/DashboardTotalBalance";
import {DashboardTable} from "./DashboardTable/DashboardTable";
import {LoadingIcon} from "@orionprotocol/orion-ui-kit";
import BigNumber from "bignumber.js";
import {Dictionary} from '../../Model';
import {BrokerApi} from '../../BrokerApi';

interface DashboardProps {
    onSetCurrentPair: (pairName: string) => void;
    onDisconnectClick: () => void;
}

export default function Dashboard(props: DashboardProps) {
    const [balances, setBalances] = useState({} as Dictionary<Dictionary<BigNumber>>);
    const [isLoading, setIsLoading] = useState(true);

    const getData = () => {
        BrokerApi.getBalances()
            .then((data) => {
                const newBalances: Dictionary<Dictionary<BigNumber>> = {};

                for (let exchange in data) {
                    for (let currency in data[exchange]) {
                        if (!newBalances[currency]) {
                            newBalances[currency] = {};
                        }
                        newBalances[currency][exchange] = new BigNumber(data[exchange][currency]);
                    }
                }

                console.log('BALANCES', newBalances)

                setBalances(newBalances);
                setIsLoading(false);
            })
            .catch(error => console.error('Balances', error))
    }

    useEffect(() => {
        const interval = setInterval(() => getData(), 10000);

        getData();

        return () => clearInterval(interval);
    }, []);

    return (
        isLoading ?
            <LoadingIcon/> :
            <div className={styles.root}>
                <div className={styles.left}>
                    <DashboardTotalBalance balances={balances} inUsd={true}/>
                </div>
                <div className={styles.right}>
                    <DashboardTable balances={balances} onSetCurrentPair={props.onSetCurrentPair}/>
                </div>
            </div>
    );
}
