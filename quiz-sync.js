// Модуль синхронизации данных между устройствами
// Использует простой REST API для хранения данных

// Конфигурация API
// Можно использовать любой бесплатный сервис:
// - Firebase Realtime Database
// - Supabase
// - JSONBin.io
// - Или создать свой endpoint на Vercel/Netlify

// Для демо используем простой подход с localStorage + URL параметр для синхронизации
// В продакшене нужно заменить на реальный API endpoint

const SYNC_API_URL = null; // Установите URL вашего API endpoint здесь
const SYNC_ENABLED = false; // Включите когда настроите API

// Функции синхронизации через API
async function syncQuizToServer(quizData) {
    if (!SYNC_ENABLED || !SYNC_API_URL) {
        // Fallback на localStorage
        localStorage.setItem(STORAGE_KEY_QUIZ, JSON.stringify(quizData));
        return;
    }
    
    try {
        const response = await fetch(`${SYNC_API_URL}/quiz`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(quizData)
        });
        
        if (!response.ok) {
            throw new Error('Ошибка синхронизации квиза');
        }
        
        // Также сохраняем локально для оффлайн работы
        localStorage.setItem(STORAGE_KEY_QUIZ, JSON.stringify(quizData));
    } catch (error) {
        console.error('Ошибка синхронизации квиза:', error);
        // Fallback на localStorage
        localStorage.setItem(STORAGE_KEY_QUIZ, JSON.stringify(quizData));
    }
}

async function syncStudentsToServer(studentsData) {
    if (!SYNC_ENABLED || !SYNC_API_URL) {
        // Fallback на localStorage
        localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(studentsData));
        return;
    }
    
    try {
        const response = await fetch(`${SYNC_API_URL}/students`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(studentsData)
        });
        
        if (!response.ok) {
            throw new Error('Ошибка синхронизации студентов');
        }
        
        // Также сохраняем локально
        localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(studentsData));
    } catch (error) {
        console.error('Ошибка синхронизации студентов:', error);
        // Fallback на localStorage
        localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(studentsData));
    }
}

async function fetchQuizFromServer() {
    if (!SYNC_ENABLED || !SYNC_API_URL) {
        // Fallback на localStorage
        const saved = localStorage.getItem(STORAGE_KEY_QUIZ);
        return saved ? JSON.parse(saved) : null;
    }
    
    try {
        const response = await fetch(`${SYNC_API_URL}/quiz`);
        if (!response.ok) {
            throw new Error('Ошибка загрузки квиза');
        }
        
        const data = await response.json();
        // Сохраняем локально
        if (data) {
            localStorage.setItem(STORAGE_KEY_QUIZ, JSON.stringify(data));
        }
        return data;
    } catch (error) {
        console.error('Ошибка загрузки квиза:', error);
        // Fallback на localStorage
        const saved = localStorage.getItem(STORAGE_KEY_QUIZ);
        return saved ? JSON.parse(saved) : null;
    }
}

async function fetchStudentsFromServer() {
    if (!SYNC_ENABLED || !SYNC_API_URL) {
        // Fallback на localStorage
        const saved = localStorage.getItem(STORAGE_KEY_STUDENTS);
        return saved ? JSON.parse(saved) : [];
    }
    
    try {
        const response = await fetch(`${SYNC_API_URL}/students`);
        if (!response.ok) {
            throw new Error('Ошибка загрузки студентов');
        }
        
        const data = await response.json();
        // Сохраняем локально
        if (data && Array.isArray(data)) {
            localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(data));
        }
        return data || [];
    } catch (error) {
        console.error('Ошибка загрузки студентов:', error);
        // Fallback на localStorage
        const saved = localStorage.getItem(STORAGE_KEY_STUDENTS);
        return saved ? JSON.parse(saved) : [];
    }
}

// Экспорт функций
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        syncQuizToServer,
        syncStudentsToServer,
        fetchQuizFromServer,
        fetchStudentsFromServer
    };
}

