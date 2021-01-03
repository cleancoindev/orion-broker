import React, {FC, FormEvent, useContext, useEffect, useMemo, useState} from 'react';
import {DatePickerInput} from "rc-datepicker";
import 'moment/locale/ru.js';
import {Trans} from '@lingui/macro';
import cn from 'classnames';
import {Dictionary, isOrderOpen, NumberFormat, Pair, parseTradeOrder, TradeOrder, TradeSubOrder} from '../../../Model';
import {
    capitalize,
    formatPairAmount,
    formatPairPrice,
    formatPairTotal,
    getDateTime,
    getLastMonth,
    getTomorrow,
    statusToText
} from "../../../Utils";
import {LanguageContext, Select, STATUS_TYPE, Table, ToggleTabs, useTrans} from "@orionprotocol/orion-ui-kit";
import BigNumber from "bignumber.js";
import {useSelector} from "react-redux";
import {
    getFromCurrencies,
    getNumberFormat,
    getToCurrencies
} from "../../../redux/selectors";
import styles from './TradeHistory.module.css';
import {Api} from "../../../Api";

const getStatusClass = (status: string): string => {
    switch (status.toUpperCase()) {
        case 'CANCELED':
        case 'PARTIALLY_CANCELED':
        case 'REJECTED':
        case 'PARTIALLY_REJECTED':
        case 'FAILED':
            return styles.statusCancelled;

        case 'CONFIRMED':
        case 'SETTLED':
            return styles.statusFilled;

        default:
            return styles.statusNew;
    }
}

interface TradeHistorySubRowProps {
    subOrder: TradeSubOrder;
    numberFormat: Dictionary<NumberFormat>;
}

function TradeHistorySubRow(index: number, item: TradeHistorySubRowProps) {
    const statusText = capitalize(statusToText(item.subOrder.status));

    return (
        <div className={styles.subTableRow} key={'sub_' + index}>
            <div className={styles.subTableCol}>
                {item.subOrder.id}
            </div>
            <div className={cn(styles.subTableCol, styles.subTableColRight, styles.colAmount)}>
                {formatPairAmount(item.subOrder.amount, item.subOrder.pair, item.numberFormat)}
            </div>
            <div className={cn(styles.subTableCol, styles.subTableColRight, styles.colPrice)}>
                {formatPairPrice(item.subOrder.price, item.subOrder.pair, item.numberFormat)}
            </div>
            <div
                className={cn(styles.subTableCol, styles.colStatus, getStatusClass(item.subOrder.status))}>
                {statusText}
            </div>
            <div className={cn(styles.subTableCol, styles.colExchange)}>
                {capitalize(item.subOrder.exchange)}
            </div>
        </div>
    )
}

interface TradeHistoryRow {
    order: TradeOrder;
    numberFormat: Dictionary<NumberFormat>;
    onCancelOrder: (item: TradeOrder) => void;
}

function TradeHistoryRow(index: number, props: TradeHistoryRow, isOpen?: boolean, onClick?: (index: number) => void) {
    const item = props.order;
    const itemIsOpen = isOrderOpen(item);
    const date = new Date(item.date);
    const dateString = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    const statusText = capitalize(statusToText(item.status));
    const {translate} = useTrans();
    const subOrdersId = translate('id', 'ID');
    const subOrdersAmount = translate('price', 'Price');
    const subOrdersPrice = translate('amount', 'Amount');
    const subOrdersStatus = translate('status', 'Status');
    const subOrdersExchange = translate('exchange', 'Exchange');

    const createSubOrders = () => {
        return <Table
            isLoading={false}
            headers={[
                {
                    className: cn(styles.headerCol, styles.subHeaderCol),
                    text: subOrdersId
                },
                {
                    className: cn(styles.headerCol, styles.subHeaderCol, styles.headerColRight),
                    text: subOrdersPrice
                },
                {
                    className: cn(styles.headerCol, styles.subHeaderCol, styles.headerColRight),
                    text: subOrdersAmount
                },
                {
                    className: cn(styles.headerCol, styles.subHeaderCol),
                    text: subOrdersStatus
                },
                {
                    className: cn(styles.headerCol, styles.subHeaderCol),
                    text: subOrdersExchange
                },
            ]}
            columns={[
                {
                    dataField: 'subOrder.id',
                    dataType: 'Number'
                },
                {
                    dataField: 'subOrder.amount',
                    dataType: 'BigNumber'
                },
                {
                    dataField: 'subOrder.price',
                    dataType: 'BigNumber'
                },
                {
                    dataField: 'subOrder.status',
                    dataType: 'Text'
                },
                {
                    dataField: 'subOrder.exchange',
                    dataType: 'Text'
                },
            ]}
            className={styles.subTable}
            headerClassName={styles.tableHeader}
            scrollContainerClassName={styles.subTableScrollContainer}
            rowRenderer={TradeHistorySubRow}
            data={item.subOrders.map(subOrder => ({subOrder, numberFormat: props.numberFormat}))}/>
    }

    return (
        <div className={styles.rowWrapper} key={index}>
            <div className={styles.tableRow} onClick={() => onClick!(index)}>
                <div className={cn(styles.tableCol, styles.colSell, styles.colWhite)}>
                    {capitalize(item.type)}
                </div>
                <div className={cn(styles.tableCol, styles.colCurrency)}>
                    {item.fromCurrency} / {item.toCurrency}
                </div>
                <div className={cn(styles.tableCol, styles.colDate)}>
                    {dateString}
                </div>
                <div className={cn(styles.tableCol, styles.colAmount, styles.tableColRight)}>
                    {formatPairAmount(item.amount, item.pair, props.numberFormat)}
                </div>
                <div className={cn(styles.tableCol, styles.colPrice, styles.tableColRight)}>
                    {formatPairPrice(item.price, item.pair, props.numberFormat)}
                </div>
                <div
                    className={cn(styles.tableCol, styles.colStatus, getStatusClass(item.status))}>
                    {statusText}
                </div>
                <div className={cn(styles.tableCol, styles.colTotal, styles.tableColRight)}>
                    {formatPairTotal(item.total, item.pair, props.numberFormat)}
                </div>
            </div>
            {
                (isOpen && item.subOrders.length) ? createSubOrders() : null
            }
        </div>
    );
}

