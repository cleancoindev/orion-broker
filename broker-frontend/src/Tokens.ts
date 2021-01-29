import {Dictionary} from './Model';

export class Tokens {
    readonly nameToAddress: Dictionary<string>;

    constructor(nameToAddress: Dictionary<string>) {
        this.nameToAddress = nameToAddress;
    }

    addressToName(address: string): (string | undefined) {
        for (let name in this.nameToAddress) {
            if (this.nameToAddress.hasOwnProperty(name)) {
                if (this.nameToAddress[name] === address.toLowerCase()) return name;
            }
        }
        return undefined;
    }

    addressesToSymbol(baseAsset: string, quoteAsset: string): (string | undefined) {
        const base = this.addressToName(baseAsset);
        if (!base) return undefined;
        const quote = this.addressToName(quoteAsset);
        if (!quote) return undefined;
        return base + '-' + quote;
    }

    symbolToAddresses(symbol: string): (string[] | undefined) {
        const arr = symbol.split('-');
        if (arr.length !== 2) return undefined;
        const base = this.nameToAddress[arr[0]];
        if (!base) return undefined;
        const quote = this.nameToAddress[arr[1]];
        if (!quote) return undefined;
        return [base, quote];
    }
}

