import React, { useState } from "react";
import { api } from "../api";
import { buildAndSignTransaction } from "../lib/transaction";
import { useWallet } from "./../app/context/WalletContext";

// The chain only accepts whole-number amounts (safe integers) greater than 0.
// The regex also rejects things Number() would quietly accept: "1e3", "0x10", "1.5", "-2".
function parseAmount(raw) {
  const str = String(raw).trim();
  if (str === "") return { empty: true, valid: false, value: NaN };
  if (!/^\d+$/.test(str)) return { empty: false, valid: false, value: NaN };
  const value = Number(str);
  if (!Number.isSafeInteger(value) || value <= 0)
    return { empty: false, valid: false, value: NaN };
  return { empty: false, valid: true, value };
}

export default function TransactionForm({ nodeUrl, refresh }) {
  // Pull the pre-loaded global wallet data and state flag from your Context layer
  const { selected, wallet, isLoaded, syncWalletAndNodeDetails } = useWallet();

  const [form, setForm] = useState({ to: "", amount: "" });
  const [passphrase, setPassphrase] = useState("");
  const [txMessage, setTxMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Prevent UI rendering race conditions if Context initialization hasn't finished reading storage
  if (!isLoaded) {
    return (
      <section className="panel panel-wide">
        <p className="panel-note">Resolving active wallet parameters...</p>
      </section>
    );
  }

  function refreshWallet() {
    syncWalletAndNodeDetails(selected, nodeUrl);
  }

  async function handleSubmitTx(e) {
    e.preventDefault();
    setTxMessage(null);

    // Structural validation checks
    if (!wallet || !wallet.address || !form.to || !form.amount.trim()) {
      setTxMessage({
        kind: "error",
        text: 'Please ensure an active wallet is loaded, and fill in "To" and "Amount" fields.',
      });
      return;
    }

    const parsed = parseAmount(form.amount);
    if (!parsed.valid) {
      setTxMessage({
        kind: "error",
        text: "Amount must be a whole number greater than 0 (no decimals).",
      });
      return;
    }
    const sendAmount = parsed.value;

    // Proactive Balance validation guard clause
    const currentBalance = Number(wallet.balance);
    if (!Number.isNaN(currentBalance) && sendAmount > currentBalance) {
      setTxMessage({
        kind: "error",
        text: `Insufficient funds. You are trying to send ${sendAmount}, but this wallet only has ${currentBalance} available.`,
      });
      return;
    }

    setSubmitting(true);

    try {
      // Fetch the absolute latest live nonce directly right before signing to prevent execution collisions
      const account = await api.getAccount(nodeUrl, wallet.address);

      const tx = await buildAndSignTransaction({
        walletName: wallet.name,
        passphrase,
        publicKey: wallet.publicKey,
        from: wallet.address,
        to: form.to,
        amount: sendAmount,
        nonce: account?.nextNonce ?? wallet.nextNonce ?? 0,
      });

      await api.submitTransaction(nodeUrl, tx);

      setTxMessage({
        kind: "success",
        text: `Submitted: ${wallet.address} → ${form.to} (${sendAmount})`,
      });
      setForm({ to: "", amount: "" });
      setPassphrase("");

      // update wallet details
      syncWalletAndNodeDetails(selected, nodeUrl);

      // Call parent refresh layout routines if supplied
      if (refresh) refresh();
    } catch (err) {
      setTxMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Submit failed",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Pre-calculate visual states for real-time warning indicators
  const availableBalance = wallet?.balance !== undefined ? wallet.balance : "—";
  const parsedBalance = Number(wallet?.balance);
  const parsedAmount = parseAmount(form.amount);
  const isInvalidAmount = !parsedAmount.empty && !parsedAmount.valid;
  const isOverspending =
    parsedAmount.valid &&
    !Number.isNaN(parsedBalance) &&
    parsedAmount.value > parsedBalance;

  return (
    <section className="panel panel-wide">
      <h2>Submit transaction</h2>

      {/* Informative Active Wallet Summary Module */}
      {wallet && wallet.address ? (
        <div
          className="wallet-summary-banner"
          style={{ marginBottom: "1.5rem", padding: "1px" }}
        >
          <p className="panel-note">
            <strong>Active Sender:</strong>{" "}
            <code className="mono-value">{wallet.address}</code>
          </p>
          <p className={`panel-note ${isOverspending ? "text-danger" : ""}`}>
            <strong>Available Balance:</strong>{" "}
            <span className="mono-value">{availableBalance}</span>
            <span> | </span>
            <span
              style={{ cursor: "pointer", textDecoration: "underline" }}
              onClick={refreshWallet}
            >
              Refresh
            </span>
            {isOverspending && (
              <span
                style={{
                  color: "red",
                  marginLeft: "10px",
                  fontSize: "0.9em",
                  fontWeight: "bold",
                }}
              >
                ⚠️ Exceeds Available Funds
              </span>
            )}
          </p>
        </div>
      ) : (
        <p className="panel-note text-warning">
          ⚠️ No wallet active. Create or select a wallet first.
        </p>
      )}

      <form className="tx-form" onSubmit={handleSubmitTx}>
        <label>
          To
          <input
            value={form.to}
            onChange={(e) => setForm({ ...form, to: e.target.value })}
            placeholder="0x..."
            disabled={!wallet?.address || submitting}
          />
        </label>

        <label>
          Amount
          <input
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            inputMode="numeric"
            placeholder="0"
            disabled={!wallet?.address || submitting}
            style={
              isOverspending || isInvalidAmount
                ? { borderColor: "red", backgroundColor: "#fff5f5" }
                : {}
            }
          />
          {isInvalidAmount && (
            <small style={{ color: "red" }}>
              Whole numbers only, greater than 0.
            </small>
          )}
        </label>

        <label>
          Passphrase
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Wallet decryption passphrase"
            disabled={!wallet?.address || submitting}
          />
        </label>

        <button
          type="submit"
          className="btn-primary"
          disabled={
            submitting || !wallet?.address || isOverspending || isInvalidAmount
          }
        >
          {submitting
            ? "Signing & sending…"
            : isInvalidAmount
              ? "Invalid Amount"
              : isOverspending
                ? "Insufficient Funds"
                : "Send"}
        </button>
      </form>

      {txMessage && (
        <p className={`inline-message ${txMessage.kind}`}>{txMessage.text}</p>
      )}
    </section>
  );
}
