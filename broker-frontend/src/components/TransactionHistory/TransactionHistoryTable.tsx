import React, {useContext, useState} from "react";
import {DatePickerInput} from 'rc-datepicker';
import {defineMessage, Trans} from "@lingui/macro";
import {useLingui} from "@lingui/react";
import BigNumber from "bignumber.js";
import './TransactionHistoryTable.css';
import {Transaction} from "../../Model";
import {formatNumber, getDateTime, getLastMonth, getTomorrow} from "../../Utils";
import {Table} from "../Table";
import {Select} from "../Swap/Inputs/components/Select";
import styles from './TransactionHistoryTable.module.css'
import {I18nContext} from "../I18nContext";
import {THEME, Theme} from "../Theme";
import cn from 'classnames';

function TransactionHistoryRow(index: number, props: Transaction) {
    const date = new Date(props.date);
    const dateString = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

    return (
        <div className="transactionHistory_table-row" key={index}>
            <div className="transactionHistory_table-col">
                {dateString}
            </div>
            <div
                className="transactionHistory_table-col transactionHistory_table-col-10 transactionHistory_table-col-yellow">
                {props.status}
            </div>
            <div className="transactionHistory_table-col transactionHistory_table-col-right">
                {formatNumber(props.amount, 8)}
            </div>
            <div className="transactionHistory_table-col transactionHistory_table-col-10">
                {props.token}
            </div>
        </div>
    );
}

interface TransactionHistoryTableProps {
    isDeposit: boolean;
    items: Transaction[];
    isLoading: boolean;
}

// todo: paging
export default function TransactionHistoryTable(props: TransactionHistoryTableProps) {
    const {theme} = useContext(Theme);
    const dark = theme === THEME.DARK ? styles.dark : '';
    const { language, getLocale } = useContext(I18nContext);
    const currentLocale = getLocale(language);
    const [startDate, setStartDate] = useState(getLastMonth());
    const [endDate, setEndDate] = useState(getTomorrow());
    const [currency, setCurrency] = useState('All');
    const [status, setStatus] = useState('Filled');
    const {i18n} = useLingui();
    const statusSelectFilled = i18n._(defineMessage({
        id: 'components.transaction_history_table.status_select.filled',
        message: 'Filled'
    }));
    const statusSelectOpen = i18n._(defineMessage({
        id: 'components.transaction_history_table.status_select.open',
        message: 'Open'
    }));
    const statusSelectCancel = i18n._(defineMessage({
        id: 'components.transaction_history_table.status_select.cancel',
        message: 'Cancel'
    }));
    const currencySelectAll = i18n._(defineMessage({
        id: 'components.transaction_history_table.currency_select.all',
        message: 'All'
    }));
    const tableHeaderDate = i18n._(defineMessage({
        id: 'components.transaction_history_table.table_header.date',
        message: 'Date'
    }));
    const tableHeaderStatus = i18n._(defineMessage({
        id: 'components.transaction_history_table.table_header.status',
        message: 'Status'
    }));
    const tableHeaderAmount = i18n._(defineMessage({
        id: 'components.transaction_history_table.table_header.amount',
        message: 'Amount'
    }));
    const tableHeaderAsset = i18n._(defineMessage({
        id: 'components.transaction_history_table.table_header.asset',
        message: 'Asset'
    }));

    const items = props.items;

    const startTime = getDateTime(startDate);
    const endTime = getDateTime(endDate);

    const rows = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (startTime > item.date) continue;
        if (endTime > 0 && endTime < item.date) continue;
        if (currency !== 'All' && currency !== item.token) continue;
        if (status !== 'All' && status !== item.status) continue;
        rows.push(item)
    }

    const onStartDateChange = (jsDate: Date) => {
        setStartDate(jsDate);
    }

    const onEndDateChange = (jsDate: Date) => {
        setEndDate(jsDate);
    }

    return (
        <div className={cn([dark, 'group', 'history_table'])}>
            <div className="transactionHistory_header">
                <div className="transactionHistory_h">
                    {props.isDeposit ? (
                        <Trans id="components.transaction_history_table.header.deposit_history">Deposit History</Trans>
                    ) : (
                        <Trans id="components.transaction_history_table.header.withdraw_history">Withdraw
                            History</Trans>
                    )}
                </div>

                <div className="transactionHistory_toolbar">
                    <DatePickerInput
                        locale={currentLocale}
                        onChange={onStartDateChange}
                        maxDate={endDate}
                        displayFormat="DD/MM/YYYY"
                        value={startDate}
                    />
                    <div className="tradeHistory_toolbar-dateSeparator"/>
                    <DatePickerInput
                        locale={currentLocale}
                        displayFormat="DD/MM/YYYY"
                        minDate={startDate}
                        onChange={onEndDateChange}
                        value={endDate}
                    />

                    <div className={styles.filterSelectWrapper}>
                        <Select
                            value={currency}
                            onChange={event => setCurrency(event.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="All">{currencySelectAll}</option>
                            <option value="BTC">BTC</option>
                            <option value="ETH">ETH</option>
                            <option value="XRP">XRP</option>
                            <option value="USDT">USDT</option>
                            <option value="ORN">ORN</option>
                            <option value="EGLD">EGLD</option>
                        </Select>
                    </div>

                    <div className={styles.filterSelectWrapper}>
                        <Select
                            value={status}
                            onChange={event => setStatus(event.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="Filled">{statusSelectFilled}</option>
                            <option value="Open">{statusSelectOpen}</option>
                            <option value="Cancel">{statusSelectCancel}</option>
                        </Select>
                    </div>
                </div>
            </div>

            <Table
                isLoading={props.isLoading}
                headers={[
                    {
                        className: 'transactionHistory_table-headerCol',
                        text: tableHeaderDate
                    },
                    {
                        className: 'transactionHistory_table-headerCol transactionHistory_table-headerCol-10',
                        text: tableHeaderStatus
                    },
                    {
                        className: 'transactionHistory_table-headerCol  transactionHistory_table-headerCol-right',
                        text: tableHeaderAmount
                    },
                    {
                        className: 'transactionHistory_table-headerCol transactionHistory_table-headerCol-10',
                        text: tableHeaderAsset
                    }
                ]}
                columns={[
                    {
                        dataField: 'date',
                        dataType: 'Date'
                    },
                    {
                        dataField: 'status',
                        dataType: 'Text'
                    },
                    {
                        dataField: 'amount',
                        dataType: 'BigNumber'
                    },
                    {
                        dataField: 'token',
                        dataType: 'Text'
                    }
                ]}
                className="transactionHistory_table"
                headerClassName="transactionHistory_table-header"
                scrollContainerClassName="transactionHistory_scrollContainer"
                defaultSortIndex={0}
                rowRenderer={TransactionHistoryRow}
                data={rows}/>
        </div>
    )
}
