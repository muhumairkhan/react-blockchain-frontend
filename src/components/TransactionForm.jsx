import React, { useState } from 'react';
import { api } from '../api';
import { buildAndSignTransaction } from '../lib/transaction';
import { useWallet } from "./../app/context/WalletContext";

export default function TransactionForm({ nodeUrl, refresh }) {
  // 1. Pull the active, synchronized wallet from global Context
  const { wallet } = useWallet();
  console.log(wallet)

  const [form, setForm] = useState({ to: '', amount: '' });
  const [passphrase, setPassphrase] = useState('');
  const [txMessage, setTxMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmitTx(e) {
    e.preventDefault();
    setTxMessage(null);

    const sendAmount = Number(form.amount);
    
    // 2. Structural valid state checks
    if (!wallet || !wallet.address || !form.to || !form.amount || Number.isNaN(sendAmount)) {
      setTxMessage({ kind: 'error', text: 'Please ensure an active wallet is loaded, and fill in "To" and "Amount" fields.' });
      return;
    }

    if (sendAmount <= 0) {
      setTxMessage({ kind: 'error', text: 'Transaction amount must be greater than 0.' });
      return;
    }

    // 3. Balance validation guard clause
    const currentBalance = Number(wallet.balance);
    if (!Number.isNaN(currentBalance) && sendAmount > currentBalance) {
      setTxMessage({ 
        kind: 'error', 
        text: `Insufficient funds. You are trying to send ${sendAmount}, but this wallet only has ${currentBalance} available.` 
      });
      return;
    }

    setSubmitting(true);
    try {
      // 4. Fetch the latest live nonce directly right before signing to prevent race conditions
      const account = await api.getAccount(nodeUrl, wallet.address);
      
      const tx = await buildAndSignTransaction({
        walletName: wallet.name,
        passphrase,
        publicKey: wallet.publicKey,
        from: wallet.address,
        to: form.to,
        amount: sendAmount,
        nonce: account?.nextNonce ?? wallet.nextNonce ?? 0,
      });

      await api.submitTransaction(nodeUrl, tx);
      
      setTxMessage({ kind: 'success', text: `Submitted: ${wallet.address} → ${form.to} (${sendAmount})` });
      setForm({ to: '', amount: '' });
      setPassphrase('');
      
      // Call parent refresh triggers if supplied
      if (refresh) refresh();
    } catch (err) {
      setTxMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Submit failed' });
    } finally {
      setSubmitting(false);
    }
  }

  // Convert context properties to clean numbers for safe logic fallbacks
  const availableBalance = wallet?.balance !== undefined ? wallet.balance : '—';
  const parsedBalance = Number(wallet?.balance);
  const parsedAmount = Number(form.amount);
  const isOverspending = !Number.isNaN(parsedBalance) && !Number.isNaN(parsedAmount) && parsedAmount > parsedBalance;

  return (
    <section className="panel panel-wide">
      <h2>Submit transaction</h2>
      
      {/* 5. UI enhancement: Informative active user account meta card layout */}
      {wallet && wallet.address ? (
        <div className="wallet-summary-banner" style={{ marginBottom: '1.5rem', padding: '1px' }}>
          <p className="panel-note">
            <strong>Active Sender:</strong> <code className="mono-value">{wallet.address}</code>
          </p>
          <p className={`panel-note ${isOverspending ? 'text-danger' : ''}`}>
            <strong>Available Balance:</strong> <span className="mono-value">{availableBalance}</span>
            {isOverspending && <span style={{ color: 'red', marginLeft: '10px', fontSize: '0.9em' }}>⚠️ Exceeds Available Funds</span>}
          </p>
        </div>
      ) : (
        <p className="panel-note text-warning">⚠️ No wallet active. Select or connect a wallet first.</p>
      )}

      <form className="tx-form" onSubmit={handleSubmitTx}>
        <label>To
          <input 
            value={form.to} 
            onChange={(e) => setForm({ ...form, to: e.target.value })} 
            placeholder="0x..." 
            disabled={!wallet?.address}
          />
        </label>
        
        <label>Amount
          <input 
            value={form.amount} 
            onChange={(e) => setForm({ ...form, amount: e.target.value })} 
            inputMode="decimal"
            placeholder="0.0"
            disabled={!wallet?.address}
            className={isOverspending ? 'input-error' : ''}
          />
        </label>
        
        <label>Passphrase
          <input 
            type="password" 
            value={passphrase} 
            onChange={(e) => setPassphrase(e.target.value)} 
            placeholder="Wallet decryption passphrase"
            disabled={!wallet?.address}
          />
        </label>
        
        <button 
          type="submit" 
          className="btn-primary" 
          disabled={submitting || !wallet?.address || isOverspending}
        >
          {submitting ? 'Signing & sending…' : isOverspending ? 'Insufficient Funds' : 'Send'}
        </button>
      </form>
      
      {txMessage && <p className={`inline-message ${txMessage.kind}`}>{txMessage.text}</p>}
    </section>
  );
}
