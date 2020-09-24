import { httpGet } from "../Utils";

type RequestSwapOrderList = {
    currencyFrom: string;
    currencyTo: string;
    address: string | null;
};

export const getSwapOrderList = async (params: RequestSwapOrderList) => {
    const {currencyFrom, currencyTo, address} = params;
    const url = `${process.env.REACT_APP_ORION_WAN!}/backend/api/v1/swap/history?symbol=${currencyFrom}-${currencyTo}&address=${address}`;

    const res = await httpGet(url);
    const allOrders = JSON.parse(res);

    return allOrders.reduce((ordersRes: any, order: any) => {
        return {
            ...ordersRes,
            [order.id.toString()]: order,
        }
    }, {});
};
