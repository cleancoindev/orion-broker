import {BlockchainOrder, Dictionary, Liability, parseLiability, Side, Trade, Transaction} from "./Model";
import {DbSubOrder} from "./db/Db";
import BigNumber from "bignumber.js";
import {log} from "./log";
import fetch from "node-fetch";

import Web3 from "web3";
import Long from 'long';
import {signTypedMessage} from "eth-sig-util";
import {privateToAddress} from 'ethereumjs-util';
import {ethers} from "ethers";

import exchangeArtifact from "./abi/Exchange.json";
import erc20Artifact from "./abi/ERC20.json";
import stakingArtifact from "./abi/Staking.json";
import {Account, Sign} from "web3-core";

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
    "ETH": "0x0000000000000000000000000000000000000000",
    "USDT": "0xfc1cd13a7f126efd823e373c4086f69beb8611c2",
    "ORN": "0xfc25454ac2db9f6ab36bc0b0b034b41061c00982",

    toSymbolAsset: function (asset: string): string {
        switch (asset) {
            case this.ETH:
                return 'ETH';
            case this.USDT:
                return 'USDT';
            case this.ORN:
                return 'ORN';
            default:
                throw new Error('Unknown assets ' + asset);
        }
    },

    toAssetAddress: function (asset: string): string {
        switch (asset) {
            case 'ETH':
                return this.ETH;
            case 'USDT':
                return this.USDT;
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

function longToHex(long: number): string {
    return Web3.utils.bytesToHex(Long.fromNumber(long).toBytesBE());
}

export function hashOrder(order: BlockchainOrder): string {
    return Web3.utils.soliditySha3(
        "0x03",
        order.senderAddress,
        order.matcherAddress,
        order.baseAsset,
        order.quoteAsset,
        order.matcherFeeAsset,
        longToHex(order.amount),
        longToHex(order.price),
        longToHex(order.matcherFee),
        longToHex(order.nonce),
        longToHex(order.expiration),
        order.buySide ? '0x01' : '0x00'
    );
}

export interface OrionBlockchainSettings {
    orionBlockchainUrl: string;
    matcherAddress: string;
    privateKey: string;
}

const DEFAULT_EXPIRATION = 29 * 24 * 60 * 60 * 1000;
const DEPOSIT_ETH_GAS_LIMIT = 56000;
const DEPOSIT_ERC20_GAS_LIMIT = 150000;
const APPROVE_ERC20_GAS_LIMIT = 70000;
const LOCK_STAKE_GAS_LIMIT = 200000;

function toWei8(amount: BigNumber, decimals: number = 8): string {
    return amount.multipliedBy(10 ** decimals).toFixed(0)
}

export class OrionBlockchain {
    private readonly orionBlockchainUrl: string;
    private readonly matcherAddress: string;
    private readonly privateKey: string;
    private readonly bufferKey: Buffer;
    public readonly address: string;

    private exchangeContractAddress: string;
    private wallet: ethers.Wallet;
    private exchangeContract: ethers.Contract;
    private stakingContract: ethers.Contract;

    constructor(settings: OrionBlockchainSettings) {
        this.orionBlockchainUrl = settings.orionBlockchainUrl;
        this.matcherAddress = settings.matcherAddress;
        this.privateKey = settings.privateKey;
        try {
            this.bufferKey = Buffer.from(settings.privateKey.substr(2), "hex");
            this.address = '0x' + privateToAddress(this.bufferKey).toString('hex');
            log.log('My address=' + this.address);
        } catch (e) {
            log.error('Orion blockchain init', e);
        }
    }

    public async initContracts(): Promise<void> {
        const contractsInfo: any = await this.getContracts();

        this.exchangeContractAddress = contractsInfo.exchange;
        this.wallet = new ethers.Wallet(this.privateKey);
        this.exchangeContract = new ethers.Contract(
            this.exchangeContractAddress,
            exchangeArtifact.abi as any,
            this.wallet
        );

        const stakingContractAddress = contractsInfo.stake;
        this.stakingContract = new ethers.Contract(
            stakingContractAddress,
            stakingArtifact.abi as any,
            this.wallet
        );
        log.log('exchangeContractAddress=' + this.exchangeContractAddress);
        log.log('stakingContractAddress=' + stakingContractAddress);
    }

    private signOrder(order: BlockchainOrder): string {
        const data = {
            types: {
                EIP712Domain: DOMAIN_TYPE,
                Order: ORDER_TYPE,
            },
            domain: DOMAIN_DATA,
            primaryType: "Order",
            message: order,
        };

        const msgParams = {data};
        return signTypedMessage(this.bufferKey, msgParams as any, "V4");
    }

    private toBaseUnit(amount: BigNumber, decimals: number = 8): number {
        return Math.round(amount.toNumber() * 10 ** decimals);
    }

    private counterSide(side: Side): number {
        return side === 'buy' ? 0 : 1;
    }

    private createBlockchainOrder(subOrder: DbSubOrder, trade: Trade): BlockchainOrder {
        const assets = Assets.toAssets(subOrder.symbol);
        const buySide = this.counterSide(subOrder.side);
        const matcherFeeAsset = buySide ? assets[0] : assets[1];

        const MATCHER_FEE_PERCENT = new BigNumber(0.2).dividedBy(100); // 0.2%
        const matcherFee: BigNumber = buySide ? trade.amount.multipliedBy(MATCHER_FEE_PERCENT) : trade.amount.multipliedBy(trade.price).multipliedBy(MATCHER_FEE_PERCENT);

        return {
            id: '',
            senderAddress: this.address,
            matcherAddress: this.matcherAddress,
            baseAsset: assets[0],
            quoteAsset: assets[1],
            matcherFeeAsset: matcherFeeAsset,
            amount: this.toBaseUnit(trade.amount),
            price: this.toBaseUnit(trade.price),
            matcherFee: this.toBaseUnit(matcherFee),
            nonce: trade.timestamp,
            expiration: trade.timestamp + DEFAULT_EXPIRATION,
            buySide: buySide,
            signature: ''
        };
    }

    public async signTrade(subOrder: DbSubOrder, trade: Trade): Promise<BlockchainOrder> {
        const bo = this.createBlockchainOrder(subOrder, trade);
        bo.id = hashOrder(bo);
        bo.signature = this.signOrder(bo);
        return bo;
    }

    public async sign(payload: string): Promise<string> {
        // const w = new Web3();
        // const account: Account = w.eth.accounts.privateKeyToAccount(this.privateKey);
        // const sign: Sign = account.sign(payload);
        // log.log('web3 sign', sign.signature);
        // log.log('web3 verify', w.eth.accounts.recover(payload, sign.signature));

        const signature = await this.wallet.signMessage(payload);
        return signature;
    }

    private send(url: string, method: string = 'GET', data?: any): Promise<any> {
        const headers = {
            'Content-Type': 'application/json'
        };

        const body = JSON.stringify(data);

        return fetch(url, {
            method,
            headers,
            body
        }).then(result => result.json())
    }

    private async getContracts(): Promise<any> {
        return await this.send(this.orionBlockchainUrl + '/contracts');
    }

    public async getNonce(): Promise<number> {
        const data: any = await this.send(this.orionBlockchainUrl + '/broker/getNonce/' + this.address);
        return data.nonce;
    }

    public async getTransactionStatus(transactionHash: string): Promise<'PENDING' | 'OK' | 'FAIL' | 'NONE'> {
        const data: any = await this.send(this.orionBlockchainUrl + '/broker/getTransactionStatus/' + transactionHash);
        return data.status;
    }

    private async getGasPrice(): Promise<ethers.BigNumber> { // in gwei
        const data: any = await this.send('https://ethgasstation.info/api/ethgasAPI.json');
        const gwei = new BigNumber(data.fast).dividedBy(10).toString();
        return ethers.utils.parseUnits(gwei, 'gwei');
    }

    public async getLiabilities(): Promise<Liability[]> {
        const response: any[] = await this.send(this.orionBlockchainUrl + '/broker/getLiabilities/' + this.address);
        return response.map(parseLiability);
    }

    public async getBalance(): Promise<Dictionary<BigNumber>> {
        const data: Dictionary<string> = await this.send(this.orionBlockchainUrl + '/broker/getBalance/' + this.address);
        const result = {};
        for (let key in data) {
            result[key] = new BigNumber(data[key]);
        }
        return result;
    }

    private async sendTransaction(unsignedTx: ethers.PopulatedTransaction, gasLimit: number, nonce: number = 0): Promise<string> {
        unsignedTx.chainId = 3;
        unsignedTx.from = this.address;
        if (!unsignedTx.to) throw new Error('no unsignedTx.to');
        unsignedTx.nonce = nonce || (await this.getNonce());
        unsignedTx.gasPrice = await this.getGasPrice();
        unsignedTx.gasLimit = ethers.BigNumber.from(gasLimit);
        const signedTxRaw: string = await this.wallet.signTransaction(unsignedTx);
        const resultRaw: any = await this.send(this.orionBlockchainUrl + '/broker/execute', 'POST', {signedTxRaw: signedTxRaw});
        return resultRaw.hash;
    }

    /**
     * @param amount    '0.123'
     */
    public async depositETH(amount: BigNumber): Promise<Transaction> {
        const value: string = Web3.utils.toWei(amount.toString());
        const unsignedTx: ethers.PopulatedTransaction = await this.exchangeContract.populateTransaction.deposit();
        unsignedTx.value = ethers.BigNumber.from(value);
        const transactionHash: string = await this.sendTransaction(unsignedTx, DEPOSIT_ETH_GAS_LIMIT);
        return {
            transactionHash,
            method: 'deposit',
            asset: 'ETH',
            amount: amount,
            createTime: Date.now(),
            status: 'PENDING'
        }
    }

    /**
     * @param amount    '0.123'
     * @param assetName "ETH"
     */
    public async depositERC20(amount: BigNumber, assetName: string, nonce: number = 0): Promise<Transaction> {
        const value: string = toWei8(amount);
        const assetAddress: string = Assets.toAssetAddress(assetName);
        const amountBN = ethers.BigNumber.from(value);
        const unsignedTx: ethers.PopulatedTransaction = await this.exchangeContract.populateTransaction.depositAsset(assetAddress, amountBN);
        const transactionHash: string = await this.sendTransaction(unsignedTx, DEPOSIT_ERC20_GAS_LIMIT, nonce);
        return {
            transactionHash,
            method: 'depositAsset',
            asset: assetName,
            amount: amount,
            createTime: Date.now(),
            status: 'PENDING'
        }
    }

    /**
     * @param amount    '0.123'
     * @param assetName "ETH"
     */
    public async approveERC20(amount: BigNumber, assetName: string, nonce: number = 0): Promise<Transaction> {
        const value: string = toWei8(amount, 8); // todo: get real decimals
        const assetAddress: string = Assets.toAssetAddress(assetName);
        const tokenContract: ethers.Contract = new ethers.Contract(
            assetAddress,
            erc20Artifact.abi as any,
            this.wallet
        )
        const amountBN = ethers.BigNumber.from(value);
        const unsignedTx: ethers.PopulatedTransaction = await tokenContract.populateTransaction.approve(this.exchangeContractAddress, amountBN);
        const transactionHash: string = await this.sendTransaction(unsignedTx, APPROVE_ERC20_GAS_LIMIT, nonce);
        return {
            transactionHash,
            method: 'approve',
            asset: assetName,
            amount: amount,
            createTime: Date.now(),
            status: 'PENDING'
        }
    }

    /**
     * @param amount    '0.123'
     */
    public async lockStake(amount: BigNumber): Promise<Transaction> {
        const value: string = toWei8(amount);
        const amountBN = ethers.BigNumber.from(value);
        const unsignedTx: ethers.PopulatedTransaction = await this.stakingContract.populateTransaction.lockStake(amountBN);
        const transactionHash: string = await this.sendTransaction(unsignedTx, LOCK_STAKE_GAS_LIMIT);
        return {
            transactionHash,
            method: 'lockStake',
            asset: 'ORN',
            amount: amount,
            createTime: Date.now(),
            status: 'PENDING'
        }
    }
}