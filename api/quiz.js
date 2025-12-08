// API endpoint для синхронизации квиза
// Разверните этот файл на Vercel или Netlify как serverless function

// Для Vercel: создайте папку api/ и поместите этот файл туда
// Для Netlify: создайте папку netlify/functions/ и поместите этот файл туда

// Простое хранилище в памяти (для демо)
// В продакшене используйте базу данных (MongoDB, PostgreSQL и т.д.)
let quizData = {};
let studentsData = {};

// Vercel использует экспорт по умолчанию
export default async function handler(req, res) {
    // Устанавливаем CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { type, quizId } = req.query || {};

    try {
        if (req.method === 'POST') {
            // Сохранение данных
            if (type === 'quiz') {
                const data = req.body;
                quizData[quizId || 'default'] = data;
                return res.status(200).json({ success: true });
            } else if (type === 'students') {
                const data = req.body;
                studentsData[quizId || 'default'] = data;
                return res.status(200).json({ success: true });
            }
        } else if (req.method === 'GET') {
            // Получение данных
            if (type === 'quiz') {
                return res.status(200).json(quizData[quizId || 'default'] || null);
            } else if (type === 'students') {
                return res.status(200).json(studentsData[quizId || 'default'] || []);
            }
        }

        return res.status(400).json({ error: 'Invalid request' });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

