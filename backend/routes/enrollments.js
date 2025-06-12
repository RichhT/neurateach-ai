const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { db } = require('../config/database');

const router = express.Router();

// Helper function to calculate level from XP
function calculateLevel(xp) {
  const levelRequirements = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3250];
  for (let level = levelRequirements.length - 1; level >= 0; level--) {
    if (xp >= levelRequirements[level]) {
      return level + 1;
    }
  }
  return 1;
}

// Helper function to calculate XP needed for next level
function getXPForNextLevel(currentXP) {
  const levelRequirements = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3250];
  const currentLevel = calculateLevel(currentXP);
  if (currentLevel >= levelRequirements.length) {
    return { needed: 0, total: levelRequirements[levelRequirements.length - 1] };
  }
  const nextLevelXP = levelRequirements[currentLevel];
  return { 
    needed: nextLevelXP - currentXP, 
    total: nextLevelXP 
  };
}

// Enroll student in a unit
router.post('/', authMiddleware, (req, res) => {
  const { unitId } = req.body;
  const studentId = req.user.userId;

  // Check if student
  if (req.user.userType !== 'student') {
    return res.status(403).json({ error: 'Only students can enroll in units' });
  }

  // Check if already enrolled
  db.get(
    'SELECT id FROM student_enrollments WHERE student_id = ? AND unit_id = ?',
    [studentId, unitId],
    (err, existingEnrollment) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (existingEnrollment) {
        return res.status(400).json({ error: 'Already enrolled in this unit' });
      }

      // Create enrollment
      db.run(
        'INSERT INTO student_enrollments (student_id, unit_id) VALUES (?, ?)',
        [studentId, unitId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to create enrollment' });
          }

          const enrollmentId = this.lastID;

          // Create objective progress records for all objectives in the unit
          db.all(
            'SELECT id FROM learning_objectives WHERE unit_id = ?',
            [unitId],
            (err, objectives) => {
              if (err) {
                return res.status(500).json({ error: 'Failed to fetch objectives' });
              }

              const progressInserts = objectives.map(obj => 
                `(${enrollmentId}, ${obj.id})`
              ).join(',');

              if (progressInserts) {
                db.run(
                  `INSERT INTO objective_progress (enrollment_id, objective_id) VALUES ${progressInserts}`,
                  (err) => {
                    if (err) {
                      console.error('Failed to create progress records:', err);
                    }
                  }
                );
              }

              res.json({ 
                message: 'Successfully enrolled in unit',
                enrollmentId,
                objectivesCount: objectives.length
              });
            }
          );
        }
      );
    }
  );
});

// Get student's enrollments
router.get('/my-enrollments', authMiddleware, (req, res) => {
  const studentId = req.user.userId;

  if (req.user.userType !== 'student') {
    return res.status(403).json({ error: 'Only students can view enrollments' });
  }

  const query = `
    SELECT 
      e.id as enrollment_id,
      e.enrolled_at,
      e.status,
      e.completion_percentage,
      e.last_accessed,
      u.id as unit_id,
      u.name as unit_name,
      u.description as unit_description,
      u.user_id as teacher_id,
      teacher.name as teacher_name,
      COUNT(lo.id) as total_objectives,
      AVG(op.mastery_score) as avg_mastery,
      SUM(op.level_score) as total_xp,
      MAX(op.current_level) as max_level
    FROM student_enrollments e
    JOIN units u ON e.unit_id = u.id
    JOIN users teacher ON u.user_id = teacher.id
    LEFT JOIN learning_objectives lo ON u.id = lo.unit_id
    LEFT JOIN objective_progress op ON e.id = op.enrollment_id
    WHERE e.student_id = ?
    GROUP BY e.id
    ORDER BY e.enrolled_at DESC
  `;

  db.all(query, [studentId], (err, enrollments) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const enrichedEnrollments = enrollments.map(enrollment => ({
      ...enrollment,
      avg_mastery: Math.round((enrollment.avg_mastery || 0) * 100),
      current_level: calculateLevel(enrollment.total_xp || 0),
      next_level_progress: getXPForNextLevel(enrollment.total_xp || 0)
    }));

    res.json(enrichedEnrollments);
  });
});

// Get detailed progress for a specific enrollment
router.get('/:enrollmentId/progress', authMiddleware, (req, res) => {
  const { enrollmentId } = req.params;
  const studentId = req.user.userId;

  // Verify ownership
  db.get(
    'SELECT id FROM student_enrollments WHERE id = ? AND student_id = ?',
    [enrollmentId, studentId],
    (err, enrollment) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!enrollment) {
        return res.status(404).json({ error: 'Enrollment not found' });
      }

      const query = `
        SELECT 
          op.*,
          lo.objective_text,
          lo.order_index,
          (SELECT COUNT(*) FROM study_sessions ss WHERE ss.enrollment_id = op.enrollment_id AND ss.objective_id = op.objective_id) as study_sessions_count,
          (SELECT COUNT(*) FROM quiz_sessions qs WHERE qs.enrollment_id = op.enrollment_id AND qs.objective_id = op.objective_id) as quiz_sessions_count
        FROM objective_progress op
        JOIN learning_objectives lo ON op.objective_id = lo.id
        WHERE op.enrollment_id = ?
        ORDER BY lo.order_index
      `;

      db.all(query, [enrollmentId], (err, progress) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        const enrichedProgress = progress.map(obj => ({
          ...obj,
          current_level: calculateLevel(obj.level_score),
          mastery_percentage: Math.round(obj.mastery_score * 100),
          next_level_progress: getXPForNextLevel(obj.level_score)
        }));

        res.json(enrichedProgress);
      });
    }
  );
});

// Get available units for enrollment
router.get('/available-units', authMiddleware, (req, res) => {
  const studentId = req.user.userId;

  if (req.user.userType !== 'student') {
    return res.status(403).json({ error: 'Only students can view available units' });
  }

  const query = `
    SELECT 
      u.id,
      u.name,
      u.description,
      u.created_at,
      teacher.name as teacher_name,
      COUNT(lo.id) as objectives_count,
      CASE WHEN e.id IS NOT NULL THEN 1 ELSE 0 END as is_enrolled
    FROM units u
    JOIN users teacher ON u.user_id = teacher.id
    LEFT JOIN learning_objectives lo ON u.id = lo.unit_id
    LEFT JOIN student_enrollments e ON u.id = e.unit_id AND e.student_id = ?
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `;

  db.all(query, [studentId], (err, units) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(units);
  });
});

// Unenroll from a unit
router.delete('/:enrollmentId', authMiddleware, (req, res) => {
  const { enrollmentId } = req.params;
  const studentId = req.user.userId;

  // Verify ownership
  db.get(
    'SELECT id FROM student_enrollments WHERE id = ? AND student_id = ?',
    [enrollmentId, studentId],
    (err, enrollment) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!enrollment) {
        return res.status(404).json({ error: 'Enrollment not found' });
      }

      // Update status instead of deleting to preserve learning history
      db.run(
        'UPDATE student_enrollments SET status = ? WHERE id = ?',
        ['dropped', enrollmentId],
        (err) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to unenroll' });
          }

          res.json({ message: 'Successfully unenrolled from unit' });
        }
      );
    }
  );
});

module.exports = router;