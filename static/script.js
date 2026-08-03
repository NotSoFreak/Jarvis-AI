// =======================================
// JARVIS AI
// =======================================

const chatArea = document.getElementById("chatArea");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

const sidebar = document.querySelector(".sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");

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

    chatArea.classList.add("chat-started");

    // Move welcome section up only once
    

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

sidebarToggle.addEventListener("click", () => {

    sidebar.classList.toggle("collapsed");

});