import {BrokerHub, CreateSubOrder, SubOrderStatus, SubOrderStatusAccepted,} from './hub/BrokerHub';
import {Db, DbSubOrder} from './db/Db';
import {log} from './log';
import {Balances, BlockchainOrder, Dictionary, Liability, Status, SubOrder, Trade, Transaction} from './Model';
import BigNumber from 'bignumber.js';
import {WebUI} from './ui/WebUI';
import {Connectors, ExchangeResolve} from './connectors/Connectors';
import {fromWei8, OrionBlockchain} from './OrionBlockchain';
import {Settings} from './Settings';
import {ExchangeWithdrawStatus} from './connectors/Connector';
import {minWithdrawFromExchanges} from './main';

export class Broker {
    settings: Settings;
    brokerHub: BrokerHub;
    db: Db;
    webUI: WebUI;
    connector: Connectors;
    orionBlockchain: OrionBlockchain;
    lastBalances: Dictionary<Dictionary<BigNumber>> = {};

    private balanceInterval: NodeJS.Timeout;
    private checkSubOrdersInterval: NodeJS.Timeout;
    private checkWithdrawsInterval: NodeJS.Timeout;
    private checkTransactionsInterval: NodeJS.Timeout;
    private checkLiabilitiesInterval: NodeJS.Timeout;

    constructor(settings: Settings, brokerHub: BrokerHub, db: Db, webUI: WebUI, connector: Connectors) {
        this.settings = settings;
        this.brokerHub = brokerHub;
        this.db = db;
        this.webUI = webUI;
        this.connector = connector;

        brokerHub.onCreateSubOrder = this.onCreateSubOrder.bind(this);
        brokerHub.onCancelSubOrder = this.onCancelSubOrder.bind(this);
        brokerHub.onCheckSubOrder = this.onCheckSubOrder.bind(this);
        brokerHub.onSubOrderStatusAccepted = this.onSubOrderStatusAccepted.bind(this);
        brokerHub.onReconnect = this.connectToAggregator.bind(this);
    }

    async onSubOrderStatusAccepted(data: SubOrderStatusAccepted): Promise<void> {
        const id = data.id;

        const dbSubOrder: DbSubOrder = await this.db.getSubOrderById(id);

        if (!dbSubOrder) {
            throw new Error(`Suborder ${id} not found`);
        }

        const rejectedByAggregator = (data.status === Status.REJECTED) && (dbSubOrder.status !== Status.REJECTED);
        if (rejectedByAggregator) {
            dbSubOrder.status = Status.REJECTED;
            log.error(`Order ${id} rejected by aggregator`);
        }

        const isStatusFinal = dbSubOrder.status !== Status.PREPARE && dbSubOrder.status !== Status.ACCEPTED;
        if (rejectedByAggregator || (dbSubOrder.status === data.status && isStatusFinal)) {
            dbSubOrder.sentToAggregator = true;
            await this.db.updateSubOrder(dbSubOrder);
            this.webUI.sendToFrontend(dbSubOrder);
        }
    };

    async onCheckSubOrder(id: number): Promise<SubOrderStatus> {
        const dbSubOrder: DbSubOrder = await this.db.getSubOrderById(id);

        if (!dbSubOrder) {
            return {
                id: id,
                status: null,
                filledAmount: '0'
            };
        }

        const trades: Trade[] = dbSubOrder.exchangeOrderId ? (await this.db.getSubOrderTrades(dbSubOrder.exchange, dbSubOrder.exchangeOrderId)) : [];

        if (trades.length > 1) {
            throw new Error('Cant support multiple trades yet ' + dbSubOrder.id);
        }

        const blockchainOrder: BlockchainOrder = trades.length === 0 ? undefined : (await this.orionBlockchain.signTrade(dbSubOrder, trades[0]));

        return {
            id: id,
            status: dbSubOrder.status === Status.PREPARE ? Status.ACCEPTED : dbSubOrder.status,
            filledAmount: dbSubOrder.filledAmount.toString(),
            blockchainOrder: blockchainOrder
        };
    }

