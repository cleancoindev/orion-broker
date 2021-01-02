import React, {FC} from "react";
import styles from "./ConfirmAddWalletPopup.module.css";
import {
    getConfirmAddWalletDescription,
    getConfirmAddWalletName,
    getConfirmAddWalletStatus
} from "../../../redux/selectors";
import {useSelector} from "react-redux";
import cn from 'classnames';
import {ConfirmAddWalletStatus} from "../../../redux/reducers/ui";
import {Trans} from "@lingui/macro";
import {Button, Icon, IconType, LoadingIcon} from "@orionprotocol/orion-ui-kit";

export const ConfirmAddWalletPopup: FC = () => {
    const name = useSelector(getConfirmAddWalletName);
    const description = useSelector(getConfirmAddWalletDescription);
    const status = useSelector(getConfirmAddWalletStatus);
    const hasDescription = Boolean(description);

    return (
        <div className={styles.root}>
            <p className={styles.back}>Back</p>
            <div className={styles.titleWrapper}>
                <div className={styles.title}>
                    <h4 className={styles.name}>{name}</h4>
                    {hasDescription && (<small className={styles.description}>{description}</small>)}
                </div>

                <Icon icon={name.toLowerCase() as IconType} className={styles.icon}/>
            </div>

            {status === ConfirmAddWalletStatus.INITIALIZING && (
                <div className={styles.status}>
                    <h4 className={styles.statusInfo}>
                        <Trans id="initializing">
                            Initializing...
                        </Trans>
                    </h4>
                    <div className={styles.loading}>
                        <LoadingIcon className={styles.loadingIcon}/>
                    </div>
                </div>
            )}

            {status === ConfirmAddWalletStatus.FAILED && (
                <div className={styles.status}>
                    <h4 className={cn(styles.statusInfo, styles.error)}>
                        <Trans id="error_connecting">
                            Error connecting
                        </Trans>
                    </h4>
                    <Button type="light" onClick={() => {
                        console.log('TODO')
                    }}>
                        <Trans id="try_again">
                            Try again
                        </Trans>
                    </Button>
                </div>
            )}
        </div>
    );
};
