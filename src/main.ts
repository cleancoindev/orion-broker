import {log} from "./log";
import {Db} from "./db/Db";
import {createEmulatorExchangeConfigs, Dictionary} from "./Model";
import {Connectors, ExchangeConfig} from "./connectors/Connectors";
import {BrokerHub} from "./hub/BrokerHub";
import {hashPassword, SettingsManager} from "./Settings";
import {WebUI} from "./ui/WebUI";
import {Terminal} from "./ui/Terminal";
import {v1 as uuid} from "uuid";
import {Broker} from "./Broker";
import {BrokerHubWebsocket} from "./hub/BrokerHubWebsocket";

import Cryptr from 'cryptr';
import fs from 'fs';
import express from 'express';


const settingsManager = new SettingsManager('./config.json');
const settings = settingsManager.settings;

const emulatorBalances: Dictionary<string> = JSON.parse(fs.readFileSync('./emulator_balances.json').toString());

const connector: Connectors = new Connectors(emulatorBalances, settings.production);

const app = express();

app.use(express.json());

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-compress");
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
}

terminal.onLoginPassword = (password: string): boolean => {
    const hash = hashPassword(password + settings.passwordSalt);
    if (settings.passwordHash === hash) {
        settingsManager.cryptr = new Cryptr(password);
        settingsManager.decrypt();
        start();
        return true;
    }
    return false;
}

terminal.onConnectExchange = (exchange: string, apiKey: string, privateKey: string): void => {
    settings.exchanges[exchange] = {
        key: apiKey,
        secret: privateKey,
    }
    settingsManager.save();
    connector.updateExchange(exchange, settings.exchanges[exchange]);
}

terminal.onSetPrivateKey = (privateKey: string): void => {
    settings.privateKey = privateKey;
    settingsManager.save();
    broker.connectToOrion();
}

function start(): void {
    const exchangeConfigs: Dictionary<ExchangeConfig> = settings.production ? settings.exchanges : createEmulatorExchangeConfigs();
    connector.updateExchanges(exchangeConfigs);

    terminal.ui.showMain();
    webUI.initWs();
    initHttpServer()
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
