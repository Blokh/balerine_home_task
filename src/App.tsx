import React from 'react';
import './App.css';
import {generateWallets} from "./helpers/walletGenerator";
import {WalletList} from "./modules/wallet/components";
import TransactionForm from "./modules/transaction/componentes/transactionForm";
import {ITransactionRequest} from "./modules/transaction/types";
import {transactionMachine} from "./workflow/transaction_machine";
import {interpret, Interpreter} from "xstate";
import {WALLET_STATE} from "./modules/wallet/types";
import {getAllWallets} from "./dal/wallet";

const initiateWallets = (db: any) => {
    let wallets = getAllWallets(db)
    wallets = wallets[0] == undefined ? generateWallets(db, 10) : wallets

    return wallets;
}

const sendTransactionRequest = (transactionService: any, transactionRequest: ITransactionRequest, db: any) => {
    if (transactionRequest.fromWallet.status === WALLET_STATE.BLOCKED) {
        return alert ('Picked wallet is blocked because: ' +  transactionRequest.fromWallet.blockageReason)
    }

    transactionService.send({type: 'TRANSACTION_REQUESTED', transactionRequest, db})
}

function App() {
    const wallets = initiateWallets(window.localStorage);
    // @ts-ignore
    const transactionService = interpret(transactionMachine)
        .onTransition((state) => console.log(state.value))
        .start();

  return (
    <div className="App">
      <header className="App-header">
          <WalletList wallets={wallets} />
      </header>
          <TransactionForm wallets={wallets} onTransactionSubmit={(transaction => sendTransactionRequest(transactionService, transaction, window.localStorage))}/>
    </div>
  );
}

export default App;
