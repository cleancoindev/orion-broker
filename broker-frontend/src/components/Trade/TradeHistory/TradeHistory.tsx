import React, {FC, useContext, useEffect, useMemo, useState} from "react";
import {DatePickerInput} from "rc-datepicker";
import 'moment/locale/ru.js';
import {useLingui} from "@lingui/react";
import {defineMessage, Trans} from '@lingui/macro';
import "./TradeHistory.css"
import cn from 'classnames';
import {Dictionary, NumberFormat, Pair, parseTradeOrder, TradeOrder, TradeSubOrder} from "../../../Model";
import {
    capitalize,
    formatPairAmount,
    formatPairPrice,
    formatPairTotal,
    getDateTime,
    getLastMonth,
    getTomorrow,
    httpGet,
    statusToText
} from "../../../Utils";
import {Table} from "../../Table";
import BigNumber from "bignumber.js";
import {useSelector} from "react-redux";
import {getAddress, getCurrentPair, getCurrentPairName, getNumberFormat} from "../../../redux/selectors";
import {Select} from "../../Swap/Inputs";
import styles from './TradeHistory.module.css';
import {STATUS_TYPE} from "../../Swap/Text/components/StatusText";
import {I18nContext} from "../../I18nContext";
import {THEME, Theme} from "../../Theme";

const getStatusClass = (statusText: string): string => {
    switch (statusText) {
        case 'New':
            return 'status-new';
        case 'Partial':
            return 'status-filled';
        case 'Filled':
            return 'status-filled';
        case 'Canceled':
            return 'status-cancelled';
        default:
            return '';
    }
}

interface TradeHistorySubRowProps {
    subOrder: TradeSubOrder;
    numberFormat: Dictionary<NumberFormat>;
}

function TradeHistorySubRow(index: number, item: TradeHistorySubRowProps) {
    const statusText = capitalize(statusToText(item.subOrder.status));

    return (
        <div className="tradeHistory_subTable-row" key={'sub_' + index}>
            <div className="tradeHistory_subTable-col">
                {item.subOrder.id}
            </div>
            <div className="tradeHistory_subTable-col tradeHistory_subTable-col-right tradeHistory_table-colAmount">
                {formatPairAmount(item.subOrder.amount, item.subOrder.pair, item.numberFormat)}
            </div>
            <div className="tradeHistory_subTable-col tradeHistory_subTable-col-right tradeHistory_table-colPrice">
                {formatPairPrice(item.subOrder.price, item.subOrder.pair, item.numberFormat)}
            </div>
            <div
                className={"tradeHistory_subTable-col tradeHistory_table-colStatus " + getStatusClass(statusText)}>
                {statusText}
            </div>
            <div className="tradeHistory_subTable-col tradeHistory_table-colExchange">
                {capitalize(item.subOrder.exchange)}
            </div>
        </div>
    )
}

interface TradeHistoryRow {
    order: TradeOrder;
    numberFormat: Dictionary<NumberFormat>;
}

