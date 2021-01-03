import React, {FC} from "react";
import BigNumber from "bignumber.js";
import {Doughnut} from 'react-chartjs-2';
import {CURRENCY_DEFAULT_COLOR, formatNumber, formatUsd, getCurrencyColor, getUsdPrice} from "../../../Utils";
import {Trans} from "@lingui/macro";
import {useSelector} from "react-redux";
import {getCurrencies, getPairs} from "../../../redux/selectors";
import {CurrencyIcon} from "@orionprotocol/orion-ui-kit";
import styles from "./DashboardTotalBalance.module.css";
import {Dictionary} from '../../../../../broker-frontend/src/Model';

interface DashboardTotalBalanceItemProps {
    name: string;
    value: BigNumber;
}

function DashboardTotalBalanceItem(props: DashboardTotalBalanceItemProps) {
    return (
        <div className={styles.balanceRow}>
            <CurrencyIcon icon={props.name} type='color' className={styles.balanceRowIcon}/>
            <div className={styles.balanceRowName}>{props.name}</div>
            <div className={styles.balanceRowValue}>{formatNumber(props.value, 8)}</div>
        </div>
    )
}

type Props = {
    balances: Dictionary<Dictionary<BigNumber>>
};

const chartOptions = {
    cutoutPercentage: 85,
    legend: {
        display: false
    }
}

export const DashboardTotalBalance: FC<Props> = (props) => {
    const nameToPair = useSelector(getPairs);
    const currencies = useSelector(getCurrencies);

    const chartData = {
        datasets: [{
            data: [] as number[],
            backgroundColor: [] as string[],
            borderWidth: 0
        }],
        labels: [] as string[]
    };

    let totalUsd = new BigNumber(0);
    let balancesArr = [];
    for (let name of currencies) {

        let balance = new BigNumber(0);
        const balances = props.balances[name];
        for (let exchange in balances) {
            balance = balance.plus(balances[exchange])
        }

        if (balance.eq(0)) {
            continue;
        }

        const usdPrice = getUsdPrice(name, nameToPair);
        const balanceInUsd = balance.multipliedBy(usdPrice);
        balancesArr.push({
            name,
            balance,
            balanceInUsd
        });
        totalUsd = totalUsd.plus(balanceInUsd);
    }

    balancesArr = balancesArr.sort((a, b) => b.balanceInUsd.minus(a.balanceInUsd).toNumber());

    const rows = [];
    for (let item of balancesArr) {
        chartData.datasets[0].data.push(item.balanceInUsd.toNumber());
        rows.push(<DashboardTotalBalanceItem key={item.name} name={item.name} value={item.balance}/>)
    }

    chartData.datasets[0].backgroundColor = balancesArr.map(b => getCurrencyColor(b.name));
    chartData.labels = balancesArr.map(b => b.name);

    if (!chartData.datasets[0].data.filter(n => n !== 0).length) {
        chartData.datasets[0].backgroundColor = [CURRENCY_DEFAULT_COLOR];
        chartData.datasets[0].data = [1];
    }

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <Trans id="total_balance">
                    Total Balance
                </Trans>
            </div>

            <div className={styles.balanceContainer}>
                <Doughnut data={chartData} options={chartOptions} width={222} height={222}/>
                <div className={styles.balanceLabel}>{formatUsd(totalUsd)} <span
                    className={styles.currency}>
                        <Trans id="usd">
                            USD
                        </Trans>
                    </span>
                </div>
            </div>

            {rows}
        </div>
    );
}
