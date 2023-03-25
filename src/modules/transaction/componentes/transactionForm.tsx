import React, { useState } from 'react';
import {TWalletId} from "../../wallet/types";
import { ITransactionRequest} from "../types";

interface TransactionFormProps {
    wallets: {
        id: TWalletId,
    }[],
    onTransactionSubmit: (transaction: ITransactionRequest) => void,
}

const TransactionForm: React.FC<TransactionFormProps> = ({ wallets, onTransactionSubmit }) => {
    const [fromWalletId, setFromWalletId] = useState('');
    const [toWalletId, setToWalletId] = useState('');
    const [amount, setAmount] = useState(1);

    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const fromWallet = wallets.find(wallet => wallet.id === Number(fromWalletId));
        const toWallet = wallets.find(wallet => wallet.id === Number(toWalletId));

        if (!fromWallet || !toWallet || amount <= 0 ) {
            alert('check the transaction request')

            return;
        }

        const transactionRequest: ITransactionRequest = {fromWallet: fromWallet, toWallet: toWallet, amount: amount} as ITransactionRequest;
        onTransactionSubmit(transactionRequest);

        setFromWalletId('');
        setToWalletId('');
        setAmount(1);
    };

    return (
        <div>
            <h2>Transaction Request Form</h2>
            <form onSubmit={handleFormSubmit}>
                <label htmlFor="from-wallet">From Wallet:</label>
                <select
                    id="from-wallet"
                    value={fromWalletId}
                    onChange={event => setFromWalletId(event.target.value)}
                >
                    <option value="">Select a wallet</option>
                    {wallets.map(wallet => (
                        <option key={wallet.id} value={wallet.id}>{wallet.id}</option>
                    ))}
                </select>
                <br />
                <label htmlFor="to-wallet">To Wallet:</label>
                <select
                    id="to-wallet"
                    value={toWalletId}
                    onChange={event => setToWalletId(event.target.value)}
                >
                    <option value="">Select a wallet</option>
                    {wallets.map(wallet => (
                        <option key={wallet.id} value={wallet.id}>{wallet.id}</option>
                    ))}
                </select>
                <br />
                <label htmlFor="amount">Amount:</label>
                <input
                    id="amount"
                    type="number"
                    min="0"
                    step="1"
                    value={amount}
                    onChange={event => setAmount(parseFloat(event.target.value))}
                />
                <br />
                <button type="submit">Send</button>
            </form>
        </div>
    );
};

export default TransactionForm;