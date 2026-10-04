// WebSocket client for the core node.
//
// Request/response methods keep the SAME signatures as the old REST client
// (api.getStatus(baseUrl), api.getAccount(baseUrl, address), ...), so existing
// callers like WalletContext and TransactionForm keep working unchanged.
// `baseUrl` may still be http://host:port — it is mapped to ws://host:port.
//
// New: api.subscribe(baseUrl, handlers, onConnection) for server push.

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_BACKOFF_MS = 10_000;
const IDLE_CLOSE_MS = 15_000; // close a connection nobody is using

const toWsUrl = (u) => u.trim().replace(/^http/i, "ws"); // http->ws, https->wss

class Connection {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.openPromise = null;
    this.nextId = 1;
    this.pending = new Map(); // id -> { resolve, reject, timer }
    this.handlers = new Set(); // { topics: {name: fn}, onConnection }
    this.retries = 0;
    this.reconnectTimer = null;
    this.idleTimer = null;
    this.closed = false;
  }

  // --- connection lifecycle -------------------------------------------------

  isOpen() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  ensureOpen() {
    if (this.isOpen()) return Promise.resolve();
    if (this.openPromise) return this.openPromise;

    this.openPromise = new Promise((resolve, reject) => {
      let settled = false;
      let wasOpen = false;
      const ws = new WebSocket(this.url);
      this.ws = ws;

      ws.onopen = () => {
        wasOpen = true;
        settled = true;
        this.retries = 0;
        this.openPromise = null;
        // (Re)subscribe to everything currently wanted.
        const topics = this.wantedTopics();
        if (topics.length)
          ws.send(
            JSON.stringify({
              id: this.nextId++,
              method: "subscribe",
              params: { topics },
            }),
          );
        this.notify(true);
        resolve();
      };

      ws.onmessage = (e) => this.onMessage(e.data);

      ws.onerror = () => {}; // onclose always follows

      ws.onclose = () => {
        if (this.ws === ws) this.ws = null;
        const message = wasOpen
          ? `Connection to ${this.url} lost`
          : `Can't connect to ${this.url}`;
        if (!settled) {
          settled = true;
          this.openPromise = null;
          reject(new Error(message));
        }
        this.failPending(new Error(message));
        this.notify(false, message);
        if (!this.closed && this.handlers.size > 0) this.scheduleReconnect();
      };
    });
    return this.openPromise;
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(500 * 2 ** this.retries, MAX_BACKOFF_MS);
    this.retries++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.closed && this.handlers.size > 0)
        this.ensureOpen().catch(() => {});
    }, delay);
  }

  failPending(err) {
    for (const { reject, timer } of this.pending.values()) {
      clearTimeout(timer);
      reject(err);
    }
    this.pending.clear();
  }

  notify(connected, message) {
    for (const h of this.handlers) h.onConnection?.(connected, message);
  }

  // Close the socket when no subscriber and no in-flight request needs it.
  touch() {
    if (this.handlers.size > 0 || this.pending.size > 0) return;
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.close(), IDLE_CLOSE_MS);
  }

  cancelIdle() {
    clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }

  close() {
    this.closed = true;
    clearTimeout(this.idleTimer);
    clearTimeout(this.reconnectTimer);
    this.failPending(new Error("Connection closed"));
    this.ws?.close();
    connections.delete(this.url);
  }

  // --- messages -------------------------------------------------------------

  onMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.event) {
      for (const h of this.handlers) h.topics[msg.event]?.(msg.data);
      return;
    }

    const entry = this.pending.get(msg.id);
    if (!entry) return; // e.g. the response to an automatic resubscribe
    this.pending.delete(msg.id);
    clearTimeout(entry.timer);

    if (msg.error) {
      const err = new Error(msg.error.message || "Request failed");
      err.code = msg.error.code;
      err.data = msg.error.data;
      entry.reject(err);
    } else {
      entry.resolve(msg.result);
    }
  }

  async request(method, params = {}) {
    this.cancelIdle();
    try {
      await this.ensureOpen();
      return await new Promise((resolve, reject) => {
        const id = this.nextId++;
        const timer = setTimeout(() => {
          this.pending.delete(id);
          reject(new Error(`${method} timed out`));
        }, REQUEST_TIMEOUT_MS);
        this.pending.set(id, { resolve, reject, timer });
        this.ws.send(JSON.stringify({ id, method, params }));
      });
    } finally {
      this.touch();
    }
  }

  // --- subscriptions --------------------------------------------------------

  wantedTopics() {
    const set = new Set();
    for (const h of this.handlers)
      Object.keys(h.topics).forEach((t) => set.add(t));
    return [...set];
  }

  subscribe(topicHandlers, onConnection) {
    const handler = { topics: topicHandlers, onConnection };
    this.handlers.add(handler);
    this.cancelIdle();

    if (this.isOpen()) {
      onConnection?.(true);
      this.request("subscribe", { topics: Object.keys(topicHandlers) }).catch(
        (e) => onConnection?.(false, e.message),
      );
    } else {
      // onopen sends the subscribe for every wanted topic, including these.
      this.ensureOpen().catch((e) => {
        onConnection?.(false, e.message);
        this.scheduleReconnect();
      });
    }

    return () => {
      this.handlers.delete(handler);
      const stillWanted = new Set(this.wantedTopics());
      const dropped = Object.keys(topicHandlers).filter(
        (t) => !stillWanted.has(t),
      );
      if (dropped.length && this.isOpen()) {
        this.ws.send(
          JSON.stringify({
            id: this.nextId++,
            method: "unsubscribe",
            params: { topics: dropped },
          }),
        );
      }
      this.touch();
    };
  }
}

const connections = new Map(); // ws url -> Connection

function conn(baseUrl) {
  const url = toWsUrl(baseUrl);
  let c = connections.get(url);
  if (!c) {
    c = new Connection(url);
    connections.set(url, c);
  }
  return c;
}

const call = (baseUrl, method, params) => conn(baseUrl).request(method, params);

export const api = {
  getStatus: (baseUrl) => call(baseUrl, "getStatus"),
  getBlocks: (baseUrl) => call(baseUrl, "getBlocks"),
  getPending: (baseUrl) => call(baseUrl, "getPending"),
  getValidators: (baseUrl) => call(baseUrl, "getValidators"),
  getPeers: (baseUrl) => call(baseUrl, "getPeers"),
  getAccount: (baseUrl, address) => call(baseUrl, "getAccount", { address }),
  submitTransaction: (baseUrl, tx) =>
    call(baseUrl, "submitTransaction", { transaction: tx }),
  proposeBlock: (baseUrl) => call(baseUrl, "propose"),

  /**
   * Server push. `handlers` maps topic -> callback, e.g.
   *   { status: fn, blocks: fn, pending: fn, peers: fn }
   * `onConnection(connected, message)` fires on connect / disconnect.
   * Returns an unsubscribe function. Reconnects automatically.
   */
  subscribe: (baseUrl, handlers, onConnection) =>
    conn(baseUrl).subscribe(handlers, onConnection),
};
