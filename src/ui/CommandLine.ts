import {EXCHANGES} from '../Model';
import BigNumber from 'bignumber.js';

export enum DataType {
    EXCHANGE,
    BLOCKCHAIN_PRIVATE_KEY,
    TOKEN_NAME,
    ASSET_NAME,
    AMOUNT,
    EXCHANGE_API_KEY,
    EXCHANGE_PRIVATE_KEY,
    EXCHANGE_PASSWORD,
    URL,
    BOOL,
}

export interface AskConfig {
    askText: (state: any) => string;
    fieldName: string;
    type: DataType;
}

export interface ParamConfig {
    name: string,
    fieldName: string;
    type: DataType;
}

export interface CommandConfig {
    name: string;
    help: string;
    params: ParamConfig[];
    asks: AskConfig[];
    after: (state: any) => string;
}


const state: any = {
    step: 0,
    currentCommand: undefined as CommandConfig
};

export function printHelp(config: CommandConfig[]): string {
    return config.map(c => c.name + ' - ' + c.help).join('\n');
}

function commandUsage(commandConfig: CommandConfig): string {
    return commandConfig.name + ' ' + commandConfig.params.map(p => '<' + p.name + '>').join(' ');
}

function validateInput(input: string, type: DataType): string {
    switch (type) {
        case DataType.EXCHANGE:
            if (EXCHANGES.indexOf(input) === -1) {
                return 'Invalid exchange. Available exchanges: ' + EXCHANGES.join(', ');
            }
            return '';
        case DataType.ASSET_NAME:
            if (input !== 'ETH' && input !== 'USDT' && input !== 'ORN') {
                return 'Invalid asset';
            }
            return '';
        case DataType.TOKEN_NAME:
            if (input !== 'USDT' && input !== 'ORN') {
                return 'Invalid token';
            }
            return '';
        case DataType.AMOUNT:
            const n = new BigNumber(input);
            if (n.isNaN() || n.lte(0)) {
                return 'Invalid amount';
            }
            return '';
        case DataType.BLOCKCHAIN_PRIVATE_KEY: // todo: private key format
        case DataType.EXCHANGE_PRIVATE_KEY: // todo: private key format
            if (!input.length) {
                return 'Invalid private key';
            }
            return '';
        case DataType.EXCHANGE_PASSWORD:
            return '';
        case DataType.EXCHANGE_API_KEY: // todo: api key format
            if (!input.length) {
                return 'Invalid api key';
            }
            return '';
        case DataType.URL: // todo: url format
            if (!input.length) {
                return 'Invalid url';
            }
            return '';
        case DataType.BOOL:
            if (['on', 'off'].indexOf(input) === -1) {
                return '"on" or "off';
            }
            return '';
    }
}

function nextAsk(): string {
    if (state.step < state.currentCommand.asks.length) {
        return state.currentCommand.asks[state.step].askText(state);
    } else {
        const result = state.currentCommand.after(state);
        for (const param of state.currentCommand.params) {
            state[param.fieldName] = undefined;
        }
        for (const ask of state.currentCommand.asks) {
            state[ask.fieldName] = undefined;
        }
        state.currentCommand = undefined;
        state.step = 0;
        return result;
    }
}

export function processLine(line: string, configs: CommandConfig[]): string {
    if (!state.currentCommand) {
        if (!line.trim().length) return '';

        let arr = line.split(' ');
        const commandConfig = configs.find(c => c.name === arr[0].toLowerCase());
        if (!commandConfig) {
            return 'Unknown command ' + arr[0];
        }
        if (commandConfig.params.length && commandConfig.params[0].type === DataType.BLOCKCHAIN_PRIVATE_KEY && arr.length > 1) {
            arr = [arr[0], arr.slice(1).join(' ')];
        }

        if (arr.length - 1 !== commandConfig.params.length) {
            return 'Usage: ' + commandUsage(commandConfig);
        }
        for (let i = 0; i < commandConfig.params.length; i++) {
            const param = commandConfig.params[i];
            const validateError = validateInput(arr[i + 1], param.type);
            if (validateError) {
                return validateError;
            }
        }

        for (let i = 0; i < commandConfig.params.length; i++) {
            const param = commandConfig.params[i];
            state[param.fieldName] = arr[i + 1];
        }

        state.currentCommand = commandConfig;
        state.step = 0;
        return nextAsk();
    } else {
        const ask = state.currentCommand.asks[state.step];
        const validateError = validateInput(line, ask.type);
        if (validateError) {
            return validateError;
        } else {
            state[ask.fieldName] = line;
            state.step++;
            return nextAsk();
        }
    }
}