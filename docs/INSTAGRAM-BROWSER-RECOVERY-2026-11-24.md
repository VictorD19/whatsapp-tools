# Browser access restored — 24 November 2026

Direct access to the connected in-app Meta session is working again. The former CUA tool was removed after the desktop update; the bundled Browser runtime is available through the persistent Node REPL tool. No browser approval settings, Meta permissions, cookies, CRM source, deployment or server access were changed.

## Verified recovery path

1. Use the available mcp__node_repl__js tool. Import setupBrowserRuntime from the installed bundled Browser package: /Users/mac/.codex/plugins/cache/openai-bundled/browser/26.1120.41243/scripts/browser-client.mjs.
2. Initialize agent with setupBrowserRuntime(), list agent.browsers and choose the iab browser for this session. Read that browser's full documentation before using it.
3. List browser.tabs and select by the observed URL. Tab IDs changed across the desktop update; do not assume the former IDs still match.
4. Refresh the submissions page and inspect the connected Meta UI through its documented Playwright/accessibility methods. Reuse the agent/browser/tab handles within the same runtime.
5. Open the observed feedback link and distinguish submitted application materials from an actual reviewer decision. Do not inspect hidden endpoints or extract browser credentials.

This runtime version is a verified path, not a permanent version promise. If the installed version changes, follow the current bundled documentation. The monitoring automation was updated with this recovery procedure and remains active every eight hours.

## Live result

The connected Meta session still shows Análise em andamento for app1684815669905187, submission1690021079384646. The refreshed feedback page contains no reviewer decision or new requested correction; there are zero required app actions. This is not approval. The old support workaround remains separate from the App Review.

Screenshot: output/instagram-meta-review-20261123/meta-browser-restored-20261124.jpg. Owner sending and the reviewer reply deadline of7December23:59UTC were not changed. CRM principal untouched; administrative key remains revoked.
