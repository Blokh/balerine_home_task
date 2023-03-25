import React from 'react';
import './App.css';
import {generateWallets} from "./helpers/walletGenerator";
import {WalletList} from "./modules/wallet/components";
import TransactionForm from "./modules/transaction/componentes/transactionForm";
import {ITransactionRequest} from "./modules/transaction/types";
import {transactionMachine} from "./workflow";
import {interpret, Interpreter} from "xstate";
import {WALLET_STATE} from "./modules/wallet/types";
import {deleteAllWallets, getAllWallets} from "./dal/wallet";
import { useMachine } from '@xstate/react';
import {useForceUpdate} from "./hooks/useForceUpdate";

const initiateWallets = (db: any) => {
    let wallets = getAllWallets(db)
    wallets = wallets[0] == undefined ? generateWallets(db, 10) : wallets

    wallets.sort((a,b) => a.id - b.id)
    return wallets;
}

const sendTransactionRequest = (transactionService: any, transactionRequest: ITransactionRequest, db: any) => {
    if (transactionRequest.fromWallet.status === WALLET_STATE.BLOCKED) {
        return alert ('Picked wallet is blocked because: ' +  transactionRequest.fromWallet.blockageReason)
    }

    transactionService.send({type: 'TRANSACTION_REQUESTED', transactionRequest, db})
}

function handleRefreshState(state, forceUpdate) {
    let stateName = state.value;
    console.log(stateName)
    if (stateName == 'final') {
        forceUpdate()
    }
}

function resetWallets(db, forceUpdate) {
    deleteAllWallets(db)
    generateWallets(db, 10)
    forceUpdate()
}

function App() {
    const wallets = initiateWallets(window.localStorage);
    const db = window.localStorage;
    const forceUpdate = useForceUpdate();

    // @ts-ignore
    const transactionService = interpret(transactionMachine)
        .onTransition((state) => handleRefreshState(state, forceUpdate))
        .start();

    return (
    <div className="App">
      <header className="App-header">
          <WalletList wallets={wallets} />
      </header>
          <TransactionForm wallets={wallets} onTransactionSubmit={(transaction => sendTransactionRequest(transactionService, transaction, db))}/>
          <button onClick={event => {resetWallets(window.localStorage, forceUpdate)}}> resetWallet</button>
    </div>
  );
}

export default App;
