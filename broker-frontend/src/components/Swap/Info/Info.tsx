import React, {FC} from 'react';
import cn from 'classnames';
import {SubText} from "../Text";
import {Icon, ICON_TYPE} from "../Icon";
import styles from './Info.module.css';

type Props = {
    className?: string;
};

export const Info: FC<Props> = ({ className = '', children }) => {
    return (
        <div className={cn([styles.root, className])}>
            <Icon className={styles.icon} type={ICON_TYPE.INFO} />
            <SubText className={styles.label}>
                {children}
            </SubText>
        </div>
    );
};
