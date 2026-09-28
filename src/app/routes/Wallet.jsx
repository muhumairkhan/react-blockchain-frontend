import { listWallets, createWallet, importWallet, exportWallet, deleteWallet, deleteAllWallets } from './../../lib/wallet';
import { useState } from 'react';
import { useOutletContext } from 'react-router';
import { useWallet } from "./../context/WalletContext";

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Wallet() {
  const { nodeUrl } = useOutletContext();
  const { wallet, selected, wallets, setWallets, setSelected, resetWallet, syncWalletAndNodeDetails } = useWallet();

  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletPass, setNewWalletPass] = useState('');

  const [importName, setImportName] = useState('');
  const [importPass, setImportPass] = useState('');
  const [importJson, setImportJson] = useState('');
  const [importBusy, setImportBusy] = useState(false);

  const [walletMsg, setWalletMsg] = useState(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const hasWallets = (wallets || []).length > 0;

  // Shared by create + import: refresh the list, select the wallet, load its balance.
  async function activateWallet(name) {
    setWallets(listWallets() || []);
    setSelected(name);
    setAccountLoading(true);
    await syncWalletAndNodeDetails(name, nodeUrl);
    setAccountLoading(false);
  }

  const handleSelectChange = async (e) => {
    const target = e.target.value;
    setSelected(target);
    setAccountLoading(true);
    await syncWalletAndNodeDetails(target, nodeUrl);
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
      setNewWalletName('');
      setNewWalletPass('');
      setWalletMsg({ kind: 'success', text: `Wallet "${created.name}" created. Export a backup so you can restore it later.` });
      await activateWallet(created.name);
    } catch (err) {
      setWalletMsg({ kind: 'error', text: err.message });
    }
  }

  async function handleKeystoreFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setImportJson(text);
    // Prefill the wallet name from the file if the user hasn't typed one.
    if (!importName) {
      try {
        const parsed = JSON.parse(text);
        if (parsed?.name) setImportName(parsed.name);
      } catch { /* invalid JSON gets reported on submit */ }
    }
    e.target.value = ''; // allow re-selecting the same file
  }

  async function handleImportWallet(e) {
    e.preventDefault();
    if (!importJson || !importName || !importPass) {
      setWalletMsg({ kind: 'error', text: 'Keystore, wallet name and passphrase are all required.' });
      return;
    }
    setImportBusy(true);
    try {
      const restored = await importWallet(importName, importJson, importPass);
      setImportName('');
      setImportPass('');
      setImportJson('');
      setWalletMsg({ kind: 'success', text: `Wallet "${restored.name}" restored.` });
      await activateWallet(restored.name);
    } catch (err) {
      setWalletMsg({ kind: 'error', text: err.message });
    } finally {
      setImportBusy(false);
    }
  }

  function handleExport() {
    try {
      downloadJson(`${selected}.keystore.json`, exportWallet(selected));
      setWalletMsg({ kind: 'success', text: `Exported "${selected}". The file is encrypted, but you still need its passphrase to restore it.` });
    } catch (err) {
      setWalletMsg({ kind: 'error', text: err.message });
    }
  }

  async function handleDeleteSelected() {
    const name = selected;
    deleteWallet(name);
    setDeleteConfirm('');
    const remaining = listWallets() || [];
    setWallets(remaining);
    if (remaining.length > 0) {
      await activateWallet(remaining[0]);
    } else {
      resetWallet();
    }
    setWalletMsg({ kind: 'success', text: `Wallet "${name}" removed from this browser.` });
  }

  function handleDeleteAll() {
    const count = deleteAllWallets();
    setDeleteConfirm('');
    setWallets([]);
    resetWallet();
    setWalletMsg({ kind: 'success', text: `Removed ${count} wallet${count === 1 ? '' : 's'} from this browser.` });
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

  const stat = (v) => (accountLoading ? '…' : v !== undefined ? v : '—');

  const createForm = (
    <form className="tx-form" onSubmit={handleCreateWallet}>
      <label>
        Wallet name
        <input value={newWalletName} onChange={(e) => setNewWalletName(e.target.value)} placeholder="alice" />
      </label>
      <label>
        Passphrase
        <input type="password" value={newWalletPass} onChange={(e) => setNewWalletPass(e.target.value)} placeholder="••••••••" />
      </label>
      <button type="submit" className="btn-secondary">Create wallet</button>
    </form>
  );

  const importForm = (
    <form className="tx-form" onSubmit={handleImportWallet}>
      <label>
        Keystore file
        <input type="file" accept=".json,application/json" onChange={handleKeystoreFile} />
      </label>
      <label>
        …or paste keystore JSON
        <textarea
          rows={4}
          value={importJson}
          onChange={(e) => setImportJson(e.target.value)}
          placeholder='{"version":1,"address":"0x…","publicKey":"…","encryptedPrivateKey":{…}}'
          spellCheck={false}
        />
      </label>
      <label>
        Wallet name
        <input value={importName} onChange={(e) => setImportName(e.target.value)} placeholder="alice" />
      </label>
      <label>
        Passphrase
        <input type="password" value={importPass} onChange={(e) => setImportPass(e.target.value)} placeholder="the passphrase used when the wallet was created" />
      </label>
      <button type="submit" className="btn-secondary" disabled={importBusy}>
        {importBusy ? 'Restoring…' : 'Restore wallet'}
      </button>
    </form>
  );

  return (
    <section className="panel panel-wide">
      <h2>Wallet</h2>

      {hasWallets && (
        <>
          <label className="wallet-select-label">
            Active wallet
            <select value={selected || ""} onChange={handleSelectChange}>
              {wallets.map((w) => (
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
                  <span className="wallet-stat-value">{stat(wallet.balance)}</span>
                </div>
                <div className="wallet-stat">
                  <span className="wallet-stat-label">Nonce</span>
                  <span className="wallet-stat-value">{stat(wallet.nonce)}</span>
                </div>
                <div className="wallet-stat">
                  <span className="wallet-stat-label">Next nonce</span>
                  <span className="wallet-stat-value">{stat(wallet.nextNonce)}</span>
                </div>
              </div>

              <div className="wallet-actions">
                <button type="button" className="btn-secondary btn-small" onClick={triggerRefresh} disabled={accountLoading}>
                  {accountLoading ? 'Refreshing…' : 'Refresh'}
                </button>
                <button type="button" className="btn-secondary btn-small" onClick={handleExport}>
                  Export keystore
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {!hasWallets && (
        <p className="panel-note">No wallets in this browser yet — create a new one, or restore one from a keystore file.</p>
      )}

      <details className="wallet-create-details" open={!hasWallets}>
        <summary>{hasWallets ? 'Create another wallet' : 'Create a wallet'}</summary>
        {createForm}
      </details>

      <details className="wallet-create-details" open={!hasWallets}>
        <summary>Restore a wallet from keystore</summary>
        {importForm}
      </details>

      {hasWallets && (
        <details className="wallet-create-details wallet-danger">
          <summary>Danger zone</summary>
          <p className="panel-note">
            Removing a wallet deletes its encrypted key from this browser. Without an exported keystore
            it cannot be recovered, and any funds on it become unreachable. Export a backup first.
          </p>
          <label>
            Type DELETE to enable the buttons
            <input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" />
          </label>
          <div className="wallet-actions">
            <button type="button" className="btn-danger btn-small" disabled={deleteConfirm !== 'DELETE' || !selected} onClick={handleDeleteSelected}>
              Delete "{selected}"
            </button>
            <button type="button" className="btn-danger btn-small" disabled={deleteConfirm !== 'DELETE'} onClick={handleDeleteAll}>
              Remove all wallets
            </button>
          </div>
        </details>
      )}

      {walletMsg && <p className={`inline-message ${walletMsg.kind}`}>{walletMsg.text}</p>}
    </section>
  );
}

export default Wallet;