// Конфигурация: путь к папке с лекциями
const LECTURES_PATH = 'lectures';

// Кэш для загруженных файлов
const fileCache = new Map();

// Текущий выбранный файл
let currentFile = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadFileTree();
        setupSearch();
        setupHashNavigation();
        setupTheme();
        setupMobileMenu();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        // Показываем сообщение об ошибке пользователю
        const content = document.getElementById('markdownContent');
        if (content) {
            content.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #d32f2f;">
                    <h2>Ошибка загрузки</h2>
                    <p>Произошла ошибка при загрузке приложения. Пожалуйста, обновите страницу.</p>
                </div>
            `;
        }
    }
});

// Загрузка структуры файлов
async function loadFileTree() {
    try {
        // Пытаемся загрузить index.json с информацией о структуре файлов
        const response = await fetch(`${LECTURES_PATH}/index.json`);
        if (response.ok) {
            const fileListData = await response.json();
            // Извлекаем массив файлов из объекта
            const files = fileListData.files || fileListData || [];
            console.log('Загружено файлов:', files.length);
            renderFileTree(files);
        } else {
            // Если index.json не существует, пытаемся найти файлы через GitHub API или создаем пример
            console.warn('index.json не найден. Создайте его для автоматической генерации структуры.');
            renderFileTree([]);
        }
    } catch (error) {
        console.error('Ошибка загрузки структуры файлов:', error);
        renderFileTree([]);
    }
}

// Рендеринг дерева файлов
function renderFileTree(files) {
    const fileTree = document.getElementById('fileTree');
    fileTree.innerHTML = '';
    
    // Проверяем, что files - это массив
    if (!Array.isArray(files)) {
        console.error('Ожидался массив файлов, получено:', typeof files);
        fileTree.innerHTML = '<div style="padding: 20px; color: #d32f2f;">Ошибка: неверный формат данных</div>';
        return;
    }
    
    if (files.length === 0) {
        fileTree.innerHTML = '<div style="padding: 20px; color: #999;">Нет доступных лекций</div>';
        return;
    }
    
    console.log('Рендеринг дерева файлов:', files);
    const tree = buildTree(files);
    renderTree(tree, fileTree, 0);
}

// Построение дерева из плоского списка файлов
function buildTree(files) {
    const tree = {};
    
    files.forEach(file => {
        const parts = file.path.split('/');
        let current = tree;
        
        parts.forEach((part, index) => {
            if (index === parts.length - 1) {
                // Это файл
                current[part] = { type: 'file', path: file.path, name: part };
            } else {
                // Это папка
                if (!current[part]) {
                    current[part] = { type: 'folder', children: {} };
                }
                current = current[part].children;
            }
        });
    });
    
    return tree;
}

// Рендеринг дерева в DOM
function renderTree(tree, container, level) {
    const entries = Object.entries(tree).sort((a, b) => {
        // Папки идут первыми, затем файлы, всё в алфавитном порядке
        if (a[1].type === 'folder' && b[1].type !== 'folder') return -1;
        if (a[1].type !== 'folder' && b[1].type === 'folder') return 1;
        return a[0].localeCompare(b[0], 'ru');
    });
    
    entries.forEach(([name, item]) => {
        if (item.type === 'folder') {
            const folderDiv = document.createElement('div');
            folderDiv.className = 'folder-item';
            
            const folderHeader = document.createElement('div');
            folderHeader.className = 'folder-header';
            folderHeader.innerHTML = `
                <span class="icon">▶</span>
                <span class="name">${escapeHtml(name)}</span>
            `;
            
            folderHeader.addEventListener('click', () => {
                folderHeader.classList.toggle('expanded');
                folderContent.classList.toggle('expanded');
            });
            
            const folderContent = document.createElement('div');
            folderContent.className = 'folder-content';
            
            renderTree(item.children, folderContent, level + 1);
            
            folderDiv.appendChild(folderHeader);
            folderDiv.appendChild(folderContent);
            container.appendChild(folderDiv);
        } else {
            const fileDiv = document.createElement('div');
            fileDiv.className = 'file-item';
            fileDiv.dataset.path = item.path; // Сохраняем путь для поиска
            fileDiv.innerHTML = `
                <span class="icon">📄</span>
                <span class="name">${escapeHtml(name)}</span>
            `;
            
            fileDiv.addEventListener('click', () => {
                loadFile(item.path);
                // Обновляем активный элемент
                document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
                fileDiv.classList.add('active');
            });
            
            container.appendChild(fileDiv);
        }
    });
}

// Загрузка и отображение файла
async function loadFile(filePath) {
    if (currentFile === filePath) return;
    
    currentFile = filePath;
    
    // Обновляем URL без перезагрузки страницы
    window.history.pushState({}, '', `#${encodeURIComponent(filePath)}`);
    
    // Показываем индикатор загрузки
    const content = document.getElementById('markdownContent');
    content.innerHTML = '<div style="text-align: center; padding: 40px;">Загрузка...</div>';
    
    try {
        // Проверяем кэш
        if (fileCache.has(filePath)) {
            displayMarkdown(fileCache.get(filePath), filePath);
            return;
        }
        
        // Загружаем файл
        const response = await fetch(`${LECTURES_PATH}/${filePath}`);
        if (!response.ok) {
            throw new Error(`Файл не найден: ${filePath}`);
        }
        
        const markdown = await response.text();
        fileCache.set(filePath, markdown);
        displayMarkdown(markdown, filePath);
    } catch (error) {
        console.error('Ошибка загрузки файла:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #d32f2f;">
                <h2>Ошибка загрузки</h2>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

// Отображение Markdown контента
function displayMarkdown(markdown, filePath) {
    const content = document.getElementById('markdownContent');
    const currentFileTitle = document.getElementById('currentFile');
    
    if (!content) {
        console.error('Элемент markdownContent не найден');
        return;
    }
    
    // Настраиваем marked для работы с highlight.js
    marked.setOptions({
        highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(code, { language: lang }).value;
                } catch (err) {}
            }
            return hljs.highlightAuto(code).value;
        },
        langPrefix: 'hljs language-'
    });
    
    // Парсим Markdown
    const html = marked.parse(markdown);
    content.innerHTML = html;
    
    // Добавляем кнопки копирования для блоков кода
    addCopyButtons();
    
    // Обновляем заголовок
    const fileName = filePath.split('/').pop().replace('.md', '');
    if (currentFileTitle) {
        currentFileTitle.textContent = fileName;
    }
    
    // Прокручиваем вверх
    content.scrollTop = 0;
    
    // Закрываем мобильное меню если открыто и гарантируем видимость бургера
    closeMobileMenu();
    
    // Дополнительная проверка видимости бургера через двойной requestAnimationFrame
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const mobileMenuToggle = document.getElementById('mobileMenuToggle');
            if (mobileMenuToggle && window.innerWidth <= 768) {
                // Убеждаемся, что класс sidebar-active удален
                document.body.classList.remove('sidebar-active');
                // Полностью очищаем все inline стили
                mobileMenuToggle.removeAttribute('style');
            }
        });
    });
}

