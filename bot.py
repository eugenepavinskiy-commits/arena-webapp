import os
import sqlite3
import telebot
from flask import Flask, jsonify, render_template, request
from telebot.types import WebAppInfo

TOKEN = "8630345177:AAGAWF_NoazomK6XJmjRKY3fkF_Ue_R9YuM"
bot = telebot.TeleBot(TOKEN)
app = Flask(__name__)


# Инициализация базы данных SQLite
def init_db():
  conn = sqlite3.connect("game_database.db")
  cursor = conn.cursor()
  cursor.execute("""
        CREATE TABLE IF NOT EXISTS players (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            lvl INTEGER,
            str INTEGER,
            agi INTEGER,
            hp INTEGER,
            rating INTEGER,
            wins INTEGER
        )
    """)
  conn.commit()
  conn.close()


init_db()


@app.route("/")
def index():
  return render_template("index.html")


@bot.message_handler(commands=["start"])
def send_welcome(message):
  markup = telebot.types.InlineKeyboardMarkup()
  web_app = WebAppInfo(url="https://arena-webapp-production.up.railway.app/")
  markup.add(
      telebot.types.InlineKeyboardButton("⚔️ Играть в Арену", web_app=web_app)
  )
  bot.send_message(
      message.chat.id,
      "Привет! Добро пожаловать на Арену. Сражайся с реальными игроками!",
      reply_markup=markup,
  )


@app.route("/api/save", methods=["POST"])
def save_player():
  data = request.json
  if not data or "user_id" not in data:
    return jsonify({"status": "error"}), 400

  conn = sqlite3.connect("game_database.db")
  cursor = conn.cursor()
  cursor.execute(
      """
        INSERT INTO players (user_id, username, lvl, str, agi, hp, rating, wins)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            username=excluded.username,
            lvl=excluded.lvl,
            str=excluded.str,
            agi=excluded.agi,
            hp=excluded.hp,
            rating=excluded.rating,
            wins=excluded.wins
    """,
      (
          data["user_id"],
          data.get("username", "Гладиатор"),
          data["lvl"],
          data["str"],
          data["agi"],
          data["hp"],
          data["rating"],
          data["wins"],
      ),
  )
  conn.commit()
  conn.close()
  return jsonify({"status": "ok"})


@app.route("/api/pvp/find", methods=["POST"])
def find_pvp_opponent():
  data = request.json
  my_id = data.get("user_id")

  conn = sqlite3.connect("game_database.db")
  cursor = conn.cursor()
  cursor.execute(
      "SELECT user_id, username, lvl, str, agi, hp, rating FROM players WHERE user_id != ? ORDER"
      " BY RANDOM() LIMIT 1",
      (my_id,),
  )
  row = cursor.fetchone()
  conn.close()

  if not row:
    return jsonify({
        "found": False,
        "opponent": {
            "name": "Манекен для битья",
            "lvl": 1,
            "hp": 100,
            "maxHp": 100,
            "str": 10,
            "agi": 10,
            "gold": 50,
            "ratingGain": 15,
            "icon": "🤖",
        },
    })

  opp = {
      "user_id": row[0],
      "name": row[1] if row[1] else "Гладиатор",
      "lvl": row[2],
      "str": row[3],
      "agi": row[4],
      "hp": row[5],
      "maxHp": row[5],
      "gold": 150,
      "ratingGain": 30,
      "icon": "⚔️",
  }
  return jsonify({"found": True, "opponent": opp})


@app.route("/api/leaderboard", methods=["GET"])
def get_leaderboard():
  conn = sqlite3.connect("game_database.db")
  cursor = conn.cursor()
  cursor.execute(
      "SELECT username, rating, lvl FROM players ORDER BY rating DESC LIMIT 10"
  )
  rows = cursor.fetchall()
  conn.close()

  leaders = []
  for r in rows:
    leaders.append(
        {"name": r[0] if r[0] else "Гладиатор", "rating": r[1], "lvl": r[2]}
    )
  return jsonify(leaders)


if __name__ == "__main__":
  app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
