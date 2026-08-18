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
    var script = document.currentScript || document.querySelector('script[data-tenant]');

    var rawColor = script.getAttribute('data-color') || '#122947';
    var rawPosition = script.getAttribute('data-position') || 'right';

    var config = {
        tenant: script.getAttribute('data-tenant'),
        color: /^#[0-9a-fA-F]{3,8}$|^[a-z]+$/i.test(rawColor) ? rawColor : '#122947',
        position: rawPosition === 'left' ? 'left' : 'right',
        welcome: script.getAttribute('data-welcome') || 'Hi! I\'m SamAI. How can I help you today?',
        name: script.getAttribute('data-name') || 'SamAI',
        apiUrl: script.getAttribute('data-api') || 'https://api.trysam.co',
        checkingNote: script.getAttribute('data-checking-note') || 'Checking the school\'s records…',
    };

    if (!config.tenant) {
        console.error('[Sam Widget] Missing required data-tenant attribute');
        return;
    }

    // ============================================
    // 3. COLOR HELPERS
    // ============================================
    function hexToRgb(hex) {
        var shorthand = /^#([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthand, function(m, r, g, b) {
            return '#' + r + r + g + g + b + b;
        });
        var result = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? parseInt(result[1], 16) + ',' + parseInt(result[2], 16) + ',' + parseInt(result[3], 16) : null;
    }

    var colorRgb = hexToRgb(config.color) || '46,117,182';

    // ============================================
    // 4. SVG ICONS
    // ============================================
    var ICON_CHAT = '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    var ICON_CLOSE = '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    var ICON_SEND = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';

    // ============================================
    // 5. BUBBLE STYLES (Shadow DOM)
    // ============================================
    var BUBBLE_STYLES = '\
        :host { all: initial; }\
        .sam-bubble {\
            position: fixed;\
            bottom: 24px;\
            ' + config.position + ': 24px;\
            width: 60px;\
            height: 60px;\
            border-radius: 50%;\
            background: ' + config.color + ';\
            border: none;\
            cursor: pointer;\
            z-index: 2147483647;\
            box-shadow: 0 2px 8px rgba(' + colorRgb + ',0.35), 0 8px 24px rgba(' + colorRgb + ',0.2);\
            display: flex;\
            align-items: center;\
            justify-content: center;\
            padding: 0;\
            outline: none;\
            animation: bubbleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);\
            transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;\
        }\
        @keyframes bubbleIn {\
            0% { transform: scale(0); opacity: 0; }\
            100% { transform: scale(1); opacity: 1; }\
        }\
        .sam-bubble:hover {\
            transform: scale(1.08);\
            box-shadow: 0 4px 12px rgba(' + colorRgb + ',0.4), 0 12px 28px rgba(' + colorRgb + ',0.25);\
        }\
        .sam-bubble:active {\
            transform: scale(0.95);\
        }\
        .sam-bubble:focus-visible {\
            box-shadow: 0 2px 8px rgba(' + colorRgb + ',0.35), 0 8px 24px rgba(' + colorRgb + ',0.2), 0 0 0 3px rgba(255,255,255,0.9), 0 0 0 5px ' + config.color + ';\
        }\
        .sam-bubble .icon {\
            display: flex;\
            align-items: center;\
            justify-content: center;\
            transition: transform 0.25s ease, opacity 0.25s ease;\
        }\
        .sam-bubble .icon-chat { opacity: 1; transform: rotate(0deg) scale(1); }\
        .sam-bubble .icon-close { opacity: 0; transform: rotate(-90deg) scale(0.5); position: absolute; }\
        .sam-bubble.open .icon-chat { opacity: 0; transform: rotate(90deg) scale(0.5); }\
        .sam-bubble.open .icon-close { opacity: 1; transform: rotate(0deg) scale(1); }\
        .sam-iframe {\
            position: fixed;\
            bottom: 100px;\
            ' + config.position + ': 24px;\
            width: 400px;\
            height: 600px;\
            border: none;\
            border-radius: 16px;\
            z-index: 2147483646;\
            opacity: 0;\
            transform: scale(0.5) translateY(20px);\
            transform-origin: bottom ' + config.position + ';\
            transition: opacity 0.2s ease, transform 0.2s ease;\
            pointer-events: none;\
            overflow: hidden;\
            will-change: transform, opacity;\
            box-shadow: 0 5px 15px rgba(0,0,0,0.08), 0 15px 35px rgba(0,0,0,0.12), 0 25px 55px rgba(0,0,0,0.06);\
        }\
        .sam-iframe.open {\
            opacity: 1;\
            transform: scale(1) translateY(0);\
            pointer-events: auto;\
            transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);\
        }\
        @media (max-width: 480px) {\
            .sam-bubble.mobile-hide {\
                display: none;\
            }\
            .sam-iframe {\
                width: 100vw;\
                height: 100%;\
                top: 0;\
                bottom: 0;\
                left: 0;\
                right: 0;\
                border-radius: 0;\
                transform-origin: bottom center;\
            }\
        }\
    ';

    var nameInitial = config.name.charAt(0).toUpperCase();

    // ============================================
    // 6. CHAT WINDOW HTML (iframe srcdoc)
    // ============================================
    var CHAT_HTML = '<!DOCTYPE html>\
<html lang="en">\
<head>\
<meta charset="UTF-8">\
<meta name="viewport" content="width=device-width, initial-scale=1.0">\
<style>\
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }\
html, body {\
    height: 100%;\
    width: 100%;\
    overflow: hidden;\
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;\
    font-size: 14px;\
    line-height: 1.5;\
    color: #1a1a1a;\
    background: #fff;\
    -webkit-font-smoothing: antialiased;\
    -moz-osx-font-smoothing: grayscale;\
}\
.chat-container {\
    display: flex;\
    flex-direction: column;\
    height: 100%;\
    width: 100%;\
    overflow: hidden;\
}\
\
/* ---- HEADER ---- */\
.chat-header {\
    height: 64px;\
    background: ' + config.color + ';\
    display: flex;\
    align-items: center;\
    padding: 0 16px;\
    flex-shrink: 0;\
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);\
    position: relative;\
    z-index: 1;\
}\
.header-info {\
    display: flex;\
    align-items: center;\
    flex: 1;\
    min-width: 0;\
    gap: 10px;\
}\
.header-avatar {\
    width: 34px;\
    height: 34px;\
    border-radius: 50%;\
    background: rgba(255,255,255,0.2);\
    color: #fff;\
    font-size: 14px;\
    font-weight: 600;\
    display: flex;\
    align-items: center;\
    justify-content: center;\
    flex-shrink: 0;\
}\
.header-name {\
    color: #fff;\
    font-size: 15px;\
    font-weight: 600;\
    white-space: nowrap;\
    overflow: hidden;\
    text-overflow: ellipsis;\
}\
.online-dot {\
    width: 8px;\
    height: 8px;\
    background: #4ADE80;\
    border-radius: 50%;\
    flex-shrink: 0;\
    box-shadow: 0 0 0 2px rgba(74,222,128,0.3);\
}\
.close-btn {\
    background: rgba(255,255,255,0.1);\
    border: none;\
    color: #fff;\
    cursor: pointer;\
    width: 32px;\
    height: 32px;\
    display: flex;\
    align-items: center;\
    justify-content: center;\
    border-radius: 50%;\
    transition: background 0.15s ease;\
    flex-shrink: 0;\
    padding: 0;\
    margin-left: 8px;\
}\
.close-btn:hover { background: rgba(255,255,255,0.25); }\
.close-btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }\
.close-btn svg { width: 18px; height: 18px; }\
\
/* ---- MESSAGES ---- */\
.messages {\
    flex: 1;\
    overflow-y: auto;\
    overflow-x: hidden;\
    padding: 20px 16px;\
    display: flex;\
    flex-direction: column;\
    scrollbar-width: thin;\
    scrollbar-color: #d1d5db transparent;\
}\
.messages::-webkit-scrollbar { width: 5px; }\
.messages::-webkit-scrollbar-track { background: transparent; }\
.messages::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }\
.messages::-webkit-scrollbar-thumb:hover { background: #9ca3af; }\
\
.msg-row {\
    display: flex;\
    align-items: flex-end;\
    gap: 8px;\
    margin-top: 16px;\
    animation: msgIn 0.25s ease-out;\
}\
.msg-row:first-child { margin-top: 0; }\
.msg-row.bot + .msg-row.bot { margin-top: 4px; }\
.msg-row.user + .msg-row.user { margin-top: 4px; }\
\
@keyframes msgIn {\
    from { opacity: 0; transform: translateY(8px); }\
    to { opacity: 1; transform: translateY(0); }\
}\
\
.avatar {\
    width: 28px;\
    height: 28px;\
    border-radius: 50%;\
    background: ' + config.color + ';\
    color: #fff;\
    font-size: 11px;\
    font-weight: 600;\
    display: flex;\
    align-items: center;\
    justify-content: center;\
    flex-shrink: 0;\
}\
.msg-row.bot + .msg-row.bot .avatar {\
    visibility: hidden;\
}\
\
.msg-row.bot { justify-content: flex-start; }\
.msg-row.user { justify-content: flex-end; }\
\
.msg-bubble {\
    max-width: 80%;\
    padding: 10px 14px;\
    font-size: 14px;\
    line-height: 1.5;\
    word-wrap: break-word;\
    overflow-wrap: break-word;\
    white-space: pre-wrap;\
}\
.msg-row.bot .msg-bubble {\
    background: #f1f5f9;\
    color: #1e293b;\
    border-radius: 18px 18px 18px 4px;\
    white-space: normal;\
}\
.msg-row.bot + .msg-row.bot .msg-bubble {\
    border-radius: 4px 18px 18px 4px;\
}\
.msg-row.user .msg-bubble {\
    background: ' + config.color + ';\
    color: #fff;\
    border-radius: 18px 18px 4px 18px;\
}\
.msg-row.user + .msg-row.user .msg-bubble {\
    border-radius: 18px 4px 4px 18px;\
}\
\
/* Markdown in bot messages */\
.msg-row.bot .msg-bubble ul, .msg-row.bot .msg-bubble ol {\
    margin: 6px 0;\
    padding-left: 18px;\
}\
.msg-row.bot .msg-bubble li {\
    margin: 3px 0;\
    line-height: 1.5;\
}\
.msg-row.bot .msg-bubble strong { font-weight: 600; }\
.msg-row.bot .msg-bubble em { font-style: italic; }\
.msg-row.bot .msg-bubble a {\
    color: ' + config.color + ';\
    text-decoration: underline;\
    text-decoration-color: rgba(' + colorRgb + ',0.3);\
    text-underline-offset: 2px;\
    transition: text-decoration-color 0.15s ease;\
}\
.msg-row.bot .msg-bubble a:hover {\
    text-decoration-color: ' + config.color + ';\
}\
\
/* ---- TYPING INDICATOR ---- */\
.typing-indicator {\
    display: flex;\
    align-items: flex-end;\
    gap: 8px;\
    margin-top: 16px;\
    animation: msgIn 0.25s ease-out;\
}\
.msg-row.bot + .typing-indicator { margin-top: 4px; }\
.typing-dots {\
    display: flex;\
    align-items: center;\
    gap: 5px;\
    padding: 12px 16px;\
    background: #f1f5f9;\
    border-radius: 18px 18px 18px 4px;\
}\
.typing-dots span {\
    width: 7px;\
    height: 7px;\
    background: #94a3b8;\
    border-radius: 50%;\
    animation: dotBounce 1.4s ease-in-out infinite;\
}\
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }\
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }\
@keyframes dotBounce {\
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }\
    30% { transform: translateY(-6px); opacity: 1; }\
}\
.typing-status {\
    font-size: 12px;\
    color: #64748b;\
    margin-left: 8px;\
    animation: msgIn 0.25s ease-out;\
}\
\
/* ---- INPUT BAR ---- */\
.input-bar {\
    padding: 12px 16px;\
    flex-shrink: 0;\
    border-top: 1px solid #f1f5f9;\
}\
.input-container {\
    display: flex;\
    align-items: flex-end;\
    background: #f1f5f9;\
    border-radius: 24px;\
    padding: 4px 4px 4px 16px;\
    gap: 4px;\
    transition: box-shadow 0.15s ease, background 0.15s ease;\
}\
.input-container:focus-within {\
    background: #e8eef4;\
    box-shadow: 0 0 0 2px rgba(' + colorRgb + ',0.15);\
}\
.msg-input {\
    flex: 1;\
    min-width: 0;\
    border: none;\
    outline: none;\
    font-size: 16px;\
    font-family: inherit;\
    line-height: 1.5;\
    padding: 7px 0;\
    background: transparent;\
    color: #1a1a1a;\
    resize: none;\
    overflow-y: hidden;\
    min-height: 21px;\
    max-height: 96px;\
}\
.msg-input::placeholder { color: #94a3b8; }\
.msg-input:disabled { opacity: 0.5; }\
.char-count {\
    position: absolute;\
    right: 4px;\
    top: -20px;\
    font-size: 11px;\
    color: #94a3b8;\
}\
.char-count.warn { color: #ef4444; }\
.send-btn {\
    width: 34px;\
    height: 34px;\
    border-radius: 50%;\
    border: none;\
    background: ' + config.color + ';\
    cursor: pointer;\
    display: flex;\
    align-items: center;\
    justify-content: center;\
    flex-shrink: 0;\
    padding: 0;\
    transition: opacity 0.15s ease, transform 0.15s ease;\
}\
.send-btn:disabled {\
    opacity: 0.3;\
    cursor: default;\
}\
.send-btn:not(:disabled):hover {\
    opacity: 0.85;\
}\
.send-btn:not(:disabled):active {\
    transform: scale(0.9);\
}\
.send-btn:focus-visible { outline: 2px solid ' + config.color + '; outline-offset: 2px; }\
\
/* ---- FOOTER ---- */\
.footer {\
    height: 32px;\
    background: #fafafa;\
    border-top: 1px solid #f1f5f9;\
    display: flex;\
    align-items: center;\
    justify-content: center;\
    flex-shrink: 0;\
}\
.footer span {\
    font-size: 11px;\
    color: #a1a1aa;\
}\
.footer a {\
    color: #a1a1aa;\
    text-decoration: none;\
    font-weight: 600;\
}\
.footer a:hover { text-decoration: underline; }\
</style>\
</head>\
<body>\
<div class="chat-container" role="dialog" aria-label="Chat with ' + config.name.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '">\
    <div class="chat-header">\
        <div class="header-info">\
            <div class="header-avatar">' + nameInitial + '</div>\
            <span class="header-name">' + config.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>\
            <span class="online-dot"></span>\
        </div>\
        <button class="close-btn" aria-label="Close chat">\
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>\
        </button>\
    </div>\
    <div class="messages" role="log" aria-live="polite" id="messages"></div>\
    <div class="input-bar">\
        <div class="input-container">\
            <textarea class="msg-input" id="msgInput" rows="1" placeholder="Ask me anything..." aria-label="Type a message" maxlength="2000"></textarea>\
            <button class="send-btn" aria-label="Send message" disabled id="sendBtn">\
                ' + ICON_SEND + '\
            </button>\
        </div>\
    </div>\
    <div class="footer">\
        <span>Powered by <a href="https://trysam.co" target="_blank" rel="noopener noreferrer">SamAI</a></span>\
    </div>\
