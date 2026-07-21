import json
import os
import telebot
from flask import Flask, jsonify, render_template, request
from telebot.types import WebAppInfo

TOKEN = "8630345177:AAGAWF_NoazomK6XJmjRKY3fkF_Ue_R9YuM"
bot = telebot.TeleBot(TOKEN)
app = Flask(__name__, template_folder="templates")

DATA_FILE = "players_data.json"


# Загрузка игроков из JSON-файла
def load_players():
  if not os.path.exists(DATA_FILE):
    return {}
  try:
    with open(DATA_FILE, "r", encoding="utf-8") as f:
      return json.load(f)
  except:
    return {}


# Сохранение игроков в JSON-файл
def save_players_to_file(data):
  with open(DATA_FILE, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=4)


# Главная страница игры (отдает index.html из папки templates)
@app.route("/")
def index():
  return render_template("index.html")


@bot.message_handler(commands=["start"])
def send_welcome(message):
  markup = telebot.types.InlineKeyboardMarkup()
  web_app = WebAppInfo(
      url="https://arena-webapp-production.up.railway.app/?v=107"
  )
  markup.add(
      telebot.types.InlineKeyboardButton("⚔️ Играть в Арену", web_app=web_app)
  )
  bot.send_message(
      message.chat.id,
      (
          "Привет! Добро пожаловать на Арену. Сражайся с реальными"
          " соперниками!"
      ),
      reply_markup=markup,
  )


# API для сохранения прогресса игрока
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


# API для поиска реального соперника для PvP (из очереди/базы)
@app.route("/api/pvp/find", methods=["POST"])
def find_pvp_opponent():
  data = request.json
  my_id = str(data.get("user_id"))

  players = load_players()
  other_players = [
      p for uid, p in players.items() if str(uid) != str(my_id)
  ]

  if not other_players:
    return jsonify({"found": False})

  import random

  opp = random.choice(other_players)
  formatted_opp = {
      "user_id": opp["user_id"],
      "name": opp["username"],
      "lvl": opp["lvl"],
      "str": opp["str"],
      "agi": opp["agi"],
      "hp": opp["hp"],
      "maxHp": opp["hp"],
      "gold": 150,
      "ratingGain": 30,
      "icon": "⚔️",
  }
  return jsonify({"found": True, "opponent": formatted_opp})


# API для Глобального рейтинга (Топ-10)
@app.route("/api/leaderboard", methods=["GET"])
def get_leaderboard():
  players = load_players()
  sorted_players = sorted(
      players.values(), key=lambda x: x.get("rating", 0), reverse=True
  )

  leaders = []
  for p in sorted_players[:10]:
    leaders.append({
        "name": p.get("username", "Гладиатор"),
        "rating": p.get("rating", 0),
        "lvl": p.get("lvl", 1),
    })
  return jsonify(leaders)


# API для отправки багов и обратной связи
@app.route("/api/feedback", methods=["POST"])
def receive_feedback():
  data = request.json
  if not data or "message" not in data:
    return jsonify({"status": "error"}), 400

  user_id = data.get("user_id", "Неизвестно")
  username = data.get("username", "Гладиатор")
  text = data.get("message", "")

  try:
    bot.send_message(
        user_id, f"✅ Спасибо! Ваш отчет об ошибке отправлен разработчику."
    )
  except Exception as e:
    print("Ошибка отправки сообщения:", e)

  return jsonify({"status": "ok"})


if __name__ == "__main__":
  app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
