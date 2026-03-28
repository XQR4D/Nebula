const GITHUB_USER = "onenicked";
const GITHUB_REPO = "Nebula";

const app = document.getElementById('app');

async function init() {
    const params = new URLSearchParams(window.location.search);
    const videoUrl = params.get('v');

    if (videoUrl) {
        renderPlayer(videoUrl);
    } else {
        renderGallery();
    }
}

async function renderGallery() {
    app.innerHTML = `<div class="video-grid" id="grid">Загрузка космической библиотеки из релизов...</div>`;
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
                    const card = document.createElement('div');
                    card.className = 'glass video-card';
                    card.dataset.videoUrl = videoUrl;

                    card.innerHTML = `
                        <div class="thumbnail-container">
                            <div class="thumbnail-loading">ЗАГРУЗКА ОБЛОЖКИ...</div>
                            <img class="thumbnail" src="" alt="${asset.name}">
                        </div>
                        <div style="padding: 15px">
                            <small style="margin:0; font-size: 10px; word-break: break-all;">НАЗВАНИЕ: ${release.tag_name}</small>
                            <p style="color: var(--text); font-size: 8px;">> ИМЯ ФАЙЛА: ${asset.name}</p>
                        </div>
                    `;

                    generateVideoThumbnail(card, videoUrl);

                    card.onclick = () => {
                        window.location.search = `?v=${encodeURIComponent(videoUrl)}&n=${encodeURIComponent(asset.name)}`;
                    };

                    grid.appendChild(card);
                }
            });
        });

        if (!hasVideos) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 60px 20px; color: var(--text-muted);">
                В релизах пока нет видеофайлов.<br>Загрузите .mp4 файлы в GitHub Releases.
            </div>`;
        }

    } catch (e) {
        console.error("Ошибка API:", e);
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--accent-primary);">
            Ошибка загрузки данных с GitHub.<br>Проверьте интернет или лимиты API.
        </div>`;
    }
}

function generateVideoThumbnail(card, videoUrl) {
    const container = card.querySelector('.thumbnail-container');
    const img = card.querySelector('.thumbnail');
    const loading = card.querySelector('.thumbnail-loading');

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.style.display = 'none';

    video.src = videoUrl + '#t=0.15';

    let timeoutId = setTimeout(() => {
        if (loading) {
            loading.classList.add('thumbnail-error');
            loading.textContent = 'ОБЛОЖКА НЕДОСТУПНА';
            loading.style.animation = 'none';
        }
        cleanup();
    }, 8000);

    video.onloadedmetadata = () => {
        video.currentTime = 0.15;
    };

    video.onseeked = () => {
        clearTimeout(timeoutId);
        try {
            const canvas = document.createElement('canvas');
            const aspect = video.videoWidth / video.videoHeight || 16/9;
            canvas.width = 640;
            canvas.height = Math.round(640 / aspect);

            const ctx = canvas.getContext('2d', { alpha: false });
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            img.src = canvas.toDataURL('image/jpeg', 0.88);
            img.style.display = 'block';

            if (loading) loading.remove();

            cleanup();
        } catch (err) {
            console.warn('Canvas error (CORS или tainted):', err);
            showError();
        }
    };

    video.onerror = () => {
        clearTimeout(timeoutId);
        console.warn('Video load error:', videoUrl);
        showError();
    };

    function showError() {
        if (loading) {
            loading.classList.add('thumbnail-error');
            loading.textContent = 'ОБЛОЖКА НЕДОСТУПНА';
            loading.style.animation = 'none';
        }
        cleanup();
    }

    function cleanup() {
        video.src = '';
        video.load();
    }

    video.load();
}

function renderPlayer(url) {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('n') || "Video";
    
    const shareUrl = window.location.href; 
    
    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
    const embedUrl = `${baseUrl}embed.html?v=${encodeURIComponent(url)}`;
    const embedCode = `<iframe src="${embedUrl}" width="800" height="500" frameborder="0" allowfullscreen style="border-radius:12px; overflow:hidden; border:none;"></iframe>`;

    app.innerHTML = `
    <div class="player-container">
        <div class="glass">
            <video id="v" controls autoplay preload="metadata">
                <source src="${url}" type="video/mp4">
            </video>
            
            <h1>${name}</h1>
            
            <div class="controls">
                <button class="btn" id="copyLinkBtn">ССЫЛКА</button>
                <button class="btn" id="copyEmbedBtn">&lt;/&gt; EMBED</button>
                <a href="${url}" target="_blank" class="btn" style="text-decoration:none">СКАЧАТЬ</a>
            </div>
        </div>
        
        <button class="btn" style="margin-top:30px; background:none; color:white; border:6px solid rgba(255,255,255,0.3); min-width:180px;" 
                onclick="window.location.href='index.html'">← В БИБЛИОТЕКУ</button>
    </div>
    `;

    document.getElementById('copyLinkBtn').onclick = () => copyToClipboard(shareUrl, "Ссылка на страницу скопирована!");
    document.getElementById('copyEmbedBtn').onclick = () => copyToClipboard(embedCode, "Код для вставки скопирован!");
}

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