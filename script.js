// НАСТРОЙКИ (замените на свои)
const GITHUB_USER = "onenicked";
const GITHUB_REPO = "Nebula";
const VIDEO_PATH = "videos"; 

const videoGrid = document.getElementById('videoGrid');
const mainVideo = document.getElementById('mainVideo');
const currentTitle = document.getElementById('currentTitle');
const downloadBtn = document.getElementById('downloadBtn');

// Функция получения списка файлов через GitHub API
async function loadVideos() {
    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${VIDEO_PATH}`);
        const files = await response.json();

        videoGrid.innerHTML = ''; // Очистить статус загрузки

        files.forEach(file => {
            if (file.name.endsWith('.mp4') || file.name.endsWith('.mov')) {
                createVideoCard(file);
            }
        });
    } catch (error) {
        videoGrid.innerHTML = '<p>Ошибка загрузки видео. Проверьте настройки API.</p>';
        console.error(error);
    }
}

function createVideoCard(file) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `
        <div style="height:100px; background:rgba(255,255,255,0.1); border-radius:10px; display:flex; align-items:center; justify-content:center">🎬</div>
        <span>${file.name}</span>
    `;
    
    card.onclick = () => playVideo(file.download_url, file.name);
    videoGrid.appendChild(card);
}

function playVideo(url, name) {
    mainVideo.src = url;
    currentTitle.innerText = name;
    downloadBtn.href = url;
    mainVideo.play();
    
    // Плавная прокрутка к плееру
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Функции "Поделиться"
function copyLink() {
    const url = window.location.href + "?v=" + encodeURIComponent(mainVideo.src);
    navigator.clipboard.writeText(url);
    alert("Ссылка на страницу скопирована!");
}

function copyEmbed() {
    const code = `<iframe src="${window.location.href}" width="640" height="360"></iframe>`;
    navigator.clipboard.writeText(code);
    alert("Код для вставки скопирован!");
}

// Запуск
loadVideos();