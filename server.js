const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Data storage functions
async function loadData() {
  try {
    const data = await fs.readFile(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty array
    return [];
  }
}

async function saveData(data) {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

// API Routes

// GET /api/items - return all items
app.get('/api/items', async (req, res) => {
  try {
    const items = await loadData();
    res.json(items);
  } catch (error) {
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

    const newItem = {
      id: uuidv4(),
      name: name.trim(),
      notes: notes ? notes.trim() : '',
      createdAt: new Date().toISOString()
    };

    const items = await loadData();
    items.push(newItem);
    await saveData(items);

    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// PATCH /api/items/:id - update item
app.patch('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, notes, createdAt } = req.body;

    const items = await loadData();
    const itemIndex = items.findIndex(item => item.id === id);

    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (name !== undefined) {
      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      items[itemIndex].name = name.trim();
    }

    if (notes !== undefined) {
      items[itemIndex].notes = notes ? notes.trim() : '';
    }

    // Allow updating createdAt date
    if (createdAt !== undefined) {
      const date = new Date(createdAt);
      if (!isNaN(date.getTime())) {
        items[itemIndex].createdAt = date.toISOString();
      }
    }

    await saveData(items);
    res.json(items[itemIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE /api/items/:id - delete item
app.delete('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const items = await loadData();
    const itemIndex = items.findIndex(item => item.id === id);

    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }

    items.splice(itemIndex, 1);
    await saveData(items);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`LastSeen server running on http://localhost:${PORT}`);
});
