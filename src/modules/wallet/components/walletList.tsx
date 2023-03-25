import React from 'react';
import {IWallet} from "../types";
import Wallet from "./wallet";

interface WalletListProps {
    wallets: IWallet[]
}

export const WalletList: React.FC<WalletListProps> = (wallets) => {
    return (
        <div>
            <h2>Wallets</h2>
            <table>
                <thead>
                <tr>
                    <th>ID</th>
                    <th>Status</th>
                    <th>Risk Rank</th>
                    <th>Internal</th>
                    <th>Transactions</th>
                    <th>Blockage Reason</th>
                </tr>
                </thead>
                <tbody>
                {wallets.wallets.map(wallet => (
                    <Wallet wallet={wallet} key={wallet.id}/>
                ))}
                </tbody>
            </table>
        </div>
);
};


