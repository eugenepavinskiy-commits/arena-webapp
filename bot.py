import json
import os
import random
import threading
import sqlite3
import telebot
import urllib.request
from flask import Flask, jsonify, request, send_file
from telebot.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton

TOKEN = "8630345177:AAGAWF_NoazomK6XJmjRKY3fkF_Ue_R9YuM"
bot = telebot.TeleBot(TOKEN)
app = Flask(__name__)

# --- ПОДГОТОВКА БАЗЫ ДАННЫХ (SQLite) ---
DB_FILE = "database.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            class_id TEXT,
            level INTEGER,
            rating INTEGER,
            hero_data TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# --- МАРШРУТЫ FLASK (ВЕБ-ПРИЛОЖЕНИЕ И API) ---
@app.route("/")
def index():
    return send_file("index.html")

@app.route("/api/save", methods=["POST"])
def save_player():
    data = request.json
    if not data or "id" not in data:
        return jsonify({"status": "error", "message": "Нет данных или ID"}), 400

    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        INSERT INTO users (id, name, class_id, level, rating, hero_data)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name=excluded.name,
            class_id=excluded.class_id,
            level=excluded.level,
            rating=excluded.rating,
            hero_data=excluded.hero_data
    ''', (
        str(data["id"]), 
        data.get("name", "Гладиатор"), 
        data.get("class_id", "knight"), 
        data.get("level", 1), 
        data.get("rating", 1000), 
        data.get("hero_data", "")
    ))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})

@app.route("/api/load/<user_id>", methods=["GET"])
def load_player(user_id):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('SELECT hero_data FROM users WHERE id = ?', (str(user_id),))
    row = c.fetchone()
    conn.close()
    if row:
        return jsonify({"status": "ok", "hero_data": row[0]})
    return jsonify({"status": "not_found"})

@app.route("/api/leaderboard", methods=["GET"])
def get_leaderboard():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('SELECT name, class_id, level, rating FROM users ORDER BY rating DESC LIMIT 10')
    rows = c.fetchall()
    conn.close()
    leaderboard = []
    for row in rows:
        leaderboard.append({
            "name": row[0],
            "cls": row[1],
            "level": row[2],
            "rating": row[3]
        })
    return jsonify({"status": "ok", "leaderboard": leaderboard})

@app.route("/api/pvp_opponent/<int:level>", methods=["GET"])
def get_pvp_opponent(level):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    min_level = max(1, level - 3)
    max_level = level + 3
    c.execute('''
        SELECT name, class_id, level, rating, hero_data 
        FROM users 
        WHERE level BETWEEN ? AND ? 
        ORDER BY RANDOM() LIMIT 1
    ''', (min_level, max_level))
    row = c.fetchone()
    conn.close()
    if row:
        return jsonify({
            "status": "ok",
            "opponent": {
                "name": row[0],
                "cls": row[1],
                "level": row[2],
                "rating": row[3],
                "hero_data": row[4]
            }
        })
    return jsonify({"status": "not_found"})

# --- ЭНДПОИНТ ДЛЯ ПОКУПКИ АЛМАЗОВ ЗА TELEGRAM STARS ---
@app.route("/api/create-invoice", methods=["POST"])
def create_invoice():
    data = request.json
    if not data:
        return jsonify({"error": "Нет данных"}), 400
        
    tg_url = f"https://api.telegram.org/bot{TOKEN}/createInvoiceLink"
    
    payload = {
        "title": data.get("title"),
        "description": data.get("description"),
        "payload": data.get("payload"),
        "provider_token": "",  # Обязательно пусто для Telegram Stars
        "currency": "XTR",     # Валюта Telegram Stars
        "prices": [{"label": "Алмазы", "amount": data.get("starsAmount")}]
    }
    
    req_obj = urllib.request.Request(
        tg_url, 
        data=json.dumps(payload).encode('utf-8'), 
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req_obj) as response:
            resp_data = json.loads(response.read().decode())
            if resp_data.get("ok"):
                return jsonify({"invoiceUrl": resp_data["result"]})
            else:
                return jsonify({"error": resp_data.get("description")}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- ЛОГИКА БОТА (TELEGRAM) ---
@bot.message_handler(commands=["start"])
def send_welcome(message):
    webapp_url = "https://arena-webapp-production-63ef.up.railway.app/?v=28"
    
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
    threading.Thread(target=run_bot, daemon=True).start()
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
