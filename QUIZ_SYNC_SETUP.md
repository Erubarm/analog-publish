# Настройка синхронизации квиза между устройствами

Для работы квиза на разных устройствах (GitHub Pages) нужно настроить удаленную синхронизацию данных.

## Вариант 1: Firebase Realtime Database (Рекомендуется)

### Шаги настройки:

1. Создайте проект на [Firebase Console](https://console.firebase.google.com/)
2. Включите Realtime Database в проекте
3. В правилах безопасности установите:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```
⚠️ **Внимание:** Это открывает доступ для всех. Для продакшена нужно добавить аутентификацию.

4. Скопируйте URL вашей базы данных (например: `https://your-project.firebaseio.com/`)

5. Откройте `quiz.js` и найдите строку:
```javascript
const FIREBASE_CONFIG = null;
```

6. Замените на:
```javascript
const FIREBASE_CONFIG = {
    databaseURL: "https://your-project.firebaseio.com/"
};
```

7. Установите `USE_FIREBASE = true` в `quiz.js`

## Вариант 2: Supabase (Альтернатива)

1. Создайте проект на [Supabase](https://supabase.com/)
2. Создайте таблицу `quiz_data` с полями:
   - `id` (text, primary key)
   - `data` (jsonb)
   - `updated_at` (timestamp)

3. Настройте API ключ в `quiz.js`

## Вариант 3: Простой сервер на Vercel/Netlify

Создайте простой API endpoint для хранения данных.

## Текущее решение

Сейчас используется localStorage с fallback на удаленную синхронизацию. 
Для работы между устройствами нужно настроить один из вариантов выше.

