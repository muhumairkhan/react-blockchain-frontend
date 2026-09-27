import { createContext, useState, useContext, useCallback, useEffect } from "react"
import { listWallets, loadWalletMeta, loadSelectedWalletName, saveSelectedWalletName } from './../../lib/wallet' 
import { api } from './../../api'

let initialWallet = {
    publicKey: "",
    balance: 0,
    nonce: 0
}

export const WalletContext = createContext(null)

export function WalletProvider({ children, nodeUrl }) { // Pass nodeUrl as a prop if accessible globally
    const [wallet, setWallet] = useState(initialWallet)
    const [wallets, setWallets] = useState([])
    const [selected, setSelectedState] = useState(() => loadSelectedWalletName())
    const [isLoaded, setIsLoaded] = useState(false); // Flag to stop UI rendering races

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

    const syncWalletAndNodeDetails = useCallback(async (walletName, targetNodeUrl) => {
        if (!walletName) return
        
        const walletMeta = loadWalletMeta(walletName)
        if (!walletMeta) return

        try {
            const url = targetNodeUrl || nodeUrl;
            const nodeData = url ? await api.getAccount(url, walletMeta.address) : null
            
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
    }, [nodeUrl])

    // Runs globally once on load
    useEffect(() => {
        const list = listWallets() || [];
        setWallets(list);

        let currentSelection = selected;
        
        // Fallback constraint logic: if nothing saved, grab the first one
        if (!currentSelection && list.length > 0) {
            currentSelection = list[0];
        }
        
        if (currentSelection) {
            setSelected(currentSelection); 
            syncWalletAndNodeDetails(currentSelection, nodeUrl);
        }
        setIsLoaded(true);
    }, [nodeUrl, selected, setSelected, syncWalletAndNodeDetails]);

    return (
        <WalletContext value={{
            wallet, 
            selected, 
            wallets, 
            setWallets, 
            setSelected, 
            saveWallet, 
            resetWallet,
            syncWalletAndNodeDetails,
            isLoaded 
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
