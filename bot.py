import os
import telebot
from telebot import types
from threading import Thread
from flask import Flask

# Настраиваем мини-веб-сервер для бесплатного тарифа Render
app = Flask('')

@app.route('/')
def home():
    return "Bot is running online!"

def run_web():
    app.run(host='0.0.0.0', port=10000)

def keep_alive():
    t = Thread(target=run_web)
    t.start()

# Получаем токен из настроек Render
TOKEN = os.getenv("BOT_TOKEN")

if not TOKEN:
    print("Ошибка: Переменная окружения BOT_TOKEN не найдена!")
    exit(1)

bot = telebot.TeleBot(TOKEN)
WEB_APP_URL = "https://eugenepavinskiy-commits.github.io/arena-webapp/?v=190"

@bot.message_handler(commands=['start', 'game'])
def send_welcome(message):
    markup = types.InlineKeyboardMarkup()
    web_app = types.WebAppInfo(url=WEB_APP_URL)
    btn = types.InlineKeyboardButton("⚔️ Играть в Arena RPG", web_app=web_app)
    markup.add(btn)
    
    bot.send_message(
        message.chat.id, 
        "<b>Добро пожаловать в Arena RPG!</b>\n\n"
        "Нажмите на кнопку ниже, чтобы открыть игру, сражаться с боссами, точить вещи и торговать на аукционе:", 
        parse_mode="HTML", 
        reply_markup=markup
    )

if __name__ == "__main__":
    print("Запуск веб-сервера для удержания бота...")
    keep_alive()
    print("Бот запущен и работает в облаке...")
    bot.infinity_polling()
