import React from 'react';

//const QUICK_PORTS = [3000, 3001, 3002, 3003];

export default function Header({ nodeUrl, urlInput, setUrlInput, setNodeUrl, connectionError, validators }) {
  function handleConnect(e) {
    e.preventDefault();
    setNodeUrl(urlInput.replace(/\/+$/, ''));
  }

  return (
    <header className="topbar">
      <div className="topbar-title">
        <span className="beacon" data-connected={connectionError ? 'false' : 'true'} />
        <h1>PoA Node Console</h1>
      </div>

      <form className="connect-form" onSubmit={handleConnect}>
        <div className="quick-ports">
          {validators.map((validator) => {
            const node = validator.node;
            const url = `http://localhost:${node.apiPort}`;
            return (
              <button
                type="button"
                key={node.apiPort}
                className="quick-port"
                data-active={nodeUrl === url}
                onClick={() => {
                  setUrlInput(url);
                  setNodeUrl(url);
                }}
              >
                :{node.apiPort}
              </button>
            );
          })}
        </div>
        <input
          className="url-input"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          spellCheck={false}
        />
        <button type="submit" className="btn-secondary">
          Connect
        </button>
      </form>
    </header>
  );
}