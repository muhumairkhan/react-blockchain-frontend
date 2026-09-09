# PoA Node Console (frontend)

A small, temporary control panel for the PoA blockchain node repo. It talks
directly to a node's REST API (`api.ts` in the core repo) to:

- show live status (chain length, latest block, pending tx count, whether
  this node is a validator)
- list pending transactions and recent blocks
- submit a new transaction
- **manually trigger `/propose` on whichever node you're connected to** —
  useful for testing without waiting for round-robin timing. This is called
  out in the UI as a temporary override.

It is a separate repo/process from the blockchain core — it just makes
`fetch` calls to a node's `API_PORT`. No build step or dependency is shared
with the core repo.

Plain JavaScript on purpose: this UI will go through a lot of quick
iterations, so there's no TypeScript/type-checking step here. The core repo
stays strict TypeScript since correctness there actually matters (consensus,
signatures, chain validation).

## Running

```bash
npm install
npm run dev
```

Opens on `http://localhost:5173`. Use the port shortcuts (`:3000`, `:3001`,
`:3002`, `:3003`) or type any node URL to switch which node you're talking
to — each node's API runs on its own port, so this lets you point the same
frontend at any node in the network.

Status/pending/blocks poll every 3 seconds while connected.
