/**
 * Thin proxy in front of the Apps Script backend, for LINE's Messaging API
 * webhook specifically.
 *
 * Google Apps Script Web Apps (the `/exec` URL) always respond with an HTTP
 * 302 redirect to a script.googleusercontent.com URL that serves the actual
 * body — normal browsers and `fetch` follow this automatically, but LINE's
 * webhook delivery does not, so it sees a bare 302 and treats the webhook as
 * broken. This function sits at a stable Vercel URL, follows the redirect
 * itself when forwarding to Apps Script, and always answers LINE with a
 * clean 200 regardless of what happens downstream (LINE only needs the ack;
 * the actual reply, if any, is pushed back separately via the Messaging API).
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(200).send('ok');
    return;
  }

  const appsScriptUrl = process.env.VITE_API_URL;
  if (appsScriptUrl) {
    try {
      await fetch(appsScriptUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body || {}),
      });
    } catch {
      // Swallow errors — LINE just needs the 200 ack, not the result.
    }
  }

  res.status(200).send('ok');
}
