import {log} from '../log';
import {SettingsManager} from '../Settings';
import {TerminalUI} from './TerminalUI';
import {CommandConfig, DataType, printHelp, processLine} from './CommandLine';
import BigNumber from 'bignumber.js';

export class Terminal {
    onCreatePassword: (password: string) => Promise<void>;
    onLoginPassword: (password: string) => boolean;
    onConnectExchange: (exchange: string, apiKey: string, privateKey: string, password: string) => void;
    onDisconnectExchange: (exchange: string) => void;
    onListExchanges: () => string;
    onPrintExchangesBalances: () => string;
    onPrintContractBalances: () => Promise<void>;
    onPrintWalletBalances: () => Promise<void>;
    onPrintStakes: () => Promise<void>;
    onSetPrivateKey: (privateKey: string) => void;
    onDeposit: (amount: BigNumber, assetName: string) => void;
    onWithdraw: (amount: BigNumber, assetName: string) => void;
    onApprove: (amount: BigNumber, assetName: string) => void;
    onExchangeWithdraw: (exchange: string, amount: BigNumber, assetName: string) => void;
    onGetStake: () => void;
    onLockStake: (amount: BigNumber) => void;
    onReleaseStake: () => void;
    ui: any; // TerminalUI

    constructor(settingsManger: SettingsManager) {
        const settings = settingsManger.settings;
        const ui = new TerminalUI();
        this.ui = ui;

        ui.isProduction = settings.production;

        log.writer = (s: string) => {
            if (ui.history) {
                ui.history.add(s);
            }
        };

        ui.onCreatePassword = password => this.onCreatePassword(password);
        ui.onLoginPassword = password => this.onLoginPassword(password);

        const commandConfigs: CommandConfig[] = [
            {
                name: 'connect',
                help: 'Connect to exchange',
                params: [
                    {
                        name: 'exchange',
                        fieldName: 'exchange',
                        type: DataType.EXCHANGE
                    },
                ],
                asks: [
                    {
                        askText: (state: any) => 'Please enter api key for ' + state.exchange,
                        fieldName: 'apiKey',
                        type: DataType.EXCHANGE_API_KEY
                    },
                    {
                        askText: (state: any) => 'Please enter private key for ' + state.exchange,
                        fieldName: 'privateKey',
                        type: DataType.EXCHANGE_PRIVATE_KEY
                    },
                    {
                        askText: (state: any) => 'Please enter passphrase for ' + state.exchange + ' (empty if no passphrase)',
                        fieldName: 'password',
                        type: DataType.EXCHANGE_PASSWORD
                    }
                ],
                after: (state: any) => {
                    this.onConnectExchange(state.exchange, state.apiKey, state.privateKey, state.password);
                    return state.exchange + ' connected';
                }
            },
            {
                name: 'disconnect',
                help: 'Disconnect exchange',
                params: [
                    {
                        name: 'exchange',
                        fieldName: 'exchange',
                        type: DataType.EXCHANGE
                    },
                ],
                asks: [],
                after: (state: any) => {
                    this.onDisconnectExchange(state.exchange);
                    return state.exchange + ' disconnected';
                }
            },
            {
                name: 'list',
                help: 'List connected exchanges',
                params: [],
                asks: [],
                after: (state: any) => {
                    return this.onListExchanges();
                }
            },
            {
                name: 'balances',
                help: 'Print exchanges balances',
                params: [],
                asks: [],
                after: (state: any) => {
                    return this.onPrintExchangesBalances();
                }
            },
            {
                name: 'deposits',
                help: 'Print your deposits on contract',
                params: [],
                asks: [],
                after: (state: any) => {
                    this.onPrintContractBalances();
                    return '';
                }
            },
            {
                name: 'wallet',
                help: 'Print your wallet balances',
                params: [],
                asks: [],
                after: (state: any) => {
                    this.onPrintWalletBalances()
                    return '';
                }
            },
            {
                name: 'privatekey',
                help: 'Set a blockchain private key',
                params: [
                    {
                        name: 'private_key',
                        fieldName: 'privateKey',
                        type: DataType.BLOCKCHAIN_PRIVATE_KEY
                    },
                ],
                asks: [],
                after: (state: any) => {
                    this.onSetPrivateKey(state.privateKey);
                    return 'private key saved';
                }
            },
            {
                name: 'deposit',
                help: 'Deposit asset to Orion smart contract',
                params: [
                    {
                        name: 'amount',
                        fieldName: 'amount',
                        type: DataType.AMOUNT
                    },
                    {
                        name: 'assetName',
                        fieldName: 'assetName',
                        type: DataType.ASSET_NAME
                    },
                ],
                asks: [],
                after: (state: any) => {
                    this.onDeposit(new BigNumber(state.amount), state.assetName);
                    return '';
                }
            },
            {
                name: 'approve',
                help: 'Approve asset for Orion smart contract',
                params: [
                    {
                        name: 'amount',
                        fieldName: 'amount',
                        type: DataType.AMOUNT
                    },
                    {
                        name: 'assetName',
                        fieldName: 'assetName',
                        type: DataType.TOKEN_NAME
                    },
                ],
                asks: [],
                after: (state: any) => {
                    this.onApprove(new BigNumber(state.amount), state.assetName);
                    return '';
                }
            },
            {
                name: 'withdraw',
                help: 'Withdraw asset from Orion smart contract',
                params: [
                    {
                        name: 'amount',
                        fieldName: 'amount',
                        type: DataType.AMOUNT
                    },
                    {
                        name: 'assetName',
                        fieldName: 'assetName',
                        type: DataType.ASSET_NAME
                    },
                ],
                asks: [],
                after: (state: any) => {
                    this.onWithdraw(new BigNumber(state.amount), state.assetName);
                    return '';
                }
            },
            {
                name: 'exwithdraw',
                help: 'Withdraw from exchanges',
                params: [
                    {
                        name: 'exchange',
                        fieldName: 'exchange',
                        type: DataType.EXCHANGE
                    },
                    {
                        name: 'amount',
                        fieldName: 'amount',
                        type: DataType.AMOUNT
                    },
                    {
                        name: 'assetName',
                        fieldName: 'assetName',
                        type: DataType.ASSET_NAME
                    },
                ],
                asks: [],
                after: (state: any) => {
                    this.onExchangeWithdraw(state.exchange, new BigNumber(state.amount), state.assetName);
                    return '';
                }
            },
            {
                name: 'stakes',
                help: 'Get all broker stakes in Orion',
                params: [],
                asks: [],
                after: (state: any) => {
                    this.onPrintStakes();
                    return '';
                }
            },
            {
                name: 'getstake',
                help: 'Get your ORN stake',
                params: [],
                asks: [],
                after: (state: any) => {
                    this.onGetStake();
                    return '';
                }
            },
            {
                name: 'stake',
                help: 'Add ORN to your stake',
                params: [
                    {
                        name: 'amount',
                        fieldName: 'amount',
                        type: DataType.AMOUNT
                    },
                ],
                asks: [],
                after: (state: any) => {
                    this.onLockStake(new BigNumber(state.amount));
                    return '';
                }
            },
            {
                name: 'releaseStake',
                help: 'Release your ORN stake',
                params: [],
                asks: [],
                after: (state: any) => {
                    this.onReleaseStake();
                    return '';
                }
            },
            {
                name: 'ip',
                help: 'Set server IP',
                params: [
                    {
                        name: 'ip',
                        fieldName: 'ip',
                        type: DataType.URL
                    },
                ],
                asks: [],
                after: (state: any) => {
                    settings.brokerWebServerUrl = 'http://' + state.ip + ':' + settings.httpPort;
                    settingsManger.save();
                    return 'url saved, changes will take effect after restarting the app';
                }
            },
            {
                name: 'emulator',
                help: 'Turn on/off emulator',
                params: [
                    {
                        name: 'flag',
                        fieldName: 'flag',
                        type: DataType.BOOL
                    },
                ],
                asks: [],
                after: (state: any) => {
                    settings.production = state.flag === 'off';
                    settingsManger.save();
                    return 'mode saved, changes will take effect after restarting the app';
                }
            },
            {
                name: 'help',
                help: 'List available commands',
                params: [],
                asks: [],
                after: (state: any) => {
                    return printHelp(commandConfigs);
                }
            },
            {
                name: 'exit',
                help: 'Exit the app',
                params: [],
                asks: [],
                after: (state: any) => {
                    return process.exit();
                }
            }
        ];

        ui.onCmd = line => processLine(line, commandConfigs);
        ui.onMain = () => ui.log.add(printHelp(commandConfigs));
    }
}