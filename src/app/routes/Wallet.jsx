import { listWallets, loadWalletMeta, createWallet } from './../../lib/wallet';
import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router';
import { api } from './../../api';

function Wallet() {
  const { nodeUrl } = useOutletContext();

  const [wallets, setWallets] = useState(listWallets());
  const [selected, setSelected] = useState(wallets[0] ?? '');
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletPass, setNewWalletPass] = useState('');
  const [walletMsg, setWalletMsg] = useState(null);

  const [account, setAccount] = useState(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const wallet = selected ? loadWalletMeta(selected) : null;

  // Hooks always run in the same order now (no more conditional useEffect),
  // and this also refetches whenever you switch wallets, not just on mount.
  const refreshAccount = useCallback(async () => {
    if (!wallet) {
      setAccount(null);
      return;
    }
    setAccountLoading(true);
    try {
      const accountData = await api.getAccount(nodeUrl, wallet.address);
      setAccount(accountData ?? null);
    } catch {
      setAccount(null);
    } finally {
      setAccountLoading(false);
    }
  }, [nodeUrl, wallet?.address]);

  useEffect(() => {
    refreshAccount();
  }, [refreshAccount]);

  async function handleCreateWallet(e) {
    e.preventDefault();
    if (!newWalletName || !newWalletPass) {
      setWalletMsg({ kind: 'error', text: 'Name and passphrase are both required.' });
      return;
    }
    try {
      const created = await createWallet(newWalletName, newWalletPass);
      setWallets(listWallets());
      setSelected(created.name);
      setNewWalletName('');
      setNewWalletPass('');
      setWalletMsg({ kind: 'success', text: `Wallet "${created.name}" created.` });
    } catch (err) {
      setWalletMsg({ kind: 'error', text: err.message });
    }
  }

  function handleCopyAddress() {
    if (!wallet) return;
    navigator.clipboard?.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="panel panel-wide">
      <h2>Wallet</h2>

      {wallets.length === 0 ? (
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
            <select value={selected} onChange={(e) => setSelected(e.target.value)}>
              {wallets.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </label>

          {wallet && (
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
                    {accountLoading ? '…' : account ? account.balance : '—'}
                  </span>
                </div>
                <div className="wallet-stat">
                  <span className="wallet-stat-label">Nonce</span>
                  <span className="wallet-stat-value">
                    {accountLoading ? '…' : account ? account.nonce : '—'}
                  </span>
                </div>
                <div className="wallet-stat">
                  <span className="wallet-stat-label">Next nonce</span>
                  <span className="wallet-stat-value">
                    {accountLoading ? '…' : account ? account.nextNonce : '—'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="btn-secondary btn-small"
                onClick={refreshAccount}
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