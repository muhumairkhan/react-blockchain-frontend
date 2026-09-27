import { listWallets, loadWalletMeta, createWallet } from './../../lib/wallet';
import { useState, useEffect } from "react"
import { api } from "./../../api"

function Wallet() {
    const [nodeUrl, setNodeUrl] = useState('http://localhost:3000');
    const [wallets, setWallets] = useState(listWallets());
    const [newWalletName, setNewWalletName] = useState();
    const [newWalletPass, setNewWalletPass] = useState();
    const [selected, setSelected] = useState(wallets[0] ?? '');
    const [walletMsg, setWalletMsg] = useState('');

    const [account, setAccount] = useState({})

    const wallet = selected ? loadWalletMeta(selected) : null;

    async function handleCreateWallet(e) {
        e.preventDefault();
        try {
            const created = await createWallet(newWalletName, newWalletPass);
            setWallets(listWallets());
            setSelected(created.name);
            setNewWalletName('');
            setNewWalletPass('');
        } catch (err) {
            setWalletMsg({ kind: 'error', text: err.message });
        }
    }

    if (wallet != null) {
        useEffect(function(){

            async function getAccount(){
                let accountData = await api.getAccount(nodeUrl, wallet.address);
                if (accountData != null) {
                    setAccount(accountData)
                }
            }

            getAccount()
            
        }, [])
    }

    return  (
    <section className="panel panel-wide">
      <h2>Wallet</h2>
      {wallets.length === 0 ? (
        <form className="tx-form" onSubmit={handleCreateWallet}>
          <label>Wallet name
            <input value={newWalletName} onChange={(e) => setNewWalletName(e.target.value)} placeholder="alice" />
          </label>
          <label>Passphrase
            <input type="password" value={newWalletPass} onChange={(e) => setNewWalletPass(e.target.value)} />
          </label>
          <button type="submit" className="btn-secondary">Create wallet</button>
        </form>
      ) :
        <>
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {wallets.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
          <div></div>
          {wallet && <p className="panel-note mono-value">{wallet.address}</p>}
          {Object.keys(account).length > 0 &&  <p className="panel-note mono-value">Balance {account.balance}</p>}
        </> 
      } 
        {walletMsg && <p className={`inline-message ${walletMsg.kind}`}>{walletMsg.text}</p>}
    </section>
    )
}

export default Wallet;