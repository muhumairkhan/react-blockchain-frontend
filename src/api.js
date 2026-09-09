async function request(baseUrl, path, init) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  let body = null;
  try {
    body = await res.json();
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    const message = body?.error || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return body;
}

export const api = {
  getStatus: (baseUrl) => request(baseUrl, '/status'),
  getBlocks: (baseUrl) => request(baseUrl, '/blocks'),
  getPending: (baseUrl) => request(baseUrl, '/pending'),
  getValidators: (baseUrl) => request(baseUrl, '/validators'),

  submitTransaction: (baseUrl, tx) =>
    request(baseUrl, '/transactions', {
      method: 'POST',
      body: JSON.stringify(tx),
    }),

  proposeBlock: (baseUrl) =>
    request(baseUrl, '/propose', {
      method: 'POST',
    }),
};
