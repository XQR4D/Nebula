const GITHUB_USER = "xqr4d";
const GITHUB_REPO = "Nebula";

let adminToken = sessionStorage.getItem('nebulaAdminToken') || null;

const app = document.getElementById('app');

function isAdmin() {
    return !!adminToken;
}

function slug(str) {
    return str.toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

async function githubFetch(url, options = {}) {
    try {
        const res = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `token ${adminToken}`,
                'Accept': 'application/vnd.github.v3+json',
                ...options.headers
            }
        });
        if (!res.ok) {
            let msg = res.statusText;
            try {
                const json = await res.json();
                msg = json.message || msg;
            } catch {}
            throw new Error(`GitHub ${res.status}: ${msg}`);
        }
        return res;
    } catch (e) {
        console.error('Request failed:', url, e);
        if (e.message.includes('Failed to fetch')) {
            throw new Error('Failed to fetch — используйте классический PAT с областью "repo"');
        }
        throw e;
    }
}

async function uploadVideo(title, description, videoFile, thumbFile) {
    const tagName = slug(title) + '-' + Date.now().toString(36);

    const createRes = await githubFetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases`, {
        method: 'POST',
        body: JSON.stringify({
            tag_name: tagName,
            name: title,
            body: description || '',
            draft: false,
            prerelease: false
        })
    });
    const release = await createRes.json();
    const releaseId = release.id;

    await new Promise(r => setTimeout(r, 1000));

    const videoUploadUrl = `https://uploads.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases/${releaseId}/assets?name=${encodeURIComponent(videoFile.name)}`;
    const videoRes = await githubFetch(videoUploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: videoFile
    });
    const videoAsset = await videoRes.json();

    if (thumbFile) {
        let thumbBlob = thumbFile;
        if (!thumbFile.type.match(/jpeg|jpg/)) {
            thumbBlob = await convertToJpeg(thumbFile);
        }
        const thumbUploadUrl = `https://uploads.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases/${releaseId}/assets?name=maxresdefault.jpg`;
        await githubFetch(thumbUploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: thumbBlob
        });
    }

    return { 
        videoUrl: videoAsset.browser_download_url, 
        name: videoFile.name 
    };
}

function convertToJpeg(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const url = URL.createObjectURL(file);
        img.onload = () => {
            canvas.width = img.width || 1280;
            canvas.height = img.height || 720;
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(blob => {
                URL.revokeObjectURL(url);
                blob ? resolve(blob) : reject(new Error('Не удалось конвертировать обложку'));
            }, 'image/jpeg', 0.9);
        };
        img.onerror = () => { 
            URL.revokeObjectURL(url); 
            reject(new Error('Ошибка чтения изображения')); 
        };
        img.src = url;
    });
}

async function saveEdit(releaseId, newTitle, newDesc, newThumbFile) {
    await githubFetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases/${releaseId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: newTitle, body: newDesc })
    });

    if (!newThumbFile) return;

    const relRes = await githubFetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases/${releaseId}`);
    const release = await relRes.json();

    const oldThumb = release.assets.find(a => a.name === 'maxresdefault.jpg');
    if (oldThumb) {
        await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases/assets/${oldThumb.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `token ${adminToken}` }
        }).catch(() => {});
    }

    let thumbBlob = newThumbFile;
    if (!newThumbFile.type.match(/jpeg|jpg/)) {
        thumbBlob = await convertToJpeg(newThumbFile);
    }
    const thumbUploadUrl = `https://uploads.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases/${releaseId}/assets?name=maxresdefault.jpg`;

    await githubFetch(thumbUploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: thumbBlob
    });
}

