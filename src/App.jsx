import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import Header from './components/Header';
import StatusPanel from './components/StatusPanel';
import TransactionForm from './components/TransactionForm';
import PendingTable from './components/PendingTable';
import BlocksTable from './components/BlocksTable';

const POLL_INTERVAL_MS = 1500;

export default function App() {
  const [nodeUrl, setNodeUrl] = useState('http://localhost:3000');
  const [urlInput, setUrlInput] = useState(nodeUrl);

  const [status, setStatus] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [pending, setPending] = useState([]);
  const [validators, setValidators] = useState([]);
  const [connectionError, setConnectionError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [statusRes, blocksRes, pendingRes, validatorsRes] = await Promise.all([
        api.getStatus(nodeUrl),
        api.getBlocks(nodeUrl),
        api.getPending(nodeUrl),
        api.getValidators(nodeUrl).catch(() => []),
      ]);
      setStatus(statusRes);
      setBlocks(blocksRes.slice().reverse());
      setPending(pendingRes);
      setValidators(validatorsRes);
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

  return (
    <div className="page">
      <Header
        nodeUrl={nodeUrl}
        urlInput={urlInput}
        setUrlInput={setUrlInput}
        setNodeUrl={setNodeUrl}
        connectionError={connectionError}
      />

      {connectionError && (
        <div className="banner banner-error">Can't reach {nodeUrl} — {connectionError}</div>
      )}

      <main className="grid">
        <StatusPanel status={status} validators={validators} />
        <TransactionForm nodeUrl={nodeUrl} refresh={refresh} />
        <PendingTable pending={pending} />
        <BlocksTable blocks={blocks} />
      </main>
    </div>
  );
}