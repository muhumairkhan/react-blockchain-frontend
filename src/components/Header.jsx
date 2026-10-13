import React from "react";

export default function Header({ connectionError }) {
  return (
    <header className="topbar">
      <div className="topbar-title">
        <span
          className="beacon"
          data-connected={connectionError ? "false" : "true"}
        />
        <h1>PoA Node Console</h1>
      </div>
    </header>
  );
}
