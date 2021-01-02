import React from "react";
import styles from "./AddWalletPopup.module.css";
import {Trans} from "@lingui/macro";
import {AddWalletPopupContent} from "./AddWalletPopupContent";

interface AddWalletPopupProps {
    onLogin: () => void;
}

export default function AddWalletPopup(props: AddWalletPopupProps) {
    return (
        <div className={styles.root}>
            <div className={styles.headerTitle}>
                <Trans id="add_wallet">
                    Add wallet
                </Trans>
            </div>
            <div className={styles.content}>
                <AddWalletPopupContent onLogin={props.onLogin} onDisconnect={() => {
                }}/>
            </div>
        </div>
    );
}
