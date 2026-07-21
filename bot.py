import json
import os
import random
import telebot
from telebot.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton

TOKEN = "8630345177:AAGAWF_NoazomK6XJmjRKY3fkF_Ue_R9YuM"
bot = telebot.TeleBot(TOKEN)

# Функция для отправки приветствия с картинкой и кнопкой
@bot.message_handler(commands=["start"])
def send_welcome(message):
    # URL вашего Web App (убедитесь, что он правильный)
    webapp_url = "https://arena-webapp-production.up.railway.app/?v=108"
    
    # Создаем клавиатуру с кнопкой
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton("⚔️ Играть в Арену", web_app=WebAppInfo(url=webapp_url)))

    # Путь к вашей картинке на сервере (предполагаем, что файл там)
    # Мы используем прямой путь к файлу, который вы загрузили на GitHub
    # (GitHub Pages не нужны, если файл в папке static, к которой есть доступ извне,
    # но для надежности лучше использовать публичный URL картинки, если она где-то хостится,
    # или дать боту отправить локальный файл, если бот запущен с ним).
    # Самый простой способ для Telegram Bot API — указать URL файла, если он доступен по прямой ссылке.
    
    # --- ВАРИАНТ А: Если картинка доступна по прямой ссылке в интернете (например, с imgur или другого хостинга) ---
    # Замените 'ВАША_ПРЯМАЯ_ССЫЛКА_НА_КАРТИНКУ' на реальный URL
    # image_url = "ВАША_ПРЯМАЯ_ССЫЛКА_НА_КАРТИНКУ" 
    
    # --- ВАРИАНТ Б: Если бот имеет доступ к локальному файлу (например, файл лежит рядом с bot.py) ---
    # Рекомендуемый способ, если файл в той же папке на сервере
    try:
        # Открываем файл в режиме чтения бинарных данных
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
        # Если файл не найден, отправляем только текст и кнопку
        bot.send_message(
            message.chat.id,
            (
                "⚔️ **Добро пожаловать на Арену Героев!** ⚔️\n\n"
                "Прими вызов судьбы! Нажми кнопку ниже, чтобы войти в игру:"
            ),
            parse_mode="Markdown",
            reply_markup=markup
        )

# Остальные функции bot.py (save, leaderboard, feedback) остаются без изменений...
# ... (код функций ниже) ...

if __name__ == "__main__":
    # Запуск бота
    bot.infinity_polling()

