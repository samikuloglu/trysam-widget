# trysam-widget — Frontend Chat Widget Spec
## For Frontend Claude Code

**Author:** Sami Kuloglu (CTO)
**Date:** March 7, 2026
**Repo:** github.com/samikuloglu/trysam-widget
**Deploys to:** Cloudflare Pages (auto-deploy from main branch)
**Served at:** widget.trysam.co

---

## CONTEXT FOR CLAUDE CODE

You are building an embeddable chat widget for Sam, a multi-tenant AI chatbot service. Small businesses paste a single `<script>` tag on their website, and a chat bubble appears that lets their customers ask questions. The widget talks to a FastAPI backend at `api.trysam.co`.

**This widget will be embedded on OTHER people's websites.** That means:
- It must not interfere with the host page's CSS, JS, or DOM
- It must be lightweight (target: <50KB total)
- It must work on any website (WordPress, Squarespace, Wix, custom HTML, etc.)
- It must look professional and be customizable per tenant

**Tech stack:** Vanilla JavaScript + CSS. No React, no build tools, no npm. The output is a single JS file that customers load via a script tag. Keep it simple, keep it small.

---

## HOW CUSTOMERS USE IT

A Sam customer (like Pioneer Academy) pastes this on their website:

```html
<script 
  src="https://widget.trysam.co/chat.js" 
  data-tenant="pioneer"
  data-color="#2E75B6"
  data-position="right"
  data-welcome="Hi! How can I help you today?"
  data-name="Pioneer Academy Assistant"
></script>
```

That's it. One line. The script handles everything else.

---

## FILE STRUCTURE

```
trysam-widget/
├── chat.js              # The main widget script (this is what customers load)
├── index.html           # Test/demo page for development
├── README.md
└── .gitignore
```

Yes, it's just one file. That's intentional. One JS file that injects its own CSS and HTML into an iframe. No build step, no dependencies, no bundling. Customers load `chat.js` and it works.

---

## ARCHITECTURE

### Isolation via Shadow DOM + Iframe

The widget uses a **two-layer isolation strategy**:

1. **Shadow DOM** for the chat bubble button — attaches to the host page but CSS is encapsulated
2. **Iframe** for the chat window — complete isolation from the host page

Why both? The bubble button needs to float over the host page (Shadow DOM handles this cleanly). The chat window needs full CSS isolation so the host page's styles can't break our layout (iframe handles this).

### Communication Flow

```
Customer's Website
  │
  ├── <script src="chat.js" data-tenant="pioneer">
  │     │
  │     ├── Creates Shadow DOM container
  │     │     └── Chat bubble button (floating circle)
  │     │
  │     └── Creates Iframe (hidden initially)
  │           └── Full chat interface inside
  │                 │
  │                 └── POST https://api.trysam.co/chat
  │                       ├── tenant_slug: "pioneer"
  │                       ├── message: "What is tuition?"
  │                       └── channel: "web"
  │
  └── Response displayed in iframe chat window
```

---

## DETAILED SPECIFICATION

### chat.js — Main Widget Script

The script executes immediately when loaded. Here's the flow:

```
1. Read data attributes from the script tag
2. Create Shadow DOM host element
3. Inject the chat bubble button into Shadow DOM
4. Create a hidden iframe for the chat window
5. When bubble is clicked → show iframe with chat UI
6. When user sends message → POST to API → display response
7. When close button clicked → hide iframe
```

### Configuration (from data attributes)

| Attribute | Default | Description |
|-----------|---------|-------------|
| data-tenant | (required) | Tenant slug — identifies which business |
| data-color | "#2E75B6" | Primary brand color (button, header, user messages) |
| data-position | "right" | "right" or "left" — which corner |
| data-welcome | "Hi! How can I help you?" | First message shown in chat |
| data-name | "Assistant" | Name shown in the chat header |
| data-api | "https://api.trysam.co" | API base URL (override for dev/testing) |

### Reading Config

