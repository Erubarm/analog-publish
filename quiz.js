// Конфигурация
const LECTURES_PATH = 'lectures';
const TESTS_PATH = 'тесты';
const STORAGE_KEY_QUIZ = 'quiz_data';
const STORAGE_KEY_STUDENTS = 'quiz_students';
const STORAGE_KEY_STUDENT_NAME = 'quiz_student_name';
const STORAGE_KEY_QUIZ_ID = 'quiz_id'; // Уникальный ID квиза для синхронизации
const POLL_INTERVAL = 2000; // Проверка обновлений каждые 2 секунды

// Настройка синхронизации между устройствами
// Для работы на разных устройствах нужно настроить Firebase или другой сервис
// Инструкция: см. SYNC_SETUP.md

// Простой REST API endpoint (рекомендуется для начала)
const SYNC_API_URL = "https://analog-obsidian.vercel.app/api/quiz"; // URL вашего API endpoint
const USE_API_SYNC = true; // Установите true если используете API endpoint

// Firebase Realtime Database (альтернатива)
const FIREBASE_DATABASE_URL = null; // Замените на: "https://your-project.firebaseio.com/"
const USE_FIREBASE = false; // Установите true после настройки Firebase

// Функции синхронизации через API
async function syncQuizToAPI(quizData, quizId = 'default') {
    if (!USE_API_SYNC || !SYNC_API_URL) {
        localStorage.setItem(STORAGE_KEY_QUIZ, JSON.stringify(quizData));
        return;
    }
    
    try {
        const response = await fetch(`${SYNC_API_URL}?type=quiz&quizId=${quizId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quizData)
        });
        
        if (response.ok) {
            localStorage.setItem(STORAGE_KEY_QUIZ, JSON.stringify(quizData));
            console.log('Квиз синхронизирован с сервером');
        }
    } catch (error) {
        console.error('Ошибка синхронизации квиза:', error);
        localStorage.setItem(STORAGE_KEY_QUIZ, JSON.stringify(quizData));
    }
}

async function syncStudentsToAPI(studentsData, quizId = 'default') {
    if (!USE_API_SYNC || !SYNC_API_URL) {
        localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(studentsData));
        return;
    }
    
    try {
        const url = `${SYNC_API_URL}?type=students&quizId=${encodeURIComponent(quizId)}`;
        console.log('syncStudentsToAPI: отправка данных на', url, 'студентов:', studentsData.length);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentsData)
        });
        
        console.log('syncStudentsToAPI: статус ответа', response.status);
        if (response.ok) {
            const result = await response.json();
            console.log('syncStudentsToAPI: ответ сервера', result);
            localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(studentsData));
            console.log('Студенты синхронизированы с сервером');
        } else {
            const errorText = await response.text();
            console.error('syncStudentsToAPI: ошибка HTTP', response.status, errorText);
        }
    } catch (error) {
        console.error('Ошибка синхронизации студентов:', error);
        localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(studentsData));
    }
}

async function fetchQuizFromAPI(quizId = 'default') {
    if (!USE_API_SYNC || !SYNC_API_URL) {
        const saved = localStorage.getItem(STORAGE_KEY_QUIZ);
        return saved ? JSON.parse(saved) : null;
    }
    
    try {
        const response = await fetch(`${SYNC_API_URL}?type=quiz&quizId=${encodeURIComponent(quizId)}`);
        if (response.ok) {
            const data = await response.json();
            if (data && data.id) {
                // ВАЖНО: Сохраняем quizId из квиза, чтобы использовать его для синхронизации студентов
                localStorage.setItem(STORAGE_KEY_QUIZ_ID, data.id);
                localStorage.setItem(STORAGE_KEY_QUIZ, JSON.stringify(data));
                console.log('fetchQuizFromAPI: получен квиз с quizId:', data.id);
                return data;
            } else if (data) {
                // Квиз без id - сохраняем как есть
                localStorage.setItem(STORAGE_KEY_QUIZ, JSON.stringify(data));
                return data;
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки квиза:', error);
    }
    
    const saved = localStorage.getItem(STORAGE_KEY_QUIZ);
    return saved ? JSON.parse(saved) : null;
}

async function fetchStudentsFromAPI(quizId = 'default') {
    if (!USE_API_SYNC || !SYNC_API_URL) {
        const saved = localStorage.getItem(STORAGE_KEY_STUDENTS);
        return saved ? JSON.parse(saved) : [];
    }
    
    try {
        const url = `${SYNC_API_URL}?type=students&quizId=${encodeURIComponent(quizId)}`;
        console.log('fetchStudentsFromAPI: запрос к', url);
        const response = await fetch(url);
        console.log('fetchStudentsFromAPI: статус ответа', response.status);
        if (response.ok) {
            const data = await response.json();
            console.log('fetchStudentsFromAPI: получены данные', data);
            if (data && Array.isArray(data)) {
                localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(data));
                return data;
            } else if (data && data.error) {
                console.error('fetchStudentsFromAPI: ошибка от сервера', data);
            }
        } else {
            const errorText = await response.text();
            console.error('fetchStudentsFromAPI: ошибка HTTP', response.status, errorText);
        }
    } catch (error) {
        console.error('fetchStudentsFromAPI: ошибка загрузки студентов:', error);
    }
    
    const saved = localStorage.getItem(STORAGE_KEY_STUDENTS);
    return saved ? JSON.parse(saved) : [];
}

// Состояние приложения
let currentMode = null; // 'teacher' или 'student'
let currentQuiz = null;
let students = [];
let currentQuestionIndex = 0;
let quizTimer = null;
let timeRemaining = 20;

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    // Настраиваем тему
    setupTheme();
    
    // Определяем режим из URL
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode') || 'teacher';
    
    if (mode === 'teacher') {
        initTeacherMode();
    } else {
        initStudentMode();
    }
    
    // Загружаем список файлов для выбора
    loadFileList();
    
    // Настраиваем обработчики событий
    setupEventHandlers();
    
    // Настраиваем обработчик событий storage для синхронизации между вкладками
    setupStorageListener();
    
    // Запускаем polling для синхронизации
    startPolling();
});

// Настройка темы
function setupTheme() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);
    
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('.theme-icon');
    if (icon) {
        icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

// Настройка обработчика событий storage для синхронизации между вкладками
function setupStorageListener() {
    window.addEventListener('storage', (e) => {
        // Когда localStorage изменяется в другой вкладке
        if (e.key === STORAGE_KEY_STUDENTS && currentMode === 'teacher') {
            // Немедленно обновляем список студентов
            loadStudents();
        } else if (e.key === STORAGE_KEY_QUIZ) {
            // Обновляем состояние квиза
            if (currentMode === 'student') {
                checkActiveQuiz();
            } else if (currentMode === 'teacher') {
                const saved = localStorage.getItem(STORAGE_KEY_QUIZ);
                if (saved) {
                    try {
                        const quiz = JSON.parse(saved);
                        if (quiz.status === 'active' && quiz.currentQuestionIndex !== currentQuestionIndex) {
                            currentQuestionIndex = quiz.currentQuestionIndex;
                            showQuestionForTeacher();
                        }
                    } catch (e) {
                        console.error('Ошибка обновления квиза:', e);
                    }
                }
            }
        }
    });
    
    // Также слушаем изменения в текущей вкладке через кастомное событие
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
        const oldValue = this.getItem(key);
        originalSetItem.apply(this, [key, value]);
        
        // Создаем событие для текущей вкладки
        const event = new Event('storage');
        event.key = key;
        event.oldValue = oldValue;
        event.newValue = value;
        event.storageArea = this;
        window.dispatchEvent(event);
    };
}

// Инициализация режима преподавателя
function initTeacherMode() {
    currentMode = 'teacher';
    document.getElementById('teacherMode').style.display = 'block';
    
    // Инициализируем пустой массив студентов
    if (!students) {
        students = [];
    }
    
    // Загружаем сохраненный квиз если есть
    const savedQuiz = localStorage.getItem(STORAGE_KEY_QUIZ);
    if (savedQuiz) {
        try {
            currentQuiz = JSON.parse(savedQuiz);
            showQuizControl();
        } catch (e) {
            console.error('Ошибка загрузки квиза:', e);
        }
    }
    
    // Загружаем список студентов сразу
    loadStudents();
    
    // Также загружаем список студентов через небольшую задержку для надежности
    setTimeout(() => {
        loadStudents();
    }, 500);
}

// Инициализация режима студента
async function initStudentMode() {
    currentMode = 'student';
    document.getElementById('studentMode').style.display = 'block';
    
    // Проверяем, есть ли сохраненный quizId (студент уже подключился к комнате)
    const savedQuizId = localStorage.getItem(STORAGE_KEY_QUIZ_ID);
    const savedName = localStorage.getItem(STORAGE_KEY_STUDENT_NAME);
    const nameData = savedName ? JSON.parse(savedName) : null;
    
    // Если студент уже подключился к комнате и ввел имя, проверяем статус квиза
    if (savedQuizId && nameData && nameData.lastName && nameData.firstName) {
        // Студент уже подключен - проверяем статус квиза
        let quiz = null;
        
        if (USE_API_SYNC) {
            try {
                quiz = await fetchQuizFromAPI(savedQuizId);
                console.log('initStudentMode: загружен квиз с сервера, статус:', quiz?.status);
            } catch (e) {
                console.error('Ошибка загрузки квиза с сервера при инициализации:', e);
                const saved = localStorage.getItem(STORAGE_KEY_QUIZ);
                if (saved) {
                    try {
                        quiz = JSON.parse(saved);
                    } catch (e2) {
                        console.error('Ошибка парсинга квиза из localStorage:', e2);
                    }
                }
            }
        } else {
            const saved = localStorage.getItem(STORAGE_KEY_QUIZ);
            if (saved) {
                try {
                    quiz = JSON.parse(saved);
                } catch (e) {
                    console.error('Ошибка парсинга квиза:', e);
                }
            }
        }
        
        if (quiz) {
            // Заполняем поля имени
            document.getElementById('studentLastName').value = nameData.lastName || '';
            document.getElementById('studentFirstName').value = nameData.firstName || '';
            document.getElementById('roomCodeSection').style.display = 'none';
            document.getElementById('nameInputSection').style.display = 'none';
            
            // Показываем соответствующий раздел в зависимости от статуса
            if (quiz.status === 'finished') {
                showResultsForStudent(quiz);
            } else if (quiz.status === 'active') {
                lastQuizStatus = quiz.status;
                lastQuestionIndex = quiz.currentQuestionIndex || -1;
                showQuestionForStudent(quiz, false);
                const questionStartedAt = quiz.currentQuestionStartedAt || quiz.startedAt;
                startQuestionTimer(questionStartedAt);
            } else {
                document.getElementById('waitingSection').style.display = 'block';
            }
            return;
        }
    }
    
    // Студент еще не подключился или квиз не найден - показываем форму ввода кода комнаты
    document.getElementById('roomCodeSection').style.display = 'block';
    document.getElementById('nameInputSection').style.display = 'none';
    document.getElementById('waitingSection').style.display = 'none';
    document.getElementById('quizTakingSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
}

// Подключение к комнате по коду
async function handleConnectToRoom() {
    const roomCode = document.getElementById('roomCodeInput').value.trim();
    
    if (!roomCode) {
        const errorDiv = document.getElementById('roomCodeError');
        if (errorDiv) {
            errorDiv.textContent = 'Введите код комнаты';
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    const errorDiv = document.getElementById('roomCodeError');
    errorDiv.style.display = 'none';
    
    // Пытаемся загрузить квиз с сервера по коду
    let quiz = null;
    if (USE_API_SYNC) {
        try {
            quiz = await fetchQuizFromAPI(roomCode);
            if (!quiz || !quiz.id) {
                throw new Error('Квиз не найден');
            }
        } catch (e) {
            console.error('Ошибка загрузки квиза:', e);
            if (errorDiv) {
                errorDiv.textContent = 'Квиз с таким кодом не найден. Проверьте код и попробуйте снова.';
                errorDiv.style.display = 'block';
            }
            return;
        }
    } else {
        // Без API синхронизации проверяем localStorage
        const saved = localStorage.getItem(STORAGE_KEY_QUIZ);
        if (saved) {
            try {
                const savedQuiz = JSON.parse(saved);
                if (savedQuiz.id === roomCode) {
                    quiz = savedQuiz;
                } else {
                    if (errorDiv) {
                        errorDiv.textContent = 'Квиз с таким кодом не найден. Проверьте код и попробуйте снова.';
                        errorDiv.style.display = 'block';
                    }
                    return;
                }
            } catch (e) {
                console.error('Ошибка парсинга квиза:', e);
                if (errorDiv) {
                    errorDiv.textContent = 'Ошибка загрузки квиза.';
                    errorDiv.style.display = 'block';
                }
                return;
            }
        } else {
            if (errorDiv) {
                errorDiv.textContent = 'Квиз с таким кодом не найден. Проверьте код и попробуйте снова.';
                errorDiv.style.display = 'block';
            }
            return;
        }
    }
    
    // Квиз найден - сохраняем quizId и показываем форму ввода имени
    localStorage.setItem(STORAGE_KEY_QUIZ_ID, quiz.id);
    localStorage.setItem(STORAGE_KEY_QUIZ, JSON.stringify(quiz));
    
    document.getElementById('roomCodeSection').style.display = 'none';
    document.getElementById('nameInputSection').style.display = 'block';
    
    console.log('Подключение к комнате успешно, quizId:', quiz.id);
}

// Копирование кода квиза
function handleCopyQuizCode() {
    const codeDisplay = document.getElementById('quizCodeDisplay');
    if (!codeDisplay) return;
    
    codeDisplay.select();
    codeDisplay.setSelectionRange(0, 99999); // Для мобильных устройств
    
    try {
        document.execCommand('copy');
        const btn = document.getElementById('copyQuizCodeBtn');
        if (btn) {
            const originalText = btn.textContent;
            btn.textContent = '✓ Скопировано';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        }
    } catch (err) {
        console.error('Ошибка копирования:', err);
    }
}

// Загрузка списка файлов только из папки "тесты"
async function loadFileList() {
    try {
        // Пытаемся загрузить index.json из папки lectures (там могут быть файлы из тесты)
        const response = await fetch(`${LECTURES_PATH}/index.json`);
        if (response.ok) {
            const data = await response.json();
            const files = data.files || data || [];
            const select = document.getElementById('quizFileSelect');
            
            select.innerHTML = '<option value="">Выберите файл...</option>';
            
            // Фильтруем только файлы из папки "тесты"
            const testFiles = files.filter(file => {
                const path = file.path || file;
                return path.startsWith('тесты/') || path.startsWith('тесты\\');
            });
            
            if (testFiles.length === 0) {
                select.innerHTML = '<option value="">Нет доступных тестов</option>';
                return;
            }
            
            testFiles.forEach(file => {
                const path = file.path || file;
                if (path.endsWith('.md')) {
                    const option = document.createElement('option');
                    option.value = path;
                    // Показываем только имя файла без префикса "тесты/"
                    const displayName = path.replace(/^тесты[\/\\]/, '');
                    option.textContent = displayName;
                    select.appendChild(option);
                }
            });
        } else {
            // Если index.json не найден, пытаемся загрузить напрямую из папки тесты
            const select = document.getElementById('quizFileSelect');
            select.innerHTML = '<option value="">Ошибка: index.json не найден</option>';
        }
    } catch (error) {
        console.error('Ошибка загрузки списка файлов:', error);
        const select = document.getElementById('quizFileSelect');
        if (select) {
            select.innerHTML = '<option value="">Ошибка загрузки файлов</option>';
        }
    }
}

// Настройка обработчиков событий
function setupEventHandlers() {
    // Преподаватель
    document.getElementById('parseQuizBtn')?.addEventListener('click', handleParseQuiz);
    document.getElementById('saveQuizBtn')?.addEventListener('click', handleSaveQuiz);
    document.getElementById('startQuizBtn')?.addEventListener('click', handleStartQuiz);
    document.getElementById('resetQuizBtn')?.addEventListener('click', handleResetQuiz);
    document.getElementById('refreshStudentsBtn')?.addEventListener('click', () => {
        console.log('Ручное обновление списка студентов');
        const saved = localStorage.getItem(STORAGE_KEY_STUDENTS);
        console.log('Данные в localStorage:', saved);
        loadStudents();
    });
    
    // Студент
    document.getElementById('joinQuizBtn')?.addEventListener('click', handleJoinQuiz);
    document.getElementById('connectToRoomBtn')?.addEventListener('click', handleConnectToRoom);
    document.getElementById('copyQuizCodeBtn')?.addEventListener('click', handleCopyQuizCode);
    
    // Разрешаем подключение по Enter в поле кода комнаты
    document.getElementById('roomCodeInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleConnectToRoom();
        }
    });
    document.getElementById('submitAnswerBtn')?.addEventListener('click', handleSubmitAnswer);
}

// Парсинг MD файла с вопросами
async function handleParseQuiz() {
    const filePath = document.getElementById('quizFileSelect').value;
    const quizName = document.getElementById('quizName').value;
    
    if (!filePath) {
        alert('Выберите файл с вопросами');
        return;
    }
    
    if (!quizName) {
        alert('Введите название квиза');
        return;
    }
    
    try {
        // Файлы из папки "тесты" находятся в lectures/тесты/...
        // Путь в filePath уже содержит "тесты/..." относительно lectures
        const fullPath = `${LECTURES_PATH}/${filePath}`;
        
        const response = await fetch(fullPath);
        if (!response.ok) {
            throw new Error(`Файл не найден: ${fullPath}`);
        }
        
        const markdown = await response.text();
        const questions = parseQuestions(markdown);
        
        if (questions.length === 0) {
            alert('Не удалось распознать вопросы в файле. Убедитесь, что формат соответствует:\n\nВопрос 1: ...\nа. вариант\nб. вариант\nв. вариант\nг. вариант');
            return;
        }
        
        // Сохраняем временные данные
        currentQuiz = {
            name: quizName,
            questions: questions,
            filePath: filePath
        };
        
        displayQuestionsPreview(questions);
    } catch (error) {
        console.error('Ошибка загрузки файла:', error);
        alert('Ошибка загрузки файла: ' + error.message);
    }
}

// Парсинг вопросов из Markdown
function parseQuestions(markdown) {
    const questions = [];
    const lines = markdown.split('\n');
    
    let currentQuestion = null;
    let currentAnswers = [];
    let questionTextLines = [];
    let isCollectingQuestion = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Проверяем, является ли строка началом вопроса (формат: "Вопрос 1" или "Вопрос 1:")
        const questionMatch = line.match(/^Вопрос\s+(\d+)[:：]?\s*(.*)$/i);
        if (questionMatch) {
            // Сохраняем предыдущий вопрос если есть
            if (currentQuestion && currentAnswers.length > 0) {
                questions.push({
                    text: currentQuestion,
                    answers: currentAnswers,
                    correctAnswer: null // Будет установлено преподавателем
                });
            }
            
            // Начинаем новый вопрос
            questionTextLines = [];
            isCollectingQuestion = true;
            if (questionMatch[2] && questionMatch[2].length > 0) {
                questionTextLines.push(questionMatch[2]);
            }
            currentAnswers = [];
            currentQuestion = null;
            continue;
        }
        
        // Если мы собираем текст вопроса
        if (isCollectingQuestion) {
            // Проверяем, является ли строка вариантом ответа
            const answerMatch = line.match(/^([A-Zа-яa-z])[\.\)]\s*(.+)$/);
            if (answerMatch) {
                // Встретили первый вариант ответа - завершаем сбор текста вопроса
                currentQuestion = questionTextLines.join(' ').trim();
                questionTextLines = [];
                isCollectingQuestion = false;
                
                // Добавляем вариант ответа
                const letter = answerMatch[1].toUpperCase();
                const text = answerMatch[2];
                currentAnswers.push({ letter, text });
            } else if (line.length > 0) {
                // Это часть текста вопроса
                questionTextLines.push(line);
            }
            // Пустые строки игнорируем при сборе вопроса
            continue;
        }
        
        // Если мы не собираем вопрос, проверяем варианты ответов
        if (currentQuestion) {
            const answerMatch = line.match(/^([A-Zа-яa-z])[\.\)]\s*(.+)$/);
            if (answerMatch) {
                const letter = answerMatch[1].toUpperCase();
                const text = answerMatch[2];
                currentAnswers.push({ letter, text });
            }
        }
    }
    
    // Сохраняем последний вопрос
    if (currentQuestion && currentAnswers.length > 0) {
        questions.push({
            text: currentQuestion,
            answers: currentAnswers,
            correctAnswer: null
        });
    }
    
    return questions;
}

// Отображение превью вопросов
function displayQuestionsPreview(questions) {
    const container = document.getElementById('questionsList');
    container.innerHTML = '';
    
    questions.forEach((q, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-preview';
        questionDiv.innerHTML = `
            <div class="question-preview-header">
                <strong>Вопрос ${index + 1}:</strong> ${q.text}
            </div>
            <div class="question-preview-answers">
                ${q.answers.map((a, i) => `
                    <label class="answer-option">
                        <input type="radio" name="correct_${index}" value="${a.letter}" data-question-index="${index}">
                        ${a.letter}. ${a.text}
                    </label>
                `).join('')}
            </div>
        `;
        container.appendChild(questionDiv);
    });
    
    document.getElementById('questionsPreview').style.display = 'block';
}

// Сохранение квиза
async function handleSaveQuiz() {
    if (!currentQuiz) {
        alert('Сначала загрузите вопросы');
        return;
    }
    
    // Собираем правильные ответы
    const questions = currentQuiz.questions;
    let allAnswered = true;
    
    questions.forEach((q, index) => {
        const radio = document.querySelector(`input[name="correct_${index}"]:checked`);
        if (radio) {
            q.correctAnswer = radio.value;
        } else {
            allAnswered = false;
        }
    });
    
    if (!allAnswered) {
        alert('Укажите правильные ответы для всех вопросов');
        return;
    }
    
    // Генерируем уникальный ID квиза для синхронизации
    const quizId = currentQuiz.id || `quiz_${Date.now()}`;
    currentQuiz.id = quizId;
    localStorage.setItem(STORAGE_KEY_QUIZ_ID, quizId);
    
    // Сохраняем квиз
    currentQuiz.status = 'waiting'; // waiting, active, finished
    currentQuiz.currentQuestionIndex = 0;
    currentQuiz.startedAt = null;
    
    localStorage.setItem(STORAGE_KEY_QUIZ, JSON.stringify(currentQuiz));
    
    // Синхронизируем квиз с сервером
    await syncQuizToAPI(currentQuiz, quizId);
    console.log('handleSaveQuiz: Квиз синхронизирован с сервером, quizId:', quizId);
    
    // Не очищаем список студентов при сохранении квиза - они могут уже быть добавлены
    // Только инициализируем пустой массив, если его еще нет
    const existingStudents = localStorage.getItem(STORAGE_KEY_STUDENTS);
    if (!existingStudents) {
        const emptyStudents = [];
        localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(emptyStudents));
        await syncStudentsToAPI(emptyStudents, quizId);
        console.log('handleSaveQuiz: Инициализирован пустой список студентов');
    } else {
        console.log('handleSaveQuiz: Сохранен квиз, список студентов сохранен:', existingStudents);
        // ВСЕГДА синхронизируем существующих студентов с сервером
        try {
            const students = JSON.parse(existingStudents);
            await syncStudentsToAPI(students, quizId);
            console.log('handleSaveQuiz: Список студентов синхронизирован с сервером:', students.length);
        } catch (e) {
            console.error('Ошибка синхронизации существующих студентов:', e);
        }
    }
    
    alert('Квиз сохранен! Теперь студенты могут присоединиться.');
    showQuizControl();
    
    // Принудительно загружаем список студентов после сохранения квиза
    setTimeout(() => {
        console.log('handleSaveQuiz: Принудительная загрузка списка студентов через 100ms');
        loadStudents();
    }, 100);
}

// Показать панель управления квизом
function showQuizControl() {
    document.getElementById('createQuizSection').style.display = 'none';
    document.getElementById('quizControlSection').style.display = 'block';
    document.getElementById('currentQuizName').textContent = currentQuiz.name;
    document.getElementById('totalQuestions').textContent = currentQuiz.questions.length;
    
    // Показываем код комнаты
    const quizId = localStorage.getItem(STORAGE_KEY_QUIZ_ID) || currentQuiz.id || 'default';
    const codeDisplay = document.getElementById('quizCodeDisplay');
    if (codeDisplay) {
        codeDisplay.value = quizId;
    }
    
    loadStudents();
}

// Загрузка списка студентов
async function loadStudents() {
    // Инициализируем students если не определен
    if (!students) {
        students = [];
    }
    
    const quizControlSection = document.getElementById('quizControlSection');
    const isQuizControlVisible = quizControlSection && quizControlSection.style.display !== 'none';
    
    // Пытаемся загрузить с сервера (если настроено)
    const quizId = localStorage.getItem(STORAGE_KEY_QUIZ_ID) || 'default';
    let saved = localStorage.getItem(STORAGE_KEY_STUDENTS);
    let localStudents = [];
    
    // Парсим локальные данные для сравнения
    if (saved) {
        try {
            localStudents = JSON.parse(saved);
        } catch (e) {
            localStudents = [];
        }
    }
    
    if (USE_API_SYNC) {
        try {
            const serverStudents = await fetchStudentsFromAPI(quizId);
            // Используем данные с сервера только если они есть и не пустые
            // Или если локальных данных нет
            if (serverStudents && Array.isArray(serverStudents)) {
                if (serverStudents.length > 0 || localStudents.length === 0) {
                    saved = JSON.stringify(serverStudents);
                    console.log('loadStudents: использованы данные с сервера:', serverStudents.length, 'студентов');
                } else {
                    // Если на сервере пусто, но локально есть данные - сохраняем локальные на сервер
                    console.log('loadStudents: на сервере пусто, но локально есть', localStudents.length, 'студентов. Синхронизируем...');
                    await syncStudentsToAPI(localStudents, quizId);
                }
            }
        } catch (e) {
            console.error('Ошибка загрузки студентов с сервера:', e);
            // При ошибке используем локальные данные
        }
    }
    
    if (saved) {
        try {
            const parsedStudents = JSON.parse(saved);
            if (!Array.isArray(parsedStudents)) {
                console.warn('Список студентов не является массивом:', parsedStudents);
                parsedStudents = [];
            }
            
            const oldLength = students.length;
            const oldStudentsJson = JSON.stringify(students);
            const newStudentsJson = JSON.stringify(parsedStudents);
            const studentsChanged = oldStudentsJson !== newStudentsJson;
            
            students = parsedStudents;
            
            // Всегда обновляем список если панель управления видна
            if (isQuizControlVisible) {
                if (studentsChanged || oldLength !== students.length) {
                    console.log('loadStudents: Список студентов обновлен:', oldLength, '->', students.length, students);
                }
                updateStudentsList();
            }
        } catch (e) {
            console.error('Ошибка загрузки студентов:', e, saved);
            students = [];
            if (isQuizControlVisible) {
                updateStudentsList();
            }
        }
    } else {
        // Если нет данных в localStorage
        if (students.length > 0) {
            console.log('loadStudents: Список студентов очищен (нет данных в localStorage)');
            students = [];
        }
        if (isQuizControlVisible) {
            updateStudentsList();
        }
    }
}

// Обновление списка студентов
function updateStudentsList() {
    const container = document.getElementById('studentsList');
    const count = document.getElementById('studentsCount');
    
    if (!container || !count) {
        // Элементы могут отсутствовать в режиме студента или если квиз еще не создан
        // Не выводим предупреждения, если мы не в режиме управления квизом
        return;
    }
    
    // Убеждаемся, что students - это массив
    if (!Array.isArray(students)) {
        console.error('students не является массивом:', students);
        students = [];
    }
    
    const studentsCount = students.length;
    count.textContent = studentsCount;
    
    console.log('updateStudentsList: Отображение', studentsCount, 'студентов', students);
    
    if (studentsCount === 0) {
        container.innerHTML = '<p class="no-students">Пока нет участников</p>';
        return;
    }
    
    container.innerHTML = students.map((student, index) => {
        const lastName = student.lastName || '';
        const firstName = student.firstName || '';
        return `
        <div class="student-item">
            <span class="student-number">${index + 1}</span>
            <span class="student-name">${lastName} ${firstName}</span>
        </div>
    `;
    }).join('');
    
    console.log('updateStudentsList: Список студентов отображен в DOM');
}

// Присоединение студента к квизу
async function handleJoinQuiz() {
    const lastName = document.getElementById('studentLastName').value.trim();
    const firstName = document.getElementById('studentFirstName').value.trim();
    
    if (!lastName || !firstName) {
        alert('Введите фамилию и имя');
        return;
    }
    
    // Получаем quizId из localStorage (должен быть установлен при подключении к комнате)
    const quizId = localStorage.getItem(STORAGE_KEY_QUIZ_ID);
    
    if (!quizId) {
        alert('Сначала подключитесь к комнате по коду');
        return;
    }
    
    // Сохраняем имя
    localStorage.setItem(STORAGE_KEY_STUDENT_NAME, JSON.stringify({ lastName, firstName }));
    
    console.log('handleJoinQuiz: используемый quizId:', quizId);
    
    // Загружаем текущий список студентов с сервера (если настроено) или из localStorage
    let studentsList = [];
    if (USE_API_SYNC) {
        try {
            const serverStudents = await fetchStudentsFromAPI(quizId);
            if (serverStudents && Array.isArray(serverStudents)) {
                studentsList = serverStudents;
                console.log('handleJoinQuiz: загружен список студентов с сервера:', studentsList.length);
            }
        } catch (e) {
            console.error('Ошибка загрузки студентов с сервера:', e);
        }
    }
    
    // Fallback на localStorage если сервер пустой
    if (studentsList.length === 0) {
        const saved = localStorage.getItem(STORAGE_KEY_STUDENTS);
        if (saved) {
            try {
                studentsList = JSON.parse(saved);
                if (!Array.isArray(studentsList)) {
                    studentsList = [];
                }
            } catch (e) {
                console.error('Ошибка парсинга списка студентов:', e);
                studentsList = [];
            }
        }
    }
    
    // Проверяем, не зарегистрирован ли уже
    const exists = studentsList.some(s => 
        s.lastName === lastName && s.firstName === firstName
    );
    
    if (!exists) {
        studentsList.push({
            lastName,
            firstName,
            joinedAt: new Date().toISOString(),
            answers: [],
            score: 0
        });
        const studentsJson = JSON.stringify(studentsList);
        localStorage.setItem(STORAGE_KEY_STUDENTS, studentsJson);
        
        // Синхронизируем с сервером используя правильный quizId
        await syncStudentsToAPI(studentsList, quizId);
        
        console.log('Студент добавлен:', lastName, firstName, 'Всего студентов:', studentsList.length, 'quizId:', quizId);
        console.log('Данные сохранены в localStorage:', studentsJson);
    } else {
        console.log('Студент уже зарегистрирован:', lastName, firstName);
    }
    
    // Переходим к ожиданию начала квиза
    document.getElementById('nameInputSection').style.display = 'none';
    document.getElementById('waitingSection').style.display = 'block';
    
    // Переходим к ожиданию
    document.getElementById('nameInputSection').style.display = 'none';
    document.getElementById('waitingSection').style.display = 'block';
}

// Проверка активного квиза (для студента)
function checkActiveQuiz() {
    const saved = localStorage.getItem(STORAGE_KEY_QUIZ);
    if (saved) {
        try {
            const quiz = JSON.parse(saved);
            if (quiz.status === 'active') {
                // Квиз уже начат, показываем текущий вопрос
                showQuestionForStudent(quiz);
            } else if (quiz.status === 'finished') {
                // Показываем результаты
                showResultsForStudent(quiz);
            }
        } catch (e) {
            console.error('Ошибка проверки квиза:', e);
        }
    }
}

// Запуск квиза
async function handleStartQuiz() {
    if (!currentQuiz) {
        alert('Сначала создайте квиз');
        return;
    }
    
    if (students.length === 0) {
        alert('Дождитесь хотя бы одного участника');
        return;
    }
    
    // Обновляем статус квиза
    currentQuiz.status = 'active';
    currentQuiz.currentQuestionIndex = 0;
    currentQuiz.startedAt = new Date().toISOString();
    currentQuiz.currentQuestionStartedAt = new Date().toISOString(); // Время начала первого вопроса
    currentQuestionIndex = 0;
    
    // Сохраняем локально
    localStorage.setItem(STORAGE_KEY_QUIZ, JSON.stringify(currentQuiz));
    
    // Синхронизируем с сервером (чтобы студенты получили обновление)
    const quizId = localStorage.getItem(STORAGE_KEY_QUIZ_ID) || 'default';
    await syncQuizToAPI(currentQuiz, quizId);
    console.log('Квиз запущен и синхронизирован с сервером');
    
    // Показываем первый вопрос преподавателю
    showQuestionForTeacher();
    
    // Запускаем таймер с временем начала вопроса для синхронизации
    startQuestionTimer(currentQuiz.currentQuestionStartedAt);
}

// Показать вопрос преподавателю
function showQuestionForTeacher() {
    const question = currentQuiz.questions[currentQuestionIndex];
    document.getElementById('currentQuestionNumber').textContent = currentQuestionIndex + 1;
    document.getElementById('quizProgress').style.display = 'block';
    
    // Обновляем прогресс-бар
    const progress = ((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
}

// Показать вопрос студенту
function showQuestionForStudent(quiz, resetTimer = true) {
    document.getElementById('waitingSection').style.display = 'none';
    document.getElementById('quizTakingSection').style.display = 'block';
    document.getElementById('resultsSection').style.display = 'none';
    
    const question = quiz.questions[quiz.currentQuestionIndex];
    const currentQuestionIndex = quiz.currentQuestionIndex || 0;
    
    // Проверяем, изменился ли вопрос
    const displayedQuestionNumber = parseInt(document.getElementById('studentQuestionNumber')?.textContent || '0');
    const questionChanged = (currentQuestionIndex + 1) !== displayedQuestionNumber;
    
    // ВАЖНО: Защита от отката назад - не обновляем UI если текущий вопрос меньше отображаемого
    if (currentQuestionIndex + 1 < displayedQuestionNumber && displayedQuestionNumber > 0) {
        console.warn('showQuestionForStudent: попытка отката на предыдущий вопрос. Игнорируем. Текущий:', currentQuestionIndex + 1, 'Отображаемый:', displayedQuestionNumber);
        return;
    }
    
    document.getElementById('questionText').textContent = question.text;
    document.getElementById('studentQuestionNumber').textContent = currentQuestionIndex + 1;
    document.getElementById('studentTotalQuestions').textContent = quiz.questions.length;
    
    // Обновляем варианты ответов только если вопрос изменился
    if (questionChanged) {
        const answersContainer = document.getElementById('answersList');
        answersContainer.innerHTML = question.answers.map(a => `
            <label class="answer-option-large">
                <input type="radio" name="studentAnswer" value="${a.letter}">
                <span class="answer-letter">${a.letter}.</span>
                <span class="answer-text">${a.text}</span>
            </label>
        `).join('');
        
        // Сбрасываем состояние кнопки только при смене вопроса
        const submitBtn = document.getElementById('submitAnswerBtn');
        submitBtn.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ответить';
    }
    
    // Сбрасываем таймер только если вопрос изменился или явно запрошено
    if (resetTimer && questionChanged) {
        timeRemaining = 20;
        updateTimer();
    }
}

// Запуск таймера вопроса
function startQuestionTimer(questionStartedAt = null) {
    // Если есть время начала вопроса, вычисляем оставшееся время
    if (questionStartedAt) {
        const startTime = new Date(questionStartedAt).getTime();
        const now = new Date().getTime();
        const elapsed = Math.floor((now - startTime) / 1000); // секунды
        timeRemaining = Math.max(0, 20 - elapsed);
    } else {
        // Иначе начинаем с 20 секунд
        timeRemaining = 20;
    }
    
    updateTimer();
    
    if (quizTimer) {
        clearInterval(quizTimer);
    }
    
    quizTimer = setInterval(() => {
        timeRemaining--;
        updateTimer();
        
        if (timeRemaining <= 0) {
            clearInterval(quizTimer);
            // Автоматически переходим к следующему вопросу только у преподавателя
            if (currentMode === 'teacher') {
                nextQuestion();
            }
        }
    }, 1000);
}

// Обновление таймера
function updateTimer() {
    const teacherTimer = document.getElementById('questionTimer');
    const studentTimer = document.getElementById('studentTimer');
    
    if (teacherTimer) {
        teacherTimer.textContent = timeRemaining;
        if (timeRemaining <= 5) {
            teacherTimer.classList.add('timer-warning');
        } else {
            teacherTimer.classList.remove('timer-warning');
        }
    }
    
    if (studentTimer) {
        studentTimer.textContent = timeRemaining;
        if (timeRemaining <= 5) {
            studentTimer.classList.add('timer-warning');
        } else {
            studentTimer.classList.remove('timer-warning');
        }
    }
}

// Переход к следующему вопросу
async function nextQuestion() {
    if (!currentQuiz) return;
    
    currentQuestionIndex++;
    
    if (currentQuestionIndex >= currentQuiz.questions.length) {
        // Квиз завершен
        await finishQuiz();
    } else {
        currentQuiz.currentQuestionIndex = currentQuestionIndex;
        // Сохраняем время начала текущего вопроса для синхронизации таймеров
        currentQuiz.currentQuestionStartedAt = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY_QUIZ, JSON.stringify(currentQuiz));
        
        // Синхронизируем с сервером (чтобы студенты получили обновление)
        const quizId = localStorage.getItem(STORAGE_KEY_QUIZ_ID) || 'default';
        await syncQuizToAPI(currentQuiz, quizId);
        console.log('Переход к вопросу', currentQuestionIndex + 1, 'синхронизирован с сервером');
        
        if (currentMode === 'teacher') {
            showQuestionForTeacher();
            // Используем время начала вопроса для синхронизации таймера
            startQuestionTimer(currentQuiz.currentQuestionStartedAt);
        }
        // Для студентов обновление произойдет через polling
    }
}

// Завершение квиза
async function finishQuiz() {
    if (currentQuiz) {
        currentQuiz.status = 'finished';
        localStorage.setItem(STORAGE_KEY_QUIZ, JSON.stringify(currentQuiz));
        
        // Синхронизируем с сервером
        const quizId = localStorage.getItem(STORAGE_KEY_QUIZ_ID) || 'default';
        await syncQuizToAPI(currentQuiz, quizId);
        console.log('Квиз завершен и синхронизирован с сервером');
    }
    
    if (currentMode === 'teacher') {
        document.getElementById('quizProgress').style.display = 'none';
        alert('Квиз завершен!');
    }
    
    if (quizTimer) {
        clearInterval(quizTimer);
    }
}

// Отправка ответа студентом
function handleSubmitAnswer() {
    const selected = document.querySelector('input[name="studentAnswer"]:checked');
    if (!selected) {
        alert('Выберите ответ');
        return;
    }
    
    const answer = selected.value;
    const saved = localStorage.getItem(STORAGE_KEY_STUDENTS);
    let students = [];
    if (saved) {
        try {
            students = JSON.parse(saved);
        } catch (e) {
            students = [];
        }
    }
    
    // Находим текущего студента и сохраняем ответ
    const nameData = JSON.parse(localStorage.getItem(STORAGE_KEY_STUDENT_NAME));
    const student = students.find(s => 
        s.lastName === nameData.lastName && s.firstName === nameData.firstName
    );
    
    if (student) {
        const quiz = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ));
        student.answers[quiz.currentQuestionIndex] = answer;
        localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
    }
    
    // Показываем сообщение об отправке
    document.getElementById('submitAnswerBtn').textContent = 'Ответ отправлен ✓';
    document.getElementById('submitAnswerBtn').disabled = true;
}

// Показать результаты студенту
function showResultsForStudent(quiz) {
    document.getElementById('waitingSection').style.display = 'none';
    document.getElementById('quizTakingSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'block';
    
    const nameData = JSON.parse(localStorage.getItem(STORAGE_KEY_STUDENT_NAME));
    const saved = localStorage.getItem(STORAGE_KEY_STUDENTS);
    let students = [];
    if (saved) {
        try {
            students = JSON.parse(saved);
        } catch (e) {
            students = [];
        }
    }
    
    const student = students.find(s => 
        s.lastName === nameData.lastName && s.firstName === nameData.firstName
    );
    
    if (!student) {
        document.getElementById('resultsContent').innerHTML = '<p>Результаты не найдены</p>';
        return;
    }
    
    // Подсчитываем правильные ответы
    let correct = 0;
    quiz.questions.forEach((q, index) => {
        if (student.answers[index] === q.correctAnswer) {
            correct++;
        }
    });
    
    const total = quiz.questions.length;
    const percentage = Math.round((correct / total) * 100);
    
    document.getElementById('resultsContent').innerHTML = `
        <div class="results-summary">
            <h3>${nameData.lastName} ${nameData.firstName}</h3>
            <div class="score">Правильных ответов: ${correct} из ${total}</div>
            <div class="percentage">${percentage}%</div>
        </div>
        <div class="results-details">
            ${quiz.questions.map((q, index) => {
                const studentAnswer = student.answers[index];
                const isCorrect = studentAnswer === q.correctAnswer;
                return `
                    <div class="result-item ${isCorrect ? 'correct' : 'incorrect'}">
                        <div class="result-question">Вопрос ${index + 1}: ${q.text}</div>
                        <div class="result-answer">
                            Ваш ответ: ${studentAnswer || 'не дан'} 
                            ${isCorrect ? '✓' : `✗ (правильный: ${q.correctAnswer})`}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Сброс квиза
function handleResetQuiz() {
    if (confirm('Вы уверены, что хотите сбросить квиз? Все данные будут удалены.')) {
        localStorage.removeItem(STORAGE_KEY_QUIZ);
        localStorage.removeItem(STORAGE_KEY_STUDENTS);
        currentQuiz = null;
        students = [];
        currentQuestionIndex = 0;
        
        if (quizTimer) {
            clearInterval(quizTimer);
        }
        
        document.getElementById('createQuizSection').style.display = 'block';
        document.getElementById('quizControlSection').style.display = 'none';
        document.getElementById('quizProgress').style.display = 'none';
    }
}

// Polling для синхронизации
let lastQuestionIndex = -1;
let lastQuizStatus = null;

function startPolling() {
    setInterval(async () => {
        if (currentMode === 'student') {
            // Студент проверяет обновления квиза с сервера
            let quizId = localStorage.getItem(STORAGE_KEY_QUIZ_ID) || 'default';
            let quiz = null;
            
            // ВСЕГДА загружаем данные с сервера (если настроено), чтобы получить актуальные данные
            if (USE_API_SYNC) {
                try {
                    // Пробуем загрузить квиз с текущим quizId
                    quiz = await fetchQuizFromAPI(quizId);
                    
                    // Если не нашли с текущим quizId, пробуем 'default'
                    if (!quiz || !quiz.id) {
                        quiz = await fetchQuizFromAPI('default');
                    }
                    
                    // Если получили квиз с другим id, обновляем quizId
                    if (quiz && quiz.id && quiz.id !== quizId) {
                        quizId = quiz.id;
                        localStorage.setItem(STORAGE_KEY_QUIZ_ID, quizId);
                        console.log('Polling: обновлен quizId на', quizId);
                    }
                    
                    console.log('Polling: загружен квиз с сервера, вопрос:', (quiz?.currentQuestionIndex || 0) + 1, 'quizId:', quizId);
                    // Обновляем localStorage актуальными данными с сервера
                    if (quiz) {
                        localStorage.setItem(STORAGE_KEY_QUIZ, JSON.stringify(quiz));
                    }
                } catch (e) {
                    console.error('Ошибка загрузки квиза с сервера:', e);
                    // Fallback на localStorage только при ошибке
                    const saved = localStorage.getItem(STORAGE_KEY_QUIZ);
                    if (saved) {
                        try {
                            quiz = JSON.parse(saved);
                            // Обновляем quizId из сохраненного квиза
                            if (quiz.id && quiz.id !== quizId) {
                                quizId = quiz.id;
                                localStorage.setItem(STORAGE_KEY_QUIZ_ID, quizId);
                                console.log('Polling: обновлен quizId из localStorage на', quizId);
                            }
                            console.warn('Polling: использованы данные из localStorage (fallback)');
                        } catch (e2) {
                            console.error('Ошибка парсинга квиза из localStorage:', e2);
                        }
                    }
                }
            } else {
                // Используем только localStorage (для локального тестирования)
                const saved = localStorage.getItem(STORAGE_KEY_QUIZ);
                if (saved) {
                    try {
                        quiz = JSON.parse(saved);
                    } catch (e) {
                        console.error('Ошибка парсинга квиза:', e);
                    }
                }
            }
            
            if (quiz) {
                try {
                    // Проверяем изменение статуса
                    if (quiz.status !== lastQuizStatus) {
                        lastQuizStatus = quiz.status;
                        console.log('Polling: изменение статуса квиза', quiz.status);
                        
                        if (quiz.status === 'active') {
                            const currentIndex = quiz.currentQuestionIndex || 0;
                            // Обновляем только если вопрос изменился ВПЕРЕД
                            const isNewQuestion = currentIndex !== lastQuestionIndex && currentIndex >= lastQuestionIndex;
                            
                            if (isNewQuestion) {
                                showQuestionForStudent(quiz, true);
                                // Запускаем таймер с синхронизацией времени начала вопроса
                                const questionStartedAt = quiz.currentQuestionStartedAt || quiz.startedAt;
                                startQuestionTimer(questionStartedAt);
                                lastQuestionIndex = currentIndex;
                                console.log('Polling: запущен таймер для вопроса', currentIndex + 1, 'время начала:', questionStartedAt);
                            } else if (currentIndex < lastQuestionIndex) {
                                console.warn('Polling: обнаружен откат вопроса при изменении статуса. Игнорируем.');
                            }
                        } else if (quiz.status === 'finished') {
                            if (quizTimer) {
                                clearInterval(quizTimer);
                            }
                            showResultsForStudent(quiz);
                        }
                    } else if (quiz.status === 'active') {
                        // Проверяем изменение индекса вопроса
                        const currentIndex = quiz.currentQuestionIndex || 0;
                        
                        // ВАЖНО: Обновляем только если вопрос изменился ВПЕРЕД (не откатываемся назад)
                        // Это предотвращает откат на предыдущий вопрос при временных проблемах синхронизации
                        if (currentIndex !== lastQuestionIndex && currentIndex >= lastQuestionIndex) {
                            console.log('Polling: переход к вопросу', currentIndex + 1, '(был вопрос', lastQuestionIndex + 1 + ')');
                            lastQuestionIndex = currentIndex;
                            showQuestionForStudent(quiz, true); // Явно сбрасываем таймер при смене вопроса
                            // Используем время начала вопроса для синхронизации таймера
                            const questionStartedAt = quiz.currentQuestionStartedAt || quiz.startedAt;
                            startQuestionTimer(questionStartedAt);
                            console.log('Polling: запущен таймер для вопроса', currentIndex + 1, 'время начала:', questionStartedAt);
                        } else if (currentIndex < lastQuestionIndex) {
                            // Предупреждение о возможной проблеме синхронизации, но не откатываемся
                            console.warn('Polling: обнаружен откат вопроса (текущий:', currentIndex + 1, 'был:', lastQuestionIndex + 1 + '). Игнорируем для предотвращения отката UI.');
                        }
                    }
                } catch (e) {
                    console.error('Ошибка обработки квиза:', e);
                }
            }
        } else if (currentMode === 'teacher') {
            // Преподаватель загружает список студентов с сервера при каждом polling
            // Это гарантирует, что мы видим всех студентов, даже если они присоединились на других устройствах
            const quizControlSection = document.getElementById('quizControlSection');
            if (quizControlSection && quizControlSection.style.display !== 'none') {
                // Загружаем студентов с сервера (если настроено) или из localStorage
                await loadStudents();
            }
            
            // Обновляем прогресс если квиз активен
            if (currentQuiz && currentQuiz.status === 'active') {
                const saved = localStorage.getItem(STORAGE_KEY_QUIZ);
                if (saved) {
                    try {
                        const quiz = JSON.parse(saved);
                        if (quiz.currentQuestionIndex !== currentQuestionIndex) {
                            currentQuestionIndex = quiz.currentQuestionIndex;
                            showQuestionForTeacher();
                        }
                    } catch (e) {
                        console.error('Ошибка обновления прогресса:', e);
                    }
                }
            } else {
                // Если квиз еще не создан, загружаем его из localStorage
                const saved = localStorage.getItem(STORAGE_KEY_QUIZ);
                if (saved && !currentQuiz) {
                    try {
                        currentQuiz = JSON.parse(saved);
                        if (currentQuiz.status === 'waiting' || currentQuiz.status === 'active') {
                            showQuizControl();
                        }
                    } catch (e) {
                        console.error('Ошибка загрузки квиза:', e);
                    }
                }
            }
        }
    }, POLL_INTERVAL);
}

