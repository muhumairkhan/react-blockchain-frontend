import React from 'react';
import { formatTime } from '../utils/formatters';

export default function PendingTable({ pending }) {
  return (
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
  );
}