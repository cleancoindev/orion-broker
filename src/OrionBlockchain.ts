import {Order, Side, Trade} from "./connectors/Model";
import {DbOrder} from "./db";
import BigNumber from "bignumber.js";
import {log} from "./log";

const fetch = require("node-fetch");

const Web3 = require("web3");
const Long = require('long');
const sigUtil = require("eth-sig-util");
const ethUtil = require('ethereumjs-util');

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
    {name: "side", type: "string"},
];

const DOMAIN_DATA = {
    name: "Orion Exchange",
    version: "1",
    chainId: 3,
    salt:
        "0xf2d857f4a3edcb9b78b4d503bfe733db1e3f6cdc2b7971ee739626c97e86a557",
};

interface OrderInfo {
    id?: string,
    signature?: string;
    senderAddress: string;
    matcherAddress: string;
    baseAsset: string;
    quoteAsset: string;
    matcherFeeAsset: string;
    amount: number;
    price: number;
    matcherFee: number;
    nonce: number;
    expiration: number;
    side: Side;
}

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
    orionBlockchainUrl: string;
    matcherAddress: string;
    privateKey: string;
}

export class OrionBlockchain {
    orionBlockchainUrl: string;
    matcherAddress: string;
    bufferKey: Buffer;
    address: string;
    defaultMatcherFee: number;
    defaultExpiration: number;

    constructor(settings: OrionBlockchainSettings) {
        this.orionBlockchainUrl = settings.orionBlockchainUrl + '/api';
        this.matcherAddress = settings.matcherAddress;
        try {
            this.bufferKey = Buffer.from(settings.privateKey.substr(2), "hex");
            this.address = '0x' + ethUtil.privateToAddress(this.bufferKey).toString('hex');
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
    private hashOrder(orderInfo: OrderInfo): string {
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
            orderInfo.side === Side.BUY ? "0x00" : "0x01"
        );
    }

    // private async validateSignature(signature: string, orderInfo: OrderInfo): Promise<string> {
    //     let message = this.hashOrder(orderInfo);
    //     let sender = await this.web3.eth.accounts.recover(message, signature);
    //     return sender;
    // }

    private signOrder(orderInfo: OrderInfo): string {
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
        const signedMessage = sigUtil.signTypedMessage(this.bufferKey, msgParams, "V3");
        return signedMessage;
    }

    private toBaseUnit(amount: BigNumber, decimals: number = 8): number {
        return Math.round(amount.toNumber() * 10 ** decimals);
    }

    private counterSide(side: Side): Side {
        return side === Side.BUY ? Side.SELL : Side.BUY;
    }

    private createBlockchainOrder(order: DbOrder, trade: Trade): OrderInfo {
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
            side: this.counterSide(order.side)
        };
    }

    /**
     *
     * @param order Order
     * @param trade Trade
     * @returns {Promise<Order>}
     */
    public async sendTrade(order: DbOrder, trade: Trade): Promise<any> {

        const bo = this.createBlockchainOrder(order, trade);
        const message = this.hashOrder(bo);
        const signature = this.signOrder(bo);

        /* const sender = await this.validateSignature(bo.signature, bo); */

        const orionTrade = {
            "id": message,
            "ordId": order.ordId,
            "subOrdId": order.subOrdId,
            "clientOrdId": order.clientOrdId,
            "tradeId": bo.id,
            "status": trade.status,
            "timestamp": trade.timestamp,
            "signature": signature,
            ...bo
        };

        log.log('Sending Trade', JSON.stringify(orionTrade));

        return fetch(`${this.orionBlockchainUrl}/trade`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(orionTrade)
        })
            .then((response) => {
                log.log('Sending Trade Response', JSON.stringify(response));
                if (!response.ok) {
                    throw Error(response.statusText);
                }
                return response.json();
            })
            .catch((error) => {
                log.log('Sending Trade Error', JSON.stringify(error));
                throw error;
            });
    }
}