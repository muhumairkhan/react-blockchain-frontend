import { useState } from "react";
import { NavLink, Outlet } from "react-router";
import Header from "./../components/Header";
import { WalletProvider } from "./context/WalletContext";

// Sits above both routes in router.jsx, so Home and Wallet share this one
// Header instance (and the nodeUrl it points at) instead of each keeping
// their own copy.
export default function Layout() {
  const [nodeUrl, setNodeUrl] = useState('http://localhost:3000');
  const [urlInput, setUrlInput] = useState(nodeUrl);
  const [connectionError, setConnectionError] = useState(null);

  return (
    <div className="page">
      <Header
        nodeUrl={nodeUrl}
        urlInput={urlInput}
        setUrlInput={setUrlInput}
        setNodeUrl={setNodeUrl}
        connectionError={connectionError}
      />

      <nav className="main-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Chain
        </NavLink>
        <NavLink to="/wallet" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Wallet
        </NavLink>
      </nav>

      {connectionError && (
        <div className="banner banner-error">Can't reach {nodeUrl} — {connectionError}</div>
      )}

      {/* Provider lives here (not in index.jsx) so it can receive nodeUrl */}
      <WalletProvider nodeUrl={nodeUrl}>
        <Outlet context={{ nodeUrl, setConnectionError }} />
      </WalletProvider>
    </div>
  );
}