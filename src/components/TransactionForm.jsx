import React, { useState } from 'react';
import { api } from '../api';
import { buildAndSignTransaction } from '../lib/transaction';
import { useWallet } from "./../app/context/WalletContext";

export default function TransactionForm({ nodeUrl, refresh }) {
  // Pull the pre-loaded global wallet data and state flag from your Context layer
  const { selected, wallet, isLoaded, syncWalletAndNodeDetails } = useWallet();

  const [form, setForm] = useState({ to: '', amount: '' });
  const [passphrase, setPassphrase] = useState('');
  const [txMessage, setTxMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Prevent UI rendering race conditions if Context initialization hasn't finished reading storage
  if (!isLoaded) {
    return (
      <section className="panel panel-wide">
        <p className="panel-note">Resolving active wallet parameters...</p>
      </section>
    );
  }

  function refreshWallet() {
    syncWalletAndNodeDetails(selected, nodeUrl)
  }

  async function handleSubmitTx(e) {
    e.preventDefault();
    setTxMessage(null);

    const sendAmount = Number(form.amount);
    
    // Structural validation checks
    if (!wallet || !wallet.address || !form.to || !form.amount || Number.isNaN(sendAmount)) {
      setTxMessage({ kind: 'error', text: 'Please ensure an active wallet is loaded, and fill in "To" and "Amount" fields.' });
      return;
    }

    if (sendAmount <= 0) {
      setTxMessage({ kind: 'error', text: 'Transaction amount must be greater than 0.' });
      return;
    }

    // Proactive Balance validation guard clause
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
      // Fetch the absolute latest live nonce directly right before signing to prevent execution collisions
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

      // update wallet details
      syncWalletAndNodeDetails(selected, nodeUrl);
      
      // Call parent refresh layout routines if supplied
      if (refresh) refresh();
    } catch (err) {
      setTxMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Submit failed' });
    } finally {

      setSubmitting(false);
    }
  }

  // Pre-calculate visual states for real-time warning indicators
  const availableBalance = wallet?.balance !== undefined ? wallet.balance : '—';
  const parsedBalance = Number(wallet?.balance);
  const parsedAmount = Number(form.amount);
  const isOverspending = !Number.isNaN(parsedBalance) && !Number.isNaN(parsedAmount) && parsedAmount > parsedBalance;

  return (
    <section className="panel panel-wide">
      <h2>Submit transaction</h2>
      
      {/* Informative Active Wallet Summary Module */}
      {wallet && wallet.address ? (
        <div className="wallet-summary-banner" style={{ marginBottom: '1.5rem', padding: '1px' }}>
          <p className="panel-note">
            <strong>Active Sender:</strong> <code className="mono-value">{wallet.address}</code>
          </p>
          <p className={`panel-note ${isOverspending ? 'text-danger' : ''}`}>
            <strong>Available Balance:</strong> <span className="mono-value">{availableBalance}</span>
            <span> | </span>
            <span 
              style={{ cursor: 'pointer', textDecoration: 'underline' }} 
              onClick={refreshWallet}
            >
              Refresh
            </span>
            {isOverspending && (
              <span style={{ color: 'red', marginLeft: '10px', fontSize: '0.9em', fontWeight: 'bold' }}>
                ⚠️ Exceeds Available Funds
              </span>
            )}
          </p>
        </div>
      ) : (
        <p className="panel-note text-warning">⚠️ No wallet active. Create or select a wallet first.</p>
      )}

      <form className="tx-form" onSubmit={handleSubmitTx}>
        <label>To
          <input 
            value={form.to} 
            onChange={(e) => setForm({ ...form, to: e.target.value })} 
            placeholder="0x..." 
            disabled={!wallet?.address || submitting}
          />
        </label>
        
        <label>Amount
          <input 
            value={form.amount} 
            onChange={(e) => setForm({ ...form, amount: e.target.value })} 
            inputMode="decimal"
            placeholder="0.0"
            disabled={!wallet?.address || submitting}
            style={isOverspending ? { borderColor: 'red', backgroundColor: '#fff5f5' } : {}}
          />
        </label>
        
        <label>Passphrase
          <input 
            type="password" 
            value={passphrase} 
            onChange={(e) => setPassphrase(e.target.value)} 
            placeholder="Wallet decryption passphrase"
            disabled={!wallet?.address || submitting}
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
