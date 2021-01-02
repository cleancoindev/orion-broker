import WalletLink from 'walletlink'
import Web3 from 'web3'

const walletLink = new WalletLink({
    appName: 'Orion',
    appLogoUrl: process.env.REACT_APP_WALLET_LINK_LOGO_URL!,
    darkMode: false
})

export const coinbaseEthereum = walletLink.makeWeb3Provider(
    process.env.REACT_APP_WALLET_LINK_JSONRPC_URL!,
    Number(process.env.REACT_APP_CHAIN_ID!)
)
export const coinbaseWeb3 = new Web3(coinbaseEthereum)
