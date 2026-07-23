import json
import os
import random
import threading
import telebot
from flask import Flask, jsonify, render_template, request
from telebot.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton

TOKEN = "8630345177:AAGAWF_NoazomK6XJmjRKY3fkF_Ue_R9YuM"
bot = telebot.TeleBot(TOKEN)
app = Flask(__name__, template_folder="templates")

DATA_FILE = "players_data.json"

# --- ЛОГИКА СОХРАНЕНИЯ ---
def load_players():
    if not os.path.exists(DATA_FILE):
        return {}
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {}

def save_players_to_file(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


# --- МАРШРУТЫ FLASK (ВЕБ-ПРИЛОЖЕНИЕ) ---

@app.route("/")
def index():
    # Отдаем нашу крутую страницу с героем!
    return render_template("game.html")

@app.route("/api/save", methods=["POST"])
def save_player():
    data = request.json
    if not data or "user_id" not in data:
        return jsonify({"status": "error"}), 400

    players = load_players()
    user_id_str = str(data["user_id"])

    players[user_id_str] = {
        "user_id": data["user_id"],
        "username": data.get("username", "Гладиатор"),
        "lvl": data.get("lvl", 1),
        "str": data.get("str", 10),
        "agi": data.get("agi", 10),
        "hp": data.get("hp", 100),
        "rating": data.get("rating", 0),
        "wins": data.get("wins", 0),
    }

    save_players_to_file(players)
    return jsonify({"status": "ok"})


# --- ЛОГИКА БОТА (TELEGRAM) ---

@bot.message_handler(commands=["start"])
def send_welcome(message):
    # Добавил параметр ?v=777 чтобы 100% сбить кэш Telegram при запуске!
    webapp_url = "https://arena-webapp-production.up.railway.app/?v=7787"
    
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton("⚔️ Играть в Арену", web_app=WebAppInfo(url=webapp_url)))

    try:
        with open("static/1784659131417.png", "rb") as photo_file:
            bot.send_photo(
                message.chat.id,
                photo_file,
                caption=(
                    "⚔️ **Добро пожаловать на Арену Героев!** ⚔️\n\n"
                    "Прими вызов судьбы! Вступай в схватку с реальными противниками, "
                    "прокачивай своего гладиатора и стань чемпионом "
                    "Гладиаторских Легенд прямо в Telegram!\n\n"
                    "Нажми кнопку ниже, чтобы войти в игру:"
                ),
                parse_mode="Markdown",
                reply_markup=markup
            )
    except FileNotFoundError:
        bot.send_message(
            message.chat.id,
            (
                "⚔️ **Добро пожаловать на Арену Героев!** ⚔️\n\n"
                "Прими вызов судьбы! Нажми кнопку ниже, чтобы войти в игру:"
            ),
            parse_mode="Markdown",
            reply_markup=markup
        )

# --- ЗАПУСК СЕРВЕРА И БОТА ---

def run_bot():
    bot.infinity_polling()

if __name__ == "__main__":
    # Запускаем бота в отдельном потоке, чтобы он не мешал веб-серверу
    threading.Thread(target=run_bot, daemon=True).start()
    
    # Запускаем веб-сервер Flask
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))



