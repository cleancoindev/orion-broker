import React from "react";
import {Trans} from "@lingui/macro";
import {useDispatch} from "react-redux";
import cn from 'classnames';
import styles from './AddWalletPopupContent.module.css';
import {setWallet} from "../../../redux/actions";
import {fortmaticWeb3} from "../../../Fortmatic";
import {coinbaseEthereum} from "../../../Coinbase";
import {Icon, IconType} from "@orionprotocol/orion-ui-kit";

async function loginMetamask(onLogin: (currency: string, walletType: string, account: string) => void,
                             onClear: () => void) {
    const provider = window.ethereum as any;

    if (!provider) {
        // TODO: remove alert
        alert('MetaMask not installed');
        onClear();
    } else {
        try {
            // Request account access if needed
            const accounts: string[] = (await provider.send('eth_requestAccounts')).result;

            if (accounts.length > 0) {
                // Accounts now exposed, use them
                const account = accounts[0] // We currently only ever provide a single account,
                                            // but the array gives us some room to grow.
                onLogin('ETH', 'metamask', account);
            } else {
                onClear();
            }
        } catch (error) {
            // User denied or Error
            console.log(error);
            onClear();
        }

        provider.on('accountsChanged', function (accounts: string[]) {
            console.log('accountsChanged', accounts);
            const account = accounts[0];
            if (account) {
                onLogin('ETH', 'metamask', account);
            } else {
                onClear();
            }
        });
    }
}

async function loginFortmatic(onLogin: (currency: string, walletType: string, account: string) => void,
                              onClear: () => void) {
    fortmaticWeb3.eth.getAccounts((error: Error, accounts: string[]) => {
        if (accounts && accounts.length > 0) {
            onLogin('ETH', 'fortmatic', accounts[0]);
        } else {
            onClear();
        }
    });
}

async function loginCoinbase(onLogin: (currency: string, walletType: string, account: string) => void,
                             onClear: () => void) {
    try {
        // Request account access if needed
        const accounts: string[] = (await coinbaseEthereum.send('eth_requestAccounts'));
        if (accounts.length > 0) {
            // Accounts now exposed, use them
            const account = accounts[0] // We currently only ever provide a single account,
                                        // but the array gives us some room to grow.
            onLogin('ETH', 'coinbase', account)
        } else {
            onClear();
        }
    } catch (error) {
        // User denied or Error
        console.log(error);
        onClear();
    }

    // coinbaseEthereum.on('accountsChanged', function (accounts: string[]) {
    //     console.log('accountsChanged', accounts);
    //     const account = accounts[0];
    //     localStorage.setItem('ETH_address', account);
    // });
}

export async function loginToWallet(walletType: string,
                                    onLogin: (currency: string, walletType: string, account: string) => void,
                                    onClear: () => void) {

    switch (walletType) {
        case 'metamask':
            loginMetamask(onLogin, onClear);
            break;
        case 'fortmatic':
            loginFortmatic(onLogin, onClear);
            break;
        case 'coinbase':
            loginCoinbase(onLogin, onClear);
            break;
    }
}

interface AddWalletPopupBtnProps {
    onClick?: () => void;
    name: string;
}

function AddWalletPopupBtn(props: AddWalletPopupBtnProps) {
    return (
        <div className={cn(styles.btn, styles.walletItem)} onClick={() => props.onClick && props.onClick()}>
            <div className={styles.btnImg}>
                <Icon icon={props.name.toLowerCase() as IconType}/>
            </div>

            <div className={styles.btnText}>
                {props.name}
            </div>
        </div>
    )
}

interface AddWalletPopupContentProps {
    onLogin: () => void;
    onDisconnect: () => void;
    className?: string;
}

export function AddWalletPopupContent(props: AddWalletPopupContentProps) {
    const dispatch = useDispatch();

    const onLogin = (currency: string, walletType: string, account: string) => {
        dispatch(setWallet(currency, walletType, account));
        props.onLogin();
    }

    const onClear = () => {
        props.onDisconnect();
    }

    const onMetamaskClick = async () => {
        onClear();
        loginToWallet('metamask', onLogin, onClear);
        // TODO: Тут вызывается попап с подтверждением добавления кошелька
        //dispatch(setConfirmAddWalletPopupData({ name: 'Metamask', description: 'Easy-to-use browser extension.', status: ConfirmAddWalletStatus.INITIALIZING }));
        //dispatch(openPopup(POPUP_TYPE.CONFIRM_ADD_WALLET_POPUP));
    };

    const onFortmaticClick = async () => {
        onClear();
        loginToWallet('fortmatic', onLogin, onClear);
    }

    const onCoinbaseClick = async () => {
        onClear();
        loginToWallet('coinbase', onLogin, onClear);
    }

    return <div className={props.className}>
        <div className={cn(styles.root, styles.walletH)}>
            <Trans id="choose_your_wallet">
                Choose your wallet
            </Trans>
        </div>

        <div className={styles.walletList}>
            <AddWalletPopupBtn name="Metamask" onClick={onMetamaskClick}/>
            <AddWalletPopupBtn name="Fortmatic" onClick={onFortmaticClick}/>
            <AddWalletPopupBtn name="Coinbase" onClick={onCoinbaseClick}/>
            {/*<AddWalletPopupBtn name="Keystore"/>*/}
            {/*<AddWalletPopupBtn name="Privatekey"/>*/}

            {/*<div className="walletPopup_btnOther">*/}
            {/*    <div className="walletPopup_btnOther-text">*/}
            {/*        <Trans id="other_wallets">*/}
            {/*            Other Wallets*/}
            {/*        </Trans>*/}
            {/*    </div>*/}
            {/*</div>*/}
        </div>
    </div>
}
