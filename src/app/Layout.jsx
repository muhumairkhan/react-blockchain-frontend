import { useCallback,useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router";
import Header from "./../components/Header";
import { WalletProvider } from "./context/WalletContext";
import { api } from './../api';

// Sits above both routes in router.jsx
// Header instance (and the nodeUrl it points at) instead of each keeping
// their own copy.
export default function Layout() {
  const [nodeUrl, setNodeUrl] = useState('http://localhost:3000');
  const [urlInput, setUrlInput] = useState(nodeUrl);
  const [connectionError, setConnectionError] = useState(null);

  const [validators, setValidators] = useState([]);

  const onload = useCallback(async () => {
      
        const [validatorsRes] = await Promise.all([
          api.getValidators(nodeUrl).catch(() => []),
        ]);
        setValidators(validatorsRes);
    }, [nodeUrl, setConnectionError]);

    useEffect(function(){
      onload();
    },[]);

  return (
    <div className="page">
      <Header
        nodeUrl={nodeUrl}
        urlInput={urlInput}
        setUrlInput={setUrlInput}
        setNodeUrl={setNodeUrl}
        connectionError={connectionError}
        validators={validators}
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