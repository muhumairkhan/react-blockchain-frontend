import { useState } from "react";
import { NavLink, Outlet } from "react-router";
import Header from "./../components/Header";
import { WalletProvider } from "./context/WalletContext";

// The single endpoint the app talks to. In production this is the gateway
// (load balancer in front of full nodes); on localhost it's the full node.
const NODE_URL = import.meta.env.VITE_NODE_URL || "http://localhost:3099";

export default function Layout() {
  const [connectionError, setConnectionError] = useState(null);

  return (
    <div className="page">
      <Header connectionError={connectionError} />

      <nav className="main-nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
        >
          Chain
        </NavLink>
        <NavLink
          to="/wallet"
          className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
        >
          Wallet
        </NavLink>
      </nav>

      {connectionError && (
        <div className="banner banner-error">
          Can't reach the network — {connectionError}
        </div>
      )}

      <WalletProvider nodeUrl={NODE_URL}>
        <Outlet context={{ nodeUrl: NODE_URL, setConnectionError }} />
      </WalletProvider>
    </div>
  );
}
