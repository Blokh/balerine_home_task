to run the project - need to run 
yarn install
yarn start

what i would do different if I had more knowledge/time:
1. instead of using the hack of forceUpdate(). use the useMachine hook in order to update the state.
2. set context properly instead of passing it from the event, use assign instead of passing it.
3. update the the machine to 3 different machines with the domains of:
  1. locking machanisem
  2. transaction logic & persistence
  3. wallet persistence.
4. generate a dynamic config, also the transactions are very much different so maybe generating 2 different actos for each would be perferable.
