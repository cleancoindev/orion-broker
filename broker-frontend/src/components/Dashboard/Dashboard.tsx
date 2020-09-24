import React, {useEffect, useState} from "react";
import "./Dashboard.css";
import "./DashboardTotalBalance.css";
import "./DashboardWallets.css";
import "./DashboardWalletItem.css";
import "./DashboardTable.css";
import {DashboardTotalBalance} from "./DashboardTotalBalance";
import {DashboardWallets} from "./DashboardWallets";
import {DashboardTable} from "./DashboardTable";
import BigNumber from "bignumber.js";
import {LoadingIcon} from "../Table/Loading";
import {useSelector} from "react-redux";
import {getBalancesLoaded, getPairsLoaded} from "../../redux/selectors";
import {Dictionary, parseTradeOrder, TradeOrder} from "../../Model";
import {EXCHANGES, httpGet} from "../../Utils";

interface DashboardProps {

}

export default function Dashboard(props: DashboardProps) {
    const pairsLoaded = useSelector(getPairsLoaded);

    const [balances, setBalances] = useState({} as Dictionary<Dictionary<BigNumber>>);
    const [isLoading, setIsLoading] = useState(true);

    const getData = () => {
        httpGet((window as any).BROKER_URL + '/api/balance')
            .then((dataText: string) => {
                const data = JSON.parse(dataText);
                console.log('Balances Json', data)

                const newBalances: Dictionary<Dictionary<BigNumber>> = {};

                for (let exchange in data) {
                    for (let currency in data[exchange]) {
                        if (!newBalances[currency]) {
                            newBalances[currency] = {};
                            for (let e of EXCHANGES) {
                                newBalances[currency][e] = new BigNumber(0);
                            }
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
            <div className="dashboard">
                <div className="col-dashboard-left">
                    <div className="row-100">
                        <DashboardTotalBalance balances={balances} />
                    </div>
                </div>
                <div className="col-dashboard-right">
                    <div className="row-grow dashboard_row-grow">
                        <DashboardTable balances={balances} />
                    </div>
                </div>
            </div>
    );
}
