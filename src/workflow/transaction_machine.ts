import {assign, createMachine, send} from "xstate";
import {
    BLOCKAGE_REASONS,
    IWallet,
    TBlockageReasons,
    TWalletId,
    TWalletRank,
    WALLET_STATE
} from "../modules/wallet/types";
import {INewTransaction, ITransaction, ITransactionRequest} from "../modules/transaction/types";
import {updateWallet} from "../dal/wallet";
import {insertTransaction} from "../dal/transaction";

const MAX_RISK_RANK = 600;
const EXTERNAL_LIMIT_THRESHOLD = 100;
const INTERNAL_LIMIT_THRESHOLD = 300;
const INTERNAL_PERCENTAGE_ADDITIONAL_RISK_ON_BLOCK = 15;
const EXTERNAL_PERCENTAGE_ADDITIONAL_RISK_ON_BLOCK = 10;
const IN_PROCESS_PREFIX = 'in_process_wallet';

const isReceivingWalletBlocked = (request: ITransactionRequest) => {
    return request.toWallet.status == WALLET_STATE.BLOCKED
}

const persistSumOfRanksToSendingWallet = (transactionRequest: ITransactionRequest) : IWallet => {
    let fromWallet = transactionRequest.fromWallet;
    let summedRank = fromWallet.riskRank + transactionRequest.toWallet.riskRank
    fromWallet.riskRank = summedRank

    fromWallet = persistWallet(fromWallet)

    return fromWallet
}

function generate_process_key(transactionRequest: ITransactionRequest) {
    return IN_PROCESS_PREFIX + fetchSendingWalletId(transactionRequest);
}

const lockSenderInTransaction = (db: any, transactionRequest: ITransactionRequest) : void => {
    db.setItem(generate_process_key(transactionRequest), 'true');
}

const isTransactionFromWalletAlreadyEnqueued = (db: any, transactionRequest: ITransactionRequest) : boolean => {
    let isSellerAlreadySending = db.getItem(generate_process_key(transactionRequest), 'false');
    return isSellerAlreadySending == 'true'
}

const unlockSenderTransaction = (db: any, transactionRequest: ITransactionRequest) : void => {
    db.removeItem(generate_process_key(transactionRequest))
}

const fetchSendingWalletId = (transactionRequest: ITransactionRequest) : TWalletId =>{
    return transactionRequest.fromWallet.id
}

const blockWallet = (wallet: IWallet, blockageReason: TBlockageReasons, db) : IWallet =>{
    wallet.blockageReason = blockageReason;
    wallet.status = WALLET_STATE.BLOCKED;
    wallet = updateWallet(wallet, db)

    return wallet;
}

function isExternalTransactionFitsLimits(transaction: ITransactionRequest) {
    return transaction.fromWallet.riskRank < EXTERNAL_LIMIT_THRESHOLD;
}

function isInternalTransactionFitsLimits(transaction) {
    let transactionRiskRank = transaction.fromWallet.riskRank + transaction.toWallet.riskRank;

    return transactionRiskRank < INTERNAL_LIMIT_THRESHOLD
}

function isInternalTransaction(transaction: ITransactionRequest) {
    return transaction.toWallet.isInternal;
}

const persistWallet = (wallet: IWallet ) : IWallet => {
    return updateWallet(wallet, window.localStorage);
}

const calculateBlockedTransactionNewRisk = (transaction: ITransactionRequest) => {
    let fromWallet = transaction.fromWallet;
    let toWallet = transaction.toWallet;

    if (toWallet.isInternal) {
        fromWallet.riskRank = calculateAddedRankPercentageValue(fromWallet.riskRank, INTERNAL_PERCENTAGE_ADDITIONAL_RISK_ON_BLOCK)
        toWallet.riskRank = calculateAddedRankPercentageValue(toWallet.riskRank, INTERNAL_PERCENTAGE_ADDITIONAL_RISK_ON_BLOCK)

        persistWallet(toWallet)
    } else {
        fromWallet.riskRank = calculateAddedRankPercentageValue(fromWallet.riskRank, EXTERNAL_PERCENTAGE_ADDITIONAL_RISK_ON_BLOCK)
    }

    persistWallet(fromWallet);
}

const calculateAddedRankPercentageValue = (riskRank: TWalletRank, percentage: number): TWalletRank => {
    let additional_riskRank = percentage / 100 * riskRank;
    return additional_riskRank + riskRank
}

function persistTransactionToDb(transactionRequest, db) {
    let fromWallet = transactionRequest.fromWallet;
    let toWallet = transactionRequest.toWallet;

    const newTransaction = {
        fromWalletId: fromWallet.id,
        toWalletId: toWallet.id,
        amount: transactionRequest.amount
    } as INewTransaction;

    const transaction = insertTransaction(newTransaction, db);
    let {amount, ...partialTransaction} = transaction;
    partialTransaction['amount'] = -transaction.amount;
    const sendingTransaction = partialTransaction as ITransaction;

    let sendingTransactions = fromWallet.transactions.concat(sendingTransaction);
    let receivingTransactions = toWallet.transactions.concat(transaction);
    fromWallet.transactions = sendingTransactions;
    toWallet.transactions = receivingTransactions;

    persistWallet(fromWallet);
    persistWallet(toWallet);
}

