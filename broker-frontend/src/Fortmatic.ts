import Web3 from "web3";
import Fortmatic from "fortmatic";

const fm = new Fortmatic(
    process.env.REACT_APP_FORTMATIC_API_KEY!,
    process.env.REACT_APP_FORTMATIC_CHAIN_NAME!
);
export const fortmaticWeb3 = new Web3(fm.getProvider() as any);
