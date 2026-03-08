# CLAUDE.md — Frontend Widget Build Instructions

## Project Overview

This is the **trysam-widget** repo — an embeddable chat widget for Sam, a multi-tenant AI chatbot service for small businesses. Customers paste a single `<script>` tag on their website and a chat bubble appears that lets their visitors ask questions.

## What You're Building

A single JavaScript file (`chat.js`) that:
- Injects a floating chat bubble button (Shadow DOM for CSS isolation)
- Opens a chat window (iframe for full CSS isolation from host page)
- Sends messages to the Sam API and displays responses
- Is fully configurable via `data-` attributes on the script tag

**Read `SPEC.md` in this repo for the complete specification.** It contains every detail: visual specs, dimensions, colors, API communication, edge cases, accessibility, and the full code structure. Follow it closely.

## Critical Context

- **Tech stack:** Vanilla JavaScript + CSS only. No React, no npm, no build tools, no dependencies. Single file output.
- **The widget runs on OTHER people's websites.** It must not interfere with host page CSS, JS, or DOM. This is why we use Shadow DOM (bubble) + iframe (chat window).
- **Target size:** <40KB uncompressed, <15KB gzip.
- **No localStorage, sessionStorage, or cookies.** All state lives in JavaScript memory. Session ends on page refresh.

## API Details

- **Endpoint:** `POST https://api.trysam.co/chat`
- **CORS:** The API accepts requests from all origins (`*`). This is intentional — the widget runs on customer websites with unpredictable domains. Standard `fetch()` calls work with no special headers or workarounds needed.
- **Request body:**
```json
{
    "tenant_slug": "pioneer",
    "message": "What is tuition?",
    "channel": "web"
}
```
- **Response body:**
```json
{
    "answer": "Tuition for PreK is $12,500...",
    "tenant_name": "Pioneer Academy"
}
```
- **Timeout:** 15 seconds. If the API doesn't respond in 15 seconds, abort and show a friendly error message.

## File Structure

```
trysam-widget/
├── chat.js          # The widget (this is what you're building)
├── index.html       # Test/demo page (spec has the exact HTML)
├── CLAUDE.md        # This file
├── SPEC.md          # Full specification (READ THIS FIRST)
├── README.md
└── .gitignore
```

## Architecture Decisions

**Shadow DOM + Iframe isolation:** The bubble button uses Shadow DOM so it floats over the host page without CSS leaking in or out. The chat window uses an iframe (with `srcdoc`) so the entire chat UI is completely isolated. This two-layer approach is how professional embeddable widgets work.

**Why NOT React/build tools:** Customers load this via a script tag on WordPress, Squarespace, Wix, etc. A single vanilla JS file with no dependencies means zero compatibility issues, instant loading, and no build pipeline. The entire widget is one HTTP request.

**Why `srcdoc` for iframe:** Avoids needing to host a separate HTML file for the iframe content. Everything is self-contained in `chat.js`. If `srcdoc` is blocked by CSP, fall back to a blob URL.

## What NOT to Build

- No conversation history persistence (messages reset on page refresh)
- No file/image upload
- No markdown rendering (plain text only)
- No sound notifications
- No pre-chat forms (name/email collection)
- No satisfaction rating
- No analytics/tracking code
- No multi-language UI

## Testing

After building, verify with the test page (`index.html`):
```bash
python3 -m http.server 3000
# Open http://localhost:3000/index.html
```

The test page points `data-api` to `http://localhost:8000` for local backend testing. In production, customers omit `data-api` and it defaults to `https://api.trysam.co`.

Note: For testing against production without running the backend locally, change `data-api` in index.html to `https://api.trysam.co`. The tenant "pioneer" exists in production with test knowledge base data.
