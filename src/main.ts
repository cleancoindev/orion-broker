import {log} from './log';
import {Db} from './db/Db';
import {createEmulatorExchangeConfigs, Dictionary} from './Model';
import {Connectors, ExchangeConfig} from './connectors/Connectors';
import {BrokerHub} from './hub/BrokerHub';
import {hashPassword, SettingsManager} from './Settings';
import {WebUI} from './ui/WebUI';
import {Terminal} from './ui/Terminal';
import {v1 as uuid} from 'uuid';
import {Broker} from './Broker';
import {BrokerHubWebsocket} from './hub/BrokerHubWebsocket';

import Cryptr from 'cryptr';
import express from 'express';
import BigNumber from 'bignumber.js';
import {Tokens} from './Tokens';
import fetch from 'node-fetch';
import 'reflect-metadata';

export let tokensDecimals: Dictionary<number>;
export let tokens: Tokens;
export let exchangeContractAddress: string;

const init = async (): Promise<void> => {
    const settingsManager = new SettingsManager('./data/config.json');
    const settings = settingsManager.settings;

    const blockchainInfoRaw = await fetch(settings.orionBlockchainUrl + '/info');
    const blockchainInfo = await blockchainInfoRaw.json();
    exchangeContractAddress = blockchainInfo.exchangeContractAddress;
    tokensDecimals = blockchainInfo.assetToDecimals;
    const tokensDict: Dictionary<string> = blockchainInfo.assetToAddress;
    tokens = new Tokens(tokensDict);

    const emulatorBalances: Dictionary<string> = {};
    for (let asset of Object.keys(tokens.nameToAddress)) {
        if (asset === 'ETH') {
            emulatorBalances[asset] = '5';
        } else {
            emulatorBalances[asset] = '3000';
        }
    }

    const connector: Connectors = new Connectors(emulatorBalances, settings.production);

    const app = express();

    app.use(express.json());

    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-compress,Cache-Control');
        next();
    });

    function initHttpServer(): void {
        app.listen(settings.httpPort, function () {
            log.log('Broker app listening on http://localhost:' + settings.httpPort);
        });
    }

    const db = new Db();
    db.init();

    const brokerHub: BrokerHub = new BrokerHubWebsocket(settings);
    const webUI = new WebUI(db, settings, app);
    const terminal = new Terminal(settingsManager);

    const broker = new Broker(settings, brokerHub, db, webUI, connector);
    connector.setOnTradeListener(trade => broker.onTrade(trade));

    terminal.onCreatePassword = async (password: string): Promise<void> => {
        settingsManager.cryptr = new Cryptr(password);
        settings.passwordSalt = uuid().toString();
        settings.passwordHash = hashPassword(password + settings.passwordSalt);
        await settingsManager.save();
        start();
    };

    terminal.onLoginPassword = (password: string): boolean => {
        const hash = hashPassword(password + settings.passwordSalt);
        if (settings.passwordHash === hash) {
            settingsManager.cryptr = new Cryptr(password);
            settingsManager.decrypt();
            start();
            return true;
        }
        return false;
    };

    terminal.onConnectExchange = (exchange: string, apiKey: string, privateKey: string, password: string): void => {
        settings.exchanges[exchange] = {
            key: apiKey,
            secret: privateKey,
            password: password
        };
        settingsManager.save();
        connector.updateExchange(exchange, settings.exchanges[exchange]);
    };

    terminal.onDisconnectExchange = (exchange: string): void => {
        delete settings.exchanges[exchange];
        settingsManager.save();
        connector.removeExchange(exchange);
    };

    terminal.onListExchanges = (): string => {
        return connector.exchangesIds.length === 0 ? 'no exchanges connected' : connector.exchangesIds.join(', ');
    };

    const formatBalances = (balances: Dictionary<BigNumber>): string => {
        const arr: string[] = [];
        for (let currency in balances) {
            if (balances.hasOwnProperty(currency)) {
                const balance = balances[currency];
                if (!balance.isZero()) {
                    arr.push(balance.toString() + ' ' + currency);
                }
            }
        }
        return arr.length === 0 ? 'empty' : arr.join(', ');
    };

    terminal.onPrintExchangesBalances = (): string => {
        const balances = broker.lastBalances;
        let s = '';
        for (let exchange in balances) {
            if (balances.hasOwnProperty(exchange)) {
                s += exchange + ': ' + formatBalances(balances[exchange]);
                s += '\n';
            }
        }
        return s;
    };

    terminal.onPrintContractBalances = async (): Promise<void> => {
        try {
            const balances = await broker.orionBlockchain.getContractBalance();
            terminal.ui.log.add(formatBalances(balances));
        } catch (e) {
            log.error('Contract balances error:', e);
        }
    };

    terminal.onPrintWalletBalances = async (): Promise<void> => {
        try {
            const balances = await broker.orionBlockchain.getWalletBalance();
            terminal.ui.log.add(formatBalances(balances));
        } catch (e) {
            log.error('Wallet balances error:', e);
        }
    };

    terminal.onPrintStakes = async (): Promise<void> => {
        try {
            const stakes = await broker.orionBlockchain.getStakes();
            terminal.ui.log.add(stakes.join(','));
        } catch (e) {
            log.error('Stakes error:', e);
        }
    };

    terminal.onSetPrivateKey = (privateKey: string): void => {
        settings.privateKey = privateKey;
        settingsManager.save();
        broker.connectToOrion();
    };

    terminal.onDeposit = async (amount: BigNumber, assetName: string): Promise<void> => {
        try {
            await broker.deposit(amount, assetName);
        } catch (e) {
            log.error('Deposit error:', e);
        }
    };

    terminal.onWithdraw = async (amount: BigNumber, assetName: string): Promise<void> => {
        try {
            await broker.withdraw(amount, assetName);
        } catch (e) {
            log.error('Withdraw error:', e);
        }
    };

    terminal.onApprove = async (amount: BigNumber, assetName: string): Promise<void> => {
        try {
            await broker.approve(amount, assetName);
        } catch (e) {
            log.error('Approve error:', e);
        }
    };

    terminal.onExchangeWithdraw = async (exchange: string, amount: BigNumber, assetName: string): Promise<void> => {
        try {
            await broker.exchangeWithdraw(exchange, amount, assetName);
        } catch (e) {
            log.error('Withdraw error:', e);
        }
    };

    terminal.onGetStake = async (): Promise<void> => {
        try {
            const stake = await broker.orionBlockchain.getStake();
            terminal.ui.log.add(stake);
        } catch (e) {
            log.error('Get stake error:', e);
        }
    };

    terminal.onLockStake = async (amount: BigNumber): Promise<void> => {
        try {
            await broker.lockStake(amount);
        } catch (e) {
            log.error('Stake error:', e);
        }
    };

    terminal.onReleaseStake = async (): Promise<void> => {
        try {
            await broker.releaseStake();
        } catch (e) {
            log.error('Release stake error:', e);
        }
    };

    function start(): void {
        const exchangeConfigs: Dictionary<ExchangeConfig> = settings.production ? settings.exchanges : createEmulatorExchangeConfigs();
        connector.updateExchanges(exchangeConfigs);

        terminal.ui.showMain();
        webUI.initWs();
        initHttpServer();
        broker.connectToOrion();
    }

    if (settings.passwordHash) {
        const arg = process.argv.slice(2).find(arg => arg.startsWith('-p'));
        const password = arg ? arg.substring(2) : undefined;

        if (password) {
            if (!terminal.onLoginPassword(password)) {
                console.log('Invalid password');
                process.exit();
            }
        } else {
            terminal.ui.showLogin();
        }

    } else {
        terminal.ui.showHello();
    }
};

init();
