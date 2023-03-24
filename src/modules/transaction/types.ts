import {IWallet, TWalletId} from "../wallet/types";

export type TTransactionId = number;

export interface INewTransaction {
    fromWalletId: TWalletId;
    toWalletId: TWalletId;
    amount: number;
}
export interface ITransaction extends INewTransaction{
    id: TTransactionId;
}

export interface ITransactionRequest {
    fromWallet: IWallet;
    toWallet: IWallet;
    amount: number;
}