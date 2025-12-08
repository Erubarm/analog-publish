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

    // Парсим query параметры
    // Vercel предоставляет их в req.query как объект
    // Также проверяем req.url для случаев с rewrites
    let type = null;
    let quizId = 'default';
    
    // Сначала пробуем req.query (стандартный способ для Vercel)
    if (req.query && typeof req.query === 'object') {
        type = req.query.type || null;
        quizId = req.query.quizId || 'default';
    }
    
    // Fallback: парсим из req.url если query не доступен или пустой
    if (!type) {
        // Проверяем разные варианты req.url
        const urlToParse = req.url || (req.headers && req.headers['x-forwarded-url']) || '';
        if (urlToParse) {
            try {
                // Если URL относительный, добавляем протокол и хост
                const urlString = urlToParse.startsWith('http') 
                    ? urlToParse 
                    : `http://${req.headers?.host || 'localhost'}${urlToParse}`;
                const url = new URL(urlString);
                type = url.searchParams.get('type');
                quizId = url.searchParams.get('quizId') || 'default';
            } catch (e) {
                console.error('Ошибка парсинга URL:', e, 'urlToParse:', urlToParse);
            }
        }
    }
    
    console.log('API Request parsed:', { 
        type, 
        quizId, 
        method: req.method,
        'req.query': req.query, 
        'req.url': req.url,
        'headers.host': req.headers?.host
    });

    // Парсим body для POST запросов
    let body = null;
    if (req.method === 'POST') {
        if (req.body) {
            try {
                body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            } catch (e) {
                console.error('Ошибка парсинга body:', e, 'Body:', req.body);
                return res.status(400).json({ error: 'Invalid JSON in body' });
            }
        } else {
            console.warn('POST request without body');
        }
    }

    console.log(`API Request: ${req.method} type=${type} quizId=${quizId}`, req.method === 'POST' ? `body keys: ${body ? Object.keys(body).join(',') : 'none'}` : '');

    // Проверяем наличие обязательного параметра type
    if (!type) {
        return res.status(400).json({ 
            error: 'Invalid request', 
            message: 'Missing required parameter: type. Use ?type=quiz or ?type=students',
            received: { type, quizId, method: req.method }
        });
    }

    try {
        if (req.method === 'POST') {
            // Сохранение данных
            if (type === 'quiz') {
                if (!body) {
                    return res.status(400).json({ error: 'Missing body for quiz data' });
                }
                quizData[quizId] = body;
                console.log(`Quiz saved for quizId: ${quizId}`);
                return res.status(200).json({ success: true, quizId });
            } else if (type === 'students') {
                if (!body) {
                    return res.status(400).json({ error: 'Missing body for students data' });
                }
                if (!Array.isArray(body)) {
                    return res.status(400).json({ error: 'Students data must be an array' });
                }
                studentsData[quizId] = body;
                console.log(`Students saved for quizId: ${quizId}, count: ${body.length}`);
                return res.status(200).json({ success: true, quizId, count: body.length });
            } else {
                return res.status(400).json({ 
                    error: `Invalid type: ${type}. Expected 'quiz' or 'students'`,
                    received: { type, quizId, method: req.method }
                });
            }
        } else if (req.method === 'GET') {
            // Получение данных
            if (type === 'quiz') {
                const data = quizData[quizId] || null;
                console.log(`Quiz retrieved for quizId: ${quizId}, exists: ${data !== null}`);
                return res.status(200).json(data);
            } else if (type === 'students') {
                const data = studentsData[quizId] || [];
                console.log(`Students retrieved for quizId: ${quizId}, count: ${Array.isArray(data) ? data.length : 0}`);
                return res.status(200).json(data);
            } else {
                return res.status(400).json({ 
                    error: `Invalid type: ${type}. Expected 'quiz' or 'students'`,
                    received: { type, quizId, method: req.method }
                });
            }
        }

        return res.status(400).json({ 
            error: `Invalid method: ${req.method}. Expected GET or POST`,
            received: { type, quizId, method: req.method }
        });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}

