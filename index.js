const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios');

const token = '7401632575:AAGIPNXZGltUiN5ch8v20ZBlapcrvQAu0Y8';
const ngrokUrl = 'https://4192-85-143-106-69.ngrok-free.app'; 

const bot = new TelegramBot(token);
bot.setWebHook(`${ngrokUrl}/bot${token}`);

const app = express();
app.use(express.json());

// Обработка запросов на маршрут вебхука
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);  // Передаём обновления в бота
  res.sendStatus(200);
});

// Запуск express сервера
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Express server is listening on port ${PORT}`);
  axios.get(`https://api.telegram.org/bot${token}/getWebhookInfo`)
    .then(response => console.log(response.data))
    .catch(console.error);
});

// Устанавливаем команды бота
bot.setMyCommands([
    { command: '/start', description: 'Начать работу с ботом' },
    { command: '/help', description: 'Помощь и информация' },
    { command: '/language', description: 'Выбрать язык' }
]);

const userLanguages = {};

// Обработка команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Добро пожаловать! Выберите язык / Choose your language:', {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🇷🇺 Русский', callback_data: 'lang_ru' }],
                [{ text: '🇬🇧 English', callback_data: 'lang_en' }]
            ]
        }
    });
});

// Обработка команды /help
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Это демонстрационный бот. Вы можете использовать команды /start, /help и /language.');
});



// Обработка команды /language
bot.onText(/\/language/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Выберите язык / Choose your language:', {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🇷🇺 Русский', callback_data: 'lang_ru' }],
                [{ text: '🇬🇧 English', callback_data: 'lang_en' }]
            ]
        }
    });
});

// Обработка выбора языка
bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    bot.answerCallbackQuery(callbackQuery.id);

    if (data === 'lang_ru') {
        userLanguages[chatId] = 'ru';
        bot.sendMessage(chatId, '/help');
    } else if (data === 'lang_en') {
        userLanguages[chatId] = 'en';
        bot.sendMessage(chatId, 'Language set to English.');
    }
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '/start' || text === '/help' || text === '/language') return;

    const language = userLanguages[chatId] || 'en'; 
    const response = language === 'ru' ? `Вы сказали: "${text}"` : `You said: "${text}"`;

    bot.sendMessage(chatId, response);
});

console.log('Бот запущен!');
