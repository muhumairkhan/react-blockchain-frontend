import { listWallets, loadWalletMeta, createWallet } from '../lib/wallet';

function Wallet() {

    const [wallets, setWallets] = useState(listWallets());

    return  (
    <section className="panel panel-wide">
      <h2>Wallet</h2>
      if (wallets.length === 0) (
        <form className="tx-form" onSubmit={handleCreateWallet}>
          <label>Wallet name
            <input value={newWalletName} onChange={(e) => setNewWalletName(e.target.value)} placeholder="alice" />
          </label>
          <label>Passphrase
            <input type="password" value={newWalletPass} onChange={(e) => setNewWalletPass(e.target.value)} />
          </label>
          <button type="submit" className="btn-secondary">Create wallet</button>
        </form>
      ) 

    </section>
    )
}

export default Wallet;