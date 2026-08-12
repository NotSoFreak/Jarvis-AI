// =======================================
// DEXTER APP CONTROLLER
// =======================================

// DOM Elements
const chatArea = document.getElementById("chatArea");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const voiceBtn = document.getElementById("voiceBtn");

const sidebar = document.querySelector(".sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const welcomeScreen = document.getElementById("welcomeScreen");

const activeModelBadge = document.getElementById("activeModelBadge");
const modelDropdown = document.getElementById("modelDropdown");

// App State
let selectedModel = "auto";
let isVoiceInput = false;
let userHasScrolledUp = false;
let lastScrollTop = 0;

// Purge any stale chat history localStorage key
try { localStorage.removeItem("dexter_chat_history"); } catch (e) {}

// =======================================
// AUTO SCROLL CONTROL
// =======================================

function scrollToBottom(force = false) {
    if (force) {
        userHasScrolledUp = false;
    }
    if (userHasScrolledUp) return;
    if (chatArea) {
        chatArea.scrollTop = chatArea.scrollHeight;
    }
}

if (chatArea) {
    chatArea.addEventListener("scroll", () => {
        const threshold = 50;
        const distanceToBottom = chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight;

        if (chatArea.scrollTop < lastScrollTop && distanceToBottom > threshold) {
            userHasScrolledUp = true;
        }

        if (distanceToBottom <= threshold) {
            userHasScrolledUp = false;
        }

        lastScrollTop = chatArea.scrollTop;
    });
}

// Current Time Utility
function currentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// =======================================
// MARKDOWN & TYPEWRITER EFFECT
// =======================================

function renderMarkdown(text) {
    if (typeof marked !== 'undefined') {
        return marked.parse(text);
    }
    return text.replace(/\n/g, '<br>');
}

function typeText(element, text) {
    let speed = 8;
    if (text.length > 200) speed = 3;
    if (text.length > 500) speed = 0;

    let i = 0;
    let accumulated = "";

    function typing() {
        if (i < text.length) {
            accumulated += text.charAt(i);
            i++;
            element.innerHTML = renderMarkdown(accumulated);
            scrollToBottom();
            setTimeout(typing, speed);
        } else {
            element.innerHTML = renderMarkdown(text);
            scrollToBottom();
        }
    }

    typing();
}

// Create Message Bubble
function createMessage(text, sender) {
    if (!chatArea) return;
    const message = document.createElement("div");
    message.className = `message ${sender}`;

    message.innerHTML = `
        <div class="bubble"></div>
    `;

    chatArea.appendChild(message);

    const bubble = message.querySelector(".bubble");

    if (sender === "bot") {
        typeText(bubble, text);
    } else {
        const p = document.createElement("p");
        p.textContent = text;
        bubble.appendChild(p);
        scrollToBottom();
    }
}

// =======================================
// TYPING INDICATOR CONTROLS
// =======================================

function showTypingIndicator() {
    let indicator = document.getElementById("typingIndicator");

    if (!indicator) {
        indicator = document.createElement("div");
        indicator.id = "typingIndicator";
        indicator.className = "message bot typing-indicator";

        indicator.innerHTML = `
            <div class="bubble typing-bubble">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        `;
    }

    if (chatArea) {
        chatArea.appendChild(indicator);
        indicator.style.display = "flex";
        scrollToBottom();
    }
}

function hideTypingIndicator() {
    const indicator = document.getElementById("typingIndicator");
    if (indicator) {
        indicator.style.display = "none";
        indicator.remove();
    }
}

// =======================================
// SEND MESSAGE
// =======================================

function sendMessage() {
    if (!userInput) return;
    const text = userInput.value.trim();
    if (text === "") return;

    scrollToBottom(true);

    if (welcomeScreen) {
        welcomeScreen.style.opacity = "0";
        setTimeout(() => {
            try { welcomeScreen.remove(); } catch(e){}
        }, 500);
    }

    if (chatArea) {
        chatArea.classList.add("chat-started");
    }

    createMessage(text, "user");
    userInput.value = "";

    showTypingIndicator();

    fetch("/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: text,
            model: selectedModel
        })
    })
    .then(response => response.json())
    .then(data => {
        hideTypingIndicator();

        const modelNameEl = document.getElementById("modelName");
        if (modelNameEl && data.model) {
            modelNameEl.textContent = data.model;
        }

        createMessage(data.reply, "bot");

        if (isVoiceInput) {
            speak(data.reply);
            isVoiceInput = false;
        }
    })
    .catch(error => {
        hideTypingIndicator();
        createMessage("Something went wrong. Please check your connection and try again.", "bot");
        isVoiceInput = false;
        console.error("Chat error:", error);
    });
}

