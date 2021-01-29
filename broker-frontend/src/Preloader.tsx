import React, {FC, useEffect} from "react";
import {DEFAULT_PAIR} from "./redux/reducers/pairs";
import {BlockchainInfo, Dictionary, NumberFormat} from "./Model";
import WebFont from "webfontloader";
import {useDispatch, useSelector} from "react-redux";
import {setCurrentPair, setNumberFormat, setPairsList} from "./redux/actions";
import {App} from "./App";
import {LoadingIcon} from "@orionprotocol/orion-ui-kit";
import {getPairsInitialized} from "./redux/selectors";
import {Api} from "./Api";
import {Tokens} from './Tokens';

export const Preloader: FC = () => {
    const dispatch = useDispatch();
    const isLoaded = useSelector(getPairsInitialized);

    async function preloadFonts() {
        return new Promise((resolve, reject) => {
            const WebFontConfig = {
                custom: {
                    families: ['Montserrat:400,500,600,700'],
                    urls: ['/fonts/fonts.css']
                },
                active: resolve
            };

            WebFont.load(WebFontConfig);
        });
    }

    async function loadNumberFormat(): Promise<Dictionary<NumberFormat>> {
        const data = await Api.getExchangeInfo();
        const numberFormat: Dictionary<NumberFormat> = {};
        for (let pairName in data) {
            if (data.hasOwnProperty(pairName)) {
                const item = data[pairName];
                numberFormat[item.name] = item;
            }
        }
        console.log('numberFormat', numberFormat);
        return numberFormat;
    }

    function getPairFromLocation(pairsList: string[]): string {
        const s = window.location.pathname;
        if (s.indexOf('/trade/') === -1) return DEFAULT_PAIR;
        const pair = s.substr('/trade/'.length);
        if (pairsList.indexOf(pair) > -1) {
            return pair;
        } else {
            window.history.pushState({}, '', '/trade/' + DEFAULT_PAIR);
            return DEFAULT_PAIR;
        }
    }

    async function start(): Promise<void> {
        await preloadFonts();

        const blockchainInfo: BlockchainInfo = await Api.getBlockchainInfo();
        const pairsList: string[] = await Api.getPairsList();
        const initPair: string = getPairFromLocation(pairsList);
        const numberFormat = await loadNumberFormat();

        Api.blockchainInfo = blockchainInfo;
        Api.tokens = new Tokens(blockchainInfo.assetToAddress);
        Api.prices = await Api.getPricesFromBlockchain();
        dispatch(setNumberFormat(numberFormat));
        dispatch(setPairsList(pairsList));
        dispatch(setCurrentPair(initPair));
    }

    useEffect(() => {
        start()
    }, []);

    return isLoaded ? <App/> : <LoadingIcon/>;
}
