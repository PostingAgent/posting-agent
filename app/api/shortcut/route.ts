// app/api/shortcut/route.ts
//
// GET /api/shortcut?key=<api_key>
// Returns an Apple Shortcuts deep link that creates a pre-configured
// shortcut with the user's API key and upload URL baked in.
// Redirects to shortcuts://import-shortcut URL.

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const apiKey = req.nextUrl.searchParams.get('key')
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing key' }, { status: 400 })
  }

  // We can't generate binary .shortcut files easily, so instead
  // we return an HTML page with clear 3-step setup + copy-paste values
  // that's optimized for mobile Safari.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Install Posting Agent Shortcut</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, sans-serif; background: #f8f9fa; padding: 20px; color: #1a1a1a; }
  .card { background: white; border-radius: 16px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  h1 { font-size: 22px; margin-bottom: 8px; }
  h2 { font-size: 15px; margin-bottom: 12px; color: #333; }
  p { font-size: 14px; color: #666; line-height: 1.5; }
  .step { display: flex; gap: 12px; margin-bottom: 16px; }
  .num { width: 28px; height: 28px; background: #4f46e5; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; flex-shrink: 0; }
  .copy-box { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; font-family: monospace; font-size: 12px; word-break: break-all; margin: 8px 0; position: relative; }
  .copy-btn { position: absolute; right: 8px; top: 8px; background: #4f46e5; color: white; border: none; padding: 4px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; }
  .big-btn { display: block; width: 100%; background: #4f46e5; color: white; border: none; padding: 16px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; text-align: center; text-decoration: none; margin-top: 16px; }
  .hint { font-size: 12px; color: #999; margin-top: 4px; }
</style>
</head>
<body>
  <div class="card">
    <h1>Posting Agent</h1>
    <p>Set up your iPhone shortcut to upload job photos in one tap.</p>
  </div>

  <div class="card">
    <h2>Your API key</h2>
    <div class="copy-box" id="key-box">
      ${apiKey}
      <button class="copy-btn" onclick="copy('key-box')">Copy</button>
    </div>
    <p class="hint">You'll paste this into the shortcut below.</p>
  </div>

  <div class="card">
    <h2>Your upload URL</h2>
    <div class="copy-box" id="url-box">
      ${appUrl}/api/posts/upload-shortcut
      <button class="copy-btn" onclick="copy('url-box')">Copy</button>
    </div>
  </div>

  <div class="card">
    <h2>Create the shortcut</h2>

    <div class="step">
      <div class="num">1</div>
      <div>
        <p>Tap the button below to open Shortcuts, then tap <strong>+</strong> to make a new shortcut.</p>
      </div>
    </div>

    <div class="step">
      <div class="num">2</div>
      <div>
        <p>Add these actions in order:</p>
        <p style="margin-top:8px"><strong>Select Photos</strong> → turn on "Select Multiple"</p>
        <p style="margin-top:4px"><strong>Repeat with Each</strong> → set to "Selected Photos"</p>
        <p style="margin-top:4px">&nbsp;&nbsp;Inside the loop: <strong>Get Contents of URL</strong></p>
        <p style="margin-top:4px">&nbsp;&nbsp;URL → paste the upload URL above</p>
        <p style="margin-top:4px">&nbsp;&nbsp;Method → <strong>POST</strong></p>
        <p style="margin-top:4px">&nbsp;&nbsp;Headers → add <strong>x-api-key</strong> → paste your API key</p>
        <p style="margin-top:4px">&nbsp;&nbsp;Body → <strong>Form</strong> → add field <strong>photo</strong> (File) → "Repeat Item"</p>
        <p style="margin-top:4px"><strong>End Repeat</strong></p>
        <p style="margin-top:4px"><strong>Show Notification</strong> → "Photos uploaded to Posting Agent!"</p>
      </div>
    </div>

    <div class="step">
      <div class="num">3</div>
      <div>
        <p>Name it <strong>"Post to PA"</strong>, tap the settings icon, and enable <strong>"Show in Share Sheet"</strong> so it appears when you share photos.</p>
        <p style="margin-top:8px"><strong>Bonus:</strong> In Shortcuts → Automation → tap <strong>+</strong> → Time of Day → pick 6 PM → run "Post to PA". It'll upload your job photos every evening automatically.</p>
      </div>
    </div>

    <a href="shortcuts://create-shortcut" class="big-btn">Open Shortcuts App</a>
  </div>

<script>
function copy(id) {
  const el = document.getElementById(id);
  const text = el.childNodes[0].textContent.trim();
  navigator.clipboard.writeText(text);
  const btn = el.querySelector('.copy-btn');
  btn.textContent = 'Copied!';
  setTimeout(() => btn.textContent = 'Copy', 2000);
}
</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}
