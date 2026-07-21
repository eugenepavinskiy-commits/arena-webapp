import os
import telebot
from telebot import types

TOKEN = os.getenv("BOT_TOKEN")

if not TOKEN:
    print("Ошибка: Переменная окружения BOT_TOKEN не найдена!")
    exit(1)

bot = telebot.TeleBot(TOKEN)
WEB_APP_URL = "https://eugenepavinskiy-commits.github.io/arena-webapp/?v=190"
ADMIN_ID = 752251268

@bot.message_handler(commands=['start', 'game'])
def send_welcome(message):
    markup = types.InlineKeyboardMarkup()
    web_app = types.WebAppInfo(url=WEB_APP_URL)
    btn = types.InlineKeyboardButton("⚔️ Играть в Arena RPG", web_app=web_app)
    markup.add(btn)
    
    bot.send_message(
        message.chat.id, 
        "<b>Добро пожаловать в Arena RPG!</b>\n\n"
        "Нажмите на кнопку ниже, чтобы открыть игру:", 
        parse_mode="HTML", 
        reply_markup=markup
    )

@bot.message_handler(commands=['feedback'])
def feedback_command(message):
    msg = bot.send_message(message.chat.id, "✍️ Напишите ваше предложение или баг следующим сообщением:")
    bot.register_next_step_handler(msg, save_feedback)

def save_feedback(message):
    user_info = f"От: @{message.from_user.username} [ID: {message.from_user.id}]"
    bot.send_message(ADMIN_ID, f"📩 <b>Отзыв:</b>\n{user_info}\n\n{message.text}", parse_mode="HTML")
    bot.send_message(message.chat.id, "✅ Спасибо! Отзыв отправлен.")

if __name__ == "__main__":
    print("Бот успешно запущен и работает...")
    bot.infinity_polling()
