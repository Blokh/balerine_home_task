import {IWallet, INewWallet} from "../modules/wallet/types";
import {ITransaction} from "../modules/transaction/types";
export let lastWalletId = 0

export const insertWallet = (wallet: INewWallet, db: any) : IWallet => {
    let walletToPersist = wallet as IWallet
    lastWalletId = lastWalletId += 1
    walletToPersist.id = lastWalletId

    db.setItem('wallet' + lastWalletId, JSON.stringify(walletToPersist))

    return walletToPersist
}

export const updateWallet = (wallet: IWallet, db: any) : IWallet => {
    db.setItem('wallet' + wallet.id, JSON.stringify(wallet))

    return wallet;
}

export const addTransaction = (wallet: IWallet, transaction: ITransaction, db: any) : IWallet => {
    let transactions = wallet.transactions || []
    wallet.transactions = transactions.concat(transaction)

    updateWallet(wallet, db)

    return wallet;
}