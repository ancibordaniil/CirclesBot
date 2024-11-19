import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import axios from 'axios';

const token = '7401632575:AAGIPNXZGltUiN5ch8v20ZBlapcrvQAu0Y8';
const ngrokUrl = 'https://a2d8-85-143-106-69.ngrok-free.app';

const bot = new TelegramBot(token);
bot.setWebHook(`${ngrokUrl}/bot${token}`);

const app = express();
app.use(express.json());

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

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Это демонстрационный бот. Вы можете использовать команды /start, /help и /language.');
});

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

bot.on('callback_query', (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  bot.answerCallbackQuery(callbackQuery.id);

  if (data === 'lang_ru') {
    userLanguages[chatId] = 'ru';
    bot.sendMessage(chatId, 'Установлен русский язык');
    bot.sendMessage(chatId, 'Привет, я *NAME*, здесь предоставлены все функции бота', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎬Видео в кружок🎬', callback_data: 'vtc' }],
          [{ text: '🇷🇺 Language 🇬🇧', callback_data: 'lng' }],
          [{ text: '🆘Помощь🆘', callback_data: 'help'}]
        ]
      }
    });
  } else if (data === 'lang_en') {
    userLanguages[chatId] = 'en';
    bot.sendMessage(chatId, 'Language set to English.');
    bot.sendMessage(chatId, 'Hello, I am *NAME*, here are all the bot features', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎬Видео в кружок🎬', callback_data: 'vtc' }],
          [{ text: '🇷🇺 Language 🇬🇧', callback_data: 'lng' }],
          [{ text: '🆘Help🆘', callback_data: 'help'}]
        ]
      }
    });
  } else if (data === 'lng') {
    bot.sendMessage(chatId, 'Выберите язык / Choose your language:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🇷🇺 Русский', callback_data: 'lang_ru' }],
          [{ text: '🇬🇧 English', callback_data: 'lang_en' }]
        ]
      }
    });
  } else if (data === 'help') {
    bot.sendMessage(chatId, 'Это демонстрационный бот. Вы можете использовать команды /start, /help и /language.');
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
