const buttons = document.querySelectorAll('.tab-btn');
const contents = document.querySelectorAll('.tab-content');

buttons.forEach(btn => {
    btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

// ===== ФОТО =====
async function loadPhotos() {
    try {
        const res = await fetch('/api/photos');
        if (!res.ok) throw new Error('photos load failed');
        const photos = await res.json();
        const grid = document.querySelector('.photo-grid');
        grid.innerHTML = '';

        photos.forEach(p => {
            const card = document.createElement('div');
            card.className = 'photo-card';
            const imgUrl = p.url;

            const img = document.createElement('img');
            img.src = imgUrl;
            img.alt = p.caption || 'фото';

            const caption = document.createElement('p');
            caption.textContent = p.caption || '';

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '🗑️';
            deleteBtn.className = 'delete-btn';
            deleteBtn.onclick = () => deletePhoto(p.id);

            card.appendChild(img);
            card.appendChild(caption);
            card.appendChild(deleteBtn);
            grid.appendChild(card);
        });
    } catch (err) {
        console.error('Error loading photos:', err);
    }
}

async function deletePhoto(id) {
    if (confirm('Видалити фото?')) {
        try {
            const res = await fetch(`/api/photos/${id}`, { method: 'DELETE' });
            if (res.ok) await loadPhotos();
        } catch (err) {
            console.error(err);
        }
    }
}

// ===== НОТАТКИ =====
async function loadNotes() {
    try {
        const res = await fetch('/api/notes');
        if (!res.ok) throw new Error('failed to load notes');
        const notes = await res.json();
        const list = document.getElementById('notes-list');
        list.innerHTML = '';

        if (!notes.length) {
            list.innerHTML = '<p>Нотаток ще нема.</p>';
            return;
        }

        const ul = document.createElement('ul');
        notes.forEach((n, idx) => {
            const li = document.createElement('li');
            const created = n.created_at ? new Date(n.created_at).toLocaleDateString('uk-UA') : '';

            const numSpan = document.createElement('span');
            numSpan.className = 'note-number';
            numSpan.textContent = `${idx + 1}.`;

            const text = document.createElement('span');
            text.textContent = `${n.text} ${created ? ' - ' + created : ''}`;

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '✕';
            deleteBtn.className = 'delete-note-btn';
            deleteBtn.onclick = () => deleteNote(n.id);

            li.appendChild(numSpan);
            li.appendChild(text);
            li.appendChild(deleteBtn);
            ul.appendChild(li);
        });
        list.appendChild(ul);
    } catch (err) {
        console.error('Error loading notes:', err);
    }
}

async function deleteNote(id) {
    if (confirm('Видалити нотатку?')) {
        try {
            const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
            if (res.ok) await loadNotes();
        } catch (err) {
            console.error(err);
        }
    }
}

// ===== АНІМЕ =====
let currentAnimeSort = 'date';
let currentAnimeOrder = 'desc';
let currentAnimeSearch = '';
let editingAnimeId = null;

async function loadAnime() {
    try {
        const params = new URLSearchParams({
            sort: currentAnimeSort,
            order: currentAnimeOrder,
            search: currentAnimeSearch
        });
        const res = await fetch(`/api/anime?${params}`);
        if (!res.ok) throw new Error('failed to load anime');
        const animes = await res.json();
        const list = document.getElementById('anime-list');
        list.innerHTML = '';

        if (!animes.length) {
            list.innerHTML = '<p>Аніме ще не додано.</p>';
            return;
        }

        const ul = document.createElement('ul');
        animes.forEach((a, idx) => {
            const li = document.createElement('li');
            li.className = 'anime-item';

            const posterImg = document.createElement('img');
            posterImg.src = a.poster_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="90"%3E%3Crect fill="%23ddd" width="60" height="90"/%3E%3C/svg%3E';
            posterImg.alt = 'poster';
            posterImg.className = 'anime-poster';

            const infoDiv = document.createElement('div');
            infoDiv.className = 'anime-info';

            const titleText = document.createElement('span');
            titleText.className = 'anime-title';
            titleText.textContent = `${idx + 1}. ${a.title}`;

            const ratingText = document.createElement('span');
            ratingText.className = 'anime-rating';
            ratingText.textContent = `⭐ ${a.rating}/10`;

            const episodesText = document.createElement('span');
            episodesText.className = 'anime-episodes';
            episodesText.textContent = a.episodes ? `📺 ${a.episodes} ep` : '';

            const statusText = document.createElement('span');
            statusText.className = 'anime-status';
            statusText.textContent = a.status === 'completed' ? '✓ Завершено' : '🔄 Триває';

            infoDiv.appendChild(titleText);
            infoDiv.appendChild(ratingText);
            if (a.episodes) infoDiv.appendChild(episodesText);
            infoDiv.appendChild(statusText);

            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'anime-buttons';

            const editBtn = document.createElement('button');
            editBtn.textContent = '✏️';
            editBtn.className = 'edit-btn-small';
            editBtn.onclick = () => startEditAnime(a);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '✕';
            deleteBtn.className = 'delete-btn-small';
            deleteBtn.onclick = () => deleteAnime(a.id);

            buttonsDiv.appendChild(editBtn);
            buttonsDiv.appendChild(deleteBtn);

            li.appendChild(posterImg);
            li.appendChild(infoDiv);
            li.appendChild(buttonsDiv);
            ul.appendChild(li);
        });
        list.appendChild(ul);
    } catch (err) {
        console.error('Error loading anime:', err);
    }
}

function startEditAnime(anime) {
    editingAnimeId = anime.id;
    document.getElementById('anime-title').value = anime.title;
    document.getElementById('anime-rating').value = anime.rating;
    document.getElementById('anime-episodes').value = anime.episodes || '';
    document.getElementById('anime-status').value = anime.status || 'ongoing';
    document.getElementById('anime-form-title').textContent = 'Редагувати аніме';
    document.getElementById('anime-btn-submit').textContent = 'Оновити';
    document.getElementById('anime-btn-cancel').style.display = 'inline-block';
    window.scrollTo(0, document.getElementById('anime-form').offsetTop);
}

function cancelEditAnime() {
    editingAnimeId = null;
    document.getElementById('anime-form').reset();
    document.getElementById('anime-form-title').textContent = 'Додати нове аніме';
    document.getElementById('anime-btn-submit').textContent = 'Додати';
    document.getElementById('anime-btn-cancel').style.display = 'none';
}

async function deleteAnime(id) {
    if (confirm('Видалити аніме?')) {
        try {
            const res = await fetch(`/api/anime/${id}`, { method: 'DELETE' });
            if (res.ok) await loadAnime();
        } catch (err) {
            console.error(err);
        }
    }
}

// ===== ФІЛЬМИ/СЕРІАЛИ =====
let currentMovieSort = 'date';
let currentMovieOrder = 'desc';
let currentMovieSearch = '';
let currentMovieType = 'all';
let editingMovieId = null;

async function loadMovies() {
    try {
        const params = new URLSearchParams({
            sort: currentMovieSort,
            order: currentMovieOrder,
            search: currentMovieSearch,
            type: currentMovieType
        });
        const res = await fetch(`/api/movies?${params}`);
        if (!res.ok) throw new Error('failed to load movies');
        const movies = await res.json();
        const list = document.getElementById('movies-list');
        list.innerHTML = '';

        if (!movies.length) {
            list.innerHTML = '<p>Фільми/серіали ще не додано.</p>';
            return;
        }

        const ul = document.createElement('ul');
        movies.forEach((m, idx) => {
            const li = document.createElement('li');
            li.className = 'movie-item';

            const posterImg = document.createElement('img');
            posterImg.src = m.poster_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="90"%3E%3Crect fill="%23ddd" width="60" height="90"/%3E%3C/svg%3E';
            posterImg.alt = 'poster';
            posterImg.className = 'movie-poster';

            const infoDiv = document.createElement('div');
            infoDiv.className = 'movie-info';

            const titleText = document.createElement('span');
            titleText.className = 'movie-title';
            titleText.textContent = `${idx + 1}. ${m.title}`;

            const typeText = document.createElement('span');
            typeText.className = 'movie-type';
            typeText.textContent = m.type === 'movie' ? '🎬 Фільм' : '📺 Серіал';

            const ratingText = document.createElement('span');
            ratingText.className = 'movie-rating';
            ratingText.textContent = `⭐ ${m.rating}/10`;

            const yearText = document.createElement('span');
            yearText.className = 'movie-year';
            yearText.textContent = m.year ? `📅 ${m.year}` : '';

            const descText = document.createElement('span');
            descText.className = 'movie-desc';
            descText.textContent = m.description || '';

            infoDiv.appendChild(titleText);
            infoDiv.appendChild(typeText);
            infoDiv.appendChild(ratingText);
            if (m.year) infoDiv.appendChild(yearText);
            if (m.description) infoDiv.appendChild(descText);

            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'movie-buttons';

            const editBtn = document.createElement('button');
            editBtn.textContent = '✏️';
            editBtn.className = 'edit-btn-small';
            editBtn.onclick = () => startEditMovie(m);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '✕';
            deleteBtn.className = 'delete-btn-small';
            deleteBtn.onclick = () => deleteMovie(m.id);

            buttonsDiv.appendChild(editBtn);
            buttonsDiv.appendChild(deleteBtn);

            li.appendChild(posterImg);
            li.appendChild(infoDiv);
            li.appendChild(buttonsDiv);
            ul.appendChild(li);
        });
        list.appendChild(ul);
    } catch (err) {
        console.error('Error loading movies:', err);
    }
}

function startEditMovie(movie) {
    editingMovieId = movie.id;
    document.getElementById('movie-title').value = movie.title;
    document.getElementById('movie-type').value = movie.type;
    document.getElementById('movie-rating').value = movie.rating;
    document.getElementById('movie-year').value = movie.year || '';
    document.getElementById('movie-desc').value = movie.description || '';
    document.getElementById('movie-form-title').textContent = 'Редагувати фільм/серіал';
    document.getElementById('movie-btn-submit').textContent = 'Оновити';
    document.getElementById('movie-btn-cancel').style.display = 'inline-block';
    window.scrollTo(0, document.getElementById('movie-form').offsetTop);
}

function cancelEditMovie() {
    editingMovieId = null;
    document.getElementById('movie-form').reset();
    document.getElementById('movie-form-title').textContent = 'Додати новий фільм/серіал';
    document.getElementById('movie-btn-submit').textContent = 'Додати';
    document.getElementById('movie-btn-cancel').style.display = 'none';
}

async function deleteMovie(id) {
    if (confirm('Видалити?')) {
        try {
            const res = await fetch(`/api/movies/${id}`, { method: 'DELETE' });
            if (res.ok) await loadMovies();
        } catch (err) {
            console.error(err);
        }
    }
}

// ===== ПОБАЧЕННЯ =====
async function loadDates() {
    try {
        const res = await fetch('/api/dates');
        if (!res.ok) throw new Error('failed to load dates');
        const dates = await res.json();
        const list = document.getElementById('dates-list');
        list.innerHTML = '';

        if (!dates.length) {
            list.innerHTML = '<p>Дати ще не додано.</p>';
            return;
        }

        const ul = document.createElement('ul');
        dates.forEach((d, idx) => {
            const li = document.createElement('li');
            li.className = 'date-item';

            const numSpan = document.createElement('span');
            numSpan.className = 'date-number';
            numSpan.textContent = `${idx + 1}.`;

            const dateFormatted = new Date(d.date).toLocaleDateString('uk-UA');
            const text = document.createElement('span');
            text.textContent = `📅 ${dateFormatted}${d.description ? ' - ' + d.description : ''}`;

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '✕';
            deleteBtn.className = 'delete-btn-small';
            deleteBtn.onclick = () => deleteDate(d.id);

            li.appendChild(numSpan);
            li.appendChild(text);
            li.appendChild(deleteBtn);
            ul.appendChild(li);
        });
        list.appendChild(ul);
    } catch (err) {
        console.error('Error loading dates:', err);
    }
}

async function deleteDate(id) {
    if (confirm('Видалити дату?')) {
        try {
            const res = await fetch(`/api/dates/${id}`, { method: 'DELETE' });
            if (res.ok) await loadDates();
        } catch (err) {
            console.error(err);
        }
    }
}

// ===== ІНІЦІАЛІЗАЦІЯ =====
document.addEventListener('DOMContentLoaded', () => {
    loadPhotos();
    loadNotes();
    loadAnime();
    loadMovies();
    loadDates();

    // Фото
    document.getElementById('upload-photo-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('photo-file');
        const captionInput = document.getElementById('photo-caption');

        if (!fileInput.files.length) return alert('Вибери фото!');

        const formData = new FormData();
        formData.append('photo', fileInput.files[0]);
        formData.append('caption', captionInput.value);

        try {
            const res = await fetch('/api/photos/upload', { method: 'POST', body: formData });
            if (!res.ok) throw new Error(await res.json().then(e => e.error));

            fileInput.value = '';
            captionInput.value = '';
            await loadPhotos();
        } catch (err) {
            alert('Помилка: ' + err.message);
        }
    });

    // Нотатки
    document.getElementById('note-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('note-text');
        const text = input.value.trim();
        if (!text) return alert('Введи текст нотатки');

        try {
            const res = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            if (!res.ok) throw new Error(await res.json().then(e => e.error));

            input.value = '';
            await loadNotes();
        } catch (err) {
            alert('Помилка: ' + err.message);
        }
    });

    // Аніме
    document.getElementById('anime-search').addEventListener('input', (e) => {
        currentAnimeSearch = e.target.value;
        loadAnime();
    });

    document.getElementById('anime-sort').addEventListener('change', (e) => {
        currentAnimeSort = e.target.value;
        loadAnime();
    });

    document.getElementById('anime-order').addEventListener('change', (e) => {
        currentAnimeOrder = e.target.value;
        loadAnime();
    });

    document.getElementById('anime-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('anime-title').value.trim();
        const rating = document.getElementById('anime-rating').value || 0;
        const episodes = document.getElementById('anime-episodes').value || 0;
        const status = document.getElementById('anime-status').value;
        const fileInput = document.getElementById('anime-poster');

        if (!title) return alert('Введи назву аніме');

        const formData = new FormData();
        formData.append('title', title);
        formData.append('rating', parseFloat(rating));
        formData.append('episodes', parseInt(episodes));
        formData.append('status', status);
        if (fileInput.files.length) formData.append('poster', fileInput.files[0]);

        try {
            const url = editingAnimeId ? `/api/anime/${editingAnimeId}` : '/api/anime';
            const method = editingAnimeId ? 'PUT' : 'POST';
            const res = await fetch(url, { method, body: formData });
            if (!res.ok) throw new Error(await res.json().then(e => e.error));

            cancelEditAnime();
            fileInput.value = '';
            await loadAnime();
        } catch (err) {
            alert('Помилка: ' + err.message);
        }
    });

    document.getElementById('anime-btn-cancel').addEventListener('click', cancelEditAnime);

    // Фільми/Серіали
    document.getElementById('movie-search').addEventListener('input', (e) => {
        currentMovieSearch = e.target.value;
        loadMovies();
    });

    document.getElementById('movie-sort').addEventListener('change', (e) => {
        currentMovieSort = e.target.value;
        loadMovies();
    });

    document.getElementById('movie-order').addEventListener('change', (e) => {
        currentMovieOrder = e.target.value;
        loadMovies();
    });

    document.getElementById('movie-type-filter').addEventListener('change', (e) => {
        currentMovieType = e.target.value;
        loadMovies();
    });

    document.getElementById('movie-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('movie-title').value.trim();
        const type = document.getElementById('movie-type').value;
        const rating = document.getElementById('movie-rating').value || 0;
        const year = document.getElementById('movie-year').value;
        const desc = document.getElementById('movie-desc').value;
        const fileInput = document.getElementById('movie-poster');

        if (!title || !type) return alert('Введи назву та тип');

        const formData = new FormData();
        formData.append('title', title);
        formData.append('type', type);
        formData.append('rating', parseFloat(rating));
        if (year) formData.append('year', parseInt(year));
        formData.append('description', desc);
        if (fileInput.files.length) formData.append('poster', fileInput.files[0]);

        try {
            const url = editingMovieId ? `/api/movies/${editingMovieId}` : '/api/movies';
            const method = editingMovieId ? 'PUT' : 'POST';
            const res = await fetch(url, { method, body: formData });
            if (!res.ok) throw new Error(await res.json().then(e => e.error));

            cancelEditMovie();
            fileInput.value = '';
            await loadMovies();
        } catch (err) {
            alert('Помилка: ' + err.message);
        }
    });

    document.getElementById('movie-btn-cancel').addEventListener('click', cancelEditMovie);

    // Побачення
    document.getElementById('date-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = document.getElementById('date-input').value;
        const description = document.getElementById('date-description').value.trim();

        if (!date) return alert('Вибери дату');

        try {
            const res = await fetch('/api/dates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, description })
            });
            if (!res.ok) throw new Error(await res.json().then(e => e.error));

            document.getElementById('date-input').value = '';
            document.getElementById('date-description').value = '';
            await loadDates();
        } catch (err) {
            alert('Помилка: ' + err.message);
        }
    });
});