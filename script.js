const GITHUB_USER = "xqr4d";
const GITHUB_REPO = "Nebula";

const app = document.getElementById('app');

function slug(str) {
    return str.toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function renderThumbnail(card, thumbUrl) {
    const container = card.querySelector('.thumbnail-container');
    const img = card.querySelector('.thumbnail');
    const loading = card.querySelector('.thumbnail-loading');

    if (thumbUrl) {
        img.src = thumbUrl;
        img.style.display = 'block';
        if (loading) loading.remove();
    } else {
        if (loading) {
            loading.classList.add('thumbnail-error');
            loading.textContent = 'ПРЕВЬЮ НЕДОСТУПНО';
        }
        img.style.display = 'none';
    }
}

async function renderGallery() {
    app.innerHTML = `
        <div class="video-grid" id="grid">Загрузка космической библиотеки из релизов...</div>
    `;

    const grid = document.getElementById('grid');

    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases`);
        if (!response.ok) throw new Error('GitHub API error');
        const releases = await response.json();

        grid.innerHTML = '';

        let hasVideos = false;

        releases.forEach(release => {
            release.assets.forEach(asset => {
                if (asset.name.match(/\.(mp4|mov|webm)$/i)) {
                    hasVideos = true;
                    const videoUrl = asset.browser_download_url;

                    const thumbAsset = release.assets.find(a => a.name === 'maxresdefault.jpg');
                    const thumbUrl = thumbAsset ? thumbAsset.browser_download_url : null;

                    const card = document.createElement('div');
                    card.className = 'glass video-card';
                    card.dataset.videoUrl = videoUrl;

                    card.innerHTML = `
                        <div class="thumbnail-container">
                            <div class="thumbnail-loading">ЗАГРУЗКА ОБЛОЖКИ...</div>
                            <img class="thumbnail" src="" alt="${asset.name}">
                        </div>
                        <div style="padding: 15px">
                            <small style="margin:0; font-size: 10px; word-break: break-all;">НАЗВАНИЕ: ${release.name || release.tag_name}</small>
                            <p style="color: var(--text); font-size: 8px;">> ИМЯ ФАЙЛА: ${asset.name}</p>
                        </div>
                    `;

                    renderThumbnail(card, thumbUrl);

                    card.addEventListener('click', () => {
                        window.location.search = `?v=${encodeURIComponent(videoUrl)}&n=${encodeURIComponent(asset.name)}`;
                    });

                    grid.appendChild(card);
                }
            });
        });

        if (!hasVideos) {
            grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-muted);">В релизах пока нет видеофайлов.</div>`;
        }
    } catch (e) {
        console.error("Ошибка API:", e);
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--accent-primary);">Ошибка загрузки данных с GitHub.<br>${e.message}</div>`;
    }
}

function renderPlayer(url) {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('n') || "Video";
    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
    const embedUrl = `${baseUrl}embed.html?v=${encodeURIComponent(url)}`;
    const embedCode = `<iframe src="${embedUrl}" width="800" height="500" frameborder="0" allowfullscreen style="border-radius:12px; overflow:hidden; border:none;"></iframe>`;

    app.innerHTML = `
    <div class="player-container">
        <div class="glass">
            <video id="v" controls autoplay preload="metadata">
                <source src="${url}" type="video/mp4">
            </video>
            <h1>Имя файла: ${name}</h1>
            <div class="controls">
                <button class="btn" id="copyLinkBtn">ССЫЛКА</button>
                <a href="${url}" target="_blank" class="btn" style="text-decoration:none">СКАЧАТЬ</a>
                <button class="btn" id="copyEmbedBtn">&lt;/&gt; EMBED</button>
            </div>
        </div>
        <button class="btn" style="margin-top:30px; background:none; color:white; border:6px solid rgba(255,255,255,0.3); min-width:180px;" onclick="window.location.href='index.html'">← В БИБЛИОТЕКУ</button>
    </div>`;

    const video = document.getElementById('v');
    if (video) video.volume = 0.2;

    document.getElementById('copyLinkBtn').onclick = () => {
        navigator.clipboard.writeText(window.location.href).then(() => alert('Ссылка скопирована'));
    };

    document.getElementById('copyEmbedBtn').onclick = () => {
        navigator.clipboard.writeText(embedCode).then(() => alert('Код embed скопирован'));
    };
}

async function init() {
    const params = new URLSearchParams(window.location.search);
    const videoUrl = params.get('v');
    if (videoUrl) {
        renderPlayer(videoUrl);
    } else {
        renderGallery();
    }
}

init();