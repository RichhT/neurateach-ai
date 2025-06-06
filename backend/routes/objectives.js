const express = require('express');
const { authMiddleware, teacherOnlyMiddleware } = require('../middleware/auth');
const db = require('../config/database');

const router = express.Router();

router.post('/', authMiddleware, teacherOnlyMiddleware, async (req, res) => {
  try {
    const { unit_id, objective_text, order_index } = req.body;

    const unitCheck = await db.query(
      'SELECT id FROM units WHERE id = ? AND user_id = ?',
      [unit_id, req.userId]
    );

    if (unitCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    const result = await db.query(
      'INSERT INTO learning_objectives (unit_id, objective_text, order_index) VALUES (?, ?, ?)',
      [unit_id, objective_text, order_index || 0]
    );
    
    const newObjective = await db.query('SELECT * FROM learning_objectives WHERE id = ?', [result.insertId]);
    res.status(201).json(newObjective.rows[0]);
  } catch (error) {
    console.error('Objective creation error:', error);
    res.status(500).json({ error: 'Error creating objective' });
  }
});

router.put('/:id', authMiddleware, teacherOnlyMiddleware, async (req, res) => {
  try {
    const { objective_text, order_index } = req.body;

    const objectiveCheck = await db.query(`
      SELECT lo.* FROM learning_objectives lo
      JOIN units u ON lo.unit_id = u.id
      WHERE lo.id = ? AND u.user_id = ?
    `, [req.params.id, req.userId]);

    if (objectiveCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Objective not found' });
    }

    const result = await db.query(
      'UPDATE learning_objectives SET objective_text = ?, order_index = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [objective_text, order_index, req.params.id]
    );
    
    const updatedObjective = await db.query('SELECT * FROM learning_objectives WHERE id = ?', [req.params.id]);
    res.json(updatedObjective.rows[0]);
  } catch (error) {
    console.error('Objective update error:', error);
    res.status(500).json({ error: 'Error updating objective' });
  }
});

router.delete('/:id', authMiddleware, teacherOnlyMiddleware, async (req, res) => {
  try {
    const objectiveCheck = await db.query(`
      SELECT lo.* FROM learning_objectives lo
      JOIN units u ON lo.unit_id = u.id
      WHERE lo.id = ? AND u.user_id = ?
    `, [req.params.id, req.userId]);

    if (objectiveCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Objective not found' });
    }

    await db.query('DELETE FROM learning_objectives WHERE id = ?', [req.params.id]);

    res.json({ message: 'Objective deleted successfully' });
  } catch (error) {
    console.error('Objective deletion error:', error);
    res.status(500).json({ error: 'Error deleting objective' });
  }
});

module.exports = router;