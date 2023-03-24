import { createMachine} from "xstate";


export const transactionMachine = createMachine({
    id: 'TRANSACTION_MACHINE',
    initial: 'pendingTransaction',
    predictableActionArguments: true,
    context: {
        wallets: undefined,
        transaction: undefined,
        transactionConfiguration: undefined,
        walletBlockReason: undefined,
    },
    states: {

    }
}, {
    actions: {},
    guards: {}
});
