import React, {useEffect, useState} from "react";
import {TradeHistory} from "./TradeHistory";
import "./Trade.css"
import {DashboardTotalProfit} from "../Dashboard/DashboardTotalProfit";
import {httpGet} from "../../Utils";
import {Dictionary, parseTradeOrder, TradeOrder} from "../../Model";
import BigNumber from "bignumber.js";
import {Stats} from "fs";

interface TradeProps {
}

export default function Trade(props: TradeProps) {
    const [items, setItems] = useState([] as TradeOrder[]);
    const [profits, setProfits] = useState({} as Dictionary<BigNumber>);
    const [isLoading, setIsLoading] = useState(true);

    const getData = () => {
        setIsLoading(true);
        httpGet((window as any).BROKER_URL + '/api/orderhistory')
            .then((dataText: string) => {
                let newProfits: Dictionary<BigNumber> = {};

                const data = JSON.parse(dataText);
                console.log('Trade History Json', data)
                const orders: TradeOrder[] = [];

                for (let item of data) {
                    const order = parseTradeOrder(item);
                    orders.push(order);
                    if (order.status === "FILLED") {
                        const profit = order.total.multipliedBy(0.02);
                        if (!newProfits[order.toCurrency]) {
                            newProfits[order.toCurrency] = new BigNumber(0);
                        }
                        newProfits[order.toCurrency] = newProfits[order.toCurrency].plus(profit);
                    }
                }

                console.log('ORDERS', orders)

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
        <div className="dashboard">
            <div className="col-dashboard-left">
                <div className="row-100">
                    <DashboardTotalProfit profits={profits} />
                </div>
            </div>
            <div className="col-dashboard-right">
                <div className="row-grow dashboard_row-grow">
                    <TradeHistory items={items} isLoading={isLoading}/>
                </div>
            </div>
        </div>
    )
}
