// =======================================
// JARVIS AI
// =======================================

const chatArea = document.getElementById("chatArea");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const voiceBtn = document.getElementById("voiceBtn");

const sidebar = document.querySelector(".sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const welcomeScreen = document.getElementById("welcomeScreen");
let autoScroll = true;
let userScrolling = false;

function scrollToBottom() {

    requestAnimationFrame(() => {

        chatArea.scrollTo({
            top: chatArea.scrollHeight,
            behavior: "smooth"
        });

    });

}

// =======================================
// AUTO SCROLL CONTROL
// =======================================

chatArea.addEventListener("scroll", () => {

    const isAtBottom =
        chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight < 20;

    if (isAtBottom) {

        userScrolling = false;

    }

});

//let chatStarted = false;

// Current Time
function currentTime() {
    const now = new Date();

    return now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

// =======================================
// TYPEWRITER EFFECT
// =======================================

function typeText(element, text) {

    let speed = 8;

if (text.length > 200) speed = 3;
if (text.length > 500) speed = 0;

    let i = 0;

    function typing() {

    if (i < text.length) {

        element.textContent += text.charAt(i);
        i++;

        if (!userScrolling) {

    scrollToBottom();

    }

        setTimeout(typing, speed);

    }

}

typing();

}



// Create Message
function createMessage(text, sender) {

    const message = document.createElement("div");

    message.className = `message ${sender}`;

    message.innerHTML = `

        

        <div class="bubble">

            <div class="message-header"></div>

            <p></p>

        </div>

    `;

    chatArea.appendChild(message);

const paragraph = message.querySelector("p");

if (sender === "bot") {

    autoScroll = true;
    typeText(paragraph, text);

} else {

    paragraph.textContent = text;
    scrollToBottom();

}

    // Always scroll to newest message
    

}

// =======================================
// TEXT TO SPEECH
// =======================================

function speak(text) {

    speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);

    speech.rate = 1;
    speech.pitch = 1;
    speech.volume = 1;

    speech.lang = "en-US";

    speechSynthesis.speak(speech);

}

// =======================================
// SEND MESSAGE
// =======================================

function sendMessage() {

    const text = userInput.value.trim();

    if (text === "") return;

    // Hide welcome screen on first message
    if (welcomeScreen) {

        welcomeScreen.style.opacity = "0";

        setTimeout(() => {

            welcomeScreen.remove();

        }, 500);

    }

    chatArea.classList.add("chat-started");

    // User Message
    createMessage(text, "user");

    userInput.value = "";

    // Show typing animation
    document.querySelector(".typing-indicator").style.display = "flex";

    fetch("/chat", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            message: text
        })

    })

    .then(response => response.json())

    .then(data => {

    document.querySelector(".typing-indicator").style.display = "none";

    createMessage(data.reply, "bot");

    speak(data.reply);

})

    .catch(error => {

        document.querySelector(".typing-indicator").style.display = "none";

        createMessage("Something went wrong.", "bot");

        console.log(error);

    });

}

// =======================================
// BUTTON
// =======================================

sendBtn.addEventListener("click", sendMessage);

// =======================================
// ENTER KEY
// =======================================

userInput.addEventListener("keydown", function(e){

    if(e.key === "Enter" && !e.shiftKey){

        e.preventDefault();

        sendMessage();

    }

});



// ===============================
// SIDEBAR TOGGLE
// ===============================

function isMobile() {
    return window.matchMedia("(max-width: 768px)").matches;
}

// Desktop starts collapsed
if (!isMobile()) {
    sidebar.classList.add("collapsed");
}

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

if (sidebarOverlay) {

    sidebarOverlay.addEventListener("click", () => {

        sidebar.classList.remove("show");
        sidebarOverlay.classList.remove("show");

    });

}

// =======================================
// VOICE RECOGNITION
// =======================================

const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {

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

            userInput.placeholder = "Ask JARVIS anything...";

        }

    });

    recognition.onstart = () => {

        listening = true;

        voiceBtn.classList.add("listening");

        userInput.placeholder = "🎤 Listening...";

    };

    recognition.onresult = (event) => {

        finalTranscript = event.results[0][0].transcript;

        userInput.value = finalTranscript;

    };

    recognition.onend = () => {

        listening = false;

        voiceBtn.classList.remove("listening");

        userInput.placeholder = "Ask JARVIS anything...";

        if (finalTranscript.trim() !== "") {

            sendMessage();

            finalTranscript = "";

        }

    };

    recognition.onerror = () => {

        listening = false;

        voiceBtn.classList.remove("listening");

        userInput.placeholder = "Ask JARVIS anything...";

        finalTranscript = "";

    };

}



