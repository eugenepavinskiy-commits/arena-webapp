import os
import telebot
from telebot import types
from threading import Thread
from flask import Flask

# Настраиваем мини-веб-сервер для удержания бесплатного тарифа Render активным
app = Flask('')

@app.route('/')
def home():
    return "Bot is running online!"

def run_web():
    app.run(host='0.0.0.0', port=10000)

def keep_alive():
    t = Thread(target=run_web)
    t.start()

# Получаем токен из защищенных переменных окружения Render
TOKEN = os.getenv("BOT_TOKEN")

if not TOKEN:
    print("Ошибка: Переменная окружения BOT_TOKEN не найдена!")
    exit(1)

bot = telebot.TeleBot(TOKEN)
WEB_APP_URL = "https://eugenepavinskiy-commits.github.io/arena-webapp/?v=190"

# Ваш реальный Telegram ID администратора для получения отзывов
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
        "Нажмите на кнопку ниже, чтобы открыть игру, сражаться с боссами, точить вещи и торговать на аукционе:\n\n"
        "<i>Если хотите отправить отзыв или сообщить о баге, введите команду /feedback</i>", 
        parse_mode="HTML", 
        reply_markup=markup
    )

# Команда для сбора обратной связи от игроков
@bot.message_handler(commands=['feedback'])
def feedback_command(message):
    msg = bot.send_message(
        message.chat.id, 
        "✍️ <b>Напишите ваше предложение или опишите баг следующим сообщением:</b>\n"
        "Ваш отзыв будет отправлен напрямую разработчику.",
        parse_mode="HTML"
    )
    bot.register_next_step_handler(msg, save_feedback)

def save_feedback(message):
    # Формируем информацию об игроке
    username = f"@{message.from_user.username}" if message.from_user.username else "нет юзернейма"
    user_info = f"От: {message.from_user.first_name} ({username}) [ID: {message.from_user.id}]"
    
    feedback_text = (
        f"📩 <b>Новый отзыв от игрока!</b>\n\n"
        f"{user_info}\n\n"
        f"<b>Текст:</b> {message.text}"
    )
    
    try:
        # Отправляем отзыв вам в личные сообщения
        bot.send_message(ADMIN_ID, feedback_text, parse_mode="HTML")
        bot.send_message(message.chat.id, "✅ Спасибо! Ваше сообщение успешно доставлено разработчику.")
    except Exception as e:
        bot.send_message(message.chat.id, "❌ Произошла ошибка при отправке. Попробуйте позже.")
        print(f"Ошибка отправки фидбека: {e}")

if __name__ == "__main__":
    print("Запуск веб-сервера для удержания бота...")
    keep_alive()
    print("Бот запущен и работает автономно в облаке...")
    bot.infinity_polling()
