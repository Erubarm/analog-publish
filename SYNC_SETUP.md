# Настройка синхронизации квиза между устройствами

Для работы квиза на разных устройствах (GitHub Pages) нужно настроить удаленную синхронизацию данных.

## ⚠️ Важно: GitHub Pages + API

**GitHub Pages** - это статический хостинг, который отлично работает с внешними API:
- ✅ Фронтенд на GitHub Pages может обращаться к API на Vercel/Netlify
- ✅ Это работает между разными устройствами и браузерами
- ✅ Не нужно настраивать CORS (уже настроено в API)
- ✅ Бесплатно для обоих сервисов

## Быстрое решение: Vercel API (Рекомендуется)

### Шаги:

1. **Создайте аккаунт на [Vercel](https://vercel.com/)** (бесплатно)

2. **Установите Vercel CLI:**
```bash
npm i -g vercel
```

3. **Войдите в Vercel:**
```bash
vercel login
```

4. **Разверните API:**
```bash
vercel --prod
```

5. **Скопируйте URL вашего API** (например: `https://your-project.vercel.app/api/quiz`)

6. **Откройте `quiz.js`** и найдите:
```javascript
const SYNC_API_URL = null;
```

7. **Замените на ваш URL:**
```javascript
const SYNC_API_URL = "https://your-project.vercel.app/api/quiz";
const USE_API_SYNC = true;
```

8. **Обновите страницу** - синхронизация будет работать между всеми устройствами!

## Альтернатива: Netlify Functions

1. Создайте аккаунт на [Netlify](https://www.netlify.com/)
2. Переместите `api/quiz.js` в `netlify/functions/quiz.js`
3. Разверните проект
4. Настройте `SYNC_API_URL` в `quiz.js`

## Альтернатива: Firebase Realtime Database

1. Создайте проект на [Firebase Console](https://console.firebase.google.com/)
2. Включите Realtime Database
3. Установите правила безопасности (для демо - открытый доступ)
4. Скопируйте URL базы данных
5. В `quiz.js` установите:
```javascript
const FIREBASE_DATABASE_URL = "https://your-project.firebaseio.com/";
const USE_FIREBASE = true;
```

## Как это работает с GitHub Pages

**Архитектура:**
```
GitHub Pages (фронтенд)  ←→  Vercel API (бэкенд)
     ↓                           ↓
  Статические файлы         Serverless функции
  (HTML, CSS, JS)           (Хранение данных)
```

**Преимущества:**
- ✅ Фронтенд на GitHub Pages может обращаться к API на Vercel
- ✅ Работает между разными устройствами и браузерами
- ✅ CORS уже настроен в API
- ✅ Бесплатно для обоих сервисов
- ✅ Не нужно настраивать сервер для фронтенда

**Как это работает:**
1. Фронтенд на GitHub Pages загружается в браузере студента/преподавателя
2. JavaScript делает `fetch` запросы к API на Vercel
3. API хранит данные в памяти (или в базе данных)
4. Все устройства получают одинаковые данные через API

## Текущее состояние

По умолчанию используется localStorage, который работает только в рамках одного браузера/устройства.

Для работы между разными устройствами нужно настроить один из вариантов выше.

