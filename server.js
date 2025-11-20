require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Database connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

// Initialize DB
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS photos (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL,
        caption TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS anime (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        rating NUMERIC(3,1) DEFAULT 0,
        poster_url TEXT,
        episodes INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'ongoing',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS movies (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        rating NUMERIC(3,1) DEFAULT 0,
        poster_url TEXT,
        year INT,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS dates (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ Database initialized');
  } catch (err) {
    console.error('DB init error:', err);
  }
}

initDB();

const upload = multer({ storage: multer.memoryStorage() });

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
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не завантажено' });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'karinka-photos', resource_type: 'auto' },
      async (error, result) => {
        if (error) {
          return res.status(500).json({ error: 'Cloudinary error: ' + error.message });
        }

        const caption = req.body.caption || '';
        try {
          const dbResult = await pool.query(
            'INSERT INTO photos(url, caption, created_at) VALUES ($1, $2, NOW()) RETURNING *',
            [result.secure_url, caption]
          );
          res.json(dbResult.rows[0]);
        } catch (dbErr) {
          res.status(500).json({ error: 'DB error: ' + dbErr.message });
        }
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  } catch (err) {
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
    try {
      const urlParts = photo.url.split('/');
      const filename = urlParts[urlParts.length - 1];
      const publicId = `karinka-photos/${filename.split('.')[0]}`;
      await cloudinary.uploader.destroy(publicId);
    } catch (e) {
      console.error('Cloudinary delete error:', e);
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
    const { sort = 'date', search = '', order = 'desc' } = req.query;
    let query = 'SELECT * FROM anime WHERE LOWER(title) LIKE LOWER($1)';
    const searchParam = `%${search}%`;

    if (sort === 'title') {
      query += ` ORDER BY title ${order === 'asc' ? 'ASC' : 'DESC'}`;
    } else if (sort === 'rating') {
      query += ` ORDER BY rating ${order === 'asc' ? 'ASC' : 'DESC'}, id DESC`;
    } else {
      query += ` ORDER BY created_at DESC`;
    }

    const result = await pool.query(query, [searchParam]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/anime', upload.single('poster'), async (req, res) => {
  try {
    const { title, rating, episodes, status } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Назва аніме обов\'язкова' });
    }

    let posterUrl = null;
    if (req.file) {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'karinka-anime-posters', resource_type: 'auto' },
        (error, result) => {
          if (!error) posterUrl = result.secure_url;
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      await new Promise(resolve => uploadStream.on('finish', resolve));
    }

    const rate = Math.min(10, Math.max(0, parseFloat(rating) || 0));
    const result = await pool.query(
      'INSERT INTO anime(title, rating, poster_url, episodes, status, created_at) VALUES($1, $2, $3, $4, $5, NOW()) RETURNING *',
      [title.trim(), rate, posterUrl, parseInt(episodes) || 0, status || 'ongoing']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/anime/:id', upload.single('poster'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, rating, episodes, status } = req.body;

    let posterUrl = null;
    if (req.file) {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'karinka-anime-posters', resource_type: 'auto' },
        (error, result) => {
          if (!error) posterUrl = result.secure_url;
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      await new Promise(resolve => uploadStream.on('finish', resolve));
    }

    const rate = Math.min(10, Math.max(0, parseFloat(rating) || 0));
    const updateQuery = posterUrl
      ? 'UPDATE anime SET title=$1, rating=$2, episodes=$3, status=$4, poster_url=$5 WHERE id=$6 RETURNING *'
      : 'UPDATE anime SET title=$1, rating=$2, episodes=$3, status=$4 WHERE id=$5 RETURNING *';

    const params = posterUrl
      ? [title.trim(), rate, parseInt(episodes) || 0, status || 'ongoing', posterUrl, id]
      : [title.trim(), rate, parseInt(episodes) || 0, status || 'ongoing', id];

    const result = await pool.query(updateQuery, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Аніме не знайдено' });
    }

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

// ===== ФІЛЬМИ/СЕРІАЛИ =====
app.get('/api/movies', async (req, res) => {
  try {
    const { sort = 'date', search = '', type = 'all', order = 'desc' } = req.query;
    let query = 'SELECT * FROM movies WHERE LOWER(title) LIKE LOWER($1)';
    const searchParam = `%${search}%`;
    const params = [searchParam];

    if (type !== 'all') {
      query += ` AND type = $${params.length + 1}`;
      params.push(type);
    }

    if (sort === 'title') {
      query += ` ORDER BY title ${order === 'asc' ? 'ASC' : 'DESC'}`;
    } else if (sort === 'rating') {
      query += ` ORDER BY rating ${order === 'asc' ? 'ASC' : 'DESC'}, id DESC`;
    } else if (sort === 'year') {
      query += ` ORDER BY year ${order === 'asc' ? 'ASC' : 'DESC'}, id DESC`;
    } else {
      query += ` ORDER BY created_at DESC`;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/movies', upload.single('poster'), async (req, res) => {
  try {
    const { title, type, rating, year, description } = req.body;
    if (!title || !type) {
      return res.status(400).json({ error: 'Назва та тип обов\'язкові' });
    }

    let posterUrl = null;
    if (req.file) {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'karinka-movie-posters', resource_type: 'auto' },
        (error, result) => {
          if (!error) posterUrl = result.secure_url;
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      await new Promise(resolve => uploadStream.on('finish', resolve));
    }

    const rate = Math.min(10, Math.max(0, parseFloat(rating) || 0));
    const result = await pool.query(
      'INSERT INTO movies(title, type, rating, poster_url, year, description, created_at) VALUES($1, $2, $3, $4, $5, $6, NOW()) RETURNING *',
      [title.trim(), type, rate, posterUrl, parseInt(year) || null, description || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/movies/:id', upload.single('poster'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, rating, year, description } = req.body;

    let posterUrl = null;
    if (req.file) {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'karinka-movie-posters', resource_type: 'auto' },
        (error, result) => {
          if (!error) posterUrl = result.secure_url;
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      await new Promise(resolve => uploadStream.on('finish', resolve));
    }

    const rate = Math.min(10, Math.max(0, parseFloat(rating) || 0));
    const updateQuery = posterUrl
      ? 'UPDATE movies SET title=$1, type=$2, rating=$3, year=$4, description=$5, poster_url=$6 WHERE id=$7 RETURNING *'
      : 'UPDATE movies SET title=$1, type=$2, rating=$3, year=$4, description=$5 WHERE id=$6 RETURNING *';

    const params = posterUrl
      ? [title.trim(), type, rate, parseInt(year) || null, description || '', posterUrl, id]
      : [title.trim(), type, rate, parseInt(year) || null, description || '', id];

    const result = await pool.query(updateQuery, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Фільм не знайдено' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/movies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM movies WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Фільм не знайдено' });
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
app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));