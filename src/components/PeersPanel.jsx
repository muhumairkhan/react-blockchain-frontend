// Shows who the selected node is connected to right now (peers.connected),
// plus any addresses it knows about but isn't currently connected to
// (peers.known minus connected) — handy for spotting a bootnode that's down.
//
// Expects the JSON from GET /peers:
//   { nodeId, p2pPort,
//     connected: [{ address, nodeId, direction: 'inbound' | 'outbound' }],
//     known:     [{ address, lastSeen, failures }] }
import React, { useEffect, useState } from "react";
import { formatTime } from "../utils/formatters";

const FALLBACK_URL = import.meta.env?.VITE_NODE_URL || "http://localhost:3099";

// http://host:3099 -> ws://host:<apiPort>
function validatorWsUrl(nodeUrl, apiPort) {
  try {
    const u = new URL(nodeUrl || FALLBACK_URL);
    const proto =
      u.protocol === "https:" || u.protocol === "wss:" ? "wss:" : "ws:";
    return `${proto}//${u.hostname}:${apiPort}`;
  } catch {
    return null;
  }
}

// Live peers of a node via its WebSocket API. url=null stays idle.
function useNodePeers(url) {
  const [state, setState] = useState({
    peers: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!url) {
      setState({ peers: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState({ peers: null, loading: true, error: null });

    let ws;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      setState({ peers: null, loading: false, error: err.message });
      return;
    }

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          id: 1,
          method: "subscribe",
          params: { topics: ["peers"] },
        }),
      );
    };
    ws.onmessage = (event) => {
      if (cancelled) return;
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.event === "peers") {
        setState({ peers: msg.data, loading: false, error: null });
      } else if (msg.error) {
        setState((s) => ({ ...s, loading: false, error: msg.error.message }));
      }
    };
    ws.onerror = () => {
      if (!cancelled)
        setState((s) => ({ ...s, loading: false, error: "node unreachable" }));
    };
    ws.onclose = () => {
      if (!cancelled) {
        setState((s) =>
          s.peers
            ? s
            : { ...s, loading: false, error: s.error ?? "connection closed" },
        );
      }
    };

    return () => {
      cancelled = true;
      ws.close();
    };
  }, [url]);

  return state;
}

const tabStyle = (active) => ({
  padding: "4px 10px",
  fontSize: "0.8rem",
  borderRadius: 6,
  cursor: "pointer",
  border: "1px solid rgba(255,255,255,0.12)",
  background: active ? "var(--accent)" : "transparent",
  color: active ? "#111" : "inherit",
  fontWeight: active ? 600 : 400,
});

export default function PeersPanel({
  peers: fullNodePeers,
  validators = [],
  nodeUrl,
}) {
  const [selected, setSelected] = useState("full"); // 'full' or a validatorIndex

  const validatorTabs = [...validators]
    .filter((v) => v?.node?.apiPort)
    .sort((a, b) => a.node.validatorIndex - b.node.validatorIndex);

  const selectedValidator =
    selected === "full"
      ? null
      : validatorTabs.find((v) => v.node.validatorIndex === selected);
  const effectiveSelected =
    selected !== "full" && !selectedValidator ? "full" : selected;
  const isFull = effectiveSelected === "full";

  const wsUrl = selectedValidator
    ? validatorWsUrl(nodeUrl, selectedValidator.node.apiPort)
    : null;
  const remote = useNodePeers(wsUrl);
  const peers = isFull ? fullNodePeers : remote.peers;

  const tabs = (
    <div
      style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}
    >
      <button
        type="button"
        style={tabStyle(isFull)}
        onClick={() => setSelected("full")}
      >
        Full node
      </button>
      {validatorTabs.map((v) => (
        <button
          key={v.node.validatorIndex}
          type="button"
          style={tabStyle(effectiveSelected === v.node.validatorIndex)}
          onClick={() => setSelected(v.node.validatorIndex)}
          title={`API :${v.node.apiPort}  P2P :${v.node.p2pPort}`}
        >
          {v.name ?? `validator-${v.node.validatorIndex}`}
        </button>
      ))}
    </div>
  );

  if (!isFull && (!peers || remote.error)) {
    return (
      <section className="panel">
        <h2>Peers</h2>
        {tabs}
        <p className="empty">
          {remote.error && !peers
            ? `Could not load peers from this node (${remote.error}).`
            : "Connecting…"}
        </p>
      </section>
    );
  }

  if (!peers) {
    return (
      <section className="panel">
        <h2>Peers</h2>
        {tabs}
        <p className="empty">No peer data available.</p>
      </section>
    );
  }

  const connected = [...(peers.connected ?? [])].sort((a, b) =>
    String(a.address).localeCompare(String(b.address)),
  );
  const connectedAddresses = new Set(connected.map((p) => p.address));
  const disconnected = (peers.known ?? [])
    .filter((p) => !connectedAddresses.has(p.address))
    .sort((a, b) => a.address.localeCompare(b.address));

  return (
    <section className="panel">
      <h2>Peers ({connected.length} connected)</h2>
      {tabs}

      <dl className="status-grid">
        <dt>Node ID</dt>
        <dd className="mono-value">
          {peers.nodeId ? peers.nodeId.slice(0, 8) : "—"}
        </dd>
        <dt>P2P port</dt>
        <dd className="mono-value">{peers.p2pPort ?? "—"}</dd>
      </dl>

      {connected.length === 0 ? (
        <p className="empty">Not connected to any peers.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Address</th>
              <th>Node</th>
              <th>Direction</th>
            </tr>
          </thead>
          <tbody>
            {connected.map((p) => (
              <tr key={`${p.nodeId}-${p.address}`}>
                <td className="mono-value">{p.address}</td>
                <td className="mono-value">
                  {p.nodeId ? p.nodeId.slice(0, 8) : "—"}
                </td>
                <td>
                  <span className="tag" data-role={p.direction}>
                    {p.direction}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {disconnected.length > 0 && (
        <>
          <h3>Known, not connected ({disconnected.length})</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Address</th>
                <th>State</th>
                <th>Failed dials</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {disconnected.map((p) => (
                <tr key={p.address}>
                  <td className="mono-value">{p.address}</td>
                  <td>{p.lastSeen > 0 ? "unreachable" : "unverified"}</td>
                  <td>{p.failures}</td>
                  <td>{p.lastSeen > 0 ? formatTime(p.lastSeen) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
