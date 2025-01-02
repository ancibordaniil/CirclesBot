import express from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import TelegramBot from 'node-telegram-bot-api';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static'; // Использование ffmpeg-static
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

const app = express();
app.use(express.json());

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Express server is listening on port ${PORT}`);
});

const userLanguages = {};

const messages = {
  ru: {
    start: 'Выберите язык / Choose your language:',
    languageSet: 'Установлен русский язык',
    greeting: 'Привет, я CircleBot, здесь предоставлены все мои функции',
    videoRequest: 'Отправьте мне видео, чтобы я мог преобразовать его в кружок.',
    help: 'Это демонстрационный бот. Вы можете использовать команды /start, /help и /language.',
    error: 'Произошла ошибка при обработке видео.',
    videoProcessed: 'Ваше видео-кружок готов!',
  },
  en: {
    start: 'Choose your language / Выберите язык:',
    languageSet: 'Language set to English.',
    greeting: 'Hello, I am CircleBot, here are all the bot features',
    videoRequest: 'Send me a video so I can convert it into a circle.',
    help: 'This is a demo bot. You can use /start, /help, and /language commands.',
    error: 'An error occurred while processing the video.',
    videoProcessed: 'Your circle video is ready!',
  }
};

bot.setMyCommands([
  { command: '/start', description: 'Начать работу с ботом' },
  { command: '/help', description: 'Помощь и информация' },
  { command: '/language', description: 'Выбрать язык' }
]);

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const lang = userLanguages[chatId] || 'ru'; 
  bot.sendMessage(chatId, messages[lang].start, {
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
  const lang = userLanguages[chatId] || 'ru'; 
  bot.sendMessage(chatId, messages[lang].start, {
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
  const lang = userLanguages[chatId] || 'ru'; 
  bot.sendMessage(chatId, messages[lang].help);
});

bot.on('callback_query', async callbackQuery => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  bot.answerCallbackQuery(callbackQuery.id);

  if (data === 'lang_ru') {
    userLanguages[chatId] = 'ru'; 
    bot.sendMessage(chatId, messages.ru.languageSet);
    bot.sendMessage(chatId, messages.ru.greeting, {
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
    bot.sendMessage(chatId, messages.en.languageSet);
    bot.sendMessage(chatId, messages.en.greeting, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎬Video to circle🎬', callback_data: 'vtc' }],
          [{ text: '🇷🇺 Language 🇬🇧', callback_data: 'lng' }],
          [{ text: '🆘Help🆘', callback_data: 'help'}]
        ]
      }
    });
  } else if (data === 'lng') {
    bot.sendMessage(chatId, messages[userLanguages[chatId]].start, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🇷🇺 Русский', callback_data: 'lang_ru' }],
          [{ text: '🇬🇧 English', callback_data: 'lang_en' }]
        ]
      }
    });
  } else if (data === 'help') {
    const lang = userLanguages[chatId] || 'ru';
    bot.sendMessage(chatId, messages[lang].help);
  } else if (data === 'vtc') {
    const lang = userLanguages[chatId] || 'ru';
    bot.sendMessage(chatId, messages[lang].videoRequest);
  }
});

// Функция обработки видео
const processVideo = async (inputPath, outputPath, chatId, lang) => {
  try {
    // Получаем информацию о видео, используя ffprobe
    const probe = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) reject(err);
        resolve(metadata);
      });
    });

    // Получаем ширину и высоту видео
    const { width, height } = probe.streams[0];

    console.log(`Разрешение видео: ${width}x${height}`);

    // Устанавливаем параметры фильтра в зависимости от размера видео
    let cropFilter = '';
    let scaleFilter = 'scale=400:400'; // Стандартный размер для видео

    // Если ширина или высота видео меньше 400, то не применяем crop, или уменьшаем размер
    if (width < 400 || height < 400) {
      cropFilter = ''; // Убираем crop, если видео слишком маленькое
      scaleFilter = `scale=${width}:${height}`; // Масштабируем под размер исходного видео
    } else {
      cropFilter = `crop=400:400:(iw-400)/2:(ih-400)/2`; // Обрезаем в круг
    }

    // Запускаем обработку видео с соответствующими фильтрами
    ffmpeg(inputPath)
      .videoFilter([cropFilter, scaleFilter]) // Применяем фильтры
      .outputOptions('-pix_fmt', 'yuv420p')
      .on('start', (commandLine) => {
        console.log(`ffmpeg процесс стартовал: ${commandLine}`);
      })
      .on('stderr', (stderrLine) => {
        console.log(`ffmpeg stderr: ${stderrLine}`);
      })
      .on('end', async () => {
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          console.log(`Output file exists. Size: ${stats.size} bytes`);
          await bot.sendVideoNote(chatId, outputPath, { caption: messages[lang].videoProcessed });
        } else {
          console.error('Ошибка: не удалось найти обработанное видео');
          await bot.sendMessage(chatId, 'Ошибка: не удалось найти обработанное видео.');
        }

        try {
          await fs.promises.unlink(inputPath);
          await fs.promises.unlink(outputPath);
        } catch (error) {
          console.error('Ошибка при удалении файлов:', error.message);
        }
      })
      .on('error', (err) => {
        console.error('Ошибка при обработке видео:', err.message);
        bot.sendMessage(chatId, `${messages[lang].error}: ${err.message}`);
      })
      .run();
  } catch (error) {
    console.error('Ошибка при получении метаданных видео:', error.message);
    bot.sendMessage(chatId, `${messages[lang].error}: ${error.message}`);
  }
};

// Обработка сообщения с видео
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const lang = userLanguages[chatId] || 'ru'; 

  if (msg.video) {
    const fileId = msg.video.file_id;
    const processingMessage = await bot.sendMessage(chatId, 'Видео получено, начинается обработка...');

    try {
      const fileUrl = await bot.getFileLink(fileId);

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      const tmpDir = path.join(__dirname, 'tmp');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
      const inputPath = path.join(tmpDir, `input-${chatId}.mp4`);
      const outputPath = path.join(tmpDir, `output-${chatId}.mp4`);

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

      await processVideo(inputPath, outputPath, chatId, lang);
      
    } catch (error) {
      console.error('Ошибка при загрузке или обработке видео:', error.message);
      bot.sendMessage(chatId, `${messages[lang].error}: ${error.message}`);
    }
  }
});
