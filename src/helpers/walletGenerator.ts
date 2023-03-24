import {
    BLOCKAGE_REASONS,
    IWallet,
    TWalletRank,
    TWalletState,
    WALLET_STATE,
    INewWallet
} from "../modules/wallet/types";
import {ITransaction} from "../modules/transaction/types";
import {insertWallet} from "../dal/wallet";

export const generateWallets = (db: any, numberOfWallets: number): IWallet[] => {
    const wallets: IWallet[] = [];

    for (let i = 1; i <= numberOfWallets; i++) {
        const status: TWalletState = (i === 4 || i === 2 || i === 6) ? 'blocked' : 'active';
        const riskRank: TWalletRank = Math.floor(Math.random() * 16) - 5;
        const isInternal: boolean = Math.random() < 0.5;
        const transactions: ITransaction[] = [];
        let blockageReason;

        if (status === WALLET_STATE.BLOCKED) {
            blockageReason = BLOCKAGE_REASONS.EXCEEDED_RISK_RANK_LIMIT;
        }
        let walletRequest = {status, riskRank, isInternal, transactions, blockageReason} as INewWallet
        let wallet = insertWallet(walletRequest, db);

        wallets.push(wallet);
    }

    return wallets;
};

