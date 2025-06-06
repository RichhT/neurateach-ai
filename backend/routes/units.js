const express = require('express');
const { authMiddleware, teacherOnlyMiddleware } = require('../middleware/auth');
const db = require('../config/database');

const router = express.Router();

router.post('/', authMiddleware, teacherOnlyMiddleware, async (req, res) => {
  try {
    const { name, description, objectives } = req.body;

    const unitResult = await db.query(
      'INSERT INTO units (user_id, name, description) VALUES (?, ?, ?)',
      [req.userId, name, description || '']
    );

    const unit = await db.query('SELECT * FROM units WHERE id = ?', [unitResult.insertId]);
    const unitData = unit.rows[0];

    if (objectives && objectives.length > 0) {
      for (let i = 0; i < objectives.length; i++) {
        await db.query(
          'INSERT INTO learning_objectives (unit_id, objective_text, order_index) VALUES (?, ?, ?)',
          [unitData.id, objectives[i], i]
        );
      }
    }

    const objectivesResult = await db.query(
      'SELECT * FROM learning_objectives WHERE unit_id = ? ORDER BY order_index',
      [unitData.id]
    );

    res.status(201).json({
      ...unitData,
      objectives: objectivesResult.rows
    });
  } catch (error) {
    console.error('Unit creation error:', error);
    res.status(500).json({ error: 'Error creating unit' });
  }
});

router.get('/', authMiddleware, teacherOnlyMiddleware, async (req, res) => {
  try {
    const unitsResult = await db.query(
      'SELECT * FROM units WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );

    const units = [];
    for (const unit of unitsResult.rows) {
      const objectivesResult = await db.query(
        'SELECT * FROM learning_objectives WHERE unit_id = ? ORDER BY order_index',
        [unit.id]
      );
      units.push({
        ...unit,
        objectives: objectivesResult.rows
      });
    }

    res.json(units);
  } catch (error) {
    console.error('Units fetch error:', error);
    res.status(500).json({ error: 'Error fetching units' });
  }
});

router.get('/:id', authMiddleware, teacherOnlyMiddleware, async (req, res) => {
  try {
    const unitResult = await db.query(
      'SELECT * FROM units WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (unitResult.rows.length === 0) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    const unit = unitResult.rows[0];
    const objectivesResult = await db.query(
      'SELECT * FROM learning_objectives WHERE unit_id = ? ORDER BY order_index',
      [unit.id]
    );

    res.json({
      ...unit,
      objectives: objectivesResult.rows
    });
  } catch (error) {
    console.error('Unit fetch error:', error);
    res.status(500).json({ error: 'Error fetching unit' });
  }
});

router.put('/:id', authMiddleware, teacherOnlyMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;

    const result = await db.query(
      'UPDATE units SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [name, description, req.params.id, req.userId]
    );
    
    const updatedUnit = await db.query('SELECT * FROM units WHERE id = ?', [req.params.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    res.json(updatedUnit.rows[0]);
  } catch (error) {
    console.error('Unit update error:', error);
    res.status(500).json({ error: 'Error updating unit' });
  }
});

router.delete('/:id', authMiddleware, teacherOnlyMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM learning_objectives WHERE unit_id = ?', [req.params.id]);
    
    const result = await db.query(
      'DELETE FROM units WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    res.json({ message: 'Unit deleted successfully' });
  } catch (error) {
    console.error('Unit deletion error:', error);
    res.status(500).json({ error: 'Error deleting unit' });
  }
});

module.exports = router;