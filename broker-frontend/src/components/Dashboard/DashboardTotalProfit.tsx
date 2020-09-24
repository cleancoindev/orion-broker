import React, {FC} from "react";
import BigNumber from "bignumber.js";
import {Doughnut} from 'react-chartjs-2';
import {formatNumber, formatUsd, getColorIcon, getUsdPrice} from "../../Utils";
import {Trans} from "@lingui/macro";
import {useSelector} from "react-redux";
import {getBalances, getCurrencies, getPairs} from "../../redux/selectors";
import {Dictionary} from "../../Model";

interface DashboardTotalBalanceItemProps {
    name: string;
    value: BigNumber;
}

function DashboardTotalBalanceItem(props: DashboardTotalBalanceItemProps) {
    return (
        <div className="dashboard_balanceRow">
            <div className={`dashboard_balanceRow-icon ` + getColorIcon(props.name)}/>
            <div className="dashboard_balanceRow-name">{props.name}</div>
            <div className="dashboard_balanceRow-value">{formatNumber(props.value, 8)}</div>
        </div>
    )
}

type Props = {
    profits: Dictionary<BigNumber>
};

const chartOptions = {
    cutoutPercentage: 85,
    legend: {
        display: false
    }
}

export const DashboardTotalProfit: FC<Props> = (props) => {
    const balances = {
        wallet: {} as Dictionary<BigNumber>,
        contract: props.profits
    };
    const nameToPair = useSelector(getPairs);
    const currencies = useSelector(getCurrencies);

    const COLORS: Dictionary<string> = {
        'ETH': '#8800FF',
        'BTC': '#F7931A',
        'XRP': '#F54562',
        'USDT': '#39ff00',
        'ORN': '#00BBFF',
        'EGLD': '#ffe700',
    }
    const DEFAULT_COLOR = '#39ff00';

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
        const walletBalance = balances.wallet[name] || new BigNumber(0);
        const contractBalance = balances.contract[name] || new BigNumber(0);
        const balance = contractBalance.plus(walletBalance);
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

    chartData.datasets[0].backgroundColor = balancesArr.map(b => COLORS[b.name] || DEFAULT_COLOR);
    chartData.labels = balancesArr.map(b => b.name);

    if (!chartData.datasets[0].data.filter(n => n !== 0).length) {
        chartData.datasets[0].backgroundColor = [DEFAULT_COLOR];
        chartData.datasets[0].data = [1];
    }

    return (
        <div className="group dashboard_totalBalance">
            <div className="dashboard_totalBalance-h">
                Total Profit
            </div>

            <div className="dashboard_balanceContainer">
                <Doughnut data={chartData} options={chartOptions} width={222} height={222}/>
                <div className="dashboard_balanceLabel">{formatUsd(totalUsd)} <span
                    className="dashboard_balanceLabel-currency">
                        <Trans id="components.dashboard_total_balance.usd">
                            USD
                        </Trans>
                    </span>
                </div>
            </div>

            {rows}

            <div className="grow"/>

        </div>
    );
}
