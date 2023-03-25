import React from 'react';
import {IWallet} from "../types";

interface WalletProps {
    wallet: IWallet
}

const Wallet: React.FC<WalletProps> = ({ wallet }) => {
    return (
        <tr>
            <td><b>Wallet ID: {wallet.id}</b></td>
            <td>Status: {wallet.status}</td>
            <td>Risk Rank: {wallet.riskRank}</td>
            <td>Internal: {wallet.isInternal ? 'Yes' : 'No'}</td>
            {wallet.transactions && ( <td>Transactions count: {wallet.transactions.length}</td> )}
            {wallet.blockageReason && (<td>Blockage Reason: {wallet.blockageReason}</td>)}
    </tr>
);
};

export default Wallet;