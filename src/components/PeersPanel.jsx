import React from 'react';
import { formatTime } from '../utils/formatters';

// Shows who the selected node is connected to right now (peers.connected),
// plus any addresses it knows about but isn't currently connected to
// (peers.known minus connected) — handy for spotting a bootnode that's down.
//
// Expects the JSON from GET /peers:
//   { nodeId, p2pPort,
//     connected: [{ address, nodeId, direction: 'inbound' | 'outbound' }],
//     known:     [{ address, lastSeen, failures }] }
export default function PeersPanel({ peers }) {
  if (!peers) {
    return (
      <section className="panel">
        <h2>Peers</h2>
        <p className="empty">No peer data available.</p>
      </section>
    );
  }

  const connected = [...(peers.connected ?? [])].sort((a, b) =>
    String(a.address).localeCompare(String(b.address))
  );
  const connectedAddresses = new Set(connected.map((p) => p.address));

  const disconnected = (peers.known ?? [])
    .filter((p) => !connectedAddresses.has(p.address))
    .sort((a, b) => a.address.localeCompare(b.address));

  return (
    <section className="panel">
      <h2>Peers ({connected.length} connected)</h2>

      <dl className="status-grid">
        <dt>Node ID</dt>
        <dd className="mono-value">{peers.nodeId ? peers.nodeId.slice(0, 8) : '—'}</dd>
        <dt>P2P port</dt>
        <dd className="mono-value">{peers.p2pPort ?? '—'}</dd>
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
                <td className="mono-value">{p.nodeId ? p.nodeId.slice(0, 8) : '—'}</td>
                <td>
                  <span className="tag" data-role={p.direction}>{p.direction}</span>
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
                  <td>{p.lastSeen > 0 ? 'unreachable' : 'unverified'}</td>
                  <td>{p.failures}</td>
                  <td>{p.lastSeen > 0 ? formatTime(p.lastSeen) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}