// Конфигурация: путь к папке с лекциями
const LECTURES_PATH = 'lectures';

// Кэш для загруженных файлов
const fileCache = new Map();

// Текущий выбранный файл
let currentFile = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    await loadFileTree();
    setupSearch();
    setupHashNavigation();
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
    const breadcrumbs = document.getElementById('breadcrumbs');
    
    // Парсим Markdown
    const html = marked.parse(markdown);
    content.innerHTML = html;
    
    // Обновляем заголовок
    const fileName = filePath.split('/').pop().replace('.md', '');
    currentFileTitle.textContent = fileName;
    
    // Обновляем breadcrumbs
    const pathParts = filePath.split('/');
    const breadcrumbParts = pathParts.map((part, index) => {
        if (index === pathParts.length - 1) {
            return `<span>${escapeHtml(part.replace('.md', ''))}</span>`;
        }
        return `<a href="#" onclick="event.preventDefault(); expandToPath('${pathParts.slice(0, index + 1).join('/')}')">${escapeHtml(part)}</a> / `;
    });
    breadcrumbs.innerHTML = breadcrumbParts.join('');
    
    // Прокручиваем вверх
    content.scrollTop = 0;
}

// Настройка поиска
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
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