interface Props {
    items: TradeOrder[];
    isLoading: boolean;
}

// todo: paging
export const TradeHistory: FC<Props> = (props) => {
    const {items} = props;
    const {language, getLocale} = useContext(LanguageContext);
    const currentLocale = getLocale(language);
    const fromCurrencies = useSelector(getFromCurrencies);
    const toCurrencies = useSelector(getToCurrencies);
    const numberFormat = useSelector(getNumberFormat);

    enum OrderHistoryType {
        OPEN = 'open',
        HISTORY = 'history',
    }

    const [orderHistoryType, setOrderHistoryType] = useState(OrderHistoryType.OPEN);
    const [startDate, setStartDate] = useState(getLastMonth());
    const [endDate, setEndDate] = useState(getTomorrow());
    const [fromCurrency, setFromCurrency] = useState('ALL');
    const [toCurrency, setToCurrency] = useState('ALL');
    const [status, setStatus] = useState('ALL');
    const {translate} = useTrans();

    const orderStatusAll = translate('all', 'All');
    const orderStatusNew = translate('open', 'New');
    const orderStatusFilled = translate('filled', 'Filled');
    const orderStatusCancelled = translate('cancelled', 'Cancelled');
    const orderStatusPartial = translate('partial', 'Partial');
    const tableHeaderPair = translate('pair', 'Pair');
    const tableHeaderType = translate('type', 'Type');
    const tableHeaderTime = translate('date', 'Time');
    const tableHeaderAmount = translate('amount', 'Amount');
    const tableHeaderPrice = translate('price', 'Price');
    const tableHeaderStatus = translate('status', 'Status');
    const tableHeaderTotal = translate('total', 'Total');

    const onStartDateChange = (jsDate: Date, dateString: string) => {
        setStartDate(jsDate);
    }

    const onEndDateChange = (jsDate: Date, dateString: string) => {
        setEndDate(jsDate);
    }

    const startTime = getDateTime(startDate);
    const endTime = getDateTime(endDate);

    const rows: any[] = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (startTime > item.date) continue;
        if (endTime > 0 && endTime < item.date) continue;
        if (fromCurrency !== 'ALL' && item.fromCurrency !== fromCurrency) continue;
        if (toCurrency !== 'ALL' && item.toCurrency !== toCurrency) continue;
        const itemIsOpen = isOrderOpen(item);
        if (status !== STATUS_TYPE.ALL) {
            if ((status === STATUS_TYPE.NEW) && !itemIsOpen) continue;
            if ((status === STATUS_TYPE.FILLED) && (item.status !== STATUS_TYPE.FILLED)) continue;
            if ((status === STATUS_TYPE.PARTIAL) && (item.status !== 'PARTIALLY_FILLED')) continue;
            if ((status === STATUS_TYPE.CANCELLED) && (item.status !== 'CANCELED' && item.status !== 'PARTIALLY_CANCELED')) continue;
        } else {
            if (orderHistoryType === OrderHistoryType.OPEN && !itemIsOpen) continue;
            if (orderHistoryType === OrderHistoryType.HISTORY && itemIsOpen) continue;
        }
        rows.push({
            order: item,
            numberFormat: numberFormat,
        });
    }

    return (
        <div className={styles.root}>
            <div className={styles.toolbar}>
                <div className={styles.toolbarMobileRow}>
                    <ToggleTabs selected={orderHistoryType} tabClassName={styles.tab} transparent
                                className={styles.orderHistoryTypeToggle}
                                onTabChanged={(key) => setOrderHistoryType(key as OrderHistoryType)}>
                        <Trans id="open_orders" key={OrderHistoryType.OPEN}>
                            Open Orders
                        </Trans>

                        <Trans id="history" key={OrderHistoryType.HISTORY}>
                            Order History
                        </Trans>
                    </ToggleTabs>
                </div>

                <div className={styles.toolbarMobileRow}>
                    {useMemo(() => (
                        <DatePickerInput
                            onChange={onStartDateChange}
                            locale={currentLocale}
                            displayFormat="DD/MM/YYYY"
                            maxDate={endDate}
                            value={startDate}
                        />
                    ), [endDate, startDate, currentLocale])}
                    <div className={styles.dateSeparator}/>
                    {useMemo(() => (
                        <DatePickerInput
                            onChange={onEndDateChange}
                            locale={currentLocale}
                            displayFormat="DD/MM/YYYY"
                            minDate={startDate}
                            value={endDate}
                        />
                    ), [endDate, startDate, currentLocale])}
                </div>

                <div className={cn([styles.toolbarMobileRow, styles.currencyFilter])}>
                    <div className={styles.filterSelectWrapper}>
                        <Select value={fromCurrency}
                                className={styles.filterSelect}
                                onChange={event => {
                                    setFromCurrency(event.currentTarget.value)
                                }}
                        >
                            <option value="ALL">All</option>
                            {
                                fromCurrencies.map(currency => <option key={currency} value={currency}>{currency}</option>)
                            }
                        </Select>
                    </div>
                    <div className={styles.currencySeparator}>/</div>
                    <div className={styles.filterSelectWrapper}>
                        <Select value={toCurrency}
                                className={styles.filterSelect}
                                onChange={event => {
                                    console.log(event.currentTarget.value)
                                    setToCurrency(event.currentTarget.value)
                                }}>
                            <option value="ALL">All</option>
                            {
                                toCurrencies.map(currency => <option key={currency} value={currency}>{currency}</option>)
                            }
                        </Select>
                    </div>

                    <div className={styles.filterSelectWrapper}>
                        <Select value={status}
                                onChange={event => setStatus(event.currentTarget.value)}
                                className={styles.filterSelect}
                        >
                            <option value={STATUS_TYPE.ALL}>{orderStatusAll}</option>
                            <option value={STATUS_TYPE.NEW}>{orderStatusNew}</option>
                            <option value={STATUS_TYPE.FILLED}>{orderStatusFilled}</option>
                            <option value={STATUS_TYPE.PARTIAL}>{orderStatusPartial}</option>
                            <option value={STATUS_TYPE.CANCELLED}>{orderStatusCancelled}</option>
                        </Select>
                    </div>
                </div>
            </div>

            <Table
                isLoading={props.isLoading && items.length === 0}
                headers={[
                    {
                        className: styles.headerCol,
                        text: tableHeaderType
                    },
                    {
                        className: styles.headerCol,
                        text: tableHeaderPair
                    },
                    {
                        className: styles.headerCol,
                        text: tableHeaderTime
                    },
                    {
                        className: cn(styles.headerCol, styles.headerColRight),
                        text: tableHeaderAmount
                    },
                    {
                        className: cn(styles.headerCol, styles.headerColRight),
                        text: tableHeaderPrice
                    },
                    {
                        className: styles.headerCol,
                        text: tableHeaderStatus
                    },
                    {
                        className: cn(styles.headerCol, styles.headerColRight),
                        text: tableHeaderTotal
                    },
                ]}
                columns={[
                    {
                        dataField: 'order.type',
                        dataType: 'Text'
                    },
                    {
                        dataField: 'order.fromCurrency',
                        dataType: 'Text'
                    },
                    {
                        dataField: 'order.date',
                        dataType: 'Date'
                    },
                    {
                        dataField: 'order.amount',
                        dataType: 'BigNumber'
                    },
                    {
                        dataField: 'order.price',
                        dataType: 'BigNumber'
                    },
                    {
                        dataField: 'order.status',
                        dataType: 'Text'
                    },
                    {
                        dataField: 'order.total',
                        dataType: 'BigNumber'
                    },
                ]}
                defaultSortIndex={2}
                className={styles.table}
                headerClassName={styles.tableHeader}
                scrollContainerClassName={styles.scrollContainer}
                rowRenderer={TradeHistoryRow}
                data={rows}/>
        </div>
    )
}
