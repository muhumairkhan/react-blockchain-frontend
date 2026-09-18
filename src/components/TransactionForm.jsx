import React, { useState } from 'react';
import { api } from '../api';

export default function TransactionForm({ nodeUrl, refresh }) {
  const [form, setForm] = useState({ from: '', to: '', amount: '' });
  const [txMessage, setTxMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmitTx(e) {
    e.preventDefault();
    setTxMessage(null);

    const amount = Number(form.amount);
    if (!form.from || !form.to || !form.amount || Number.isNaN(amount)) {
      setTxMessage({ kind: 'error', text: 'from, to, and a numeric amount are required' });
      return;
    }

    setSubmitting(true);
    try {
      await api.submitTransaction(nodeUrl, { from: form.from, to: form.to, amount });
      setTxMessage({ kind: 'success', text: `Submitted: ${form.from} → ${form.to} (${amount})` });
      setForm({ from: '', to: '', amount: '' });
      refresh();
    } catch (err) {
      setTxMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Submit failed' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel panel-wide">
      <h2>Submit transaction</h2>
      <form className="tx-form" onSubmit={handleSubmitTx}>
        <label>
          From
          <input
            value={form.from}
            onChange={(e) => setForm({ ...form, from: e.target.value })}
            placeholder="alice"
          />
        </label>
        <label>
          To
          <input
            value={form.to}
            onChange={(e) => setForm({ ...form, to: e.target.value })}
            placeholder="bob"
          />
        </label>
        <label>
          Amount
          <input
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="10"
            inputMode="decimal"
          />
        </label>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send'}
        </button>
      </form>
      {txMessage && <p className={`inline-message ${txMessage.kind}`}>{txMessage.text}</p>}
    </section>
  );
}