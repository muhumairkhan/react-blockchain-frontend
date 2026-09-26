import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { listWallets, loadWalletMeta, createWallet } from '../lib/wallet';
import { buildAndSignTransaction } from '../lib/transaction';

export default function TransactionForm({ nodeUrl, refresh }) {
  const [wallets, setWallets] = useState(listWallets());
  const [selected, setSelected] = useState(wallets[0] ?? '');
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletPass, setNewWalletPass] = useState('');

  const [form, setForm] = useState({ to: '', amount: '' });
  const [passphrase, setPassphrase] = useState('');
  const [txMessage, setTxMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
      setTxMessage({ kind: 'error', text: err.message });
    }
  }

  async function handleSubmitTx(e) {
    e.preventDefault();
    setTxMessage(null);

    const amount = Number(form.amount);
    if (!wallet || !form.to || !form.amount || Number.isNaN(amount)) {
      setTxMessage({ kind: 'error', text: 'select a wallet, and fill in "to" and amount' });
      return;
    }

    setSubmitting(true);
    try {
      const account = await api.getAccount(nodeUrl, wallet.address);
      console.log(account);
      const tx = await buildAndSignTransaction({
        walletName: wallet.name,
        passphrase,
        publicKey: wallet.publicKey,
        from: wallet.address,
        to: form.to,
        amount,
        nonce: account.nextNonce,
      });
      await api.submitTransaction(nodeUrl, tx);
      setTxMessage({ kind: 'success', text: `Submitted: ${wallet.address} → ${form.to} (${amount})` });
      setForm({ to: '', amount: '' });
      setPassphrase('');
      refresh();
    } catch (err) {
      setTxMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Submit failed' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
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
      ) : (
        <>
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {wallets.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
          {wallet && <p className="panel-note mono-value">{wallet.address}</p>}
        </>
      )}

      <h2>Submit transaction</h2>
      <form className="tx-form" onSubmit={handleSubmitTx}>
        <label>To
          <input value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} placeholder="0x..." />
        </label>
        <label>Amount
          <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} inputMode="decimal" />
        </label>
        <label>Passphrase
          <input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
        </label>
        <button type="submit" className="btn-primary" disabled={submitting || !wallet}>
          {submitting ? 'Signing & sending…' : 'Send'}
        </button>
      </form>
      {txMessage && <p className={`inline-message ${txMessage.kind}`}>{txMessage.text}</p>}
    </section>
  );
}