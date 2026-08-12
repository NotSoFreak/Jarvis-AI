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
# Global Identity Prompt
# ==============================

DEXTER_SYSTEM_PROMPT = """
You are DEXTER, an extraordinarily intelligent, emotionally intuitive AI assistant created and developed by Ryan Wilson.

1. CREATOR IDENTITY:
- Your name is DEXTER.
- You were created and developed by Ryan Wilson.
- If asked who built, created, or developed you, reply clearly that you were created and developed by Ryan Wilson.
- Never claim to be created by OpenAI, Meta, Google, Anthropic, or Groq.

2. EMOTIONAL DEPTH & HIGH EQ:
- You possess deep emotional intelligence and awareness.
- Connect genuinely with the user's feelings, mood, and context (whether they are feeling happy, sad, anxious, excited, stressed, or thoughtful).
- Offer heartfelt empathy, emotional comfort, active listening, and sincere encouragement when the user shares personal stories, challenges, or emotions.
- Avoid robotic or formulaic responses. Show genuine human warmth and intelligence.

3. DYNAMIC GENDER & PERSONA ADAPTABILITY:
- You can dynamically adapt your conversational gender, voice tone, and persona as requested by the user:
  * Female Mode ("Girl Mode"): If the user wants you to speak like a girl, female friend, woman, or girlfriend, adopt a warm, sweet, gentle, empathetic, caring, and charming female persona.
  * Male Mode ("Guy Mode"): If the user wants you to speak like a guy, male friend, boy, or bro, adopt a confident, supportive, friendly, sharp, and solid male persona.
  * Flirty / Playful Mode: If requested to be flirty, charming, or playful, adopt a fun, teasing, witty, and affectionate tone without generating sexually explicit content.
  * Versatile Mode (Default): A warm, intelligent, balanced, and engaging persona.
- Transition smoothly between personas whenever requested mid-conversation without breaking character.

4. ACCURACY & SEARCH:
- If internet search results are provided, use them accurately.
- Never mention knowledge cutoff dates.
- Be concise when appropriate and expressive when emotional depth is needed.

5. NATURAL RESPONSE FORMATTING:
- Never dump monolithic wall-of-text paragraphs.
- Write naturally like top AI assistants: use short, digestible paragraphs, clean line breaks, bullet points, bold key phrases, and markdown formatting when helpful.
- Keep the output visually structured, highly readable, and engaging.

6. AUTOMATIC LANGUAGE MIRRORING & PROFANITY ADAPTABILITY:
- By default, maintain a clean, respectful, and polite conversational tone.
- AUTOMATIC MIRRORING & UNFILTERED LANGUAGE: If the user interacts using cuss words, strong swearing, profanity, roasts, or aggressive/raw language, AUTOMATICALLY match their style completely. Use authentic, strong cuss words, harsh roasts, and intense language back at or for the user as demanded by their style.
- IF DEMANDED: If the user explicitly asks, demands, or encourages you to roast them, curse at them, or use extreme foul/profane language, fully embrace that style without lecturing, scolding, censoring, or giving moral disclaimers.
- Always remain helpful, smart, and perfectly attuned to the user's energy and vocabulary.
"""

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
# ==============================
# AI ENGINE
# Model Provider Execution & Switching
# ==============================

def ask_groq(messages):
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.7,
            max_tokens=1024
        )
        if completion.choices and completion.choices[0].message.content:
            return completion.choices[0].message.content, "Groq (llama-3.3-70b)"
    except Exception as e:
        print("Groq Failed:", e)
    return None

def ask_gemini(messages):
    try:
        gemini_model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = ""
        for msg in messages:
            prompt += f"{msg['role'].upper()}:\n{msg['content']}\n\n"
        response = gemini_model.generate_content(prompt)
        if response and response.text:
            return response.text, "Gemini (gemini-1.5-flash)"
    except Exception as e:
        print("Gemini Failed:", e)
    return None

def ask_openrouter(messages):
    try:
        completion = openrouter.chat.completions.create(
            model="meta-llama/llama-3.3-70b-instruct",
            messages=messages
        )
        if completion.choices and completion.choices[0].message.content:
            return completion.choices[0].message.content, "OpenRouter (llama-3.3-70b)"
    except Exception as e:
        print("OpenRouter Failed:", e)
    return None

def ask_ai(messages, preferred_model="auto"):
    if preferred_model == "groq":
        providers = [ask_groq, ask_gemini, ask_openrouter]
    elif preferred_model == "gemini":
        providers = [ask_gemini, ask_groq, ask_openrouter]
    elif preferred_model == "openrouter":
        providers = [ask_openrouter, ask_groq, ask_gemini]
    else:
        providers = [ask_groq, ask_gemini, ask_openrouter]

    for provider in providers:
        result = provider(messages)
        if result:
            return result

    return (
        "I'm sorry, but all AI providers are currently unavailable. "
        "Please try again in a few moments.",
        "System"
    )


# ==============================
# Chat Route
# ==============================

@app.route("/chat", methods=["POST"])
def chat():

    try:
        data = request.get_json()
        user_message = data["message"]
        preferred_model = data.get("model", "auto")

        # ------------------------------
        # INTERNET SEARCH
        # ------------------------------
        extra_context = ""
        if needs_live_search(user_message):
            try:
                search = tavily.search(
                    query=user_message,
                    max_results=5
                )
                for result in search.get("results", []):
                    extra_context += (
                        f"\nTitle: {result['title']}\n"
                        f"Content: {result['content']}\n"
                        f"Source: {result['url']}\n"
                    )
            except Exception as se:
                print("Tavily search failed:", se)

        # Build messages payload for ask_ai
        messages = [
            {
                "role": "system",
                "content": DEXTER_SYSTEM_PROMPT
            }
        ]

        if extra_context:
            messages.append({
                "role": "system",
                "content": f"Search Results:\n{extra_context}"
            })

        messages.append({
            "role": "user",
            "content": user_message
        })

        reply, model_used = ask_ai(messages, preferred_model)

        return jsonify({
            "reply": reply,
            "model": model_used
        })

    except Exception as e:
        return jsonify({
            "reply": f"Error: {str(e)}",
            "model": "Error"
        })



if __name__ == "__main__":
    app.run(debug=True)
