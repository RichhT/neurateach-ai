const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const db = new sqlite3.Database('./config/database.sqlite');

// XP calculation constants
const XP_PER_MINUTE = 10;
const QUALITY_MULTIPLIER = 1.2; // Bonus for good conversations

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

// Start a study session
router.post('/start-session', authMiddleware, (req, res) => {
  const { enrollmentId, objectiveId } = req.body;
  const studentId = req.user.userId;

  if (req.user.userType !== 'student') {
    return res.status(403).json({ error: 'Only students can start study sessions' });
  }

  // Verify enrollment ownership
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

      // Check if there's already an active session
      db.get(
        'SELECT id FROM study_sessions WHERE enrollment_id = ? AND ended_at IS NULL',
        [enrollmentId],
        (err, activeSession) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          if (activeSession) {
            return res.status(400).json({ 
              error: 'Active study session already exists',
              sessionId: activeSession.id 
            });
          }

          // Create new study session
          db.run(
            'INSERT INTO study_sessions (enrollment_id, objective_id) VALUES (?, ?)',
            [enrollmentId, objectiveId],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Failed to create study session' });
              }

              const sessionId = this.lastID;

              // Update objective progress session start time
              db.run(
                'UPDATE objective_progress SET current_study_session_start = CURRENT_TIMESTAMP WHERE enrollment_id = ? AND objective_id = ?',
                [enrollmentId, objectiveId]
              );

              // Log learning event
              db.run(
                'INSERT INTO learning_events (enrollment_id, event_type, objectives_involved) VALUES (?, ?, ?)',
                [enrollmentId, 'study_session_start', JSON.stringify([objectiveId])]
              );

              res.json({ 
                sessionId,
                message: 'Study session started',
                enrollmentId,
                objectiveId
              });
            }
          );
        }
      );
    }
  );
});

// Add message to conversation
router.post('/add-message', authMiddleware, (req, res) => {
  const { sessionId, speaker, message, teachingTechnique } = req.body;
  const studentId = req.user.userId;

  // Verify session ownership
  db.get(
    `SELECT ss.id, ss.enrollment_id, se.student_id 
     FROM study_sessions ss
     JOIN student_enrollments se ON ss.enrollment_id = se.id
     WHERE ss.id = ? AND se.student_id = ?`,
    [sessionId, studentId],
    (err, session) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!session) {
        return res.status(404).json({ error: 'Study session not found' });
      }

      // Get current message sequence number
      db.get(
        'SELECT COALESCE(MAX(message_sequence), 0) + 1 as next_sequence FROM teaching_conversations WHERE study_session_id = ?',
        [sessionId],
        (err, result) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          const messageSequence = result.next_sequence;

          // Add message to conversation
          db.run(
            'INSERT INTO teaching_conversations (study_session_id, message_sequence, speaker, message_content, teaching_technique) VALUES (?, ?, ?, ?, ?)',
            [sessionId, messageSequence, speaker, message, teachingTechnique],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Failed to add message' });
              }

              // Update session stats
              const updateQuery = speaker === 'student' 
                ? 'UPDATE study_sessions SET conversation_turns = conversation_turns + 1, student_questions_count = student_questions_count + 1 WHERE id = ?'
                : 'UPDATE study_sessions SET conversation_turns = conversation_turns + 1 WHERE id = ?';

              db.run(updateQuery, [sessionId]);

              res.json({ 
                messageId: this.lastID,
                messageSequence,
                message: 'Message added to conversation'
              });
            }
          );
        }
      );
    }
  );
});

