import {ICON_TYPE} from "../components/Swap/Icon";

export const getIconTypeByString = (icon: string, isColor?: boolean) => {
    switch (icon.toLowerCase()) {
        case 'btc':
        case 'wbtc':
            return isColor ? ICON_TYPE.COLOR_BTC : ICON_TYPE.BTC;
        case 'eth':
            return isColor ? ICON_TYPE.COLOR_ETH : ICON_TYPE.ETH;
        case 'xrp':
            return isColor ? ICON_TYPE.COLOR_XRP : ICON_TYPE.XRP;
        case 'usdt':
            return isColor ? ICON_TYPE.COLOR_USDT : ICON_TYPE.USDT;
        case 'orn':
            return isColor ? ICON_TYPE.COLOR_ORN : ICON_TYPE.ORN;
        case 'egld':
            return isColor ? ICON_TYPE.COLOR_ERD : ICON_TYPE.EGLD;
        default:
            return isColor ? ICON_TYPE.COLOR_ETH : ICON_TYPE.ETH;
    }
}
