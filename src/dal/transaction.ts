import {INewTransaction, ITransaction} from "../modules/transaction/types";

export let lastTransactionId = 0

export const insertTransaction = (newTransaction: INewTransaction, db: any) : ITransaction => {
    let transaction = newTransaction as ITransaction
    transaction.id = lastTransactionId += 1

    db.setItem('transaction' + lastTransactionId, JSON.stringify(transaction))

    return transaction
}