// End study session and award XP
router.post('/end-session', authMiddleware, (req, res) => {
  const { sessionId, sessionQuality, topicsCovered, comprehensionIndicators } = req.body;
  const studentId = req.user.userId;

  // Verify session ownership
  db.get(
    `SELECT ss.*, se.student_id 
     FROM study_sessions ss
     JOIN student_enrollments se ON ss.enrollment_id = se.id
     WHERE ss.id = ? AND se.student_id = ?`,
    [sessionId, studentId],
    (err, session) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!session || session.ended_at) {
        return res.status(404).json({ error: 'Active study session not found' });
      }

      const endTime = new Date();
      const startTime = new Date(session.started_at);
      const durationMinutes = Math.max(1, Math.round((endTime - startTime) / (1000 * 60)));

      // Calculate XP earned
      let xpEarned = durationMinutes * XP_PER_MINUTE;
      if (sessionQuality && sessionQuality > 0.7) {
        xpEarned = Math.round(xpEarned * QUALITY_MULTIPLIER);
      }

      // End the session
      db.run(
        `UPDATE study_sessions SET 
         ended_at = CURRENT_TIMESTAMP,
         duration_minutes = ?,
         xp_earned = ?,
         session_quality_score = ?,
         topics_covered = ?,
         comprehension_indicators = ?
         WHERE id = ?`,
        [durationMinutes, xpEarned, sessionQuality, JSON.stringify(topicsCovered), JSON.stringify(comprehensionIndicators), sessionId],
        (err) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to end session' });
          }

          // Update objective progress
          db.get(
            'SELECT * FROM objective_progress WHERE enrollment_id = ? AND objective_id = ?',
            [session.enrollment_id, session.objective_id],
            (err, progress) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }

              const newLevelScore = progress.level_score + xpEarned;
              const newStudyTime = progress.study_time_minutes + durationMinutes;
              const newLevel = calculateLevel(newLevelScore);
              const newSessionsCount = progress.study_sessions_count + 1;

              // Determine when to suggest next quiz (15 minutes default, but adaptive)
              const minutesUntilQuiz = Math.max(5, 15 - Math.floor(durationMinutes / 2));

              db.run(
                `UPDATE objective_progress SET 
                 level_score = ?,
                 study_time_minutes = ?,
                 current_level = ?,
                 study_sessions_count = ?,
                 last_studied = CURRENT_TIMESTAMP,
                 minutes_until_quiz_prompt = ?,
                 current_study_session_start = NULL
                 WHERE enrollment_id = ? AND objective_id = ?`,
                [newLevelScore, newStudyTime, newLevel, newSessionsCount, minutesUntilQuiz, session.enrollment_id, session.objective_id],
                (err) => {
                  if (err) {
                    return res.status(500).json({ error: 'Failed to update progress' });
                  }

                  // Log learning event
                  db.run(
                    'INSERT INTO learning_events (enrollment_id, event_type, objectives_involved, performance_metrics) VALUES (?, ?, ?, ?)',
                    [
                      session.enrollment_id, 
                      'study_session_end', 
                      JSON.stringify([session.objective_id]),
                      JSON.stringify({
                        duration_minutes: durationMinutes,
                        xp_earned: xpEarned,
                        session_quality: sessionQuality,
                        level_gained: newLevel > progress.current_level
                      })
                    ]
                  );

                  res.json({ 
                    message: 'Study session completed successfully',
                    durationMinutes,
                    xpEarned,
                    newLevel,
                    levelUp: newLevel > progress.current_level,
                    shouldSuggestQuiz: durationMinutes >= minutesUntilQuiz
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

// Get conversation history for a session
router.get('/session/:sessionId/conversation', authMiddleware, (req, res) => {
  const { sessionId } = req.params;
  const studentId = req.user.userId;

  // Verify session ownership
  db.get(
    `SELECT ss.id 
     FROM study_sessions ss
     JOIN student_enrollments se ON ss.enrollment_id = se.id
     WHERE ss.id = ? AND se.student_id = ?`,
    [sessionId, studentId],
    (err, session) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!session) {
        return res.status(404).json({ error: 'Study session not found' });
      }

      db.all(
        'SELECT * FROM teaching_conversations WHERE study_session_id = ? ORDER BY message_sequence',
        [sessionId],
        (err, messages) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          res.json(messages);
        }
      );
    }
  );
});

// Get active study session for a student
router.get('/active-session/:enrollmentId', authMiddleware, (req, res) => {
  const { enrollmentId } = req.params;
  const studentId = req.user.userId;

  db.get(
    `SELECT ss.*, lo.objective_text, lo.order_index
     FROM study_sessions ss
     JOIN student_enrollments se ON ss.enrollment_id = se.id
     JOIN learning_objectives lo ON ss.objective_id = lo.id
     WHERE ss.enrollment_id = ? AND se.student_id = ? AND ss.ended_at IS NULL`,
    [enrollmentId, studentId],
    (err, session) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!session) {
        return res.json({ activeSession: null });
      }

      // Get recent conversation messages
      db.all(
        'SELECT * FROM teaching_conversations WHERE study_session_id = ? ORDER BY message_sequence DESC LIMIT 10',
        [session.id],
        (err, recentMessages) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          res.json({
            activeSession: session,
            recentMessages: recentMessages.reverse() // Most recent last
          });
        }
      );
    }
  );
});

// Simple AI teaching response (placeholder for actual AI integration)
router.post('/get-ai-response', authMiddleware, (req, res) => {
  const { sessionId, studentMessage, objectiveText, conversationHistory } = req.body;

  // This is a placeholder - in production you'd call OpenAI, Claude, etc.
  const responses = [
    "That's a great question! Let me explain that concept in a different way...",
    "I can see you're thinking about this correctly. Let's build on that understanding...",
    "Let me give you an example that might help clarify this...",
    "You're on the right track! Can you tell me what you think the next step would be?",
    "That's exactly right! Now let's see how we can apply this to a more complex scenario...",
    "I notice you might be unsure about this part. Let's break it down step by step..."
  ];

  const randomResponse = responses[Math.floor(Math.random() * responses.length)];

  // In production, you'd analyze the student message and context to generate appropriate response
  res.json({
    aiResponse: randomResponse,
    teachingTechnique: 'explanation',
    comprehensionLevel: Math.random() * 0.3 + 0.6, // Random between 0.6-0.9
    suggestedFollowUp: 'Would you like to try a practice problem to test your understanding?'
  });
});

module.exports = router;