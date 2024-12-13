import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import axios from 'axios';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const token = '7401632575:AAGIPNXZGltUiN5ch8v20ZBlapcrvQAu0Y8';
const ngrokUrl = 'https://96ad-176-124-146-172.ngrok-free.app'; // Убедитесь, что здесь нет пробела

const bot = new TelegramBot(token);
bot.setWebHook(`${ngrokUrl}/bot${token}`);

const app = express();
app.use(express.json());

app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body); 
  res.sendStatus(200);
});

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

bot.on('callback_query', async callbackQuery => {
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
  } else if (data === 'vtc') {
    bot.sendMessage(chatId, 'Отправьте мне видео, чтобы я мог преобразовать его в кружок.');
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  // Проверка, что это видео
  if (msg.video) {
    const fileId = msg.video.file_id;

    const processingMessage = await bot.sendMessage(chatId, 'Видео получено, начинается обработка...');
    try {
      const fileUrl = await bot.getFileLink(fileId);

      const inputPath = path.join(__dirname, `input-${chatId}.mp4`);
      const outputPath = path.join(__dirname, `output-${chatId}.mp4`);

      // Скачиваем видео
      const downloadVideo = async () => {
        const response = await axios.get(fileUrl, { responseType: 'stream' });
        const writer = fs.createWriteStream(inputPath);
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
      };

      await downloadVideo();

      const ffmpegCommand = `ffmpeg -i ${inputPath} -vf "scale=400:400,format=yuv420p" -c:v libx264 -profile:v baseline -level 3.0 -b:v 256k -bufsize 256k -pix_fmt yuv420p -f mp4 ${outputPath}`;
    
      await new Promise((resolve, reject) => {
        exec(ffmpegCommand, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      await bot.sendVideo(chatId, outputPath, { caption: 'Ваше видео-кружок готов!' });

      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    } catch (error) {
      console.error('Ошибка:', error);
      bot.sendMessage(chatId, 'Произошла ошибка при обработке видео.');
    } finally {
      bot.deleteMessage(chatId, processingMessage.message_id);
    }
  } else {
    // Если это не видео, отправляем пользователю сообщение
    bot.sendMessage(chatId, 'Пожалуйста, отправьте видео для обработки.');
  }
});

// Обработка текстовых сообщений
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === '/start' || text === '/help' || text === '/language') return;

  const language = userLanguages[chatId] || 'en';
  const response = language === 'ru' ? `Вы сказали: "${text}"` : `You said: "${text}"`;

  bot.sendMessage(chatId, response);
});

console.log('Бот запущен!');
