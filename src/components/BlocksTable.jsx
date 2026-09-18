import React from 'react';
import { formatTime, short } from '../utils/formatters';

export default function BlocksTable({ blocks }) {
  return (
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
  );
}