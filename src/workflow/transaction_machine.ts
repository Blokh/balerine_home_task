import {assign, createMachine, send} from "xstate";
import {BLOCKAGE_REASONS, IWallet, TBlockageReasons, TWalletId, WALLET_STATE} from "../modules/wallet/types";
import {INewTransaction, ITransaction, ITransactionRequest} from "../modules/transaction/types";
import {updateWallet} from "../dal/wallet";
import {insertTransaction} from "../dal/transaction";

let runningWalletTransaction = {}
const MAX_RISK_RANK = 600;
const EXTERNAL_LIMIT_THRESHOLD = 100;
const INTERNAL_LIMIT_THRESHOLD = 300;

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

const lockSenderInTransaction = (transactionRequest: ITransactionRequest) : void => {
    let walletId = fetchSendingWalletId(transactionRequest);

    runningWalletTransaction[walletId] = true
}

const isTransactionFromWalletAlreadyEnqueued = (transactionRequest: ITransactionRequest) : boolean => {
    let isSellerAlreadySending = runningWalletTransaction[fetchSendingWalletId(transactionRequest)];

    return isSellerAlreadySending
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
    const persistedWallet = updateWallet(wallet, window.localStorage)
    return persistedWallet
}

function persistTransactionToDb(transactionRequest, db) {
    let fromWallet = transactionRequest.fromWallet;
    let toWallet = transactionRequest.toWallet;

    const newTransaction = {
        fromWalletId: fromWallet.id,
        toWalletId: toWallet.id,
        amount: transactionRequest.amount
    } as INewTransaction

    const transaction = insertTransaction(newTransaction, db);
    let {amount, ...partialTransaction} = transaction;
    partialTransaction['amount'] = -transaction.amount
    const sendingTransaction = partialTransaction as ITransaction

    let sendingTransactions = fromWallet.transactions.concat(sendingTransaction);
    let receivingTransactions = toWallet.transactions.concat(transaction);
    fromWallet.transactions = sendingTransactions
    toWallet.transactions = receivingTransactions

    persistWallet(fromWallet)
    persistWallet(toWallet)
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
                    { target: 'blockSenderWallet', cond: 'shouldBlockWallet', action: ['generateWalletBlockReason', 'blockSendingWallet'] },
                    { target: 'reEnqueueTransaction', cond: 'isTransactionFromWalletAlreadyEnqueued' },
                    { target: 'validateTransaction', actions: 'lockSenderInTransaction' },
                ]
            },
        }, reEnqueueTransaction: {
            after: { '5000': { target: 'pendingTransaction', actions: send({ type: 'TRANSACTION_REQUESTED', log: 'Resednging Transction' }) } }
        }, blockSenderWallet: {
            on: { target: 'pendingTransaction' } // TODO implement block sender
        }, validateTransaction: {
            always: { cond: 'isTransactionToExternal', actions: 'persistSumOfRanksToSendingWallet'},
            on: [
                {target: 'enqueueTransaction', cond: ['isTransactionToExternal','isExternalTransactionValid']}, // could not find the reason why it does not allow double condintions to be executed
                {target: 'enqueueTransaction', cond: ['isTransactionToInternal', 'isInternalTransactionValid']},
                {target: 'blockTransaction'},
            ]
        }, enqueueTransaction: {
            after: {5500: {on: {target: 'unlockSenderTransaction', actions: ['persistTransactionsToWallets']}}} // added after in order to simluate transaction that takes time
         }, blockTransaction: {
            on: { target: 'pendingTransaction' }
        }
    }
}, {
    actions: {
        lockSenderInTransaction: (context, event) => {
            assign({transaction: lockSenderInTransaction(context.transactionRequest)})
        }, persistSumOfRanksToSendingWallet: (context, event) => {
            context.transactionRequest.fromWallet = persistSumOfRanksToSendingWallet(context.transactionRequest)
        }, generateWalletBlockReason: (context, event) => {
            let transactionRequest = context.transactionRequest;

            if (transactionRequest.toWallet.status == WALLET_STATE.BLOCKED) {
                assign({walletBlockReason: BLOCKAGE_REASONS.SENT_TO_BLOCKED_WALLET})
            } else if (transactionRequest.fromWallet.riskRank >= MAX_RISK_RANK) {
                assign({walletBlockReason: BLOCKAGE_REASONS.EXCEEDED_RISK_RANK_LIMIT})
            }
        }, blockSendingWallet: (context, event) => {
            blockWallet(context.transactionRequest.fromWallet, context.walletBlockReason, context.db)
        }
    },
    guards: {
        assignInitialContext: (context, event) => {
            if (context.transactionRequest == undefined){
                context.transactionRequest = event.transactionRequest;
                context.db = event.db;
            }

            return false;
        }, assignContextFromEvent: (context, event) => {
            debugger
            assign({
                transactionRequest: event.transactionRequest,
                db: event.db
            })
        }, shouldBlockWallet: (context, event) => {
            let transactionRequest = context.transactionRequest;
            return isReceivingWalletBlocked(transactionRequest) || transactionRequest.fromWallet.riskRank > MAX_RISK_RANK;
        }, isTransactionFromWalletAlreadyEnqueued: (context, event) => {
            return isTransactionFromWalletAlreadyEnqueued(context.transactionRequest)
        }, isTransactionToExternal: (context, event) => {
            return !isInternalTransaction(context.transactionRequest)
        },isExternalTransactionValid: (context, event) => {
            return isExternalTransactionFitsLimits(context.transactionRequest)
        },isTransactionToInternal: (context, event) => {
            return isInternalTransaction(context.transactionRequest)
        },isInternalTransactionValid: (context, event) => {
            return isInternalTransactionFitsLimits(context.transactionRequest)
        }, persistTransactionsToWallets: (context, event) => {
            persistTransactionToDb(context.transactionRequest, context.db);
        }
    }
});