async function deleteCard(card) {
    if (!confirm('Удалить ролик полностью?')) return;

    const releaseId = card.dataset.releaseId;
    const assetId = card.dataset.assetId;
    const assetName = card.dataset.assetName;

    try {
        const relRes = await githubFetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases/${releaseId}`);
        const release = await relRes.json();

        const thumbAsset = release.assets.find(a => a.name === 'maxresdefault.jpg');

        await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases/assets/${assetId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `token ${adminToken}` }
        });

        if (thumbAsset) {
            await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases/assets/${thumbAsset.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `token ${adminToken}` }
            });
        }

        alert('Ролик удалён');
        renderGallery();
    } catch (e) {
        alert('Ошибка удаления: ' + e.message);
    }
}

function showLoginModal() {
    const modalHTML = `
    <div class="modal" id="loginModal" style="display:flex;">
        <div class="modal-content">
            <h2>АДМИН-ПАНЕЛЬ</h2>
            <p style="font-size:11px;margin-bottom:20px;">Введите GitHub Personal Access Token (classic) с областью repo</p>
            <input type="password" id="patInput" placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxx" style="margin-bottom:20px;">
            <div style="display:flex;gap:15px;justify-content:center;">
                <button class="btn" onclick="performLogin()">ВОЙТИ</button>
                <button class="btn" style="background:none;border-color:#ff00aa;color:#ff00aa;" onclick="hideModal('loginModal')">ОТМЕНА</button>
            </div>
            <small style="display:block;margin-top:15px;text-align:center;color:var(--text-muted);">Токен хранится только в текущей сессии</small>
        </div>
    </div>`;
    const container = document.createElement('div');
    container.innerHTML = modalHTML;
    document.body.appendChild(container.firstElementChild);
}

window.performLogin = async function () {
    const input = document.getElementById('patInput');
    const token = input.value.trim();
    if (!token) return alert('Введите токен');
    adminToken = token;
    sessionStorage.setItem('nebulaAdminToken', token);
    hideModal('loginModal');
    renderGallery();
};

function hideModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.remove();
}

function logoutAdmin() {
    if (confirm('Выйти из админ-панели?')) {
        adminToken = null;
        sessionStorage.removeItem('nebulaAdminToken');
        renderGallery();
    }
}

function showUploadModal() {
    const modalHTML = `
    <div class="modal" id="uploadModal" style="display:flex;">
        <div class="modal-content">
            <h2>ЗАЛИТЬ НОВЫЙ РОЛИК</h2>
            <label>Название ролика</label>
            <input type="text" id="uploadTitle" placeholder="Название ролика">
            <label>Описание</label>
            <textarea id="uploadDesc" placeholder="Краткое описание..."></textarea>
            <label>Файл видео (mp4, mov, webm)</label>
            <input type="file" id="uploadVideo" accept="video/mp4,video/quicktime,video/webm">
            <label>Обложка (опционально)</label>
            <input type="file" id="uploadThumb" accept="image/*">
            <div style="margin-top:25px;display:flex;gap:15px;justify-content:center;">
                <button class="btn" id="uploadSubmitBtn">ЗАЛИТЬ В РЕЛИЗЫ</button>
                <button class="btn" style="background:none;border-color:#ff00aa;color:#ff00aa;" onclick="hideModal('uploadModal')">ОТМЕНА</button>
            </div>
            <div id="uploadStatus" style="margin-top:15px;text-align:center;font-size:11px;color:var(--accent-secondary);display:none;"></div>
        </div>
    </div>`;
    const container = document.createElement('div');
    container.innerHTML = modalHTML;
    document.body.appendChild(container.firstElementChild);

    const submitBtn = document.getElementById('uploadSubmitBtn');
    submitBtn.onclick = async () => {
        const title = document.getElementById('uploadTitle').value.trim();
        const desc = document.getElementById('uploadDesc').value.trim();
        const videoFile = document.getElementById('uploadVideo').files[0];
        const thumbFile = document.getElementById('uploadThumb').files[0];

        if (!title || !videoFile) return alert('Укажите название и файл видео');

        submitBtn.disabled = true;
        submitBtn.textContent = 'ЗАГРУЗКА... ОЖИДАЙТЕ';
        const statusEl = document.getElementById('uploadStatus');
        statusEl.style.display = 'block';
        statusEl.textContent = 'Идёт загрузка на GitHub...';

        try {
            const result = await uploadVideo(title, desc, videoFile, thumbFile);
            hideModal('uploadModal');
            window.location.search = `?v=${encodeURIComponent(result.videoUrl)}&n=${encodeURIComponent(result.name)}`;
        } catch (e) {
            console.error(e);
            alert('Ошибка загрузки: ' + e.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'ЗАЛИТЬ В РЕЛИЗЫ';
            statusEl.style.display = 'none';
        }
    };
}

function showEditModal(card) {
    const releaseId = card.dataset.releaseId;
    const currentTitle = card.dataset.releaseName || '';
    const currentDesc = card.dataset.releaseBody || '';

    const modalHTML = `
    <div class="modal" id="editModal" style="display:flex;">
        <div class="modal-content">
            <h2>РЕДАКТИРОВАТЬ РОЛИК</h2>
            <label>Название</label>
            <input type="text" id="editTitle" value="${currentTitle}">
            <label>Описание</label>
            <textarea id="editDesc">${currentDesc}</textarea>
            <label>Новая обложка (опционально)</label>
            <input type="file" id="editThumb" accept="image/*">
            <div style="margin-top:25px;display:flex;gap:15px;justify-content:center;">
                <button class="btn" onclick="saveEditHandler(${releaseId}, this)">СОХРАНИТЬ</button>
                <button class="btn" style="background:none;border-color:#ff00aa;color:#ff00aa;" onclick="hideModal('editModal')">ОТМЕНА</button>
            </div>
        </div>
    </div>`;
    const container = document.createElement('div');
    container.innerHTML = modalHTML;
    document.body.appendChild(container.firstElementChild);
}

window.saveEditHandler = async function (releaseId, btn) {
    const title = document.getElementById('editTitle').value.trim();
    const desc = document.getElementById('editDesc').value.trim();
    const thumbFile = document.getElementById('editThumb').files[0];

    if (!title) return alert('Название обязательно');

    btn.disabled = true;
    btn.textContent = 'СОХРАНЕНИЕ...';

    try {
        await saveEdit(releaseId, title, desc, thumbFile);
        hideModal('editModal');
        alert('Изменения успешно сохранены');
        renderGallery();
    } catch (e) {
        console.error(e);
        alert('Ошибка при сохранении: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'СОХРАНИТЬ';
    }
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
        <div id="admin-bar" style="padding:20px 1.5rem 10px;max-width:1400px;margin:0 auto;text-align:right;"></div>
        <div class="video-grid" id="grid">Загрузка космической библиотеки из релизов...</div>
    `;

    const grid = document.getElementById('grid');
    const bar = document.getElementById('admin-bar');

    if (isAdmin()) {
        bar.innerHTML = `
            <button class="btn" id="uploadBtn" style="margin-right:12px;">Залить новый ролик</button>
            <button class="btn" id="logoutBtn" style="background:none;border-color:#ff00aa;color:#ff00aa;">Выйти из админа</button>
        `;
    } else {
        bar.innerHTML = `<button class="btn" id="loginBtn">🔑 Войти в админ-панель</button>`;
    }

    if (document.getElementById('loginBtn')) document.getElementById('loginBtn').onclick = showLoginModal;
    if (document.getElementById('uploadBtn')) document.getElementById('uploadBtn').onclick = showUploadModal;
    if (document.getElementById('logoutBtn')) document.getElementById('logoutBtn').onclick = logoutAdmin;

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
                    card.dataset.releaseId = release.id;
                    card.dataset.assetId = asset.id;
                    card.dataset.assetName = asset.name;
                    card.dataset.releaseName = release.name || release.tag_name;
                    card.dataset.releaseBody = release.body || '';

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

                    card.addEventListener('click', (e) => {
                        if (e.target.closest('.admin-controls')) return;
                        window.location.search = `?v=${encodeURIComponent(videoUrl)}&n=${encodeURIComponent(asset.name)}`;
                    });

                    if (isAdmin()) {
                        const controls = document.createElement('div');
                        controls.className = 'admin-controls';
                        const editBtn = document.createElement('button');
                        editBtn.className = 'btn small';
                        editBtn.textContent = '✏️';
                        const delBtn = document.createElement('button');
                        delBtn.className = 'btn small';
                        delBtn.textContent = '🗑️';

                        editBtn.addEventListener('click', (e) => {
                            e.stopImmediatePropagation();
                            showEditModal(card);
                        });
                        delBtn.addEventListener('click', (e) => {
                            e.stopImmediatePropagation();
                            deleteCard(card);
                        });

                        controls.append(editBtn, delBtn);
                        card.appendChild(controls);
                    }

                    grid.appendChild(card);
                }
            });
        });

        if (!hasVideos) {
            grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-muted);">В релизах пока нет видеофайлов.<br>Администратор может загрузить новые ролики.</div>`;
        }
    } catch (e) {
        console.error("Ошибка API:", e);
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--accent-primary);">Ошибка загрузки данных с GitHub.<br>${e.message}</div>`;
    }
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