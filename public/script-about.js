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
            const imgUrl = p.url.startsWith('/') ? p.url : '/' + p.url;
            
            const img = document.createElement('img');
            img.src = imgUrl;
            img.alt = p.caption || 'фото';
            img.onerror = () => console.error('Image failed to load:', imgUrl);
            
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
            if (res.ok) {
                await loadPhotos();
            } else {
                console.error('Delete failed:', res.status);
            }
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
        notes.forEach(n => {
            const li = document.createElement('li');
            const created = n.created_at ? new Date(n.created_at).toLocaleDateString('uk-UA') : '';
            
            const text = document.createElement('span');
            text.textContent = `${n.text} ${created ? ' - ' + created : ''}`;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '✕';
            deleteBtn.className = 'delete-note-btn';
            deleteBtn.onclick = () => deleteNote(n.id);
            
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
            if (res.ok) {
                await loadNotes();
            }
        } catch (err) {
            console.error(err);
        }
    }
}

// ===== АНІМЕ =====
async function loadAnime() {
    try {
        const res = await fetch('/api/anime');
        if (!res.ok) throw new Error('failed to load anime');
        const animes = await res.json();
        const list = document.getElementById('anime-list');
        list.innerHTML = '';

        if (!animes.length) {
            list.innerHTML = '<p>Аніме ще не додано.</p>';
            return;
        }

        const ul = document.createElement('ul');
        animes.forEach(a => {
            const li = document.createElement('li');
            li.className = 'anime-item';
            
            const text = document.createElement('span');
            text.textContent = `${a.title} - ⭐ ${a.rating}/10`;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '✕';
            deleteBtn.className = 'delete-btn-small';
            deleteBtn.onclick = () => deleteAnime(a.id);
            
            li.appendChild(text);
            li.appendChild(deleteBtn);
            ul.appendChild(li);
        });
        list.appendChild(ul);
    } catch (err) {
        console.error('Error loading anime:', err);
    }
}

async function deleteAnime(id) {
    if (confirm('Видалити аніме?')) {
        try {
            const res = await fetch(`/api/anime/${id}`, { method: 'DELETE' });
            if (res.ok) {
                await loadAnime();
            }
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
        dates.forEach(d => {
            const li = document.createElement('li');
            li.className = 'date-item';
            
            const dateFormatted = new Date(d.date).toLocaleDateString('uk-UA');
            const text = document.createElement('span');
            text.textContent = `📅 ${dateFormatted}${d.description ? ' - ' + d.description : ''}`;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '✕';
            deleteBtn.className = 'delete-btn-small';
            deleteBtn.onclick = () => deleteDate(d.id);
            
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
            if (res.ok) {
                await loadDates();
            }
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
    loadDates();

    // Форма нотаток
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
            if (!res.ok) {
                const error = await res.json();
                console.error('Server error:', error);
                throw new Error(error.error);
            }
            input.value = '';
            await loadNotes();
        } catch (err) {
            console.error('Error adding note:', err);
            alert('Не вдалось додати нотатку: ' + err.message);
        }
    });

    // Форма фото
    document.getElementById('upload-photo-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('photo-file');
        const captionInput = document.getElementById('photo-caption');
        
        if (!fileInput.files.length) return alert('Вибери фото!');

        const formData = new FormData();
        formData.append('photo', fileInput.files[0]);
        formData.append('caption', captionInput.value);

        try {
            console.log('Uploading photo...', fileInput.files[0].name);
            const res = await fetch('/api/photos/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!res.ok) {
                const error = await res.json();
                console.error('Server error:', error);
                throw new Error(error.error);
            }
            
            const result = await res.json();
            console.log('Photo uploaded successfully:', result);
            fileInput.value = '';
            captionInput.value = '';
            await loadPhotos();
        } catch (err) {
            console.error('Error uploading photo:', err);
            alert('Не вдалося завантажити фото: ' + err.message);
        }
    });

    // Форма аніме
    document.getElementById('anime-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('anime-title').value.trim();
        const rating = document.getElementById('anime-rating').value || 0;
        
        if (!title) return alert('Введи назву аніме');
        
        try {
            const res = await fetch('/api/anime', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, rating: parseFloat(rating) })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error);
            }
            document.getElementById('anime-title').value = '';
            document.getElementById('anime-rating').value = '';
            await loadAnime();
        } catch (err) {
            console.error('Error adding anime:', err);
            alert('Не вдалось додати аніме: ' + err.message);
        }
    });

    // Форма дат
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
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error);
            }
            document.getElementById('date-input').value = '';
            document.getElementById('date-description').value = '';
            await loadDates();
        } catch (err) {
            console.error('Error adding date:', err);
            alert('Не вдалось додати дату: ' + err.message);
        }
    });
});