    async onCreateSubOrder(request: CreateSubOrder): Promise<SubOrderStatus> {
        const oldSubOrder = await this.db.getSubOrderById(request.id);

        if (oldSubOrder) {
            log.log('Suborder ' + request.id + ' already created');
            return this.onCheckSubOrder(request.id);
        }

        const dbSubOrder: DbSubOrder = {
            id: request.id,
            symbol: request.symbol,
            side: request.side,
            price: request.price,
            amount: request.amount,
            exchange: request.exchange,
            timestamp: Date.now(),
            status: Status.PREPARE,
            filledAmount: new BigNumber(0),
            sentToAggregator: false
        };
        await this.db.insertSubOrder(dbSubOrder);
        log.debug(`Suborder ${request.id} inserted`);

        let subOrder: SubOrder = null;

        try {
            subOrder = await this.connector.submitSubOrder(request.exchange, dbSubOrder.id, dbSubOrder.symbol, dbSubOrder.side, dbSubOrder.amount, dbSubOrder.price);
        } catch (e) {
            log.error('Submit order error:', e);
        }

        if (subOrder === null) {
            dbSubOrder.status = Status.REJECTED;
        } else {
            dbSubOrder.exchangeOrderId = subOrder.exchangeOrderId;
            dbSubOrder.status = Status.ACCEPTED;
        }

        await this.db.updateSubOrder(dbSubOrder);
        log.debug('Suborder updated ', JSON.stringify(dbSubOrder));

        this.webUI.sendToFrontend(dbSubOrder);
        return this.onCheckSubOrder(dbSubOrder.id);
    };

    async onCancelSubOrder(id: number): Promise<SubOrderStatus> {
        const dbSubOrder: DbSubOrder = await this.db.getSubOrderById(id);

        if (!dbSubOrder) throw new Error('Cant find suborder ' + dbSubOrder.id);

        if (dbSubOrder.status === Status.PREPARE) {
            // todo: implement cancel order in prepare status
        } else if (dbSubOrder.status === Status.ACCEPTED) {
            const cancelResult = await this.connector.cancelSubOrder(dbSubOrder);

            if (!cancelResult) throw new Error('Cant cancel suborder ' + dbSubOrder.id);

            dbSubOrder.status = Status.CANCELED;

            await this.db.updateSubOrder(dbSubOrder);
            this.webUI.sendToFrontend(dbSubOrder);

        } else {
            log.log('Cant cancel suborder in status ' + dbSubOrder.status);
        }

        return this.onCheckSubOrder(dbSubOrder.id);
    };

    sendUpdateBalance(balances: Dictionary<ExchangeResolve<Balances>>): Promise<void> {
        const exchanges: Dictionary<Dictionary<string>> = {};
        this.lastBalances = {};

        for (const exchange in balances) {
            const exchangeBalances: ExchangeResolve<Balances> = balances[exchange];
            if (exchangeBalances.error) {
                log.error('Get ' + exchange + ' balances error:', exchangeBalances.error);
            } else {
                this.lastBalances[exchange] = {};
                exchanges[exchange] = {};
                for (const currency in exchangeBalances.result) {
                    const v = exchangeBalances.result[currency];
                    exchanges[exchange][currency] = v.toString();
                    this.lastBalances[exchange][currency] = v;
                }
            }
        }
        const newBalancesJson = JSON.stringify(exchanges);
        if (this.brokerHub.getLastBalancesJson() !== newBalancesJson) {
            this.webUI.lastBalancesJson = newBalancesJson;
            return this.brokerHub.sendBalances(exchanges);
        }
    }

    startUpdateBalances(): void {
        this.balanceInterval = setInterval(async () => {
            try {
                const balances = await this.connector.getBalances();
                await this.sendUpdateBalance(balances);
            } catch (e) {
                log.error('Get balances error:', e);
            }
        }, 10 * 1000);
    }

    startCheckSubOrders(): void {
        this.checkSubOrdersInterval = setInterval(async () => {
            try {
                const subOrdersToResend = await this.db.getSubOrdersToResend();
                for (const subOrder of subOrdersToResend) {
                    await this.brokerHub.sendSubOrderStatus(await this.onCheckSubOrder(subOrder.id));
                }

                const openSubOrders = await this.db.getSubOrdersToCheck();
                if (openSubOrders.length) {
                    await this.connector.checkSubOrders(openSubOrders);
                }
            } catch (e) {
                log.error('Suborders check error:', e);
            }
        }, 10 * 1000);
    }

    startCheckWithdraws(): void {
        this.checkWithdrawsInterval = setInterval(async () => {
            try {
                const openWithdraws = await this.db.getWithdrawsToCheck();
                if (openWithdraws.length) {
                    const withdrawsStatuses: ExchangeWithdrawStatus[] = await this.connector.checkWithdraws(openWithdraws);
                    for (const status of withdrawsStatuses) {
                        const w = openWithdraws.find(w => w.exchangeWithdrawId === status.exchangeWithdrawId);
                        log.log('Withdraw ' + w.amount.toString() + ' ' + w.currency + ' from ' + w.exchange + ' status ' + status.status);
                        await this.db.updateWithdrawStatus(status.exchangeWithdrawId, status.status);
                    }
                }
            } catch (e) {
                log.error('Withdraw check error:', e);
            }
        }, 60 * 1000);
    }

