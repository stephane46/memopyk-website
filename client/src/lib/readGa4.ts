export function readGa4Ids(): { clientId?: string; sessionId?: string } {
  // GA4 client ID is in _ga cookie: GA1.2.1234567890.1234567890 (the last two numbers)
  const gaCookie = document.cookie.split("; ").find((c) => c.startsWith("_ga="));
  let clientId: string | undefined;
  if (gaCookie) {
    const val = gaCookie.split("=")[1] || "";
    const parts = val.split(".");
    if (parts.length >= 4) clientId = `${parts[2]}.${parts[3]}`;
  }

  // sessionId: if you already store GA4 session id in your app, set it here.
  // Otherwise skip or derive from your own session logic.
  return { clientId, sessionId: undefined };
}