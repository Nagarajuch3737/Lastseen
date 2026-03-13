require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

// MySQL Connection Pool
let pool;

async function initializeDatabase() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test connection
    const connection = await pool.getConnection();
    console.log('✓ Connected to MySQL Database');
    connection.release();
    
    // Initialize tables
    await createTablesIfNotExists();
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    process.exit(1);
  }
}

async function createTablesIfNotExists() {
  const connection = await pool.getConnection();
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS items (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        notes TEXT,
        createdAt VARCHAR(255) NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Items table ready');
  } finally {
    connection.release();
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// API Routes

// GET /api/items - return all items
app.get('/api/items', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT * FROM items ORDER BY createdAt DESC');
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to load items' });
  }
});

// POST /api/items - create item
app.post('/api/items', async (req, res) => {
  try {
    const { name, notes } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }

    const id = uuidv4();
    const createdAt = new Date().toISOString();
    const trimmedNotes = notes ? notes.trim() : '';

    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO items (id, name, notes, createdAt) VALUES (?, ?, ?, ?)',
      [id, name.trim(), trimmedNotes, createdAt]
    );
    connection.release();

    res.status(201).json({
      id,
      name: name.trim(),
      notes: trimmedNotes,
      createdAt
    });
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// PATCH /api/items/:id - update item
app.patch('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, notes, createdAt } = req.body;

    const connection = await pool.getConnection();

    // Check if item exists
    const [existing] = await connection.execute('SELECT * FROM items WHERE id = ?', [id]);
    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = existing[0];
    const updatedName = name !== undefined ? name.trim() : item.name;
    const updatedNotes = notes !== undefined ? (notes ? notes.trim() : '') : item.notes;
    const updatedCreatedAt = createdAt !== undefined ? createdAt : item.createdAt;

    if (updatedName === '') {
      connection.release();
      return res.status(400).json({ error: 'Name cannot be empty' });
    }

    await connection.execute(
      'UPDATE items SET name = ?, notes = ?, createdAt = ? WHERE id = ?',
      [updatedName, updatedNotes, updatedCreatedAt, id]
    );

    const [updated] = await connection.execute('SELECT * FROM items WHERE id = ?', [id]);
    connection.release();

    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE /api/items/:id - delete item
app.delete('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();
    
    // Check if item exists
    const [existing] = await connection.execute('SELECT * FROM items WHERE id = ?', [id]);
    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Item not found' });
    }

    await connection.execute('DELETE FROM items WHERE id = ?', [id]);
    connection.release();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'error', message: 'Database unavailable' });
  }
});

// Start server
async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`✓ LastSeen server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
