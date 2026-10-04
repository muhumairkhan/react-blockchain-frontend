import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { api } from "./../../api";
import StatusPanel from "./../../components/StatusPanel";
import PeersPanel from "./../../components/PeersPanel";
import TransactionForm from "./../../components/TransactionForm";
import PendingTable from "./../../components/PendingTable";
import BlocksTable from "./../../components/BlocksTable";
export default function Home() {
  const { nodeUrl, setConnectionError } = useOutletContext();
  const [status, setStatus] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [pending, setPending] = useState([]);
  const [validators, setValidators] = useState([]);
  const [peers, setPeers] = useState(null);
  // Live data: the node pushes status / blocks / pending / peers over the // WebSocket whenever they change. No polling interval. useEffect(() => { const unsubscribe = api.subscribe( nodeUrl, { status: setStatus, blocks: (chain) => setBlocks(chain.slice().reverse()), pending: setPending, peers: setPeers, }, (connected, message) => { if (connected) { setConnectionError(null); } else { setConnectionError(message || 'Could not reach node'); setStatus(null); setPeers(null); } } ); return unsubscribe; }, [nodeUrl, setConnectionError]);
  // Validators don't change while running — fetch once per node. useEffect(() => { api.getValidators(nodeUrl).then(setValidators).catch(() => setValidators([])); }, [nodeUrl]);
  // Manual one-shot resync. Kept because TransactionForm calls it after // submitting; the server also pushes the new pending tx on its own. const refresh = useCallback(async () => { try { const [statusRes, blocksRes, pendingRes] = await Promise.all([ api.getStatus(nodeUrl), api.getBlocks(nodeUrl), api.getPending(nodeUrl), ]); setStatus(statusRes); setBlocks(blocksRes.slice().reverse()); setPending(pendingRes); } catch (err) { setConnectionError(err instanceof Error ? err.message : 'Could not reach node'); } }, [nodeUrl, setConnectionError]);
  return (
    <main className="grid">
      {" "}
      <StatusPanel status={status} validators={validators} />{" "}
      <PeersPanel peers={peers} />{" "}
      <TransactionForm nodeUrl={nodeUrl} refresh={refresh} />{" "}
      <PendingTable pending={pending} /> <BlocksTable blocks={blocks} />{" "}
    </main>
  );
}