// Настройка поиска
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        filterFileTree(query);
    });
}

// Фильтрация дерева файлов
function filterFileTree(query) {
    const fileItems = document.querySelectorAll('.file-item, .folder-item');
    
    fileItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (query === '' || text.includes(query)) {
            item.style.display = '';
            // Показываем родительские папки
            let parent = item.parentElement;
            while (parent && parent.classList.contains('folder-content')) {
                parent.style.display = 'block';
                parent.previousElementSibling?.classList.add('expanded');
                parent.classList.add('expanded');
                parent = parent.parentElement;
            }
        } else {
            item.style.display = 'none';
        }
    });
}

// Навигация по hash в URL
function setupHashNavigation() {
    // Загружаем файл из hash при загрузке страницы
    if (window.location.hash) {
        const filePath = decodeURIComponent(window.location.hash.substring(1));
        loadFile(filePath);
    }
    
    // Обрабатываем изменения hash
    window.addEventListener('hashchange', () => {
        if (window.location.hash) {
            const filePath = decodeURIComponent(window.location.hash.substring(1));
            loadFile(filePath);
        }
    });
}

// Вспомогательная функция для экранирования HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Функция для расширения пути в навигации
window.expandToPath = function(path) {
    // Можно добавить логику для автоматического раскрытия папок
    console.log('Expand to path:', path);
};