function TradeHistoryRow(index: number, props: TradeHistoryRow, isOpen?: boolean, onClick?: (index: number) => void) {
    const item = props.order;
    const date = new Date(item.date);
    const dateString = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    const statusText = capitalize(statusToText(item.status));
    const {i18n} = useLingui();
    const subOrdersId = i18n._(defineMessage({id: 'components.trade_history_row.sib_orders.id', message: 'ID'}));
    const subOrdersAmount = i18n._(defineMessage({
        id: 'components.trade_history_row.sib_orders.price',
        message: 'Price'
    }));
    const subOrdersPrice = i18n._(defineMessage({
        id: 'components.trade_history_row.sib_orders.amount',
        message: 'Amount'
    }));
    const subOrdersStatus = i18n._(defineMessage({
        id: 'components.trade_history_row.sib_orders.status',
        message: 'Status'
    }));
    const subOrdersExchange = i18n._(defineMessage({
        id: 'components.trade_history_row.sib_orders.exchange',
        message: 'Exchange'
    }));

    const createSubOrders = () => {
        return <Table
            isLoading={false}
            headers={[
                {
                    className: 'tradeHistory_table-headerCol tradeHistory_subTable-headerCol',
                    text: subOrdersId
                },
                {
                    className: 'tradeHistory_table-headerCol tradeHistory_subTable-headerCol tradeHistory_table-headerCol-right',
                    text: subOrdersPrice
                },
                {
                    className: 'tradeHistory_table-headerCol tradeHistory_subTable-headerCol tradeHistory_table-headerCol-right',
                    text: subOrdersAmount
                },
                {
                    className: 'tradeHistory_table-headerCol tradeHistory_subTable-headerCol',
                    text: subOrdersStatus
                },
                {
                    className: 'tradeHistory_table-headerCol tradeHistory_subTable-headerCol',
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
            className="tradeHistory_subTable"
            headerClassName="tradeHistory_table-header"
            scrollContainerClassName="tradeHistory_subTable-scrollContainer"
            rowRenderer={TradeHistorySubRow}
            data={item.subOrders.map(subOrder => ({subOrder, numberFormat: props.numberFormat}))}/>
    }

    return (
        <div className="tradeHistory_table-rowWrapper" key={index}>
            <div className="tradeHistory_table-row" onClick={() => onClick!(index)}>
                <div className="tradeHistory_table-col tradeHistory_table-colSell tradeHistory_table-col-white">
                    {capitalize(item.type)}
                </div>
                <div className="tradeHistory_table-col tradeHistory_table-colCurrency">
                    {item.fromCurrency} / {item.toCurrency}
                </div>
                <div className="tradeHistory_table-col tradeHistory_table-colDate">
                    {dateString}
                </div>
                <div className="tradeHistory_table-col tradeHistory_table-colAmount tradeHistory_table-col-right">
                    {formatPairAmount(item.amount, item.pair, props.numberFormat)}
                </div>
                <div className="tradeHistory_table-col tradeHistory_table-colPrice tradeHistory_table-col-right">
                    {formatPairPrice(item.price, item.pair, props.numberFormat)}
                </div>
                <div
                    className={"tradeHistory_table-col tradeHistory_table-colStatus " + getStatusClass(statusText)}>
                    {statusText}
                </div>
                <div className="tradeHistory_table-col tradeHistory_table-colTotal tradeHistory_table-col-right">
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
export const TradeHistory: FC<Props> = (props: Props) => {
    const {theme} = useContext(Theme);
    const dark = theme === THEME.DARK ? styles.dark : '';
    const {language, getLocale} = useContext(I18nContext);
    const currentLocale = getLocale(language);
    const numberFormat = useSelector(getNumberFormat);

    const [isOrders, setIsOrders] = useState(false);
    const [startDate, setStartDate] = useState(getLastMonth());
    const [endDate, setEndDate] = useState(getTomorrow());
    const [fromCurrency, setFromCurrency] = useState('All');
    const [toCurrency, setToCurrency] = useState('All');
    const [status, setStatus] = useState('All');

    const {i18n} = useLingui();
    const orderStatusAll = i18n._(defineMessage({id: 'components.trade_history.order_status.all', message: 'All'}));
    const orderStatusOpen = i18n._(defineMessage({id: 'components.trade_history.order_status.open', message: 'Open'}));
    const orderStatusFilled = i18n._(defineMessage({
        id: 'components.trade_history.order_status.filled',
        message: 'Filled'
    }));
    const orderStatusCancelled = i18n._(defineMessage({
        id: 'components.trade_history.order_status.cancelled',
        message: 'Cancelled'
    }));
    const orderStatusPartial = i18n._(defineMessage({
        id: 'components.trade_history.order_status.partial',
        message: 'Partial'
    }));
    const tableHeaderPair = i18n._(defineMessage({id: 'components.trade_history.table_header.pair', message: 'Pair'}));
    const tableHeaderType = i18n._(defineMessage({id: 'components.trade_history.table_header.type', message: 'Type'}));
    const tableHeaderTime = i18n._(defineMessage({id: 'components.trade_history.table_header.time', message: 'Time'}));
    const tableHeaderAmount = i18n._(defineMessage({
        id: 'components.trade_history.table_header.amount',
        message: 'Amount'
    }));
    const tableHeaderPrice = i18n._(defineMessage({
        id: 'components.trade_history.table_header.price',
        message: 'Price'
    }));
    const tableHeaderStatus = i18n._(defineMessage({
        id: 'components.trade_history.table_header.status',
        message: 'Status'
    }));
    const tableHeaderTotal = i18n._(defineMessage({
        id: 'components.trade_history.table_header.total',
        message: 'Total'
    }));

    const onStartDateChange = (jsDate: Date, dateString: string) => {
        setStartDate(jsDate);
    }

    const onEndDateChange = (jsDate: Date, dateString: string) => {
        setEndDate(jsDate);
    }

    const startTime = getDateTime(startDate);
    const endTime = getDateTime(endDate);

    const rows: any[] = [];

    for (let i = 0; i < props.items.length; i++) {
        const item = props.items[i];
        if (startTime > item.date) continue;
        if (endTime > 0 && endTime < item.date) continue;
        if (fromCurrency !== 'All' && item.fromCurrency !== fromCurrency) continue;
        if (toCurrency !== 'All' && item.toCurrency !== toCurrency) continue;
        if (status !== 'All') {
            if ((status === 'OPEN') && (item.status !== 'NEW')) continue;
            if ((status === 'FILLED') && (item.status !== 'FILLED')) continue;
            if ((status === 'PARTIAL') && (item.status !== 'PARTIALLY_FILLED')) continue;
            if ((status === 'CANCELLED') && (item.status !== 'CANCELLED' && item.status !== 'PARTIALLY_CANCELLED')) continue;
        }
        const itemIsOpen = item.status === 'NEW' || item.status === 'PARTIALLY_FILLED' || item.status === 'PARTIALLY_CANCELLED';
        if (isOrders && !itemIsOpen) continue;
        if (!isOrders && itemIsOpen) continue;
        rows.push({
            order: item,
            numberFormat: numberFormat
        });
    }


    return (
        <div className={cn([dark, 'group', 'tradeHistory_container'])}>
            <div className="tradeHistory_toolbar">
                <div className={styles.toolbarMobileRow}>
                    <div className="btn-group-container btn-group-container_buttons">
                        <button className={`btn btn_transparent ${isOrders ? 'selected' : ''}`}
                                onClick={() => setIsOrders(true)}>
                            <Trans id="components.trade_history.btn.orders">Orders</Trans>
                        </button>
                        <button className={`btn btn_transparent ${isOrders ? '' : 'selected'}`}
                                onClick={() => setIsOrders(false)}>
                            <Trans id="components.trade_history.btn.history">History</Trans>
                        </button>
                    </div>
                </div>

                <div className={styles.toolbarMobileRow}>
                    <DatePickerInput
                        onChange={onStartDateChange}
                        locale={currentLocale}
                        displayFormat="DD/MM/YYYY"
                        maxDate={endDate}
                        value={startDate}
                    />
                    <div className="tradeHistory_toolbar-dateSeparator"/>
                    <DatePickerInput
                        onChange={onEndDateChange}
                        locale={currentLocale}
                        displayFormat="DD/MM/YYYY"
                        minDate={startDate}
                        value={endDate}
                    />
                </div>

                <div className={cn([styles.toolbarMobileRow, styles.currencyFilter])}>
                    <div className={styles.filterSelectWrapper}>
                        <Select value={fromCurrency}
                                className={styles.filterSelect}
                                onChange={event => {
                                    setFromCurrency(event.target.value)
                                }}
                        >
                            <option value="All">All</option>
                            <option value="BTC">BTC</option>
                            <option value="ETH">ETH</option>
                            <option value="XRP">XRP</option>
                            <option value="USDT">USDT</option>
                            <option value="ORN">ORN</option>
                            <option value="EGLD">EGLD</option>
                        </Select>
                    </div>
                    <div className="tradeHistory_toolbar-currencySeparator">/</div>
                    <div className={styles.filterSelectWrapper}>
                        <Select value={toCurrency}
                                className={styles.filterSelect}
                                onChange={event => {
                                    setToCurrency(event.target.value)
                                }}>
                            <option value="All">All</option>
                            <option value="BTC">BTC</option>
                            <option value="USDT">USDT</option>
                        </Select>
                    </div>

                    <div className={styles.filterSelectWrapper}>
                        <Select value={status}
                                onChange={event => setStatus(event.target.value)}
                                className={styles.filterSelect}
                        >
                            <option value={STATUS_TYPE.ALL}>{orderStatusAll}</option>
                            <option value={STATUS_TYPE.OPEN}>{orderStatusOpen}</option>
                            <option value={STATUS_TYPE.FILLED}>{orderStatusFilled}</option>
                            <option value={STATUS_TYPE.PARTIAL}>{orderStatusPartial}</option>
                            <option value={STATUS_TYPE.CANCELLED}>{orderStatusCancelled}</option>
                        </Select>
                    </div>
                </div>
            </div>

            <Table
                isLoading={props.isLoading && props.items.length === 0}
                headers={[
                    {
                        className: 'tradeHistory_table-headerCol',
                        text: tableHeaderType
                    },
                    {
                        className: 'tradeHistory_table-headerCol',
                        text: tableHeaderPair
                    },
                    {
                        className: 'tradeHistory_table-headerCol',
                        text: tableHeaderTime
                    },
                    {
                        className: 'tradeHistory_table-headerCol tradeHistory_table-headerCol-right',
                        text: tableHeaderAmount
                    },
                    {
                        className: 'tradeHistory_table-headerCol tradeHistory_table-headerCol-right',
                        text: tableHeaderPrice
                    },
                    {
                        className: 'tradeHistory_table-headerCol',
                        text: tableHeaderStatus
                    },
                    {
                        className: 'tradeHistory_table-headerCol tradeHistory_table-headerCol-right',
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
                className="tradeHistory_table"
                headerClassName="tradeHistory_table-header"
                scrollContainerClassName="tradeHistory_scrollContainer"
                rowRenderer={TradeHistoryRow}
                data={rows}/>
        </div>
    )
}
