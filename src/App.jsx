import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

const QUICK_PORTS = [3000, 3001, 3002, 3003];
const POLL_INTERVAL_MS = 3000;

/** PEM keys and hashes are long — show enough to distinguish, not the whole blob. */
function short(value, headChars = 10, tailChars = 6) {
  const clean = value.replace(/-----(BEGIN|END) PUBLIC KEY-----/g, '').replace(/\s+/g, '');
  if (clean.length <= headChars + tailChars) return clean;
  return `${clean.slice(0, headChars)}…${clean.slice(-tailChars)}`;
}

function formatTime(ts) {
  if (!ts) return 'genesis';
  return new Date(ts).toLocaleTimeString();
}

export default function App() {
  const [nodeUrl, setNodeUrl] = useState('http://localhost:3000');
  const [urlInput, setUrlInput] = useState(nodeUrl);

  const [status, setStatus] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [pending, setPending] = useState([]);
  const [connectionError, setConnectionError] = useState(null);

  const [form, setForm] = useState({ from: '', to: '', amount: '' });
  const [txMessage, setTxMessage] = useState(null);
  const [proposeMessage, setProposeMessage] = useState(null);
  const [proposing, setProposing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [statusRes, blocksRes, pendingRes] = await Promise.all([
        api.getStatus(nodeUrl),
        api.getBlocks(nodeUrl),
        api.getPending(nodeUrl),
      ]);
      setStatus(statusRes);
      setBlocks(blocksRes.slice().reverse());
      setPending(pendingRes);
      setConnectionError(null);
    } catch (err) {
      setConnectionError(err instanceof Error ? err.message : 'Could not reach node');
      setStatus(null);
    }
  }, [nodeUrl]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  function handleConnect(e) {
    e.preventDefault();
    setNodeUrl(urlInput.replace(/\/+$/, ''));
  }

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

  async function handlePropose() {
    setProposeMessage(null);
    setProposing(true);
    try {
      const result = await api.proposeBlock(nodeUrl);
      setProposeMessage({ kind: 'success', text: `Block #${result.block.index} accepted` });
      refresh();
    } catch (err) {
      setProposeMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Propose failed' });
    } finally {
      setProposing(false);
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-title">
          <span className="beacon" data-connected={connectionError ? 'false' : 'true'} />
          <h1>PoA Node Console</h1>
        </div>

        <form className="connect-form" onSubmit={handleConnect}>
          <div className="quick-ports">
            {QUICK_PORTS.map((port) => {
              const url = `http://localhost:${port}`;
              return (
                <button
                  type="button"
                  key={port}
                  className="quick-port"
                  data-active={nodeUrl === url}
                  onClick={() => {
                    setUrlInput(url);
                    setNodeUrl(url);
                  }}
                >
                  :{port}
                </button>
              );
            })}
          </div>
          <input
            className="url-input"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            spellCheck={false}
          />
          <button type="submit" className="btn-secondary">
            Connect
          </button>
        </form>
      </header>

      {connectionError && (
        <div className="banner banner-error">Can't reach {nodeUrl} — {connectionError}</div>
      )}

      <main className="grid">
        <section className="panel">
          <h2>Status</h2>
          {status ? (
            <dl className="status-grid">
              <dt>Chain length</dt>
              <dd>{status.chainLength}</dd>
              <dt>Latest block</dt>
              <dd>#{status.latestBlockIndex}</dd>
              <dt>Latest hash</dt>
              <dd className="mono-value">{short(status.latestBlockHash)}</dd>
              <dt>Pending tx</dt>
              <dd>{status.pendingTransactions}</dd>
              <dt>This node</dt>
              <dd>
                <span className="tag" data-role={status.isValidator ? 'validator' : 'observer'}>
                  {status.isValidator ? 'validator' : 'observer'}
                </span>
              </dd>
            </dl>
          ) : (
            <p className="empty">No status yet.</p>
          )}
        </section>

        <section className="panel">
          <h2>Propose next block</h2>
          <p className="panel-note">
            Manual override for testing — normally a validator proposes automatically on its turn.
            This calls whichever node you're connected to.
          </p>
          <button className="btn-primary" onClick={handlePropose} disabled={proposing}>
            {proposing ? 'Proposing…' : 'Propose block'}
          </button>
          {proposeMessage && (
            <p className={`inline-message ${proposeMessage.kind}`}>{proposeMessage.text}</p>
          )}
        </section>

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

        <section className="panel panel-wide">
          <h2>Pending ({pending.length})</h2>
          {pending.length === 0 ? (
            <p className="empty">Mempool is empty.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>From</th>
                  <th>To</th>
                  <th>Amount</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((tx, i) => (
                  <tr key={`${tx.from}-${tx.to}-${tx.timestamp}-${i}`}>
                    <td>{tx.from}</td>
                    <td>{tx.to}</td>
                    <td>{tx.amount}</td>
                    <td>{formatTime(tx.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel panel-wide">
          <h2>Blocks ({blocks.length})</h2>
          {blocks.length === 0 ? (
            <p className="empty">No blocks yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Hash</th>
                  <th>Validator</th>
                  <th>Tx count</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((block) => (
                  <tr key={block.index}>
                    <td>{block.index}</td>
                    <td className="mono-value">{short(block.hash)}</td>
                    <td className="mono-value">
                      {block.index === 0 ? 'genesis' : short(block.validatorPublicKey)}
                    </td>
                    <td>{block.transactions.length}</td>
                    <td>{formatTime(block.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}
