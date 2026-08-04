// =======================================
// JARVIS AI
// =======================================

const chatArea = document.getElementById("chatArea");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

const sidebar = document.querySelector(".sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const welcomeScreen = document.getElementById("welcomeScreen");

function scrollToBottom() {

    requestAnimationFrame(() => {

        chatArea.scrollTo({
            top: chatArea.scrollHeight,
            behavior: "smooth"
        });

    });

}

//let chatStarted = false;

// Current Time
function currentTime() {
    const now = new Date();

    return now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

// Create Message
function createMessage(text, sender) {

    const message = document.createElement("div");

    message.className = `message ${sender}`;

    message.innerHTML = `

        

        <div class="bubble">

            <div class="message-header"></div>

            <p>${text}</p>

        </div>

    `;

    chatArea.appendChild(message);
    scrollToBottom();

    // Always scroll to newest message
    

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