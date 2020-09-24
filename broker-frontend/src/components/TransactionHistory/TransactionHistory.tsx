import React, {useEffect, useState} from "react";
import TransactionHistoryTable from "./TransactionHistoryTable";
import './TransactionHistory.css';
import {parseTransaction, Transaction} from "../../Model";
import {httpGet} from "../../Utils";
import {useSelector} from "react-redux";
import {getAddress} from "../../redux/selectors";

export default function TransactionHistory() {
    const [deposits, setDeposits] = useState([] as Transaction[]);
    const [withdraws, setWithdraws] = useState([] as Transaction[]);
    const [isLoading, setIsLoading] = useState(true);
    const walletAddress = useSelector(getAddress);

    const getData = () => {
        const address = walletAddress;

        if (!address) {
            setWithdraws([]);
            setDeposits([]);
        } else {
            httpGet(process.env.REACT_APP_ORION_WAN! + '/api/history/' + address)
                .then((dataText: string) => {
                    const data = JSON.parse(dataText);
                    console.log('TransactionHistory Json', data)
                    const newDeposits: Transaction[] = [];
                    const newWithdraws: Transaction[] = [];

                    for (let item of data) {
                        const tx = parseTransaction(item);

                        if (item.type === 'deposit') {
                            newDeposits.push(tx);
                        } else if (item.type === 'withdrawl' || item.type === 'withdrawal') {
                            newWithdraws.push(tx);
                        }
                    }

                    setDeposits(newDeposits);
                    setWithdraws(newWithdraws);
                    setIsLoading(false);
                })
                .catch(error => console.error('Transaction History', error))
        }
    }

    useEffect(() => {
        const interval = setInterval(() => getData(), 10000);

        getData();

        return () => clearInterval(interval);
    }, [walletAddress]);

    return (
        <>
            <div className="transactionHistory_col col-50">
                <div className="row-100">
                    <TransactionHistoryTable isDeposit items={deposits} isLoading={isLoading}/>
                </div>
            </div>
            <div className="transactionHistory_col col-50">
                <div className="row-100">
                    <TransactionHistoryTable isDeposit={false} items={withdraws} isLoading={isLoading}/>
                </div>
            </div>
        </>
    );
}