```javascript
(function() {
    // Find our own script tag
    const script = document.currentScript || document.querySelector('script[data-tenant]');
    
    const config = {
        tenant: script.getAttribute('data-tenant'),
        color: script.getAttribute('data-color') || '#2E75B6',
        position: script.getAttribute('data-position') || 'right',
        welcome: script.getAttribute('data-welcome') || 'Hi! How can I help you?',
        name: script.getAttribute('data-name') || 'Assistant',
        apiUrl: script.getAttribute('data-api') || 'https://api.trysam.co',
    };
    
    if (!config.tenant) {
        console.error('[Sam Widget] Missing required data-tenant attribute');
        return;
    }
    
    // ... build the widget using config
})();
```

### The Chat Bubble Button

A floating circular button in the bottom corner of the page. Uses Shadow DOM for CSS isolation.

**Visual spec:**
- Circle, 60px diameter
- Background: `config.color`
- White chat icon inside (SVG, not an image file — keeps it self-contained)
- Fixed position: 20px from bottom, 20px from right (or left if data-position="left")
- z-index: 2147483647 (max safe integer — must be above everything on host page)
- Subtle shadow: `0 4px 12px rgba(0,0,0,0.15)`
- Hover: slight scale up (1.1) with smooth transition
- Click: opens the chat window

**When chat is open:**
- Button changes to an X (close) icon
- Same position, same styling, icon rotates/transitions smoothly

### The Chat Window (inside iframe)

When the bubble is clicked, an iframe appears above/beside the bubble containing the full chat interface.

**Window spec:**
- Width: 380px (or 100vw on mobile screens <480px)
- Height: 520px (or 100vh - 80px on mobile)
- Position: fixed, 20px from bottom + 80px (above the bubble), 20px from right/left
- Border-radius: 16px
- Box shadow: `0 8px 32px rgba(0,0,0,0.12)`
- Background: white
- z-index: 2147483646 (one below the bubble so bubble stays on top)

**Mobile behavior (<480px viewport):**
- Chat window goes full screen (100vw × 100vh)
- Bubble is hidden while chat is open
- Close button inside the chat header

### Chat Window Internal Layout

```
┌──────────────────────────────┐
│  [Logo/Color Bar]  Name   ✕  │  ← Header (config.color background, white text)
├──────────────────────────────┤
│                              │
│  ◯ Hi! How can I help you?   │  ← Welcome message (bot bubble, left-aligned)
│                              │
│            What is tuition? ◯│  ← User message (config.color bg, right-aligned)
│                              │
│  ◯ Tuition for PreK is...    │  ← Bot response (light gray bg, left-aligned)
│                              │
│  ◯ ···                       │  ← Typing indicator (animated dots)
│                              │
├──────────────────────────────┤
│  [Type a message...    ] [➤] │  ← Input bar (text input + send button)
├──────────────────────────────┤
│      Powered by Sam ↗        │  ← Footer (small, links to trysam.co)
└──────────────────────────────┘
```

### Header

- Height: 56px
- Background: `config.color`
- Text: white, `config.name` displayed prominently
- Close button (✕) on the right — white, 20px
- Font: system font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)
- Small colored dot (green) as "online" indicator next to the name

### Message Bubbles

**Bot messages (left-aligned):**
- Background: `#F0F0F0` (light gray)
- Text color: `#1A1A1A`
- Border-radius: 16px 16px 16px 4px (rounded except bottom-left)
- Max-width: 80% of chat area
- Padding: 12px 16px
- Font-size: 14px
- Line-height: 1.5
- Small avatar circle (optional, uses first letter of config.name) to the left

**User messages (right-aligned):**
- Background: `config.color`
- Text color: white
- Border-radius: 16px 16px 4px 16px (rounded except bottom-right)
- Max-width: 80% of chat area
- Same padding, font-size, line-height

**Typing indicator:**
- Three dots that pulse/bounce in sequence
- Shows immediately when user sends a message
- Disappears when bot response arrives
- Same styling as a bot message bubble

### Input Bar

- Height: 56px
- Background: white
- Border-top: 1px solid `#E5E5E5`
- Text input: takes remaining width, no border, 14px font, placeholder "Type a message..."
- Send button: 36px circle, `config.color` background, white arrow icon
- Send button disabled (grayed out) when input is empty
- Send on Enter key press OR send button click
- Input disabled while waiting for response (prevents double-sends)
- Auto-focus input when chat opens

