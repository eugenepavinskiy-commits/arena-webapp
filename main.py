from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import sqlite3
import uvicorn
import os

app = FastAPI(title="Arena RPG API")

# Разрешаем CORS (чтобы браузер и Telegram Mini App могли обращаться к серверу без ошибок блокировки)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === ПОДГОТОВКА БАЗЫ ДАННЫХ ===
def init_db():
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    # Таблица для хранения игроков
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

# === СТРУКТУРЫ ДАННЫХ ===
class UserData(BaseModel):
    id: str
    name: str
    class_id: str
    level: int
    rating: int
    hero_data: str  # Полный JSON-текст сохранения героя

# === API ЭНДПОИНТЫ ===

@app.post("/api/save")
def save_user(user: UserData):
    """Сохраняет или обновляет данные игрока в базе"""
    conn = sqlite3.connect('database.db')
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
    ''', (user.id, user.name, user.class_id, user.level, user.rating, user.hero_data))
    conn.commit()
    conn.close()
    return {"status": "ok", "message": "Данные сохранены на сервере!"}

@app.get("/api/load/{user_id}")
def load_user(user_id: str):
    """Загружает данные игрока по его Telegram ID"""
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute('SELECT hero_data FROM users WHERE id = ?', (user_id,))
    row = c.fetchone()
    conn.close()
    if row:
        return {"status": "ok", "hero_data": row[0]}
    return {"status": "not_found", "message": "Игрок не найден"}

@app.get("/api/leaderboard")
def get_leaderboard():
    """Отдает Топ-10 игроков с самым высоким рейтингом для Арены"""
    conn = sqlite3.connect('database.db')
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
    return {"status": "ok", "leaderboard": leaderboard}

@app.get("/api/pvp_opponent/{level}")
def get_pvp_opponent(level: int):
    """Ищет случайного реального противника подходящего уровня (+/- 3 уровня)"""
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute('''
        SELECT name, class_id, level, rating, hero_data 
        FROM users 
        WHERE level BETWEEN ? AND ? 
        ORDER BY RANDOM() LIMIT 1
    ''', (max(1, level - 3), level + 3))
    row = c.fetchone()
    conn.close()
    
    if row:
        return {
            "status": "ok",
            "opponent": {
                "name": row[0],
                "cls": row[1],
                "level": row[2],
                "rating": row[3],
                "hero_data": row[4]
            }
        }
    return {"status": "not_found", "message": "Подходящий противник не найден"}

# Подключаем раздачу статики (HTML, CSS, JS, Картинки)
# Чтобы сервер отдавал саму игру при переходе по ссылке
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def serve_index():
    with open("templates/index.html", "r", encoding="utf-8") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content, status_code=200)

if __name__ == "__main__":
    print("🚀 Сервер Arena RPG запускается...")
    print("💡 Перейди по адресу: http://127.0.0.1:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)

