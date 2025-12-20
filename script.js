const GITHUB_USER = "onenicked";
const GITHUB_REPO = "Nebula";
const VIDEO_PATH = "videos";

const app = document.getElementById('app');

// Роутинг: проверяем, открыто ли конкретное видео
async function init() {
    const params = new URLSearchParams(window.location.search);
    const videoUrl = params.get('v');

    if (videoUrl) {
        renderPlayer(videoUrl);
    } else {
        renderGallery();
    }
}

// ГЛАВНАЯ СТРАНИЦА
async function renderGallery() {
    app.innerHTML = `<div class="video-grid" id="grid">Загрузка космической библиотеки...</div>`;
    const grid = document.getElementById('grid');
    
    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${VIDEO_PATH}`);
        const files = await response.json();
        grid.innerHTML = '';

        files.forEach(file => {
            if (file.name.match(/\.(mp4|mov|webm)$/i)) {
                const card = document.createElement('div');
                card.className = 'glass video-card';
                // Трюк с превью: добавляем #t=0.1 к видео, чтобы браузер подгрузил первый кадр
                card.innerHTML = `
                    <video class="thumbnail" preload="metadata">
                        <source src="${file.download_url}#t=0.1" type="video/mp4">
                    </video>
                    <p style="margin-top:10px; font-weight:500">${file.name}</p>
                `;
                card.onclick = () => {
                    window.location.search = `?v=${encodeURIComponent(file.download_url)}&n=${encodeURIComponent(file.name)}`;
                };
                grid.appendChild(card);
            }
        });
    } catch (e) {
        grid.innerHTML = 'Ошибка загрузки. Проверьте настройки репозитория.';
    }
}

function renderPlayer(url) {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('n') || "Video";
    
    // Ссылка на страницу (для кнопки Ссылка)
    const shareUrl = window.location.href; 
    
    // Ссылка на EMBED файл (для Iframe)
    // Мы берем путь до текущей папки и добавляем embed.html
    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
    const embedUrl = `${baseUrl}embed.html?v=${encodeURIComponent(url)}`;
    
    const embedCode = `<iframe src="${embedUrl}" width="640" height="360" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>`;

    app.innerHTML = `
        <div class="player-container">
            <div class="glass">
                <video id="v" controls preload="metadata">
                    <source src="${url}" type="video/mp4">
                </video>
                <h1 style="margin-top:20px">${name}</h1>
                <div class="controls">
                    <button class="btn" id="copyLinkBtn">🔗 Ссылка</button>
                    <button class="btn" id="copyEmbedBtn">&lt;/&gt; Код вставки</button>
                    <a href="${url}" download="${name}.mp4" class="btn" style="text-decoration:none">⬇️ Скачать</a>
                </div>
            </div>
            <button class="btn" style="margin-top:20px; background:none; color:white; border:1px solid rgba(255,255,255,0.3)" 
                    onclick="window.location.href='index.html'">← Назад</button>
        </div>
    `;

    document.getElementById('copyLinkBtn').onclick = () => copyToClipboard(shareUrl, "Ссылка скопирована!");
    document.getElementById('copyEmbedBtn').onclick = () => copyToClipboard(embedCode, "Код вставки скопирован!");
}

// Улучшенная функция копирования
async function copyToClipboard(text, message) {
    try {
        await navigator.clipboard.writeText(text);
        alert(message);
    } catch (err) {
        // Запасной вариант, если браузер блокирует navigator.clipboard
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert(message);
    }
}

function copyText(text) {
    navigator.clipboard.writeText(text);
    alert("Скопировано в буфер обмена!");
}

init();