</div>\
</body>\
</html>';

    // ============================================
    // 7. STATE
    // ============================================
    var isOpen = false;
    var isAnimating = false;
    var isWaiting = false;
    var iframeInitialized = false;
    var lastSendTime = 0;
    var userHasScrolled = false;
    var conversationHistory = [];
    // One id per widget load → groups this chat's messages into a conversation
    // server-side (chat_logs.session_id). Powers the admin transcript view.
    var sessionId = (window.crypto && window.crypto.randomUUID)
        ? window.crypto.randomUUID()
        : 'sess-' + Date.now() + '-' + Math.random().toString(36).slice(2);

    var iframeDoc = null;
    var messagesEl = null;
    var inputEl = null;
    var sendBtnEl = null;

    var bubbleBtn = null;
    var chatIframe = null;
    var shadowRoot = null;

    // ============================================
    // 8. CREATE BUBBLE (Shadow DOM)
    // ============================================
    function createBubble() {
        var host = document.createElement('div');
        host.id = 'sam-widget-host';
        shadowRoot = host.attachShadow({ mode: 'open' });

        var style = document.createElement('style');
        style.textContent = BUBBLE_STYLES;
        shadowRoot.appendChild(style);

        bubbleBtn = document.createElement('button');
        bubbleBtn.className = 'sam-bubble';
        bubbleBtn.setAttribute('aria-label', 'Open chat');
        bubbleBtn.innerHTML = '<span class="icon icon-chat">' + ICON_CHAT + '</span><span class="icon icon-close">' + ICON_CLOSE + '</span>';

        bubbleBtn.addEventListener('click', toggleChat);
        bubbleBtn.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleChat();
            }
        });

        shadowRoot.appendChild(bubbleBtn);
        document.body.appendChild(host);
    }

    // ============================================
    // 9. CREATE CHAT WINDOW (Iframe)
    // ============================================
    function createChatWindow() {
        chatIframe = document.createElement('iframe');
        chatIframe.className = 'sam-iframe';
        chatIframe.setAttribute('title', 'Chat with ' + config.name);

        chatIframe.srcdoc = CHAT_HTML;

        shadowRoot.appendChild(chatIframe);

        chatIframe.addEventListener('load', function() {
            if (iframeInitialized) return;
            iframeInitialized = true;

            iframeDoc = chatIframe.contentDocument || chatIframe.contentWindow.document;
            messagesEl = iframeDoc.getElementById('messages');
            inputEl = iframeDoc.getElementById('msgInput');
            sendBtnEl = iframeDoc.getElementById('sendBtn');

            sendBtnEl.addEventListener('click', handleSend);
            inputEl.addEventListener('keydown', handleKeyPress);
            inputEl.addEventListener('input', handleInputChange);

            // Auto-grow textarea
            inputEl.addEventListener('input', function() {
                this.style.height = 'auto';
                var newHeight = Math.min(this.scrollHeight, 96);
                this.style.height = newHeight + 'px';
                this.style.overflowY = this.scrollHeight > 96 ? 'auto' : 'hidden';
            });

            var closeBtn = iframeDoc.querySelector('.close-btn');
            closeBtn.addEventListener('click', toggleChat);

            iframeDoc.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && isOpen) {
                    toggleChat();
                }
            });

            messagesEl.addEventListener('scroll', function() {
                var el = messagesEl;
                var atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
                userHasScrolled = !atBottom;
            });

            // Focus trap
            iframeDoc.addEventListener('keydown', function(e) {
                if (e.key !== 'Tab') return;
                var focusable = [inputEl, sendBtnEl, closeBtn];
                var first = focusable[0];
                var last = focusable[focusable.length - 1];
                if (e.shiftKey) {
                    if (iframeDoc.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (iframeDoc.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            });

            appendMessage('bot', config.welcome);
        });
    }

    // ============================================
    // 10. MARKDOWN RENDERING
    // ============================================
    function renderMarkdown(text) {
        var html = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        var lines = html.split('\n');
        var out = '';
        var inUl = false, inOl = false;

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];

            var ulMatch = line.match(/^[*\-] (.+)/);
            if (ulMatch) {
                if (inOl) { out += '</ol>'; inOl = false; }
                if (!inUl) { out += '<ul>'; inUl = true; }
                out += '<li>' + ulMatch[1] + '</li>';
                continue;
            }

            var olMatch = line.match(/^\d+\. (.+)/);
            if (olMatch) {
                if (inUl) { out += '</ul>'; inUl = false; }
                if (!inOl) { out += '<ol>'; inOl = true; }
                out += '<li>' + olMatch[1] + '</li>';
                continue;
            }

            if (inUl) { out += '</ul>'; inUl = false; }
            if (inOl) { out += '</ol>'; inOl = false; }

            var headerMatch = line.match(/^(#{1,3}) (.+)/);
            if (headerMatch) {
                var sz = headerMatch[1].length === 1 ? 17 : headerMatch[1].length === 2 ? 16 : 15;
                out += '<div style="font-size:' + sz + 'px;font-weight:600;margin:8px 0 4px">' + headerMatch[2] + '</div>';
                continue;
            }

            if (line.trim() === '') {
                out += '<br>';
                continue;
            }

            if (out && !out.endsWith('<br>') && !out.endsWith('</ul>') && !out.endsWith('</ol>') && !out.endsWith('</div>')) {
                out += '<br>';
            }
            out += line;
        }

        if (inUl) out += '</ul>';
        if (inOl) out += '</ol>';

        out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        out = out.replace(/\*(.+?)\*/g, '<em>$1</em>');
        out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(m, t, u) {
            return /^https?:\/\//i.test(u) ? '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + t + '</a>' : t;
        });

        return out;
    }

    // ============================================
    // 11. MESSAGE HANDLING
    // ============================================
    function appendMessage(role, content) {
        if (!messagesEl) return;

        var row = iframeDoc.createElement('div');
        row.className = 'msg-row ' + role;

        if (role === 'bot') {
            var avatar = iframeDoc.createElement('div');
            avatar.className = 'avatar';
            avatar.textContent = nameInitial;
            row.appendChild(avatar);
        }

        var bubble = iframeDoc.createElement('div');
        bubble.className = 'msg-bubble';
        if (role === 'bot') {
            bubble.innerHTML = renderMarkdown(content);
        } else {
            bubble.textContent = content;
        }
        row.appendChild(bubble);

        messagesEl.appendChild(row);
        scrollToBottom();
    }

    var typingStatusTimer = null;

    function showTypingIndicator() {
        if (!messagesEl) return;
        var existing = messagesEl.querySelector('.typing-indicator');
        if (existing) return;

        var row = iframeDoc.createElement('div');
        row.className = 'typing-indicator';

        var avatar = iframeDoc.createElement('div');
        avatar.className = 'avatar';
        avatar.textContent = nameInitial;
        row.appendChild(avatar);

        var dots = iframeDoc.createElement('div');
        dots.className = 'typing-dots';
        dots.innerHTML = '<span></span><span></span><span></span>';
        row.appendChild(dots);

        messagesEl.appendChild(row);
        scrollToBottom();

        // Verified answers routinely take 10s+; past a few seconds bare dots
        // read as a hang, so name what the wait actually is.
        typingStatusTimer = setTimeout(function() {
            var status = iframeDoc.createElement('div');
            status.className = 'typing-status';
            status.textContent = config.checkingNote;
            dots.appendChild(status);
            scrollToBottom();
        }, 6000);
    }

    function hideTypingIndicator() {
        if (typingStatusTimer) {
            clearTimeout(typingStatusTimer);
            typingStatusTimer = null;
        }
        if (!messagesEl) return;
        var indicator = messagesEl.querySelector('.typing-indicator');
        if (indicator) indicator.remove();
    }

    function scrollToBottom() {
        if (!messagesEl || userHasScrolled) return;
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // ============================================
    // 12. API COMMUNICATION
    // ============================================
    async function sendMessage(text) {
        appendMessage('user', text);
        showTypingIndicator();
        setInputDisabled(true);

        var controller = new AbortController();
        // 45s: answers are verified server-side before shipping and routinely
        // take 10-20s (a correct answer once finished at 14,999ms and lost to
        // the old 15s abort). Abort only on true hangs.
        var timeout = setTimeout(function() { controller.abort(); }, 45000);

        try {
            var response = await fetch(config.apiUrl + '/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenant_slug: config.tenant,
                    message: text,
                    channel: 'web',
                    history: conversationHistory,
                    session_id: sessionId,
                }),
                signal: controller.signal,
            });

            clearTimeout(timeout);

            if (response.status === 404) {
                throw { custom: "This assistant isn't available right now." };
            }
            if (!response.ok) {
                throw { custom: 'Something went wrong. Please try again.' };
            }

            var data = await response.json();
            hideTypingIndicator();
            appendMessage('bot', data.answer);

            conversationHistory.push({ role: 'user', content: text });
            conversationHistory.push({ role: 'assistant', content: data.answer });

        } catch (error) {
            clearTimeout(timeout);
            hideTypingIndicator();

            var msg;
            if (error && error.custom) {
                msg = error.custom;
            } else if (error && error.name === 'AbortError') {
                msg = "That's taking longer than expected. Please try again.";
            } else {
                msg = "I'm having trouble connecting right now. Please try again in a moment.";
            }

            console.error('[Sam Widget] Error:', error);
            appendMessage('bot', msg);
        } finally {
            setInputDisabled(false);
            focusInput();
        }
    }

    // ============================================
    // 13. EVENT HANDLERS
    // ============================================
    function setInputDisabled(disabled) {
        isWaiting = disabled;
        if (inputEl) inputEl.disabled = disabled;
        updateSendButton();
    }

    function focusInput() {
        if (inputEl && !inputEl.disabled) {
            inputEl.focus();
        }
    }

    function updateSendButton() {
        if (!sendBtnEl || !inputEl) return;
        sendBtnEl.disabled = isWaiting || inputEl.value.trim().length === 0;
    }

    function handleInputChange() {
        updateSendButton();

        var wrapper = inputEl.parentElement;
        var existing = wrapper.querySelector('.char-count');
        var len = inputEl.value.length;

        if (len > 1500) {
            if (!existing) {
                existing = iframeDoc.createElement('div');
                existing.className = 'char-count';
                wrapper.style.position = 'relative';
                wrapper.appendChild(existing);
            }
            existing.textContent = len + '/2000';
            existing.className = 'char-count' + (len > 1900 ? ' warn' : '');
        } else if (existing) {
            existing.remove();
        }
    }

    function handleSend() {
        if (isWaiting) return;

        var now = Date.now();
        if (now - lastSendTime < 300) return;
        lastSendTime = now;

        var text = inputEl.value.trim();
        if (!text) return;
        if (text.length > 2000) {
            text = text.substring(0, 2000);
        }

        inputEl.value = '';
        inputEl.style.height = 'auto';
        inputEl.style.overflowY = 'hidden';
        handleInputChange();
        userHasScrolled = false;
        sendMessage(text);
    }

    function handleKeyPress(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    function toggleChat() {
        if (isAnimating) return;
        isAnimating = true;

        isOpen = !isOpen;

        if (isOpen) {
            chatIframe.classList.add('open');
            bubbleBtn.classList.add('open');
            bubbleBtn.setAttribute('aria-label', 'Close chat');

            if (window.innerWidth <= 480) {
                bubbleBtn.classList.add('mobile-hide');
            }

            setTimeout(function() {
                isAnimating = false;
                focusInput();
            }, 300);
        } else {
            chatIframe.classList.remove('open');
            bubbleBtn.classList.remove('open');
            bubbleBtn.classList.remove('mobile-hide');
            bubbleBtn.setAttribute('aria-label', 'Open chat');

            setTimeout(function() {
                isAnimating = false;
            }, 200);
        }
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isOpen) {
            toggleChat();
        }
    });

    // ============================================
    // 14. INITIALIZE
    // ============================================
    function init() {
        createBubble();
        createChatWindow();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
