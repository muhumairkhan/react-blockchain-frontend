let ws = null;
const pendingRequests = new Map();
const eventListeners = new Set();

// Initialize the single persistent connection
export function connectWS(wsUrl) {
  ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    // Context A: It's an async request reply from our RPC framework
    if (msg.id && pendingRequests.has(msg.id)) {
      const { resolve, reject } = pendingRequests.get(msg.id);
      pendingRequests.delete(msg.id);

      if (msg.status >= 200 && msg.status < 300) {
        resolve(msg.data);
      } else {
        reject(new Error(msg.data?.error || `Request failed with status ${msg.status}`));
      }
    } 
    // Context B: It's a true live event push from the blockchain network
    else if (msg.event) {
      eventListeners.forEach(callback => callback(msg.event, msg.data));
    }
  };

  ws.onclose = () => console.log('WS Connection dropped. Reconnecting...');
}

// Re-creates your `request` engine matching your existing exact API payload
function request(action, payload = {}) {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return reject(new Error('WebSocket is not connected'));
    }

    const id = Math.random().toString(36).substring(2, 9);
    pendingRequests.set(id, { resolve, reject });

    ws.send(JSON.stringify({ id, action, payload }));
  });
}

// Your updated API client object (dropping 'baseUrl' signatures as it lives natively inside the stream)
export const api = {
  getStatus: () => request('/status'),
  getBlocks: () => request('/blocks'),
  getPending: () => request('/pending'),
  getValidators: () => request('/validators'),
  getPeers: () => request('/peers'),
  getAccount: (address) => request('/accounts', { address }),
  
  submitTransaction: (tx) => request('/transactions', tx),
  proposeBlock: () => request('/propose'),

  // ✨ Added Bonus: Listen to live network events directly!
  subscribe: (callback) => {
    eventListeners.add(callback);
    return () => eventListeners.delete(callback); // Unsubscribe handler
  }
};