### Footer

- Height: 28px
- Background: `#FAFAFA`
- Border-top: 1px solid `#F0F0F0`
- Text: "Powered by Sam" in 11px, color `#999`
- "Sam" links to `https://trysam.co` in a new tab
- This is important for organic growth — every widget is a tiny ad for Sam

---

## API COMMUNICATION

### Sending a Message

```javascript
async function sendMessage(userMessage) {
    // 1. Display user message immediately
    appendMessage('user', userMessage);
    
    // 2. Show typing indicator
    showTypingIndicator();
    
    // 3. Disable input
    setInputDisabled(true);
    
    // 4. Call the API
    try {
        const response = await fetch(`${config.apiUrl}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tenant_slug: config.tenant,
                message: userMessage,
                channel: 'web',
            }),
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 5. Hide typing indicator, show response
        hideTypingIndicator();
        appendMessage('bot', data.answer);
        
    } catch (error) {
        console.error('[Sam Widget] Error:', error);
        hideTypingIndicator();
        appendMessage('bot', "I'm sorry, I'm having trouble right now. Please try again in a moment.");
    } finally {
        // 6. Re-enable input
        setInputDisabled(false);
        focusInput();
    }
}
```

### Error Handling

- Network error → show friendly error message in chat ("I'm having trouble connecting...")
- 404 (tenant not found) → show error message ("This assistant isn't available right now.")
- 500 (server error) → show generic error ("Something went wrong. Please try again.")
- Timeout (>15 seconds) → abort request, show timeout message
- NEVER show raw error messages to the end user

### Request Timeout

Set a 15-second timeout on the fetch call. LLM responses typically take 1-3 seconds. If it takes more than 15, something is wrong.

```javascript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15000);

const response = await fetch(url, {
    ...options,
    signal: controller.signal,
});

