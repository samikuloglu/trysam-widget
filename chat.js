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
    const script = document.currentScript || document.querySelector('script[data-tenant]');

    var rawColor = script.getAttribute('data-color') || '#2E75B6';
    var rawPosition = script.getAttribute('data-position') || 'right';

    const config = {
        tenant: script.getAttribute('data-tenant'),
        color: /^#[0-9a-fA-F]{3,8}$|^[a-z]+$/i.test(rawColor) ? rawColor : '#2E75B6',
        position: rawPosition === 'left' ? 'left' : 'right',
        welcome: script.getAttribute('data-welcome') || 'Hi! How can I help you?',
        name: script.getAttribute('data-name') || 'Assistant',
        apiUrl: script.getAttribute('data-api') || 'https://api.trysam.co',
    };

    if (!config.tenant) {
        console.error('[Sam Widget] Missing required data-tenant attribute');
        return;
    }

    // ============================================
    // 3. SVG ICONS
    // ============================================
    var ICON_CHAT = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    var ICON_CLOSE = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    var ICON_SEND = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>';

    // ============================================
    // 4. CSS STYLES
    // ============================================
    var BUBBLE_STYLES = '\
        :host { all: initial; }\
        .sam-bubble {\
            position: fixed;\
            bottom: 20px;\
            ' + config.position + ': 20px;\
            width: 60px;\
            height: 60px;\
            border-radius: 50%;\
            background: ' + config.color + ';\
            border: none;\
            cursor: pointer;\
            z-index: 2147483647;\
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);\
            display: flex;\
            align-items: center;\
            justify-content: center;\
            transition: transform 0.2s ease, background 0.2s ease;\
            padding: 0;\
            outline: none;\
        }\
        .sam-bubble:hover {\
            transform: scale(1.1);\
        }\
        .sam-bubble:focus-visible {\
            box-shadow: 0 4px 12px rgba(0,0,0,0.15), 0 0 0 3px rgba(255,255,255,0.8), 0 0 0 5px ' + config.color + ';\
        }\
        .sam-bubble .icon {\
            display: flex;\
            align-items: center;\
            justify-content: center;\
            transition: transform 0.2s ease, opacity 0.2s ease;\
        }\
        .sam-bubble .icon-chat { opacity: 1; transform: rotate(0deg); }\
        .sam-bubble .icon-close { opacity: 0; transform: rotate(-90deg); position: absolute; }\
        .sam-bubble.open .icon-chat { opacity: 0; transform: rotate(90deg); }\
        .sam-bubble.open .icon-close { opacity: 1; transform: rotate(0deg); }\
        .sam-iframe {\
            position: fixed;\
            bottom: 100px;\
            ' + config.position + ': 20px;\
            width: 380px;\
            height: 520px;\
            border: none;\
            border-radius: 16px;\
            box-shadow: 0 8px 32px rgba(0,0,0,0.12);\
            z-index: 2147483646;\
            opacity: 0;\
            transform: scale(0.9) translateY(10px);\
            transform-origin: bottom ' + config.position + ';\
            transition: opacity 0.2s ease, transform 0.2s ease;\
            pointer-events: none;\
            overflow: hidden;\
        }\
        .sam-iframe.open {\
            opacity: 1;\
            transform: scale(1) translateY(0);\
            pointer-events: auto;\
        }\
        @media (max-width: 480px) {\
            .sam-bubble.mobile-hide {\
                display: none;\
            }\
            .sam-iframe {\
                width: 100vw;\
                height: 100vh;\
                bottom: 0;\
                left: 0;\
                right: 0;\
                border-radius: 0;\
                transform-origin: bottom center;\
            }\
        }\
    ';

    var nameInitial = config.name.charAt(0).toUpperCase();

    var CHAT_HTML = '<!DOCTYPE html>\
<html lang="en">\
<head>\
<meta charset="UTF-8">\
<meta name="viewport" content="width=device-width, initial-scale=1.0">\
<style>\
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }\
html, body {\
    height: 100%;\
    overflow: hidden;\
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\
    font-size: 14px;\
    line-height: 1.5;\
    color: #1A1A1A;\
    background: #fff;\
}\
.chat-container {\
    display: flex;\
    flex-direction: column;\
    height: 100%;\
}\
.chat-header {\
    height: 56px;\
    background: ' + config.color + ';\
    display: flex;\
    align-items: center;\
    padding: 0 16px;\
    flex-shrink: 0;\
}\
.header-info {\
    display: flex;\
    align-items: center;\
    flex: 1;\
    min-width: 0;\
}\
.header-name {\
    color: #fff;\
    font-size: 16px;\
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
    margin-left: 8px;\
    flex-shrink: 0;\
}\
.close-btn {\
    background: none;\
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
.close-btn:hover { background: rgba(255,255,255,0.2); }\
.close-btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }\
.close-btn svg {\
    width: 20px;\
    height: 20px;\
}\
.messages {\
    flex: 1;\
    overflow-y: auto;\
    padding: 16px;\
    display: flex;\
    flex-direction: column;\
    gap: 12px;\
}\
.msg-row {\
    display: flex;\
    align-items: flex-end;\
    gap: 8px;\
}\
.msg-row.bot { justify-content: flex-start; }\
.msg-row.user { justify-content: flex-end; }\
.avatar {\
    width: 28px;\
    height: 28px;\
    border-radius: 50%;\
    background: ' + config.color + ';\
    color: #fff;\
    font-size: 12px;\
    font-weight: 600;\
    display: flex;\
    align-items: center;\
    justify-content: center;\
    flex-shrink: 0;\
}\
.msg-bubble {\
    max-width: 80%;\
    padding: 12px 16px;\
    font-size: 14px;\
    line-height: 1.5;\
    word-wrap: break-word;\
    white-space: pre-wrap;\
}\
.msg-row.bot .msg-bubble {\
    background: #F0F0F0;\
    color: #1A1A1A;\
    border-radius: 16px 16px 16px 4px;\
}\
.msg-row.user .msg-bubble {\
    background: ' + config.color + ';\
    color: #fff;\
    border-radius: 16px 16px 4px 16px;\
}\
.typing-indicator {\
    display: flex;\
    align-items: flex-end;\
    gap: 8px;\
}\
.typing-dots {\
    display: flex;\
    align-items: center;\
    gap: 4px;\
    padding: 12px 16px;\
    background: #F0F0F0;\
    border-radius: 16px 16px 16px 4px;\
}\
.typing-dots span {\
    width: 7px;\
    height: 7px;\
    background: #999;\
    border-radius: 50%;\
    animation: bounce 1.2s infinite;\
}\
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }\
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }\
@keyframes bounce {\
    0%, 60%, 100% { transform: translateY(0); }\
    30% { transform: translateY(-4px); }\
}\
.input-bar {\
    height: 56px;\
    display: flex;\
    align-items: center;\
    padding: 0 12px;\
    border-top: 1px solid #E5E5E5;\
    flex-shrink: 0;\
    gap: 8px;\
}\
.input-wrapper {\
    flex: 1;\
    position: relative;\
    display: flex;\
    align-items: center;\
}\
.msg-input {\
    width: 100%;\
    border: none;\
    outline: none;\
    font-size: 14px;\
    font-family: inherit;\
    padding: 8px 4px;\
    background: transparent;\
    color: #1A1A1A;\
}\
.msg-input::placeholder { color: #999; }\
.msg-input:disabled { opacity: 0.6; }\
.char-count {\
    position: absolute;\
    right: 4px;\
    top: -18px;\
    font-size: 11px;\
    color: #999;\
}\
.char-count.warn { color: #e53e3e; }\
.send-btn {\
    width: 36px;\
    height: 36px;\
    border-radius: 50%;\
    border: none;\
    background: ' + config.color + ';\
    cursor: pointer;\
    display: flex;\
    align-items: center;\
    justify-content: center;\
    transition: opacity 0.15s ease;\
    flex-shrink: 0;\
    padding: 0;\
}\
.send-btn:disabled {\
    opacity: 0.4;\
    cursor: default;\
}\
.send-btn:focus-visible { outline: 2px solid ' + config.color + '; outline-offset: 2px; }\
.footer {\
    height: 28px;\
    background: #FAFAFA;\
    border-top: 1px solid #F0F0F0;\
    display: flex;\
    align-items: center;\
    justify-content: center;\
    flex-shrink: 0;\
}\
.footer span {\
    font-size: 11px;\
    color: #999;\
}\
.footer a {\
    color: #999;\
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
            <span class="header-name">' + config.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>\
            <span class="online-dot"></span>\
        </div>\
        <button class="close-btn" aria-label="Close chat">\
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>\
        </button>\
    </div>\
    <div class="messages" role="log" aria-live="polite" id="messages"></div>\
    <div class="input-bar">\
        <div class="input-wrapper">\
            <input type="text" class="msg-input" placeholder="Type a message..." aria-label="Type a message" maxlength="2000" id="msgInput">\
        </div>\
        <button class="send-btn" aria-label="Send message" disabled id="sendBtn">\
            ' + ICON_SEND + '\
        </button>\
    </div>\
    <div class="footer">\
        <span>Powered by <a href="https://trysam.co" target="_blank" rel="noopener noreferrer">Sam</a></span>\
    </div>\
</div>\
</body>\
</html>';

    // ============================================
    // 5. STATE
    // ============================================
    var isOpen = false;
    var isAnimating = false;
    var isWaiting = false;
    var iframeInitialized = false;
    var lastSendTime = 0;
    var userHasScrolled = false;

    // iframe document references
    var iframeDoc = null;
    var messagesEl = null;
    var inputEl = null;
    var sendBtnEl = null;

    // DOM elements
    var bubbleBtn = null;
    var chatIframe = null;
    var shadowRoot = null;

    // ============================================
    // 6. CREATE BUBBLE (Shadow DOM)
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
    // 7. CREATE CHAT WINDOW (Iframe)
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

            // Event listeners inside iframe
            sendBtnEl.addEventListener('click', handleSend);
            inputEl.addEventListener('keydown', handleKeyPress);
            inputEl.addEventListener('input', handleInputChange);

            // Close button
            var closeBtn = iframeDoc.querySelector('.close-btn');
            closeBtn.addEventListener('click', toggleChat);

            // Escape key closes chat
            iframeDoc.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && isOpen) {
                    toggleChat();
                }
            });

            // Track user scroll position
            messagesEl.addEventListener('scroll', function() {
                var el = messagesEl;
                var atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
                userHasScrolled = !atBottom;
            });

            // Focus trap: Tab cycles through input -> send -> close
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

            // Add welcome message
            appendMessage('bot', config.welcome);
        });
    }

    // ============================================
    // 8. MESSAGE HANDLING
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
        bubble.textContent = content;
        row.appendChild(bubble);

        messagesEl.appendChild(row);
        scrollToBottom();
    }

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
    }

    function hideTypingIndicator() {
        if (!messagesEl) return;
        var indicator = messagesEl.querySelector('.typing-indicator');
        if (indicator) indicator.remove();
    }

    function scrollToBottom() {
        if (!messagesEl || userHasScrolled) return;
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // ============================================
    // 9. API COMMUNICATION
    // ============================================
    async function sendMessage(text) {
        appendMessage('user', text);
        showTypingIndicator();
        setInputDisabled(true);

        var controller = new AbortController();
        var timeout = setTimeout(function() { controller.abort(); }, 15000);

        try {
            var response = await fetch(config.apiUrl + '/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenant_slug: config.tenant,
                    message: text,
                    channel: 'web',
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
    // 10. EVENT HANDLERS
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

        // Character count when past 1500
        var wrapper = inputEl.parentElement;
        var existing = wrapper.querySelector('.char-count');
        var len = inputEl.value.length;

        if (len > 1500) {
            if (!existing) {
                existing = iframeDoc.createElement('div');
                existing.className = 'char-count';
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

            // Mobile: hide bubble
            if (window.innerWidth <= 480) {
                bubbleBtn.classList.add('mobile-hide');
            }

            setTimeout(function() {
                isAnimating = false;
                focusInput();
            }, 200);
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

    // Escape key on host page closes chat
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isOpen) {
            toggleChat();
        }
    });

    // ============================================
    // 11. INITIALIZE
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