// @ts-ignore
export const transactionMachine = createMachine({
    id: 'TRANSACTION_MACHINE',
    initial: 'pendingTransaction',
    predictableActionArguments: true,
    context: {
        transactionRequest: undefined,
        db: undefined,
        walletBlockReason: undefined,
    },
    states: {
        pendingTransaction: {
            on: {
                'TRANSACTION_REQUESTED':  [
                    { cond: 'assignInitialContext' }, // this is a hack since I could not pass the event information to context
                    { target: 'transactionFinished', cond: 'shouldBlockWallet', actions: ['generateWalletBlockReason', 'blockSendingWallet'] },
                    { target: 'reEnqueueTransaction', cond: 'isTransactionFromWalletAlreadyEnqueued' },
                    { target: 'validateTransaction', actions: ['lockSenderInTransaction', 'persistSumOfRanksToSendingWallet', send({ type: 'VALIDATE_REQUEST' })], cond: 'isTransactionToExternal'},
                    { target: 'validateTransaction', action: ['lockSenderInTransaction', send({ type: 'VALIDATE_REQUEST' })] },
                ]
            },
        }, reEnqueueTransaction: {
            after: { 3000: { target: 'pendingTransaction', actions: send({ type: 'TRANSACTION_REQUESTED', log: 'Resednging Transction' }) } }
        }, validateTransaction: {
            on: {
                'VALIDATE_REQUEST': [
                    {target: 'enqueueTransaction', conditions: ['isTransactionToExternal', 'isExternalTransactionValid']},
                    {target: 'enqueueTransaction', conditions: ['isTransactionToInternal', 'isInternalTransactionValid']},
                    {target: 'blockTransaction', action: 'persistBlockTransactionNewRankToWallet'},
                ]
            }
        }, enqueueTransaction: {
            after: { 5500: { target: 'transactionFinished', actions: ['persistTransactionsToWallets', 'unlockSenderInTransaction'] } } // added after in order to simluate transaction that takes time
         }, blockTransaction: {
            target: 'transactionFinished', action: 'unlockSenderInTransaction'
        }, transactionFinished:
            { type: 'final' }
    }
}, {
    actions: {
        lockSenderInTransaction: (context, event) => {
            assign({transaction: lockSenderInTransaction(context.db, context.transactionRequest)})
        }, persistSumOfRanksToSendingWallet: (context, event) => {
            context.transactionRequest.fromWallet = persistSumOfRanksToSendingWallet(context.transactionRequest)
        }, generateWalletBlockReason: (context, event) => {
            let transactionRequest = context.transactionRequest;

            if (transactionRequest.toWallet.status == WALLET_STATE.BLOCKED) {
                context.walletBlockReason = BLOCKAGE_REASONS.SENT_TO_BLOCKED_WALLET
            } else if (transactionRequest.fromWallet.riskRank >= MAX_RISK_RANK) {
                context.walletBlockReason = BLOCKAGE_REASONS.EXCEEDED_RISK_RANK_LIMIT
            }
        }, blockSendingWallet: (context, event) => {
            blockWallet(context.transactionRequest.fromWallet, context.walletBlockReason, context.db)
        }, persistBlockTransactionNewRankToWallet: (context, event) => {
            calculateBlockedTransactionNewRisk(context.transactionRequest)
        }, persistTransactionsToWallets: (context, event) => {
            persistTransactionToDb(context.transactionRequest, context.db);
        }, unlockSenderInTransaction: (context, event) => {
            unlockSenderTransaction(context.db, context.transactionRequest);
        }
    },
    guards: {
        assignInitialContext: (context, event) => {
            if (event.transactionRequest){
                context.transactionRequest = event.transactionRequest;
                context.db = event.db;
            }

            return false;
        }, shouldBlockWallet: (context, event) => {
            let transactionRequest = context.transactionRequest;
            return isReceivingWalletBlocked(transactionRequest) || transactionRequest.fromWallet.riskRank > MAX_RISK_RANK;
        }, isTransactionFromWalletAlreadyEnqueued: (context, event) => {
            return isTransactionFromWalletAlreadyEnqueued(context.db, context.transactionRequest)
        }, isTransactionToExternal: (context, event) => {
            return !isInternalTransaction(context.transactionRequest)
        },isExternalTransactionValid: (context, event) => {
            return isExternalTransactionFitsLimits(context.transactionRequest)
        },isTransactionToInternal: (context, event) => {
            return isInternalTransaction(context.transactionRequest)
        },isInternalTransactionValid: (context, event) => {
            return isInternalTransactionFitsLimits(context.transactionRequest)
        }
    }
});