    startCheckTransactions(): void {
        this.checkTransactionsInterval = setInterval(async () => {
            try {
                const pendingTransactions: Transaction[] = await this.db.getPendingTransactions();
                for (const tx of pendingTransactions) {
                    const status = await this.orionBlockchain.getTransactionStatus(tx.transactionHash);
                    if (status !== tx.status) {
                        if (status === 'OK' || status === 'FAIL') {
                            await this.db.updateTransactionStatus(tx.transactionHash, status);
                            log.log('Tx ' + tx.method + ' ' + tx.amount.toString() + ' ' + tx.asset + ' ' + status);
                        }
                    }
                }
            } catch (e) {
                log.error('Transactions check error:', e);
            }
        }, 10 * 1000);
    }

    async manageLiability(liability: Liability): Promise<void> {
        const now = Date.now() / 1000;
        if (liability.outstandingAmount.gt(0) && (now - liability.timestamp > this.settings.duePeriodSeconds)) {
            const assetName = liability.assetName;
            const amount: BigNumber = fromWei8(liability.outstandingAmount);

            if ((await this.db.getPendingTransactions()).length) {
                return;
            }
            if ((await this.db.getWithdrawsToCheck()).length) {
                return;
            }

            log.log('Detected outstanding ' + amount.toString() + ' ' + assetName);

            const balance = await this.orionBlockchain.getWalletBalance();
            const assetBalance = balance[assetName];
            const ethBalance = balance['ETH'];

            if (!assetBalance || assetBalance.isNaN()) throw new Error('No balance for ' + assetName);
            if (!ethBalance || ethBalance.isNaN()) throw new Error('No balance for ETH');

            const ethFeeAmount = new BigNumber(0.02); // todo: gas fee hardcode
            if (!ethBalance.gt(ethFeeAmount)) {
                log.log('No ' + ethFeeAmount.toString() + ' ETH for gas on wallet');
                return;
            }

            const fitBalance = assetName === 'ETH' ? assetBalance.gte(amount.plus(ethFeeAmount)) : assetBalance.gte(amount);

            if (fitBalance) {
                await this.deposit(amount, assetName);
            } else {
                const remaining = amount.minus(assetBalance);
                let remainingWithFee = remaining.multipliedBy(1.05); // todo: exchange withdraw fee hardcode
                const minWithdraw = new BigNumber(minWithdrawFromExchanges[assetName]);
                if (minWithdraw.isNaN()) throw new Error('No min withdraw for ' + assetName);
                if (remainingWithFee.lt(minWithdraw)) {
                    remainingWithFee = minWithdraw;
                }
                const exchange = this.getExchangeForWithdraw(remainingWithFee, assetName);
                if (exchange) {
                    // NOTE: мы снимаем remainingWithFee так как большинство бирж вычитают свою комиссию из переданного амаунта
                    await this.exchangeWithdraw(exchange, remainingWithFee, assetName);
                } else {
                    log.log(`Need to make ${amount.toString()} ${assetName} deposit to orion contract but there is not enough amount on the wallet and exchanges`);
                }
            }
        }
    }

    startCheckLiabilities(): void {
        this.checkLiabilitiesInterval = setInterval(async () => {
            try {
                const liabilities: Liability[] = await this.orionBlockchain.getLiabilities();
                for (const l of liabilities) {
                    await this.manageLiability(l);
                }
            } catch (e) {
                log.error('Liabilities check error:', e);
            }
        }, 5 * 60 * 1000);
    }

    async connectToAggregator(): Promise<void> {
        try {
            const time = Date.now();
            const signature = await this.orionBlockchain.sign(time.toString());
            await this.brokerHub.connect({address: this.orionBlockchain.address, time, signature});
        } catch (e) {
            log.error('Failed to connect to aggregator:', e);
        }
    }

    async connectToOrion(): Promise<void> {
        clearInterval(this.balanceInterval);
        clearInterval(this.checkSubOrdersInterval);
        clearInterval(this.checkWithdrawsInterval);
        clearInterval(this.checkTransactionsInterval);
        clearInterval(this.checkLiabilitiesInterval);
        if (this.settings.privateKey) {
            this.orionBlockchain = new OrionBlockchain(this.settings);
            await this.orionBlockchain.initContracts();
            await this.connectToAggregator();
            this.startUpdateBalances();
            this.startCheckSubOrders();
            this.startCheckWithdraws();
            this.startCheckLiabilities();
            this.startCheckTransactions();
        }
    }

