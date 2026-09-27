import { createContext, useState, useContext, useCallback } from "react"
import { listWallets, loadWalletMeta, loadSelectedWalletName, saveSelectedWalletName } from './../../lib/wallet' 
import { api } from './../../api'

let initialWallet = {
    publicKey: "",
    balance: 0,
    nonce: 0
}

export const WalletContext = createContext(null)

export function WalletProvider({ children }) {
    const [wallet, setWallet] = useState(initialWallet)
    const [wallets, setWallets] = useState([])
    
    // 1. Load active tracking name from local storage on bootstrap
    const [selected, setSelectedState] = useState(() => loadSelectedWalletName())

    // 2. Dual state modification pipeline helper
    const setSelected = useCallback((walletName) => {
        setSelectedState(walletName);
        saveSelectedWalletName(walletName);
    }, []);

    const saveWallet = useCallback((walletData) => {
        setWallet(walletData)
    }, [])

    const resetWallet = () => {
        setWallet(initialWallet)
        setSelected("")
    }

    const syncWalletAndNodeDetails = useCallback(async (walletName, nodeUrl) => {
        if (!walletName) return
        
        const walletMeta = loadWalletMeta(walletName)
        if (!walletMeta) return

        try {
            const nodeData = nodeUrl ? await api.getAccount(nodeUrl, walletMeta.address) : null
            
            setWallet({
                ...walletMeta,
                balance: nodeData?.balance ?? 0,
                nonce: nodeData?.nonce ?? 0,
                nextNonce: nodeData?.nextNonce ?? 0
            })
        } catch (err) {
            console.error("Failed to sync node details:", err)
            setWallet({
                ...walletMeta,
                balance: '—',
                nonce: '—',
                nextNonce: '—'
            })
        }
    }, [])

    return (
        <WalletContext value={{
            wallet, 
            selected, 
            wallets, 
            setWallets, 
            setSelected, // Passes the updated storage-interceptor function safely
            saveWallet, 
            resetWallet,
            syncWalletAndNodeDetails
        }}>
            {children}
        </WalletContext>
    )
}

export function useWallet() {
    const context = useContext(WalletContext)
    if (!context) {
        throw new Error("useWallet must be used within a WalletProvider")
    }
    return context
}
