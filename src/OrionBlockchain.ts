import {BlockchainOrder, Order, Side, Trade} from "./Model";
import {DbOrder} from "./db/Db";
import BigNumber from "bignumber.js";
import {log} from "./log";

import Web3 from "web3";
import Long from 'long';
import {signTypedMessage} from "eth-sig-util";
import {privateToAddress} from 'ethereumjs-util';
import {TradeRequest} from "./hub/BrokerHub";

const DOMAIN_TYPE = [
    {name: "name", type: "string"},
    {name: "version", type: "string"},
    {name: "chainId", type: "uint256"},
    {name: "salt", type: "bytes32"},
];

const ORDER_TYPE = [
    {name: "senderAddress", type: "address"},
    {name: "matcherAddress", type: "address"},
    {name: "baseAsset", type: "address"},
    {name: "quoteAsset", type: "address"},
    {name: "matcherFeeAsset", type: "address"},
    {name: "amount", type: "uint64"},
    {name: "price", type: "uint64"},
    {name: "matcherFee", type: "uint64"},
    {name: "nonce", type: "uint64"},
    {name: "expiration", type: "uint64"},
    {name: "buySide", type: "uint8"},
];

const DOMAIN_DATA = {
    name: "Orion Exchange",
    version: "1",
    chainId: 3,
    salt:
        "0xf2d857f4a3edcb9b78b4d503bfe733db1e3f6cdc2b7971ee739626c97e86a557",
};

const Assets = {
    BTC: "0x335123EB7029030805864805fC95f1AB16A64D61",
    ETH: "0x0000000000000000000000000000000000000000",
    XRP: "0x15a3Eb660823e0a3eF4D4A86EEC0d66f405Db515",
    USDT: "0xfC1CD13A7f126eFD823E373C4086F69beB8611C2",
    ERD: "0x361a8c91bf9f0b3860f98308773c64f86aed632d",
    ORN: "0x06B984C1d2c8e2C525d4db16a813e067004817a8",

    toSymbolAsset: function (asset: string): string {
        switch (asset) {
            case this.BTC:
                return 'BTC';
            case this.ETH:
                return 'ETH';
            case this.XRP:
                return 'XRP';
            case this.USDT:
                return 'USDT';
            case this.ERD:
                return 'ERD';
            case this.ORN:
                return 'ORN';
            default:
                throw new Error('Unknown assets ' + asset);
        }
    },

    toAssetAddress: function (asset: string): string {
        switch (asset) {
            case 'BTC':
                return this.BTC;
            case 'ETH':
                return this.ETH;
            case 'XRP':
                return this.XRP;
            case 'USDT':
                return this.USDT;
            case 'ERD':
                return this.ERD;
            case 'ORN':
                return this.ORN;
            default:
                throw new Error('Unknown assets ' + asset);
        }
    },

    toSymbol: function (baseAsset: string, quoteAsset: string): string {
        return this.toSymbolAsset(baseAsset) + '-' + this.toSymbolAsset(quoteAsset)
    },
    toAssets: function (symbol: string): string[] {
        const symbols = symbol.split('-');
        return [this.toAssetAddress(symbols[0]), this.toAssetAddress(symbols[1])];
    }
};

export interface OrionBlockchainSettings {
    matcherAddress: string;
    privateKey: string;
}

export class OrionBlockchain {
    matcherAddress: string;
    bufferKey: Buffer;
    address: string;
    defaultMatcherFee: number;
    defaultExpiration: number;

    constructor(settings: OrionBlockchainSettings) {
        this.matcherAddress = settings.matcherAddress;
        try {
            this.bufferKey = Buffer.from(settings.privateKey.substr(2), "hex");
            this.address = '0x' + privateToAddress(this.bufferKey).toString('hex');
            log.log('My address=' + this.address);
        } catch (e) {
            log.error('Orion blockchain init', e);
        }

        this.defaultMatcherFee = 300000;
        this.defaultExpiration = 29 * 24 * 60 * 60 * 1000;
    }

    // CONVERT LONG TO BYTES
    private longToBytes(long: number): string {
        return Web3.utils.bytesToHex(Long.fromNumber(long).toBytesBE());
    }

    // === GET ORDER HASH=== //
    private hashOrder(orderInfo: BlockchainOrder): string {
        return Web3.utils.soliditySha3(
            "0x03",
            orderInfo.senderAddress,
            orderInfo.matcherAddress,
            orderInfo.baseAsset,
            orderInfo.quoteAsset,
            orderInfo.matcherFeeAsset,
            this.longToBytes(orderInfo.amount),
            this.longToBytes(orderInfo.price),
            this.longToBytes(orderInfo.matcherFee),
            this.longToBytes(orderInfo.nonce),
            this.longToBytes(orderInfo.expiration),
            orderInfo.buySide
        );
    }

    // private async validateSignature(signature: string, orderInfo: OrderInfo): Promise<string> {
    //     let message = this.hashOrder(orderInfo);
    //     let sender = await this.web3.eth.accounts.recover(message, signature);
    //     return sender;
    // }

    private signOrder(orderInfo: BlockchainOrder): string {
        const data = {
            types: {
                EIP712Domain: DOMAIN_TYPE,
                Order: ORDER_TYPE,
            },
            domain: DOMAIN_DATA,
            primaryType: "Order",
            message: orderInfo,
        };

        const msgParams = {data};
        return signTypedMessage(this.bufferKey, msgParams as any, "V4");
    }

    private toBaseUnit(amount: BigNumber, decimals: number = 8): number {
        return Math.round(amount.toNumber() * 10 ** decimals);
    }

    private counterSide(side: Side): number {
        return side === Side.BUY ? 0 : 1;
    }

    private createBlockchainOrder(order: DbOrder, trade: Trade): BlockchainOrder {
        const nowTimestamp = Date.now();
        const assets = Assets.toAssets(order.symbol);
        return {
            senderAddress: this.address,
            matcherAddress: this.matcherAddress,
            baseAsset: assets[0],
            quoteAsset: assets[1],
            matcherFeeAsset: assets[1],
            amount: this.toBaseUnit(trade.qty),
            price: this.toBaseUnit(trade.price),
            matcherFee: this.defaultMatcherFee,
            nonce: nowTimestamp,
            expiration: nowTimestamp + this.defaultExpiration,
            buySide: this.counterSide(order.side),
            signature: ''
        };
    }

    public async signTrade(order: DbOrder, trade: Trade): Promise<TradeRequest> {
        const bo = this.createBlockchainOrder(order, trade);
        const id = this.hashOrder(bo);
        bo.signature = this.signOrder(bo);

        /* const sender = await this.validateSignature(bo.signature, bo); */

        return {
            id: id,
            subOrdId: order.subOrdId,
            clientOrdId: order.clientOrdId,
            status: trade.status,

            ordId: order.ordId, // deprecated
            tradeId: id, // deprecated
            timestamp: trade.timestamp,  // deprecated

            blockchainOrder: bo
        };
    }
}