// Wallet.jsx
import { listWallets, createWallet } from './../../lib/wallet';
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router';
import { useWallet } from "./../context/WalletContext";

function Wallet() {
  const { nodeUrl } = useOutletContext();
  const { wallet, selected, wallets, setSelected, syncWalletAndNodeDetails, isLoaded } = useWallet();

  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletPass, setNewWalletPass] = useState('');
  const [walletMsg, setWalletMsg] = useState(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [copied, setCopied] = useState(false);


  const handleSelectChange = async (e) => {
    const targetWalletName = e.target.value;
    setSelected(targetWalletName);
    setAccountLoading(true);
    await syncWalletAndNodeDetails(targetWalletName, nodeUrl);
    setAccountLoading(false);
  };

  async function handleCreateWallet(e) {
    e.preventDefault();
    if (!newWalletName || !newWalletPass) {
      setWalletMsg({ kind: 'error', text: 'Name and passphrase are both required.' });
      return;
    }
    try {
      const created = await createWallet(newWalletName, newWalletPass);
      const updatedList = listWallets() || [];
      
      setWallets(updatedList);
      setSelected(created.name);
      setNewWalletName('');
      setNewWalletPass('');
      setWalletMsg({ kind: 'success', text: `Wallet "${created.name}" created.` });
      
      setAccountLoading(true);
      await syncWalletAndNodeDetails(created.name, nodeUrl);
      setAccountLoading(false);
    } catch (err) {
      setWalletMsg({ kind: 'error', text: err.message });
    }
  }

  function handleCopyAddress() {
    if (!wallet?.address) return;
    navigator.clipboard?.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const triggerRefresh = async () => {
    setAccountLoading(true);
    await syncWalletAndNodeDetails(selected, nodeUrl);
    setAccountLoading(false);
  };

  return (
    <section className="panel panel-wide">
      <h2>Wallet</h2>

     {(wallets || []).length === 0 ? (
        <form className="tx-form" onSubmit={handleCreateWallet}>
          <p className="panel-note">No wallets yet — create one to get started.</p>
          <label>
            Wallet name
            <input value={newWalletName} onChange={(e) => setNewWalletName(e.target.value)} placeholder="alice" />
          </label>
          <label>
            Passphrase
            <input
              type="password"
              value={newWalletPass}
              onChange={(e) => setNewWalletPass(e.target.value)}
              placeholder="••••••••"
            />
          </label>
          <button type="submit" className="btn-secondary">Create wallet</button>
        </form>
      ) : (
        <>
          <label className="wallet-select-label">
            Active wallet
            <select value={selected || ""} onChange={handleSelectChange}>
              {(wallets || []).map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </label>

          {wallet && wallet.address && (
            <div className="wallet-card">
              <div className="wallet-address-row">
                <span className="mono-value">{wallet.address}</span>
                <button type="button" className="btn-secondary btn-small" onClick={handleCopyAddress}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <div className="wallet-stats">
                <div className="wallet-stat">
                  <span className="wallet-stat-label">Balance</span>
                  <span className="wallet-stat-value">
                    {accountLoading ? '…' : wallet.balance !== undefined ? wallet.balance : '—'}
                  </span>
                </div>
                <div className="wallet-stat">
                  <span className="wallet-stat-label">Nonce</span>
                  <span className="wallet-stat-value">
                    {accountLoading ? '…' : wallet.nonce !== undefined ? wallet.nonce : '—'}
                  </span>
                </div>
                <div className="wallet-stat">
                  <span className="wallet-stat-label">Next nonce</span>
                  <span className="wallet-stat-value">
                    {accountLoading ? '…' : wallet.nextNonce !== undefined ? wallet.nextNonce : '—'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="btn-secondary btn-small"
                onClick={triggerRefresh}
                disabled={accountLoading}
              >
                {accountLoading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          )}

          <details className="wallet-create-details">
            <summary>Create another wallet</summary>
            <form className="tx-form" onSubmit={handleCreateWallet}>
              <label>
                Wallet name
                <input value={newWalletName} onChange={(e) => setNewWalletName(e.target.value)} placeholder="bob" />
              </label>
              <label>
                Passphrase
                <input
                  type="password"
                  value={newWalletPass}
                  onChange={(e) => setNewWalletPass(e.target.value)}
                  placeholder="••••••••"
                />
              </label>
              <button type="submit" className="btn-secondary">Create wallet</button>
            </form>
          </details>
        </>
      )}

      {walletMsg && <p className={`inline-message ${walletMsg.kind}`}>{walletMsg.text}</p>}
    </section>
  );
}

export default Wallet;
