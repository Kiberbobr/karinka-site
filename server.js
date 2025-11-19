require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
app.use(cors());
app.use(express.json());

// Статика
app.use(express.static(path.join(__dirname, 'public')));

// Підключення Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('Cloudinary Config:');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API Key:', process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING');
console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING');

// Підключення до PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

// ===== ІНІЦІАЛІЗАЦІЯ ТАБЛИЦЬ =====
async function initDB() {
  try {
    // Таблиця photos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS photos (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL,
        caption TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Таблиця notes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Таблиця anime
    await pool.query(`
      CREATE TABLE IF NOT EXISTS anime (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        rating NUMERIC(3,1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Таблиця dates
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dates (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('All tables initialized');
  } catch (err) {
    console.error('Failed to initialize tables:', err);
  }
}

// Викликаємо одразу
initDB();

// MULTER з CLOUDINARY
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'karinka-photos',
    resource_type: 'auto'
  }
});
const upload = multer({ storage });

// ===== ФОТО =====
app.get('/api/photos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM photos ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/photos/upload', upload.single('photo'), async (req, res) => {
  try {
    console.log('File received:', req.file);
    
    if (!req.file) {
      console.error('No file uploaded');
      return res.status(400).json({ error: 'Файл не завантажено' });
    }
    
    const caption = req.body.caption || '';
    const url = req.file.secure_url;
    
    console.log('File info:', {
      filename: req.file.filename,
      secure_url: req.file.secure_url,
      path: req.file.path
    });

    if (!url) {
      console.error('secure_url is null! File object:', req.file);
      return res.status(400).json({ error: 'Cloudinary upload failed - no URL' });
    }

    const result = await pool.query(
      'INSERT INTO photos(url, caption, created_at) VALUES ($1, $2, NOW()) RETURNING *',
      [url, caption]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/photos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const photoResult = await pool.query('SELECT * FROM photos WHERE id = $1', [id]);
    
    if (photoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Фото не знайдено' });
    }

    const photo = photoResult.rows[0];
    
    // Видали з Cloudinary
    try {
      const publicId = photo.url.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`karinka-photos/${publicId}`);
    } catch (e) {
      console.error('Error deleting from Cloudinary:', e);
    }

    await pool.query('DELETE FROM photos WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== НОТАТКИ =====
app.get('/api/notes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notes ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Текст нотатки не може бути порожнім' });
    }
    const result = await pool.query(
      'INSERT INTO notes(text, created_at) VALUES($1, NOW()) RETURNING *',
      [text.trim()]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM notes WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Нотатка не знайдена' });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== АНІМЕ =====
app.get('/api/anime', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM anime ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/anime', async (req, res) => {
  try {
    const { title, rating } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Назва аніме обов\'язкова' });
    }
    const rate = Math.min(10, Math.max(0, parseFloat(rating) || 0));
    const result = await pool.query(
      'INSERT INTO anime(title, rating, created_at) VALUES($1, $2, NOW()) RETURNING *',
      [title.trim(), rate]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/anime/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM anime WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Аніме не знайдено' });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== ПОБАЧЕННЯ =====
app.get('/api/dates', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM dates ORDER BY date ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/dates', async (req, res) => {
  try {
    const { date, description } = req.body;
    if (!date) {
      return res.status(400).json({ error: 'Дата обов\'язкова' });
    }
    const result = await pool.query(
      'INSERT INTO dates(date, description, created_at) VALUES($1, $2, NOW()) RETURNING *',
      [date, description || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/dates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM dates WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Дата не знайдена' });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));