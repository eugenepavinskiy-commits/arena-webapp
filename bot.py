# API для отправки багов и обратной связи
@app.route("/api/feedback", methods=["POST"])
def receive_feedback():
  data = request.json
  if not data or "message" not in data:
    return jsonify({"status": "error"}), 400

  user_id = data.get("user_id", "Неизвестно")
  username = data.get("username", "Гладиатор")
  text = data.get("message", "")

  # Текст сообщения, который придет вам в Telegram
  admin_msg = (
      f"🐛 <b>Новый баг / Отзыв от игрока!</b>\n\n"
      f"👤 <b>Имя:</b> {username} (ID: <code>{user_id}</code>)\n"
      f"💬 <b>Сообщение:</b> {text}"
  )

  try:
    # Замените ID ниже на ваш реальный Telegram ID, если хотите получать отчеты лично
    # (или бот отправит сообщение в чат с игроком/админом)
    bot.send_message(user_id, f"✅ Спасибо! Ваш отчет об ошибке отправлен разработчику.")
    # Пример отправки себе (укажите ваш Telegram numeric ID вместо 123456789):
    # bot.send_message(123456789, admin_msg, parse_mode="HTML")
  except Exception as e:
    print("Ошибка отправки сообщения:", e)

  return jsonify({"status": "ok"})
