import React, {FC, SyntheticEvent, useState} from "react";
import BigNumber from "bignumber.js";
import {useLingui} from "@lingui/react";
import {defineMessage, Trans} from '@lingui/macro';
import {capitalize, EXCHANGES, formatNumber, getColorIcon, getFullName} from "../../Utils";
import {Table} from "../Table";
import {PromptPopupProps} from "../PromptPopup/PromptPopup";
import {Checkbox} from "../Checkbox";
import styles from './DashboardTable.module.css';
import {Search} from "../Search";
import {useSelector} from "react-redux";
import {getCurrencies} from "../../redux/selectors";
import {TableColumn} from "../Table/Table";
import {Dictionary} from "../../Model";

interface DashboardTableRowProps {
    currency: string;
    // exchange -> BigNumber
    total: BigNumber;
}

function DashboardTableRow(index: number, props: any) {
    const divs = [];

    for (let exchange of EXCHANGES) {
        divs.push(<div key={exchange} className="dashboard_table-col dashboard_table-colWallet">
            <div className="dashboard_table-col__text">
                {capitalize(exchange)}
            </div>
            {formatNumber(props[exchange], 8)}
        </div>)
    }

    return (
        <div className="dashboard_table-row" key={props.currency}>
            <div className="dashboard_table-col dashboard_table-colToken">
                <div className={`icon ` + getColorIcon(props.currency)}/>
                {props.currency}
            </div>
            {divs}

            <div className="dashboard_table-col dashboard_table-colInOrder">
                <div className="dashboard_table-col__text">
                    Total
                </div>
                {formatNumber(props.total, 8)}
            </div>
        </div>
    )
}

interface DashboardTableProps {
    balances: Dictionary<Dictionary<BigNumber>>
}

export const DashboardTable: FC<DashboardTableProps> = (props) => {
    const currencies = useSelector(getCurrencies);

    const [shouldHideZero, setShouldHideZero] = useState(false);
    const [textFilter, setTextFilter] = useState('');
    const {i18n} = useLingui();
    const headerToken = i18n._(defineMessage({id: 'components.dashboard_table.header.token', message: 'Token'}));

    const onSearch = (e: SyntheticEvent<HTMLInputElement>) => {
        setTextFilter(e.currentTarget.value.toLocaleLowerCase());
    };

    const rows = [];

    for (let name of currencies) {
        const balance = props.balances[name];
        let total = new BigNumber(0);

        const rowData: any = {
            currency: name,
        };

        for (let exchange in balance) {
            total = total.plus(balance[exchange])
            rowData[exchange] = balance[exchange];
        }

        rowData.total = total;

        if (shouldHideZero && total.eq(0)) {
            continue;
        }

        if (textFilter && (name.toLowerCase().indexOf(textFilter) === -1) && (getFullName(name).toLowerCase().indexOf(textFilter) === -1)) {
            continue;
        }

        rows.push(rowData)
    }

    const headers = [];
    const columns: TableColumn[] = [];

    headers.push(
        {
            className: 'dashboard_table-headerCol',
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
                className: 'dashboard_table-headerCol dashboard_table-headerCol-right',
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
            className: 'dashboard_table-headerCol dashboard_table-headerCol-right',
            text: 'Total'
        }
    )

    columns.push(
        {
            dataField: 'total',
            dataType: 'BigNumber'
        },
    )

    return (
        <div className="group dashboard_table-group">
            <div className="dashboard_info">
                <div className="dashboard_info-h">
                    Exchange balances
                </div>
            </div>

            <div className={styles.tableControls}>
                <Checkbox className={styles.hideZeroCb} onChange={() => setShouldHideZero(!shouldHideZero)}
                          value={shouldHideZero}>
                        <span className={styles.checkboxLabel}>
                            <Trans id="components.dashboard_table.hide_zero">Hide zero</Trans>
                        </span>
                </Checkbox>
                <Search className={styles.searchInput} onChange={onSearch}/>
            </div>
            <Table
                isLoading={false}
                headers={headers}
                columns={columns}
                className="dashboard_table"
                headerClassName="dashboard_table-header"
                scrollContainerClassName="dashboard_table-scrollContainer"
                rowRenderer={DashboardTableRow}
                defaultSortIndex={7}
                data={rows}>

            </Table>
        </div>
    )
}
