import React, {FC} from 'react';
import {Button, LoadingIcon} from "@orionprotocol/orion-ui-kit";
import styles from './SwalPopup.module.css';
import {useSelector} from "react-redux";
import {getSwalPopupData,} from "../../../redux/selectors";
import {SwalPopupData} from "../../../redux/reducers/ui";

export const SwalPopup: FC = () => {
    const data: SwalPopupData = useSelector(getSwalPopupData);

    return (
        <div className={styles.root}>
            {
                data.shouldShowLoader && (
                    <div className={styles.loading}>
                        <LoadingIcon className={styles.loadingIcon}/>
                    </div>
                )
            }
            <div className={styles.header}>
                <h2 className={styles.h2}>
                    {data.title}
                </h2>
            </div>
            <div className={styles.hash}>
                <p className={styles.text}>
                    {data.text}
                </p>
            </div>
            {data.subtext !== '' && (
                <div className={styles.hash}>
                    <small className={styles.subtext}>
                        {data.subtextLink ? <a className={styles.link} href={data.subtextLink} target="_blank">{data.subtext}</a> : data.subtext}
                    </small>
                </div>
            )}

            {Boolean(data.buttonText) && (
                <div className={styles.buttons}>
                    <Button
                        type="light"
                        className={styles.button}
                        onClick={data.onClick}
                    >
                        {data.buttonText}
                    </Button>
                </div>
            )}
        </div>
    );
};
