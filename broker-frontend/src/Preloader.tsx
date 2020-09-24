import React, {FC, useEffect} from "react";
import {httpGet} from "./Utils";
import {DEFAULT_PAIRS_LIST} from "./redux/reducers/pairs";
import {Dictionary, NumberFormat} from "./Model";
import WebFont from "webfontloader";
import {useDispatch, useSelector} from "react-redux";
import {setAssets, setNumberFormat} from "./redux/actions";
import {App} from "./App";
import {LoadingIcon} from "./components/Table/Loading";
import {getPairsInitialized} from "./redux/selectors";

const filesToPreload = [ // todo
    '/img/icons_currency_color/eth.svg',
    '/img/icons_currency_color/bitcoin.svg',
    '/img/icons_currency_color/xrp.svg',
    '/img/icons_currency_color/usdt.svg',
    '/img/icons_currency_color/egld.svg',
    '/img/plus.svg',
    '/img/plus_dark.svg',
    '/img/minus.svg',
    '/img/minus_dark.svg',
    '/img/star.svg',
    '/img/star_dark.svg',
    '/img/star_fill.svg',
    '/img/next.svg',
]

export const Preloader: FC = () => {
    const dispatch = useDispatch();
    const isLoaded = useSelector(getPairsInitialized);

    async function preloadIcons() {
        for (let i = 0; i < filesToPreload.length; i++) {
            try {
                await httpGet(filesToPreload[i]);
            } catch (e) {
                console.error(e);
            }
        }
    }

    async function preloadFonts() {
        return new Promise((resolve, reject) => {
            const WebFontConfig = {
                google: {
                    families: ['Montserrat:400,500,600,700']
                },
                active: resolve
            };

            WebFont.load(WebFontConfig);
        });
    }

    async function loadPairsList(): Promise<string[]> {
        try {
            const dataString: string = await httpGet(process.env.REACT_APP_BACKEND! + '/api/v1/pairs/list');
            const data: string[] = JSON.parse(dataString);
            console.log('pairsList', data);
            return data;
        } catch (e) {
            console.error(e);
            return DEFAULT_PAIRS_LIST;
        }
    }

    async function loadNumberFormat(): Promise<Dictionary<NumberFormat>> {
        try {
            const dataString: string = await httpGet(process.env.REACT_APP_BACKEND! + '/api/v1/pairs/exchangeInfo')
            const data = JSON.parse(dataString);
            const numberFormat: Dictionary<NumberFormat> = {};
            for (let pairName in data) {
                const item = data[pairName];
                numberFormat[item.name] = item;
            }
            console.log('numberFormat', numberFormat);
            return numberFormat;
        } catch (e) {
            console.error(e);
            return {};
        }
    }

    async function start() {
        await preloadIcons();
        await preloadFonts();

        const pairsList: string[] = await loadPairsList();
        const numberFormat = await loadNumberFormat();

        dispatch(setNumberFormat(numberFormat));
        dispatch(setAssets(pairsList));
    }

    useEffect(() => {
        start();
    }, []);

    return isLoaded ? <App/> : <LoadingIcon/>;
}
