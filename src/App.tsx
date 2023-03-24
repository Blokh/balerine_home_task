import React from 'react';
import './App.css';
import {generateWallets} from "./helpers/walletGenerator";
import {WalletList} from "./modules/wallet/components";
import TransactionForm from "./modules/transaction/componentes/transactionForm";

const initiateWallets = () => {
  const wallets = generateWallets(window.localStorage, 10)
  return wallets;
}

function App() {
    const wallets = initiateWallets();

  return (
    <div className="App">
      <header className="App-header">
          <WalletList wallets={wallets}/>
      </header>
        <body>
            <TransactionForm wallets={wallets} onTransactionSubmit={(transaction => {console.log(transaction.fromWallet.id)})}/>
        </body>
    </div>
  );
}

export default App;
