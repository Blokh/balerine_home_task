import {ITransaction} from "../transaction/types";

export const WALLET_STATE = {
    ACTIVE: 'active',
    BLOCKED: 'blocked'
} as const;

export const BLOCKAGE_REASONS = {
    SENT_TO_BLOCKED_WALLET: 'SENT_TO_BLOCKED_WALLET',
    EXCEEDED_RISK_RANK_LIMIT: 'EXCEEDED_RISK_RANK_LIMIT',
} as const;

export type ObjectValues<TObject> = TObject[keyof TObject];
export type TWalletState = ObjectValues<typeof WALLET_STATE>
export type TBlockageReasons = ObjectValues<typeof BLOCKAGE_REASONS>
export type TWalletId = number;
export type TWalletRank = number;

export interface IBlockedTransaction {
    blockReason: TBlockageReasons;
}

export interface INewWallet {
    status: TWalletState,
    riskRank: TWalletRank,
    isInternal: boolean,
}

export interface IWallet extends INewWallet{
    id: TWalletId,
    transactions?: ITransaction[];
    blockageReason?: TBlockageReasons,
}