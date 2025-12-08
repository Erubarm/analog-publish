#!/usr/bin/env node

/**
 * Скрипт для генерации index.json со списком всех Markdown файлов
 * Запуск: node generate-index.js
 */

const fs = require('fs');
const path = require('path');

const LECTURES_DIR = path.join(__dirname, 'lectures');
const INDEX_FILE = path.join(LECTURES_DIR, 'index.json');

function getAllMarkdownFiles(dir, basePath = '') {
    const files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        const relativePath = path.join(basePath, item.name).replace(/\\/g, '/');
        
        if (item.isDirectory()) {
            // Рекурсивно обходим подпапки
            files.push(...getAllMarkdownFiles(fullPath, relativePath));
        } else if (item.isFile() && item.name.endsWith('.md')) {
            files.push({
                path: relativePath,
                name: item.name,
                size: fs.statSync(fullPath).size
            });
        }
    }
    
    return files;
}

function generateIndex() {
    if (!fs.existsSync(LECTURES_DIR)) {
        console.error(`Папка ${LECTURES_DIR} не существует!`);
        process.exit(1);
    }
    
    console.log('Поиск Markdown файлов...');
    const files = getAllMarkdownFiles(LECTURES_DIR);
    
    if (files.length === 0) {
        console.warn('Не найдено ни одного Markdown файла!');
    } else {
        console.log(`Найдено ${files.length} файлов:`);
        files.forEach(file => console.log(`  - ${file.path}`));
    }
    
    const indexData = {
        generated: new Date().toISOString(),
        files: files.sort((a, b) => a.path.localeCompare(b.path, 'ru'))
    };
    
    fs.writeFileSync(INDEX_FILE, JSON.stringify(indexData, null, 2), 'utf8');
    console.log(`\n✅ index.json успешно создан: ${INDEX_FILE}`);
}

generateIndex();


