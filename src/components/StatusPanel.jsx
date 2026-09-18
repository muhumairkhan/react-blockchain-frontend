import React, { useEffect, useRef, useState } from 'react';
import { short } from '../utils/formatters';

export default function StatusPanel({ status, validators }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [phase, setPhase] = useState('waiting'); // 'waiting' | 'open'
  const clockOffsetRef = useRef(0); // serverTime - clientTime

  // Re-sync against the node's clock whenever fresh status arrives
  useEffect(() => {
    if (status?.serverTime) {
      clockOffsetRef.current = status.serverTime - Date.now();
    }
  }, [status?.serverTime]);

  useEffect(() => {
    if (!status?.slotDurationMs) return;

    const tick = () => {
      const serverNow = Date.now() + clockOffsetRef.current;
      const intoSlot = serverNow % status.slotDurationMs;
      setTimeLeft(Math.ceil((status.slotDurationMs - intoSlot) / 1000));
      setPhase(intoSlot < status.slotWaitMs ? 'waiting' : 'open');
    };

    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [status?.slotDurationMs, status?.slotWaitMs]);

  if (!status) {
    return (
      <section className="panel">
        <h2>Status</h2>
        <p className="empty">No status available.</p>
      </section>
    );
  }

  const currentProposer = validators[status.currentProposerIndex] ?? null;
  const nextProposer = validators[status.nextProposerIndex] ?? null;

  return (
    <section className="panel">
      <h2>Node Status</h2>
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
        <dt>Current slot</dt>
        <dd className="mono-value">
          #{status.currentSlot} ({phase === 'waiting' ? 'wait period' : 'open to propose'})
        </dd>
        <dt>Next slot in</dt>
        <dd className="mono-value" style={{ color: 'var(--accent)', fontWeight: 'bold' }}>
          {timeLeft}s
        </dd>
        <dt>Current Proposer</dt>
        <dd className="mono-value">
          {currentProposer ? short(currentProposer) : 'Calculating...'}
        </dd>
        <dt>Next Proposer</dt>
        <dd className="mono-value">
          {nextProposer ? short(nextProposer) : 'Calculating...'}
        </dd>
      </dl>
    </section>
  );
}