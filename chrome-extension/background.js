// Background service worker - handles API calls to the pickit server
// Content scripts on facebook.com can't directly fetch localhost,
// so they send messages here and we make the request.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PICKIT_COLLECT") {
    handleCollect(message.payload, message.serverUrl)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // keep the message channel open for async response
  }
});

async function handleCollect(payload, serverUrl) {
  const res = await fetch(`${serverUrl}/api/collect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return await res.json();
}
