import Web3 from "web3";
import {PromiEvent} from "web3-core"
import {Subscription} from "web3-core-subscriptions"
import {Contract, SendOptions} from "web3-eth-contract"
import {Dictionary, NumberFormat} from "./Model";
import BigNumber from "bignumber.js";
import Long from "long";
import {fortmaticWeb3} from "./Fortmatic";
import {coinbaseWeb3} from "./Coinbase";
import {Api} from "./Api";

const exchangeArtifact = require('./contracts/Exchange.json');
const erc20Artifact = require('./contracts/ERC20.json');

const ETH_ADDRESS: string = '0x0000000000000000000000000000000000000000';

const DEFAULT_EXPIRATION: number = 29 * 24 * 60 * 60 * 1000;
// export const BROKER_FEE: BigNumber = new BigNumber(0.2).dividedBy(100); // 0.2%

export const DEPOSIT_ETH_GAS_LIMIT = 70000;
export const DEPOSIT_ERC20_GAS_LIMIT = 150000;
export const APPROVE_ERC20_GAS_LIMIT = 70000;
export const FILL_ORDERS_GAS_LIMIT = 500000;

export interface BlockchainOrder {
    id: string; // hash of BlockchainOrder (it's not part of order structure in smart-contract)

    senderAddress: string; // address
    matcherAddress: string; // address
    baseAsset: string; // address
    quoteAsset: string; // address
    matcherFeeAsset: string; // address
    amount: number; // uint64
    price: number; // uint64
    matcherFee: number; // uint64
    nonce: number; // uint64
    expiration: number; // uint64
    buySide: number; // uint8, 1=buy, 0=sell
    signature: string; // bytes
}

export interface CancelOrderRequest {
    id: number;
    senderAddress: string;
    signature: string;
}

export interface BlockchainSwap {
    order0: BlockchainOrder;
    order1: BlockchainOrder;
    withdrawAddress: string;
}

function longToHex(long: number): string {
    return Web3.utils.bytesToHex(Long.fromNumber(long).toBytesBE());
}

