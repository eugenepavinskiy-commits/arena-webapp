const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
app.use(express.json());

// Отдаем статические файлы (твой CSS, картинки и JS)
app.use('/static', express.static(path.join(__dirname, 'static')));

// Токен бота мы будем хранить в безопасном сейфе Railway
const BOT_TOKEN = process.env.BOT_TOKEN;

// Эндпоинт для генерации счета на оплату Звездами
app.post('/api/create-invoice', async (req, res) => {
    if (!BOT_TOKEN) return res.status(500).json({ error: "Токен бота не настроен на сервере" });
    
    const { starsAmount, title, description, payload } = req.body;

    try {
        const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
            title: title,
            description: description,
            payload: payload, 
            provider_token: "", // Для Telegram Stars это поле ОБЯЗАТЕЛЬНО должно быть пустым
            currency: "XTR",    // XTR - это официальный код валюты Telegram Stars
            prices: [{ label: "Алмазы", amount: starsAmount }]
        });

        if (response.data.ok) {
            res.json({ invoiceUrl: response.data.result });
        } else {
            res.status(400).json({ error: response.data.description });
        }
    } catch (error) {
        res.status(500).json({ error: "Ошибка соединения с Telegram API" });
    }
});

// Отдаем index.html при входе в игру
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});

