export function handleRussianLanguage(chatId) {
    userLanguages[chatId] = 'ru';
    bot.sendMessage(chatId, 'Установлен русский язык');
    bot.sendMessage(chatId, 'Привет, я *NAME*, здесь предоставлены все функции бота', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎬Видео в кружок🎬', callback_data: 'vtc' }],
          [{ text: '🇷🇺 Language 🇬🇧', callback_data: 'lng' }]
        ]
      }
    });
  }
  
  export function handleEnglishLanguage(chatId) {
    userLanguages[chatId] = 'en';
    bot.sendMessage(chatId, 'Language set to English.');
    bot.sendMessage(chatId, 'Hello, I am *NAME*, here are all the bot features', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎬Видео в кружок🎬', callback_data: 'vtc' }],
          [{ text: '🇷🇺 Language 🇬🇧', callback_data: 'lng' }]
        ]
      }
    });
  }
  