function hashOrder(order: BlockchainOrder): string {
    const hash = Web3.utils.soliditySha3(
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
    if (hash === null) throw new Error('Cant make hash');
    return hash;
}

const DOMAIN_TYPE = [
    {name: "name", type: "string"},
    {name: "version", type: "string"},
    {name: "chainId", type: "uint256"},
    {name: "salt", type: "bytes32"},
];

const ORDER_TYPES = {
    EIP712Domain: DOMAIN_TYPE,
    Order: [
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
    ],
};

const SWAP_TYPES = {
    EIP712Domain: DOMAIN_TYPE,
    Swap: [
        {name: 'order0', type: 'Order'},
        {name: 'order1', type: 'Order'},
        {name: 'withdrawAddress', type: 'address'},
    ]
}

const CANCEL_ORDER_TYPES = {
    EIP712Domain: DOMAIN_TYPE,
    DeleteOrder: [
        {name: "senderAddress", type: "address"},
        {name: "id", type: "uint64"},
    ],
};

export function fromUnit8(x: BigNumber.Value): BigNumber {
    return new BigNumber(x).dividedBy(10 ** 8);
}

export class OrionBlockchain {
    public readonly walletAddress: string;
    private readonly walletType: string;
    private readonly web3: Web3;
    private readonly exchangeContract: Contract;
    private readonly tokensContracts: Dictionary<Contract>;
    private blockSubscription: Subscription<any> | undefined;
    private balanceChangeHandler?: (newBalances: Dictionary<BigNumber>) => void;

    constructor(walletAddress: string, walletType: string) {
        this.walletAddress = walletAddress;
        this.walletType = walletType;

        switch (walletType) {
            case 'metamask':
                this.web3 = new Web3(window.ethereum as any);
                break;
            case 'fortmatic':
                this.web3 = fortmaticWeb3;
                break;
            case 'coinbase':
                this.web3 = coinbaseWeb3;
                break;
            default:
                throw new Error('unknown walletType ' + walletType);
        }

        this.exchangeContract = new this.web3.eth.Contract(
            exchangeArtifact.abi as any,
            Api.blockchainInfo.exchangeContractAddress
        );

        this.tokensContracts = {};
        const tokens = Api.blockchainInfo.assetToAddress;
        for (let name in tokens) {
            if (name === 'ETH') continue;
            const tokenAddress = tokens[name];
            const tokenContract = new this.web3.eth.Contract(
                erc20Artifact.abi as any,
                tokenAddress
            );

            this.tokensContracts[name] = tokenContract;
            this.tokensContracts[tokenAddress] = tokenContract;
        }
    }

    subscribeBalanceUpdates(handler: (newBalances: Dictionary<BigNumber>) => void): void {
        this.balanceChangeHandler = handler;

        this.blockSubscription = this.web3.eth.subscribe('newBlockHeaders')
            .on('data', async (blockHeader) => {
                const block = await this.web3.eth.getBlock(blockHeader.number, true);
                let assetsToUpdate: string[] = [];
                for (let tx of block.transactions) {
                    if (tx.from.toLowerCase() === this.walletAddress.toLowerCase() || tx.to?.toLowerCase() === this.walletAddress.toLowerCase()) {
                        if (assetsToUpdate.indexOf(ETH_ADDRESS) === -1) {
                            assetsToUpdate.push(ETH_ADDRESS);
                        }
                    }
                    for (let tokenAddress of Object.values(Api.blockchainInfo.assetToAddress)) {
                        if (tx.to?.toLowerCase() === tokenAddress) {
                            if (assetsToUpdate.indexOf(tokenAddress) === -1) {
                                assetsToUpdate.push(tokenAddress);
                            }
                        }
                    }
                }
                if (assetsToUpdate.length) {
                    await this.updateBalance(assetsToUpdate);
                }
            }).on('error', (error) => {
                console.error("Error on newBlockHeaders:", error);
            });
    }

    unsubscribeBalanceUpdates(): void {
        if (this.blockSubscription) {
            this.blockSubscription.unsubscribe();
        }
    }

    private async updateBalance(assetsToUpdate: string[]): Promise<void> {
        const newBalances: Dictionary<BigNumber> = {};
        for (let assetAddress of assetsToUpdate) {
            const assetName = this.tokenAddressToName(assetAddress);
            if (!assetName) continue;
            let balance: BigNumber;
            if (assetAddress === ETH_ADDRESS) {
                balance = new BigNumber(await this.web3.eth.getBalance(this.walletAddress));
            } else {
                balance = await this.getBalanceERC20(assetAddress, this.walletAddress);
            }
            newBalances[assetName] = balance;
        }
        if (this.balanceChangeHandler) {
            this.balanceChangeHandler(newBalances);
        }
    }

    destroy() {
        this.unsubscribeBalanceUpdates();
    }

    getDomainData() {
        return {
            name: "Orion Exchange",
            version: "1",
            chainId: Api.blockchainInfo.chainId,
            salt: "0xf2d857f4a3edcb9b78b4d503bfe733db1e3f6cdc2b7971ee739626c97e86a557",
        };
    }

    getTokenAddress(name: string): string {
        return Api.blockchainInfo.assetToAddress[name];
    }

    tokenAddressToName(address: string): (string | undefined) {
        for (let name in Api.blockchainInfo.assetToAddress) {
            if (Api.blockchainInfo.assetToAddress.hasOwnProperty(name)) {
                if (Api.blockchainInfo.assetToAddress[name] === address.toLowerCase()) return name;
            }
        }
        return undefined;
    }

    private async validateOrder(order: BlockchainOrder): Promise<boolean> {
        return this.exchangeContract.methods.validateOrder(order).call();
    }

    private sign(data: any, signerAddress: string): Promise<string> {
        if (this.walletType !== 'coinbase') {
            data = JSON.stringify(data);
        }

        return new Promise((resolve, reject) => {
            (this.web3.currentProvider as any).sendAsync(
                {
                    method: 'eth_signTypedData_v4',
                    params: [signerAddress, data],
                    from: signerAddress,
                },
                (err: Error | null, result: any) => {
                    if (err) {
                        reject(err);
                    } else if (result.error) {
                        reject(result.error);
                    } else {
                        resolve(result.result); // signature
                    }
                }
            );
        });
    }

    private _signOrder(order: BlockchainOrder): Promise<string> {
        return this.sign(
            {
                types: ORDER_TYPES,
                domain: this.getDomainData(),
                primaryType: 'Order',
                message: order,
            },
            order.senderAddress
        );
    }

    private _signCancelOrder(cancelOrderRequest: CancelOrderRequest): Promise<string> {
        return this.sign(
            {
                types: CANCEL_ORDER_TYPES,
                domain: this.getDomainData(),
                primaryType: "DeleteOrder",
                message: cancelOrderRequest,
            },
            cancelOrderRequest.senderAddress
        );
    }

    private getPriceWithDeviation(price: BigNumber, side: string, deviation: BigNumber): BigNumber {
        const d = deviation.dividedBy(100)
        const percent = (side === 'buy' ? d : d.negated()).plus(1);
        return price.multipliedBy(percent);
    }

    async signOrder(fromCurrency: string, toCurrency: string, side: string, price: BigNumber, amount: BigNumber, senderAddress: string, priceDeviation: BigNumber, numberFormat: NumberFormat): Promise<BlockchainOrder> {
        const baseAsset: string = this.getTokenAddress(fromCurrency);
        const quoteAsset: string = this.getTokenAddress(toCurrency);
        const nonce: number = Date.now();

        console.log(side + ' ' + amount.toString() + ' ' + fromCurrency + '-' + toCurrency + ' by ' + price.toString() + ' with price deviation ' + priceDeviation.toString() + '%');

        if (!price.gt(0)) throw new Error('Invalid price');
        if (!amount.gt(0)) throw new Error('Invalid amount');

        if (numberFormat.qtyPrecision === undefined || numberFormat.qtyPrecision === null) throw new Error('Invalid qtyPrecision');
        if (numberFormat.pricePrecision === undefined || numberFormat.pricePrecision === null) throw new Error('Invalid pricePrecision');

        const priceWithDeviation = priceDeviation.isZero() ? price : this.getPriceWithDeviation(price, side, priceDeviation);

        const amountRounded: BigNumber = amount.decimalPlaces(numberFormat.qtyPrecision, BigNumber.ROUND_DOWN);
        const priceRounded: BigNumber = priceWithDeviation.decimalPlaces(numberFormat.pricePrecision, side === 'buy' ? BigNumber.ROUND_DOWN : BigNumber.ROUND_UP);
        const matcherFee: BigNumber = Api.blockchainInfo.minOrnFee;
        const matcherFeeAsset: string = this.getTokenAddress('ORN');

        const order: BlockchainOrder = {
            id: '',
            senderAddress: senderAddress,
            matcherAddress: Api.blockchainInfo.matcherAddress,
            baseAsset: baseAsset,
            quoteAsset: quoteAsset,
            matcherFeeAsset: matcherFeeAsset,
            amount: this.numberTo8(amountRounded),
            price: this.numberTo8(priceRounded),
            matcherFee: this.numberTo8(matcherFee),
            nonce: nonce,
            expiration: nonce + DEFAULT_EXPIRATION,
            buySide: side === 'buy' ? 1 : 0,
            signature: ''
        }
        order.id = hashOrder(order);
        order.signature = await this._signOrder(order);
        if (!(await this.validateOrder(order))) {
            throw new Error('Order validation failed');
        }
        return order;
    }

    async signCancelOrder(cancelOrderRequest: CancelOrderRequest): Promise<CancelOrderRequest> {
        cancelOrderRequest.signature = await this._signCancelOrder(cancelOrderRequest);
        return cancelOrderRequest;
    }

    private async numberToUnit(currency: string, n: BigNumber): Promise<string> {
        if (currency === 'ETH') {
            return Web3.utils.toWei(n.toString());
        } else {
            const decimals = await this.tokensContracts[currency].methods.decimals().call();
            return n.multipliedBy(Math.pow(10, decimals)).toFixed(0);
        }
    }

    private numberTo8(n: BigNumber.Value): number {
        return Number(new BigNumber(n).multipliedBy(1e8).toFixed(0)); // todo: можно ли не оборачивать в Number?
    }

    async getBalanceERC20(currency: string, address: string): Promise<BigNumber> {
        const decimals: number = await this.tokensContracts[currency].methods.decimals().call();
        const unit: any = await this.tokensContracts[currency].methods
            .balanceOf(address)
            .call();
        return new BigNumber(unit).dividedBy(10 ** decimals);
    }

    async getAllowanceERC20(currency: string, address: string): Promise<BigNumber> {
        const decimals: number = await this.tokensContracts[currency].methods.decimals().call();
        const unit: any = await this.tokensContracts[currency].methods
            .allowance(address, Api.blockchainInfo.exchangeContractAddress)
            .call();
        return new BigNumber(unit).dividedBy(10 ** decimals);
    }

    private approveERC20(currency: string, amountUnit: string, senderAddress: string, gasPriceWei: BigNumber): PromiEvent<void> {
        const sendOptions: SendOptions = {from: senderAddress};
        sendOptions.gasPrice = gasPriceWei.toString();
        sendOptions.gas = APPROVE_ERC20_GAS_LIMIT

        return this.tokensContracts[currency].methods
            .approve(Api.blockchainInfo.exchangeContractAddress, amountUnit)
            .send(sendOptions);
    }

    private depositETH(amountUnit: string, senderAddress: string, gasPriceWei: BigNumber): PromiEvent<void> {
        const sendOptions: SendOptions = {from: senderAddress, value: amountUnit};
        sendOptions.gasPrice = gasPriceWei.toString();
        sendOptions.gas = DEPOSIT_ETH_GAS_LIMIT

        return this.exchangeContract.methods
            .deposit()
            .send(sendOptions);
    }

    private depositERC20(currency: string, amountUnit: string, senderAddress: string, gasPriceWei: BigNumber): PromiEvent<void> {
        const sendOptions: SendOptions = {from: senderAddress};
        sendOptions.gasPrice = gasPriceWei.toString();
        sendOptions.gas = DEPOSIT_ERC20_GAS_LIMIT

        return this.exchangeContract.methods
            .depositAsset(this.getTokenAddress(currency), amountUnit)
            .send(sendOptions);
    }

    async approve(currency: string, amount: BigNumber, senderAddress: string, onSending: (transactionHash: string) => void, gasPriceWei: BigNumber): Promise<void> {
        const amountUnit = await this.numberToUnit(currency, amount);
        if (currency !== 'ETH') {
            return await this.approveERC20(currency, amountUnit, senderAddress, gasPriceWei)
                .once('transactionHash', (transactionHash: string) => onSending(transactionHash));
        }
    }

    async deposit(currency: string, amount: BigNumber, senderAddress: string, onSending: (transactionHash: string) => void, gasPriceWei: BigNumber): Promise<void> {
        const amountUnit = await this.numberToUnit(currency, amount);
        if (currency === 'ETH') {
            await this.depositETH(amountUnit, senderAddress, gasPriceWei)
                .once('transactionHash', (transactionHash: string) => onSending(transactionHash));
        } else {
            await this.depositERC20(currency, amountUnit, senderAddress, gasPriceWei)
                .once('transactionHash', (transactionHash: string) => onSending(transactionHash));
        }
    }

    async withdraw(currency: string, amount: BigNumber, senderAddress: string, onSending: (transactionHash: string) => void, gasPriceWei: BigNumber): Promise<void> {
        const sendOptions: SendOptions = {from: senderAddress};
        sendOptions.gasPrice = gasPriceWei.toString();
        sendOptions.gas = DEPOSIT_ERC20_GAS_LIMIT

        const amountUnit = await this.numberToUnit(currency, amount);
        await this.exchangeContract.methods
            .withdraw(this.getTokenAddress(currency), amountUnit)
            .send(sendOptions)
            .once('transactionHash', (transactionHash: string) => onSending(transactionHash));
    }
}