    // TRADE

    async onTrade(trade: Trade): Promise<void> {
        try {
            const dbSubOrder: DbSubOrder = await this.db.getSubOrder(trade.exchange, trade.exchangeOrderId);

            if (!dbSubOrder) {
                throw new Error(`Suborder ${trade.exchangeOrderId} in ${trade.exchange} not found`);
            }

            if (!dbSubOrder.amount.eq(trade.amount)) {
                throw new Error('Partially trade not supported yet ' + dbSubOrder.id);
            }

            dbSubOrder.filledAmount = trade.amount;
            dbSubOrder.status = Status.FILLED;

            await this.db.insertTrade(trade); // todo: insertTrade & updateSubOrder in transaction
            await this.db.updateSubOrder(dbSubOrder);

            log.log('Send suborder ' + dbSubOrder.id + ' filled status: ' + dbSubOrder.side + ' ' + dbSubOrder.amount + ' ' + dbSubOrder.symbol + ' on ' + dbSubOrder.exchange);
            log.debug('onTrade', dbSubOrder);

            await this.brokerHub.sendSubOrderStatus(await this.onCheckSubOrder(dbSubOrder.id));
            this.webUI.sendToFrontend(dbSubOrder);
        } catch (e) {
            log.error('Trade error:', e);
        }
    }

    // DEPOSIT/WITHDRAW

    /**
     * @param amount     1.23
     * @param assetName 'USDT'
     */
    getExchangeForWithdraw(amount: BigNumber, assetName: string): string | undefined {
        for (const exchange in this.lastBalances) {
            if (this.lastBalances.hasOwnProperty(exchange)) {
                if (this.lastBalances[exchange][assetName].gte(amount)) {
                    return exchange;
                }
            }
        }
        return undefined;
    }

    /**
     * @param exchange  'binance'
     * @param amount     1.23
     * @param assetName 'ETH'
     */
    async exchangeWithdraw(exchange: string, amount: BigNumber, assetName: string): Promise<void> {
        if (!this.connector.hasWithdraw(exchange)) {
            log.log(exchange + ' does not support withdrawals');
            log.log('Please make a manual deposit ' + amount.toString() + ' ' + assetName + ' to the contract');
            return;
        }

        log.log('Withdrawing ' + amount.toString() + ' ' + assetName + ' from ' + exchange);
        const exchangeWithdrawId: string = await this.connector.withdraw(exchange, assetName, amount, this.orionBlockchain.address);
        if (exchangeWithdrawId) {
            await this.db.insertWithdraw({
                exchangeWithdrawId,
                exchange,
                currency: assetName,
                amount,
                status: 'pending'
            });
        }
    }

    /**
     * @param amount     1.23
     * @param assetName 'USDT'
     */
    async approve(amount: BigNumber, assetName: string): Promise<void> {
        log.log('Approving ' + amount.toString() + ' ' + assetName);
        const transaction: Transaction = await this.orionBlockchain.approveERC20(amount, assetName);
        await this.db.insetTransaction(transaction);
    }

    /**
     * @param amount     1.23
     * @param assetName 'ETH'
     */
    async deposit(amount: BigNumber, assetName: string): Promise<void> {
        log.log('Depositing ' + amount.toString() + ' ' + assetName);
        let transaction: Transaction;
        if (assetName === 'ETH') {
            transaction = await this.orionBlockchain.depositETH(amount);
        } else {
            const allowance: BigNumber = await this.orionBlockchain.getAllowance(assetName);
            if (allowance.gte(amount)) {
                transaction = await this.orionBlockchain.depositERC20(amount, assetName);
            } else {
                log.log(`Only ${allowance.toString()} ${assetName} approved, not enough for a deposit`);
            }
        }
        if (transaction) {
            await this.db.insetTransaction(transaction);
        }
    }

    async withdraw(amount: BigNumber, assetName: string): Promise<void> {
        log.log('Withdrawing ' + amount.toString() + ' ' + assetName);
        const transaction: Transaction = await this.orionBlockchain.withdraw(amount, assetName);
        await this.db.insetTransaction(transaction);
    }

    async lockStake(amount: BigNumber): Promise<void> {
        log.log('Staking ' + amount.toString() + ' ORN');
        const transaction: Transaction = await this.orionBlockchain.lockStake(amount);
        await this.db.insetTransaction(transaction);
    }

    async releaseStake(): Promise<void> {
        log.log('Realising ORN stake');
        const transaction: Transaction = await this.orionBlockchain.releaseStake();
        await this.db.insetTransaction(transaction);
    }
}