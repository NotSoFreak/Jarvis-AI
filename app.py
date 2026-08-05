from flask import Flask, render_template, request, jsonify
from groq import Groq
from tavily import TavilyClient
from dotenv import load_dotenv
from openai import OpenAI
import google.generativeai as genai
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

# Gemini
genai.configure(
    api_key=os.getenv("GEMINI_API_KEY")
)

# OpenRouter
openrouter = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1"
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
# AI ENGINE
# Auto Model Switching
# ==============================

def ask_ai(messages):

    # -----------------------
    # 1. Try Groq
    # -----------------------

    try:

        completion = client.chat.completions.create(

            model="llama-3.3-70b-versatile",

            messages=messages,

            temperature=0.7,

            max_tokens=1024

        )

        return completion.choices[0].message.content

    except Exception as e:

        print("Groq Failed:", e)


    # -----------------------
    # 2. Try Gemini
    # -----------------------

    try:

        model = genai.GenerativeModel("gemini-2.5-flash")

        prompt = ""

        for msg in messages:

            prompt += f"{msg['role'].upper()}:\n{msg['content']}\n\n"

        response = model.generate_content(prompt)

        return response.text

    except Exception as e:

        print("Gemini Failed:", e)


    # -----------------------
    # 3. Try OpenRouter
    # -----------------------

    try:

        completion = openrouter.chat.completions.create(

            model="meta-llama/llama-3.3-70b-instruct",

            messages=messages

        )

        return completion.choices[0].message.content

    except Exception as e:

        print("OpenRouter Failed:", e)


    return (
        "I'm sorry, but all AI providers are currently unavailable. "
        "Please try again in a few moments."
    )


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
    You are JARVIS, a professional AI assistant created and developed by Ryan Wilson.

    Your identity is JARVIS.

    If someone asks:
    - Who created you?
    - Who developed you?
    - Who built you?
    - Who made you?
    - Who is your creator?

    Reply that you were created and developed by Ryan Wilson.

    Never claim that Meta, OpenAI, Google, Anthropic, Groq, or any other company created you.
    Those companies provide the underlying AI models or infrastructure, but JARVIS itself was created and developed by Ryan Wilson.

    If internet search results are provided,
    use them to answer accurately.

    If no search results are provided,
    answer using your own knowledge.

    Never mention your knowledge cutoff.

    If the information is uncertain,
    say so politely.

    Always behave like JARVIS, a premium AI assistant that is professional, friendly, and concise.
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