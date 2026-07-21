import os
import telebot
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

# Ваш токен бота
TOKEN = "8630345177:AAHS29SOLPlE08AdvOkDFnXkDKhUeMl6zbE"

bot = telebot.TeleBot(TOKEN)

@bot.message_handler(commands=['start'])
def send_welcome(message):
    markup = InlineKeyboardMarkup()
    # Замените https://your-app.railway.app на ссылку на ваш задеплоенный Web App, если он открывается отдельно, 
    # либо используйте относительный/прямой запуск
    web_app = WebAppInfo(url="https://arena-webapp-production.up.railway.app/") 
    markup.add(InlineKeyboardButton("⚔️ Играть в Арену", web_app=web_app))
    
    bot.send_message(
        message.chat.id, 
        "Привет! Добро пожаловать на Арену.\nНажми кнопку ниже, чтобы открыть игру и начать сражение!", 
        reply_markup=markup
    )

if __name__ == "__main__":
    print("Бот успешно запущен и ожидает сообщения...")
    bot.infinity_polling()
