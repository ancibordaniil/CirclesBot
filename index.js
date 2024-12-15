import express from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import TelegramBot from 'node-telegram-bot-api';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static'; // Использование ffmpeg-static
import { fileURLToPath } from 'url';

const token = '7401632575:AAGIPNXZGltUiN5ch8v20ZBlapcrvQAu0Y8';
const ngrokUrl = 'https://9a78-176-124-146-172.ngrok-free.app';

const bot = new TelegramBot(token, { polling: true });

const app = express();
app.use(express.json());

app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Express server is listening on port ${PORT}`);
});

bot.setMyCommands([
  { command: '/start', description: 'Начать работу с ботом' },
  { command: '/help', description: 'Помощь и информация' },
  { command: '/language', description: 'Выбрать язык' }
]);

// Обработка команды /start и /language
bot.onText(/\/start|\/language/, (msg) => {
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
    bot.sendMessage(chatId, 'Language set to English.');
    bot.sendMessage(chatId, 'Hello, I am *NAME*, here are all the bot features', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎬Video to circle🎬', callback_data: 'vtc' }],
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

  // Игнорируем команды
  const text = msg.text;
  if (text === '/start' || text === '/help' || text === '/language') return;

  // Проверка, что это видео
  if (msg.video) {
    const fileId = msg.video.file_id;

    const processingMessage = await bot.sendMessage(chatId, 'Видео получено, начинается обработка...');

    try {
      const fileUrl = await bot.getFileLink(fileId);
            
      const __filename = fileURLToPath(import.meta.url); // Получаем текущий файл
      const __dirname = path.dirname(__filename); // Получаем директорию текущего файла

      const tmpDir = path.join(__dirname, 'tmp');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir); // Создаем временную папку
      const inputPath = path.join(tmpDir, `input-${chatId}.mp4`);
      const outputPath = path.join(tmpDir, `output-${chatId}.mp4`);

      // Логирование пути к видео
      console.log(`Получение видео из ${fileUrl}`);
      
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
      // Логирование информации о загруженном видео
      console.log(`Видео успешно загружено на сервер. Путь: ${inputPath}`);

      // Указываем путь к ffmpeg
      ffmpeg.setFfmpegPath(ffmpegPath);  // Использование ffmpeg-static

      // Используем ffmpeg для обработки видео
      ffmpeg(inputPath)
        .output(outputPath)
        .videoFilter([
          'crop=in_w:in_w:(in_w/2):(in_h/4)',  // Обрезаем видео до квадрата
          'scale=400:400'         // Устанавливаем размер
        ])
        .outputOptions('-pix_fmt', 'yuv420p')
        .on('start', (commandLine) => {
          console.log(`ffmpeg process started: ${commandLine}`);
        })
        .on('stderr', (stderrLine) => {
          console.log(`ffmpeg stderr: ${stderrLine}`);
        })
        .on('end', async () => {
          console.log('ffmpeg processing completed');
          if (fs.existsSync(outputPath)) {
            const stats = fs.statSync(outputPath);
            console.log(`Output file exists. Size: ${stats.size} bytes`);
            await bot.sendVideoNote(chatId, outputPath, { caption: 'Ваше видео-кружок готов!' });
          } else {
            console.log('Output file does not exist!');
            await bot.sendMessage(chatId, 'Ошибка: не удалось найти обработанное видео.');
          }
          // Асинхронное удаление файлов
          try {
            await fs.promises.unlink(inputPath);
            await fs.promises.unlink(outputPath);
          } catch (error) {
            console.error('Ошибка при удалении файлов:', error.message);
          }
        })
        .on('error', (err) => {
          bot.sendMessage(chatId, `Произошла ошибка при обработке видео: ${err.message}`);
          console.error('Ошибка при обработке видео:', err.message);
        })
        .run();
    } catch (error) {
      bot.sendMessage(chatId, 'Произошла ошибка при обработке видео.');
      bot.sendMessage(chatId, error.message);
      console.error('Ошибка при скачивании или обработке видео:', error.message);
    } finally {
      bot.deleteMessage(chatId, processingMessage.message_id);
    }
  } else {
    // Если это не видео, отправляем пользователю сообщение
    bot.sendMessage(chatId, 'Пожалуйста, отправьте видео для обработки.');
  }
});

console.log('Бот запущен!');
