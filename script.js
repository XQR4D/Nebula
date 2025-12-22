const GITHUB_USER = "onenicked";
const GITHUB_REPO = "Nebula";

const app = document.getElementById('app');

// Инициализация
async function init() {
    const params = new URLSearchParams(window.location.search);
    const videoUrl = params.get('v');

    if (videoUrl) {
        renderPlayer(videoUrl);
    } else {
        renderGallery();
    }
}

// ГЛАВНАЯ СТРАНИЦА: Загрузка видео из ассетов всех релизов
async function renderGallery() {
    app.innerHTML = `<div class="video-grid" id="grid">Загрузка космической библиотеки из релизов...</div>`;
    const grid = document.getElementById('grid');
    
    try {
        // Запрашиваем все релизы репозитория
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases`);
        const releases = await response.json();
        grid.innerHTML = '';

        let hasVideos = false;

        releases.forEach(release => {
            release.assets.forEach(asset => {
                // Фильтр по расширениям видео
                if (asset.name.match(/\.(mp4|mov|webm)$/i)) {
                    hasVideos = true;
                    const card = document.createElement('div');
                    card.className = 'glass video-card';
                    
                    const videoUrl = asset.browser_download_url;

                    card.innerHTML = `
                        <video class="thumbnail" preload="metadata">
                            <source src="${videoUrl}#t=0.1" type="video/mp4">
                        </video>
                        <div style="padding: 15px">
                            <p style="font-weight:500; margin:0">${asset.name}</p>
                            <small style="opacity:0.5; font-size:10px">${release.tag_name}</small>
                        </div>
                    `;

                    card.onclick = () => {
                        window.location.search = `?v=${encodeURIComponent(videoUrl)}&n=${encodeURIComponent(asset.name)}`;
                    };
                    grid.appendChild(card);
                }
            });
        });

        if (!hasVideos) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center">В релизах пока нет видеофайлов. Загрузите их в GitHub Releases!</div>';
        }

    } catch (e) {
        console.error("Ошибка API:", e);
        grid.innerHTML = 'Ошибка загрузки. Проверьте доступ к репозиторию или лимиты API.';
    }
}

// ПЛЕЕР: Отображение видео и инструментов
function renderPlayer(url) {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('n') || "Video";
    
    const shareUrl = window.location.href; 
    
    // Формируем путь для iframe (поддерживает и GitHub Pages, и локальный запуск)
    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
    const embedUrl = `${baseUrl}embed.html?v=${encodeURIComponent(url)}`;
    const embedCode = `<iframe src="${embedUrl}" width="800" height="500" frameborder="0" allowfullscreen style="border-radius:12px; overflow:hidden; border:none;"></iframe>`;

    app.innerHTML = `
        <div class="player-container">
            <div class="glass">
                <video id="v" controls autoplay preload="metadata">
                    <source src="${url}" type="video/mp4">
                </video>
                <h1 style="margin-top:20px">${name}</h1>
                <div class="controls">
                    <button class="btn" id="copyLinkBtn">🔗 Ссылка</button>
                    <button class="btn" id="copyEmbedBtn">&lt;/&gt; Код вставки</button>
                    <a href="${url}" target="_blank" class="btn" style="text-decoration:none">⬇️ Скачать</a>
                </div>
            </div>
            <button class="btn" style="margin-top:20px; background:none; color:white; border:1px solid rgba(255,255,255,0.3)" 
                    onclick="window.location.href='index.html'">← Назад к библиотеке</button>
        </div>
    `;

    document.getElementById('copyLinkBtn').onclick = () => copyToClipboard(shareUrl, "Ссылка на страницу скопирована!");
    document.getElementById('copyEmbedBtn').onclick = () => copyToClipboard(embedCode, "Код для вставки скопирован!");
}

// Универсальное копирование
async function copyToClipboard(text, message) {
    try {
        await navigator.clipboard.writeText(text);
        alert(message);
    } catch (err) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert(message);
    }
}

init();