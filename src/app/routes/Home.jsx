import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router';
import { api } from './../../api';
import StatusPanel from './../../components/StatusPanel';
import PeersPanel from './../../components/PeersPanel';
import TransactionForm from './../../components/TransactionForm';
import PendingTable from './../../components/PendingTable';
import BlocksTable from './../../components/BlocksTable';

const POLL_INTERVAL_MS = 2000;

export default function Home() {
  // nodeUrl + the connection-error setter now live in Layout, since the
  // header (and the node you're pointed at) is shared across routes.
  const { nodeUrl, setConnectionError } = useOutletContext();

  const [status, setStatus] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [pending, setPending] = useState([]);
  const [validators, setValidators] = useState([]);
  const [peers, setPeers] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [statusRes, blocksRes, pendingRes, validatorsRes, peersRes] = await Promise.all([
        api.getStatus(nodeUrl),
        api.getBlocks(nodeUrl),
        api.getPending(nodeUrl),
        api.getValidators(nodeUrl).catch(() => []),
        // A node running an older build has no /peers; don't let that break the page.
        api.getPeers(nodeUrl).catch(() => null),
      ]);
      setStatus(statusRes);
      setBlocks(blocksRes.slice().reverse());
      setPending(pendingRes);
      setValidators(validatorsRes);
      setPeers(peersRes);
      setConnectionError(null);
    } catch (err) {
      setConnectionError(err instanceof Error ? err.message : 'Could not reach node');
      setStatus(null);
      setPeers(null);
    }
  }, [nodeUrl, setConnectionError]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <main className="grid">
      <StatusPanel status={status} validators={validators} />
      <PeersPanel peers={peers} />
      <TransactionForm nodeUrl={nodeUrl} refresh={refresh} />
      <PendingTable pending={pending} />
      <BlocksTable blocks={blocks} />
    </main>
  );
}