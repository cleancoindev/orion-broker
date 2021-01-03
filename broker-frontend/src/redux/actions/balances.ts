export const CLEAR_BALANCES = 'CLEAR_BALANCES';
export const SET_BALANCES = 'SET_BALANCES';

export const clearBalances = () => ({type: CLEAR_BALANCES});

export const setBalances = (balances: any) => ({
    type: SET_BALANCES,
    balances
});
