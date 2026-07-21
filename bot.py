import os
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
import telebot
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

# Ваш токен бота
TOKEN = "8630345177:AAEtJ-GwXZ8v7HsQ0hv9mWUrcuxG-rFirj4"
bot = telebot.TeleBot(TOKEN)

# Функция для запуска веб-сервера, чтобы Telegram мог загрузить index.html
def run_web_server():
    port = int(os.environ.get("PORT", 8080))
    server_address = ("", port)
    httpd = HTTPServer(server_address, SimpleHTTPRequestHandler)
    print(f"Веб-сервер запущен на порту {port}")
    httpd.serve_forever()

@bot.message_handler(commands=['start'])
def send_welcome(message):
    markup = InlineKeyboardMarkup()
    # Ссылка на ваше веб-приложение в Railway
    web_app = WebAppInfo(url="https://arena-webapp-production.up.railway.app/") 
    markup.add(InlineKeyboardButton("⚔️ Играть в Арену", web_app=web_app))
    
    bot.send_message(
        message.chat.id, 
        "Привет! Добро пожаловать на Арену.\nНажми кнопку ниже, чтобы открыть игру и начать сражение!", 
        reply_markup=markup
    )

if __name__ == "__main__":
    # Запускаем веб-сервер в фоновом режиме
    server_thread = threading.Thread(target=run_web_server, daemon=True)
    server_thread.start()
    
    print("Бот успешно запущен и ожидает сообщения...")
    bot.infinity_polling()
