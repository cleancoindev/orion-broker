import React, {FC, SyntheticEvent, useState} from "react";
import BigNumber from "bignumber.js";
import {Trans} from '@lingui/macro';
import {EXCHANGES, formatNumber, getCurrencyFullName} from '../../../Utils';
import {Checkbox, CurrencyIcon, SearchInput, Table, useTrans} from '@orionprotocol/orion-ui-kit';
import {useSelector} from "react-redux";
import {getCurrencies} from "../../../redux/selectors";
import styles from './DashboardTable.module.css';
import {Dictionary} from '../../../Model';
import {capitalize} from '../../../Utils';

type TableColumn = {
    dataField: string;
    dataType: 'Text' | 'BigNumber' | 'Date' | 'Number';
};

function DashboardTableRow(index: number, props: any) {
    const divs = [];

    for (let exchange of EXCHANGES) {
        divs.push(<div key={exchange} className={styles.colWallet}>
            <div className={styles.colText}>
                {capitalize(exchange)}
            </div>
            {formatNumber(props[exchange], 8)}
        </div>)
    }

    return (
        <div className={styles.row} key={props.currency}>
            <div className={styles.colToken}>
                <CurrencyIcon icon={props.currency} type='color' className={styles.icon}/>
                {props.currency}
            </div>
            {divs}

            <div className={styles.colInOrder}>
                <div className={styles.colText}>
                    <Trans id="Total">Total</Trans>
                </div>
                {formatNumber(props.total, 8)}
            </div>
        </div>
    )
}

interface DashboardTableProps {
    onSetCurrentPair: (pairName: string) => void;
    balances: Dictionary<Dictionary<BigNumber>>
}

export const DashboardTable: FC<DashboardTableProps> = (props) => {
    const {balances} = props;
    const currencies = useSelector(getCurrencies);
    const {translate} = useTrans();

    const [shouldHideZero, setShouldHideZero] = useState(false);
    const [textFilter, setTextFilter] = useState('');
    const headerToken = translate('token', 'Token');
    const totalText = translate('total', 'Total');

    const onSearch = (e: SyntheticEvent<HTMLInputElement>) => {
        setTextFilter(e.currentTarget.value.toLocaleLowerCase());
    };

    const rows = [];

    for (let name of currencies) {
        const balance = balances[name];
        let total = new BigNumber(0);

        const rowData: any = {
            currency: name,
        };

        for (let exchange of EXCHANGES) {
            if (balance && balance[exchange]) {
                total = total.plus(balance[exchange])
                rowData[exchange] = balance[exchange];
            } else {
                total = new BigNumber(0);
                rowData[exchange] = new BigNumber(0);
            }
        }

        rowData.total = total;

        if (shouldHideZero && total.eq(0)) {
            continue;
        }

        if (textFilter && (name.toLowerCase().indexOf(textFilter) === -1) && (getCurrencyFullName(name).toLowerCase().indexOf(textFilter) === -1)) {
            continue;
        }

        rows.push(rowData)
    }

    const headers = [];
    const columns: TableColumn[] = [];

    headers.push(
        {
            className: styles.headerCol,
            text: headerToken
        },
    )

    columns.push(
        {
            dataField: 'currency',
            dataType: 'Text'
        },
    )

    for (let exchange of EXCHANGES) {
        headers.push(
            {
                className: styles.headerColRight,
                text: capitalize(exchange)
            },
        );

        columns.push(
            {
                dataField: exchange,
                dataType: 'BigNumber'
            },
        )
    }

    headers.push(
        {
            className: styles.headerColRight,
            text: totalText
        }
    )

    columns.push(
        {
            dataField: 'total',
            dataType: 'BigNumber'
        },
    );

    return (
        <div className={styles.root}>
            <div className={styles.info}>
                <div className={styles.infoHeader}>
                    <Trans id="balances_of_exchanges">
                        Balances of exchanges
                    </Trans>
                </div>
            </div>

            <div className={styles.tableControls}>
                <Checkbox className={styles.hideZeroCb} onChange={() => setShouldHideZero(!shouldHideZero)}
                          checked={shouldHideZero}>
                        <span className={styles.checkboxLabel}>
                            <Trans id="hide_zero">Hide zero</Trans>
                        </span>
                </Checkbox>
                <SearchInput className={styles.searchInput} onChange={onSearch}/>
            </div>

            <Table
                isLoading={false}
                headers={headers}
                columns={columns}
                className={styles.table}
                headerClassName={styles.header}
                scrollContainerClassName={styles.scrollContainer}
                rowRenderer={DashboardTableRow}
                defaultSortIndex={1}
                data={rows}>
            </Table>
        </div>
    )
}
