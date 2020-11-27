import {log} from "../log";
import {SettingsManager} from "../Settings";
import {TerminalUI} from "./TerminalUI";
import {CommandConfig, DataType, printHelp, processLine} from "./CommandLine";

export class Terminal {
    onCreatePassword: (password: string) => Promise<void>;
    onLoginPassword: (password: string) => boolean;
    onConnectExchange: (exchange: string, apiKey: string, privateKey: string) => void;
    onSetPrivateKey: (privateKey: string) => void;
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
        }

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
                    }
                ],
                after: (state: any) => {
                    this.onConnectExchange(state.exchange, state.apiKey, state.privateKey);
                    return state.exchange + ' connected';
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