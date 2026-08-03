from flask import Flask, render_template, request, jsonify
from groq import Groq
from tavily import TavilyClient
from dotenv import load_dotenv
import os

# ==============================
# Load Environment Variables
# ==============================

load_dotenv()

# ==============================
# API Clients
# ==============================

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

tavily = TavilyClient(
    api_key=os.getenv("TAVILY_API_KEY")
)

# ==============================
# Flask
# ==============================

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")


# ==============================
# Helper Function
# Decide if search is required
# ==============================

def needs_live_search(message):

    keywords = [
        "latest",
        "today",
        "current",
        "news",
        "weather",
        "score",
        "result",
        "won",
        "winner",
        "yesterday",
        "this week",
        "this month",
        "2026",
        "2027",
        "breaking"
    ]

    message = message.lower()

    return any(word in message for word in keywords)


# ==============================
# Chat Route
# ==============================

@app.route("/chat", methods=["POST"])
def chat():

    try:

        data = request.get_json()

        user_message = data["message"]

        # ------------------------------
        # INTERNET SEARCH
        # ------------------------------

        extra_context = ""

        if needs_live_search(user_message):

            search = tavily.search(
                query=user_message,
                max_results=5
            )

            for result in search["results"]:
                extra_context += (
                    f"\nTitle: {result['title']}\n"
                    f"Content: {result['content']}\n"
                    f"Source: {result['url']}\n"
                )

        # ------------------------------
        # Ask Groq
        # ------------------------------

        completion = client.chat.completions.create(

            model="llama-3.3-70b-versatile",

            messages=[

                {
                    "role": "system",
                    "content":
                    """
                    You are JARVIS, a professional AI assistant.

                    If internet search results are provided,
                    use them to answer accurately.

                    If no search results are provided,
                    answer using your own knowledge.

                    Never mention your knowledge cutoff.

                    If the information is uncertain,
                    say so politely.
                    """
                },

                {
                    "role": "system",
                    "content": extra_context
                },

                {
                    "role": "user",
                    "content": user_message
                }

            ],

            temperature=0.7,

            max_tokens=1024

        )

        reply = completion.choices[0].message.content

        return jsonify({
            "reply": reply
        })

    except Exception as e:

        return jsonify({
            "reply": f"Error: {str(e)}"
        })


if __name__ == "__main__":
    app.run(debug=True)