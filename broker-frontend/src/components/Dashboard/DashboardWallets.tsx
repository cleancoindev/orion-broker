import React, {FC} from "react";
import BigNumber from "bignumber.js";
import {formatNumber, formatUsd, getBtcPrice, getColorIcon, getUsdPrice} from "../../Utils";
import {defineMessage, Trans} from "@lingui/macro";
import {useLingui} from "@lingui/react";
import {useDispatch, useSelector} from "react-redux";
import {getAddress, getBalances, getCurrencies, getPairs} from "../../redux/selectors";
import {showNotify} from "../../redux/actions";

interface DashboardWalletItemProps {
    address: string;
    currency: string;
    balance: BigNumber;
    balanceBtc: BigNumber;
    balanceUsd: BigNumber;
    onDisconnectClick: () => void;
    onAlert: (text: string) => void;
}

function getWalletBgClass(currency: string) {
    if (currency === 'BTC') {
        return 'dashboard_walletItem-btc';
    } else {
        return '';
    }
}

function DashboardWalletItem(props: DashboardWalletItemProps) {
    const {i18n} = useLingui();
    const addressWasCopied = i18n._(defineMessage({
        id: 'components.dashnoard_wallets.alert.address_copied',
        message: 'Address copied to clipboard'
    }));

    const onCopyAddressClick = () => {
        navigator.clipboard.writeText(props.address).then(
            () => {
                props.onAlert(addressWasCopied)
            }, (err) => {
                console.error('Could not copy text: ', err);
            }
        );
    };

    return (
        <div className={'dashboard_walletItem ' + getWalletBgClass(props.currency)}>
            <div className={`dashboard_walletItem-icon ` + getColorIcon(props.currency)}/>

            <div className="btn-lite dashboard_walletItem-disconnect" onClick={() => props.onDisconnectClick()}>
                <div className="icon icon-disconnect"/>
                <Trans id="components.dashboard_wallet_item.disconnect">
                    Disconnect Wallet
                </Trans>
            </div>

            <div className="row dashboard_walletItem-addressRow" onClick={onCopyAddressClick}>
                <div className="dashboard_walletItem-address">{props.address}</div>
                <div className="icon icon-copy "/>
            </div>

            <div className="dashboard_walletItem-balanceLabel">
                <Trans id="components.dashboard_wallets.total_value">Total value</Trans>
            </div>
            <div className="dashboard_walletItem-balance">{formatNumber(props.balance, 8)} <span
                className="dashboard_walletItem-balanceCurrency">{props.currency}</span></div>

            <div className="dashboard_walletItem-balanceBtc">{formatNumber(props.balanceBtc, 8)} BTC</div>
            <div className="dashboard_walletItem-balanceUsd">{formatUsd(props.balanceUsd)} USD</div>

            <div className="btn-empty dashboard_walletItem-details">
                <Trans id="components.dashboard_wallet_item.details">
                    Details
                </Trans>
            </div>
        </div>
    )
}

type Props = {
    onDisconnectClick: () => void;
};

export const DashboardWallets: FC<Props> = (props) => {
    const dispatch = useDispatch();
    const balances = useSelector(getBalances);
    const nameToPair = useSelector(getPairs);
    const currencies = useSelector(getCurrencies);
    const walletAddress = useSelector(getAddress);

    const onAlert = (text: string) => {
        dispatch(showNotify(text))
    }

    const items = [];
    if (walletAddress) {
        let balancesArr = [];
        for (let name of currencies) {
            const walletBalance = balances.wallet[name] || new BigNumber(0);
            const contractBalance = balances.contract[name] || new BigNumber(0);
            const balance = contractBalance.plus(walletBalance);
            const btcPrice = getBtcPrice(name, nameToPair);
            const balanceInBtc = balance.multipliedBy(btcPrice);
            const usdPrice = getUsdPrice(name, nameToPair);
            const balanceInUsd = balance.multipliedBy(usdPrice);
            balancesArr.push({
                name,
                balance,
                balanceInBtc,
                balanceInUsd
            });
        }

        balancesArr = balancesArr
            .filter(a => a.name === 'ETH' || a.balance.gt(0))
            .sort((a, b) => b.balanceInUsd.minus(a.balanceInUsd).toNumber());

        for (let item of balancesArr) {
            items.push(<DashboardWalletItem key={item.name}
                                            currency={item.name}
                                            address={walletAddress!}
                                            onAlert={onAlert}
                                            onDisconnectClick={props.onDisconnectClick}
                                            balance={item.balance}
                                            balanceBtc={item.balanceInBtc}
                                            balanceUsd={item.balanceInUsd}/>)
        }
    }

    return (
        <div className="group dashboard_wallets">
            <div className="dashboard_wallets-header">
                <div className="dashboard_wallets-h">
                    <Trans id="components.dashboard_wallets.wallets">
                        Wallets
                    </Trans>
                </div>

                <div className="btn-lite dashboard_walletsAddBtn"
                     style={{visibility: 'hidden'}}>
                    <div className="icon icon-plus-primary"/>
                    <Trans id="components.dashboard_wallets.add_wallet">
                        Add Wallet
                    </Trans>
                </div>
            </div>

            <div className="dashboard_walletsContainer">
                {items}
                {/*<div className="dashboard_addItem" onClick={() => props.onAddWallet()}>*/}
                {/*    <div className="dashboard_addItem-text">*/}
                {/*        <div className="icon icon-plus"/>*/}
                {/*        Add Wallet*/}
                {/*    </div>*/}
                {/*</div>*/}
            </div>
        </div>
    )
}
