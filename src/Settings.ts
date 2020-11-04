import {OrionBlockchainSettings} from "./OrionBlockchain";
import {Dictionary} from "./Model";
import {ExchangeConfig} from "./connectors/Connectors";
import crypto from 'crypto';
import fs from 'fs';

export interface Settings extends OrionBlockchainSettings {
    orionUrl: string;
    orionBlockchainUrl: string;
    callbackUrl: string;
    matcherAddress: string;
    privateKey: string;
    httpPort: number;
    wsPort: number;
    passwordHash: string;
    passwordSalt: string;
    production: boolean;
    exchanges: Dictionary<ExchangeConfig>;
    sendPartialTrades: boolean;
}

export class SettingsManager {
    configPath: string;
    settings: Settings;
    cryptr: any; // Cryptr

    constructor(configPath) {
        this.configPath = configPath;
        this.settings = JSON.parse(fs.readFileSync(configPath).toString());
    }

    async save(): Promise<void> {
        const exchanges: Dictionary<ExchangeConfig> = {};
        for (let exchangeId in this.settings.exchanges) {
            const exchange = this.settings.exchanges[exchangeId];
            exchanges[exchangeId] = {
                key: exchange.key,
                secret: this.cryptr.encrypt(exchange.secret),
            }
        }
        const privateKey = this.settings.privateKey ? this.cryptr.encrypt(this.settings.privateKey) : '';
        const data = {
            ...this.settings,
            privateKey,
            exchanges
        }
        fs.writeFileSync(this.configPath, JSON.stringify(data, null, 2));
    }

    decrypt(): void {
        for (let exchangeId in this.settings.exchanges) {
            const exchange = this.settings.exchanges[exchangeId];
            exchange.secret = this.cryptr.decrypt(exchange.secret);
        }
        this.settings.privateKey = this.settings.privateKey ? this.cryptr.decrypt(this.settings.privateKey) : '';
    }
}

export function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex')
}