// =======================================
// MODEL SELECTOR DROPDOWN
// =======================================

if (activeModelBadge && modelDropdown) {
    activeModelBadge.addEventListener("click", (e) => {
        e.stopPropagation();
        modelDropdown.classList.toggle("show");
        activeModelBadge.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
        if (!modelDropdown.contains(e.target) && !activeModelBadge.contains(e.target)) {
            modelDropdown.classList.remove("show");
            activeModelBadge.classList.remove("active");
        }
    });

    const items = modelDropdown.querySelectorAll(".model-dropdown-item");
    items.forEach(item => {
        item.addEventListener("click", () => {
            items.forEach(i => i.classList.remove("active"));
            item.classList.add("active");

            selectedModel = item.getAttribute("data-model");

            const modelDisplayNames = {
                "auto": "Groq (llama-3.3-70b)",
                "groq": "Groq (llama-3.3-70b)",
                "gemini": "Gemini (gemini-1.5-flash)",
                "openrouter": "OpenRouter (llama-3.3-70b)"
            };

            const displayName = modelDisplayNames[selectedModel] || "Groq (llama-3.3-70b)";
            const modelNameEl = document.getElementById("modelName");
            if (modelNameEl) {
                modelNameEl.textContent = displayName;
            }

            modelDropdown.classList.remove("show");
            activeModelBadge.classList.remove("active");
        });
    });
}

// =======================================
// BUTTON & KEY BINDINGS
// =======================================

if (sendBtn) {
    sendBtn.addEventListener("click", () => {
        isVoiceInput = false;
        sendMessage();
    });
}

if (userInput) {
    userInput.addEventListener("keydown", function(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            isVoiceInput = false;
            sendMessage();
        }
    });
}

// =======================================
// SIDEBAR TOGGLE
// =======================================

function isMobile() {
    return window.matchMedia("(max-width: 768px)").matches;
}

const mobileMenuBtn = document.getElementById("mobileMenuBtn");

if (sidebar) {
    if (!isMobile()) {
        sidebar.classList.add("collapsed");
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener("click", () => {
            if (isMobile()) {
                sidebar.classList.remove("collapsed");
                sidebar.classList.toggle("show");
                if (sidebarOverlay) {
                    sidebarOverlay.classList.toggle("show");
                }
            } else {
                sidebar.classList.toggle("collapsed");
            }
        });
    }

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            sidebar.classList.remove("collapsed");
            sidebar.classList.toggle("show");
            if (sidebarOverlay) {
                sidebarOverlay.classList.toggle("show");
            }
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener("click", () => {
            sidebar.classList.remove("show");
            sidebarOverlay.classList.remove("show");
        });
    }
}

// =======================================
// TEXT TO SPEECH
// =======================================

function speak(text) {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = 0.95;
    speech.pitch = 0.9;
    speech.volume = 1;
    speech.lang = "en-US";

    const voices = speechSynthesis.getVoices();
    const maleVoice = voices.find(voice =>
        voice.name.includes("David") ||
        voice.name.includes("Mark") ||
        voice.name.includes("Guy") ||
        voice.name.includes("Daniel") ||
        voice.name.includes("Google UK English Male") ||
        voice.name.includes("English (United States)")
    );

    if (maleVoice) {
        speech.voice = maleVoice;
    }

    speechSynthesis.speak(speech);
}

if (window.speechSynthesis) {
    speechSynthesis.onvoiceschanged = () => {
        speechSynthesis.getVoices();
    };
}

// =======================================
// VOICE RECOGNITION
// =======================================

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition && voiceBtn) {
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let listening = false;
    let finalTranscript = "";

    voiceBtn.addEventListener("click", () => {
        if (!listening) {
            recognition.start();
        } else {
            recognition.stop();
            listening = false;
            voiceBtn.classList.remove("listening");
            if (userInput) userInput.placeholder = "Ask DEXTER anything...";
        }
    });

    recognition.onstart = () => {
        listening = true;
        voiceBtn.classList.add("listening");
        if (userInput) userInput.placeholder = "🎤 Listening...";
    };

    recognition.onresult = (event) => {
        finalTranscript = event.results[0][0].transcript;
        if (userInput) userInput.value = finalTranscript;
    };

    recognition.onend = () => {
        listening = false;
        voiceBtn.classList.remove("listening");
        if (userInput) userInput.placeholder = "Ask DEXTER anything...";
        if (finalTranscript.trim() !== "") {
            isVoiceInput = true;
            sendMessage();
            finalTranscript = "";
        }
    };

    recognition.onerror = () => {
        listening = false;
        voiceBtn.classList.remove("listening");
        if (userInput) userInput.placeholder = "Ask DEXTER anything...";
        finalTranscript = "";
        isVoiceInput = false;
    };
}