clearTimeout(timeout);
```

---

## VISUAL DESIGN PRINCIPLES

This widget appears on small business websites — daycares, schools, hotels, property companies. The design should feel:

- **Professional but warm** — not corporate/cold, not childish
- **Familiar** — users have seen chat widgets before (Intercom, Drift, Zendesk). Don't reinvent the UX.
- **Lightweight** — it's a helper, not the main event. It shouldn't dominate the page.
- **Brand-flexible** — the `data-color` attribute lets each business match their brand. The widget should look good with ANY color — bright red, dark navy, forest green, etc.

**Design DO:**
- Use system font stack (fast loading, native feel on every device)
- Smooth transitions (150-200ms ease) for open/close and hover states
- Subtle shadows for depth
- Generous padding in message bubbles (readability matters)
- Scroll to bottom automatically when new messages appear

**Design DON'T:**
- No custom fonts (adds weight, may conflict with host page)
- No animations longer than 300ms (chat should feel snappy)
- No sounds or notifications
- No avatar images (use CSS-generated initials circle)
- No markdown rendering in messages (plain text only for v1)

---

## EDGE CASES TO HANDLE

### Empty Messages
- Don't send empty or whitespace-only messages
- Trim whitespace before sending

### Long Messages
- Cap user input at 2000 characters (matches API validation)
- Show remaining character count when user is past 1500 characters

### Long Responses
- Bot responses can be several paragraphs
- Chat area must scroll
- Auto-scroll to bottom on new messages
- But if user has scrolled UP to read earlier messages, don't auto-scroll (respect their position)

### Rapid Clicks
- Debounce the send button / Enter key (300ms)
- Disable input while waiting for response
- Ignore bubble click if chat is already animating open/close

### Multiple Widgets
- Should never happen (one script tag per page), but guard against it
- If `chat.js` detects it's already been loaded, skip initialization

### Third-Party Cookie/Storage Issues
- Do NOT use localStorage, sessionStorage, or cookies
- Keep all state in JavaScript memory
- Session ends when user navigates away or refreshes — this is fine for v1

### Content Security Policy (CSP)
- Some websites have strict CSP headers
- The widget uses an iframe with `srcdoc` (inline HTML) — this works in most CSP configurations
- If `srcdoc` is blocked, fall back to blob URL
- Fetch to api.trysam.co requires `connect-src` to include our domain — document this for customers who have strict CSP

---

## ACCESSIBILITY

- Chat bubble: `aria-label="Open chat"`, `role="button"`, `tabindex="0"`
- Chat window: `role="dialog"`, `aria-label="Chat with {config.name}"`
- Message input: `aria-label="Type a message"`
- Send button: `aria-label="Send message"`
- Close button: `aria-label="Close chat"`
- Messages area: `role="log"`, `aria-live="polite"` (screen readers announce new messages)
- Keyboard: Enter sends message, Escape closes chat window
- Focus trap inside chat window when open (Tab cycles through input → send → close)

---

## PERFORMANCE BUDGET

| Metric | Target |
|--------|--------|
| Total JS file size | <40KB (uncompressed), <15KB gzip |
| Time to interactive (bubble visible) | <100ms after script loads |
| First message sent to response displayed | <3 seconds (depends on API) |
| Memory usage | <5MB |

**How to stay small:**
- No dependencies — vanilla JS only
- SVG icons inline (not image files)
- CSS as a string inside JS (injected into iframe/shadow DOM)
- No font files loaded
- No analytics or tracking code in v1

---

## CLOUDFLARE PAGES DEPLOYMENT

### Setup

1. Create a Cloudflare Pages project connected to the `trysam-widget` GitHub repo
2. Build command: (none — it's static files)
3. Output directory: `/` (root)
4. Custom domain: `widget.trysam.co`

### Caching

Cloudflare automatically caches static files. Add cache headers:
- `chat.js`: Cache for 1 hour (`Cache-Control: public, max-age=3600`)
- Short cache so customers get updates quickly, but still fast for repeat visitors

### CORS on Cloudflare

Not needed — the widget JS is loaded by the browser (same as any CDN script). The API handles CORS, not the widget host.

---

## index.html — Development Test Page

This file is for local development and testing. It simulates what a customer's website looks like with the widget embedded.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sam Widget — Test Page</title>
    <style>
        /* Simulate a real business website */
        body {
            font-family: Georgia, serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            line-height: 1.6;
            color: #333;
        }
        h1 { color: #2E75B6; }
        .content { margin: 20px 0; }
    </style>
</head>
<body>
    <h1>Pioneer Academy</h1>
    <div class="content">
        <p>Welcome to Pioneer Academy, a National Blue Ribbon School serving PreK through 12th grade in Wayne, NJ.</p>
        <p>This is a test page simulating a customer's website. The Sam chat widget should appear in the bottom-right corner.</p>
        <p>Try asking questions like:</p>
        <ul>
            <li>"What is tuition?"</li>
            <li>"How do I apply?"</li>
            <li>"What grades do you offer?"</li>
        </ul>
        <p>Scroll down to test widget positioning with long pages...</p>
        <!-- Add enough content to make the page scrollable -->
        <div style="height: 2000px; background: linear-gradient(to bottom, #fff, #f0f0f0);"></div>
    </div>

    <!-- THE WIDGET — this is what customers paste on their site -->
    <script 
        src="./chat.js" 
        data-tenant="pioneer"
        data-color="#2E75B6"
        data-welcome="Hi! I'm the Pioneer Academy assistant. Ask me about admissions, tuition, programs, or anything else!"
        data-name="Pioneer Academy"
        data-api="http://localhost:8000"
    ></script>
</body>
</html>
```

Note `data-api` points to `localhost:8000` for development. In production, customers don't include this attribute and it defaults to `https://api.trysam.co`.

---

## COMPLETE chat.js STRUCTURE

Here is the high-level structure. Implement each section in order:

```javascript
(function() {
    'use strict';
    
    // ============================================
    // 1. PREVENT DOUBLE INITIALIZATION
    // ============================================
    if (window.__samWidgetLoaded) return;
    window.__samWidgetLoaded = true;
    
    // ============================================
    // 2. READ CONFIGURATION
    // ============================================
    const script = document.currentScript;
    const config = { /* ... read data attributes ... */ };
    
    // ============================================
    // 3. CSS STYLES (as template literal string)
    // ============================================
    const BUBBLE_STYLES = `/* Shadow DOM styles for the bubble button */`;
    const CHAT_STYLES = `/* Iframe internal styles for the chat window */`;
    
    // ============================================
    // 4. SVG ICONS (inline strings)
    // ============================================
    const ICON_CHAT = `<svg>...</svg>`;
    const ICON_CLOSE = `<svg>...</svg>`;
    const ICON_SEND = `<svg>...</svg>`;
    
    // ============================================
    // 5. STATE
    // ============================================
    let isOpen = false;
    let isWaiting = false;
    let messages = [];  // Array of {role: 'user'|'bot', content: string}
    
    // ============================================
    // 6. CREATE BUBBLE (Shadow DOM)
    // ============================================
    function createBubble() { /* ... */ }
    
    // ============================================
    // 7. CREATE CHAT WINDOW (Iframe)
    // ============================================
    function createChatWindow() { /* ... */ }
    
    // ============================================
    // 8. MESSAGE HANDLING
    // ============================================
    function appendMessage(role, content) { /* ... */ }
    function showTypingIndicator() { /* ... */ }
    function hideTypingIndicator() { /* ... */ }
    
    // ============================================
    // 9. API COMMUNICATION
    // ============================================
    async function sendMessage(text) { /* ... */ }
    
    // ============================================
    // 10. EVENT HANDLERS
    // ============================================
    function handleSend() { /* ... */ }
    function handleKeyPress(e) { /* ... */ }
    function toggleChat() { /* ... */ }
    
    // ============================================
    // 11. INITIALIZE
    // ============================================
    function init() {
        createBubble();
        createChatWindow();
        // Add welcome message
        appendMessage('bot', config.welcome);
    }
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
```

---

## WHAT NOT TO BUILD (YET)

- **Conversation history persistence** — messages disappear on page refresh. Fine for v1.
- **File/image upload** — text only for now.
- **Markdown rendering** — plain text responses. Can add later.
- **Typing indicator on user side** — only show bot typing indicator.
- **Sound notifications** — no sounds.
- **Unread message badge** — no notification dots.
- **Pre-chat form** (name/email collection) — future feature.
- **Satisfaction rating** — future feature.
- **Multi-language UI** — the chat header, placeholder text, etc. are English only for now. The bot itself responds in whatever language it's prompted in.

---

## HOW TO TEST

### Local Development

```bash
# Clone the repo
git clone github.com/samikuloglu/trysam-widget
cd trysam-widget

# Serve locally (any static file server works)
python3 -m http.server 3000

# Open http://localhost:3000/index.html
# Make sure the backend is running at localhost:8000
```

### Test Checklist

Before deploying, verify all of these:

**Basic functionality:**
- [ ] Bubble appears in correct position (bottom-right by default)
- [ ] Clicking bubble opens chat window with welcome message
- [ ] Clicking X closes chat window
- [ ] Typing a message and pressing Enter sends it
- [ ] Typing a message and clicking send button sends it
- [ ] Bot response appears after a brief typing indicator
- [ ] Error message appears if API is unreachable

**Visual/UX:**
- [ ] Widget looks correct on desktop (1440px wide)
- [ ] Widget looks correct on tablet (768px wide)
- [ ] Widget goes full-screen on mobile (375px wide)
- [ ] data-color changes bubble color AND header color AND user message color
- [ ] data-position="left" moves bubble and window to the left
- [ ] data-name appears in the chat header
- [ ] data-welcome appears as the first bot message
- [ ] "Powered by Sam" footer links to trysam.co

**Edge cases:**
- [ ] Empty message cannot be sent
- [ ] Very long message (2000 chars) sends correctly
- [ ] Very long bot response scrolls correctly
- [ ] Rapid Enter key pressing doesn't send duplicate messages
- [ ] Loading the script twice doesn't create two widgets
- [ ] Widget doesn't break the host page's layout or styles
- [ ] Host page's CSS doesn't break the widget's styles

**Accessibility:**
- [ ] Tab key can reach and activate the bubble
- [ ] Escape key closes the chat window
- [ ] Screen reader announces new messages