// ========== НОВЫЕ ФУНКЦИИ ==========

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
        
        // Перезагружаем подсветку кода при смене темы
        if (currentFile) {
            const content = document.getElementById('markdownContent');
            if (content) {
                const codeBlocks = content.querySelectorAll('pre code');
                codeBlocks.forEach(code => {
                    const lang = code.className.match(/language-(\w+)/)?.[1];
                    if (lang && hljs.getLanguage(lang)) {
                        code.innerHTML = hljs.highlight(code.textContent, { language: lang }).value;
                    } else {
                        code.innerHTML = hljs.highlightAuto(code.textContent).value;
                    }
                });
            }
        }
    });
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('.theme-icon');
    if (icon) {
        icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    
    // Переключаем стили highlight.js
    const lightStyle = document.getElementById('highlight-light');
    const darkStyle = document.getElementById('highlight-dark');
    if (lightStyle && darkStyle) {
        if (theme === 'dark') {
            lightStyle.media = 'none';
            darkStyle.media = 'all';
        } else {
            lightStyle.media = 'all';
            darkStyle.media = 'none';
        }
    }
}


// Добавление кнопок копирования для блоков кода
function addCopyButtons() {
    const codeBlocks = document.querySelectorAll('.markdown-content pre');
    codeBlocks.forEach(pre => {
        if (pre.querySelector('.code-copy-btn')) return; // Уже есть кнопка
        
        const code = pre.querySelector('code');
        if (!code) return;
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'code-copy-btn';
        copyBtn.textContent = 'Копировать';
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(code.textContent);
                copyBtn.textContent = 'Скопировано!';
                copyBtn.classList.add('copied');
                setTimeout(() => {
                    copyBtn.textContent = 'Копировать';
                    copyBtn.classList.remove('copied');
                }, 2000);
            } catch (err) {
                console.error('Ошибка копирования:', err);
            }
        });
        
        pre.style.position = 'relative';
        pre.appendChild(copyBtn);
    });
}

// Настройка мобильного меню
function setupMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (!mobileMenuToggle || !sidebar || !sidebarOverlay) {
        console.warn('Элементы мобильного меню не найдены');
        return;
    }
    
    // Убеждаемся, что кнопка имеет правильный тип
    if (mobileMenuToggle.tagName === 'BUTTON') {
        mobileMenuToggle.type = 'button';
    }
    
    // Функция открытия меню
    const openMenu = () => {
        sidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
        // Добавляем класс к body для скрытия бургера (CSS управляет видимостью)
        document.body.classList.add('sidebar-active');
        // Блокируем прокрутку body когда меню открыто
        document.body.style.overflow = 'hidden';
    };
    
    // Функция закрытия меню
    const closeMenu = () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        // УБИРАЕМ класс из body - это ключевой момент
        document.body.classList.remove('sidebar-active');
        // Разблокируем прокрутку body
        document.body.style.overflow = '';
        // Полностью удаляем все inline стили
        if (mobileMenuToggle) {
            mobileMenuToggle.removeAttribute('style');
        }
    };
    
    // Функция переключения меню
    const toggleMenu = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (sidebar.classList.contains('active')) {
            closeMenu();
        } else {
            openMenu();
        }
    };
    
    // Обработчики для кнопки меню - используем onclick для лучшей совместимости с Safari
    mobileMenuToggle.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu(e);
        return false;
    };
    
    // Закрытие по клику на overlay
    sidebarOverlay.onclick = function(e) {
        if (e.target === sidebarOverlay) {
            e.preventDefault();
            e.stopPropagation();
            closeMenu();
            return false;
        }
    };
    
    // Закрытие при клике на ссылку в меню (уже обрабатывается в loadFile)
}

function closeMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    
    // Закрываем sidebar
    if (sidebar) sidebar.classList.remove('active');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    
    // УБИРАЕМ класс из body - это ключевой момент для показа бургера
    document.body.classList.remove('sidebar-active');
    
    // Разблокируем прокрутку body
    document.body.style.overflow = '';
    
    // КРИТИЧНО: Удаляем ВСЕ inline стили, которые могут перекрывать CSS
    if (mobileMenuToggle) {
        // Полностью очищаем все стили, которые могли быть установлены
        mobileMenuToggle.removeAttribute('style');
        
        // Двойная проверка через requestAnimationFrame
        requestAnimationFrame(() => {
            if (mobileMenuToggle && !document.body.classList.contains('sidebar-active')) {
                // Убеждаемся, что класс действительно удален
                document.body.classList.remove('sidebar-active');
                // Полностью очищаем стили еще раз
                mobileMenuToggle.removeAttribute('style');
            }
        });
    }
}



