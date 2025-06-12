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

              // Get the learning objective text for proactive teaching
              db.get(
                'SELECT objective_text FROM learning_objectives WHERE id = ?',
                [objectiveId],
                async (err, objective) => {
                  if (err) {
                    console.error('Error fetching objective:', err);
                    return res.json({ 
                      sessionId,
                      message: 'Study session started',
                      enrollmentId,
                      objectiveId
                    });
                  }

                  // Generate proactive AI teaching message to start the session
                  try {
                    const { generateTeachingResponse } = require('../ai-integration');
                    
                    const teachingContext = {
                      studentMessage: '',  // Empty message indicates session start
                      objectiveText: objective.objective_text,
                      conversationHistory: [],
                      studentProgress: {},
                      sessionId
                    };

                    const initialTeaching = await generateTeachingResponse(teachingContext);

                    // Add the AI's proactive message to the conversation
                    db.run(
                      'INSERT INTO teaching_conversations (study_session_id, message_sequence, speaker, message_content, teaching_technique) VALUES (?, ?, ?, ?, ?)',
                      [sessionId, 1, 'ai', initialTeaching.message, initialTeaching.technique],
                      (err) => {
                        if (err) {
                          console.error('Error saving initial AI message:', err);
                        }
                      }
                    );

                    res.json({ 
                      sessionId,
                      message: 'Study session started',
                      enrollmentId,
                      objectiveId,
                      objectiveText: objective.objective_text,
                      initialAIMessage: {
                        message: initialTeaching.message,
                        technique: initialTeaching.technique,
                        isProactive: true
                      }
                    });

                  } catch (error) {
                    console.error('Error generating initial teaching response:', error);
                    
                    // Fallback to simple welcome message
                    const fallbackMessage = `Welcome! I'm excited to help you learn about "${objective.objective_text}". What would you like to know first?`;
                    
                    // Add fallback message to conversation
                    db.run(
                      'INSERT INTO teaching_conversations (study_session_id, message_sequence, speaker, message_content, teaching_technique) VALUES (?, ?, ?, ?, ?)',
                      [sessionId, 1, 'ai', fallbackMessage, 'proactive_welcome']
                    );

                    res.json({ 
                      sessionId,
                      message: 'Study session started',
                      enrollmentId,
                      objectiveId,
                      objectiveText: objective.objective_text,
                      initialAIMessage: {
                        message: fallbackMessage,
                        technique: 'proactive_welcome',
                        isProactive: true,
                        fallbackUsed: true
                      }
                    });
                  }
                }
              );
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

// AI teaching response using OpenAI and advanced pedagogical strategies
router.post('/get-ai-response', authMiddleware, async (req, res) => {
  const { sessionId, studentMessage, objectiveText, conversationHistory } = req.body;
  const studentId = req.user.userId;

  try {
    // Import the AI teaching function
    const { generateTeachingResponse } = require('../ai-integration');

    // Verify session ownership
    const sessionCheck = await new Promise((resolve, reject) => {
      db.get(
        `SELECT ss.id, ss.enrollment_id, se.student_id 
         FROM study_sessions ss
         JOIN student_enrollments se ON ss.enrollment_id = se.id
         WHERE ss.id = ? AND se.student_id = ?`,
        [sessionId, studentId],
        (err, session) => {
          if (err) reject(err);
          else resolve(session);
        }
      );
    });

    if (!sessionCheck) {
      return res.status(404).json({ error: 'Study session not found or access denied' });
    }

    // Get student's progress data for context
    const studentProgress = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM objective_progress WHERE enrollment_id = ?',
        [sessionCheck.enrollment_id],
        (err, progress) => {
          if (err) reject(err);
          else resolve(progress || {});
        }
      );
    });

    // Prepare context for AI teaching
    const teachingContext = {
      studentMessage: studentMessage || "Hello, I'm ready to learn!",
      objectiveText,
      conversationHistory: conversationHistory || [],
      studentProgress,
      sessionId
    };

    console.log('Generating AI teaching response for objective:', objectiveText);
    console.log('Student message:', studentMessage);

    // Generate AI teaching response
    const teachingResponse = await generateTeachingResponse(teachingContext);

    // Log the AI interaction for analysis
    console.log('AI Teaching Response:', {
      technique: teachingResponse.technique,
      comprehension: teachingResponse.comprehensionAssessment,
      confidence: teachingResponse.confidence
    });

    res.json({
      aiResponse: teachingResponse.message,
      teachingTechnique: teachingResponse.technique,
      comprehensionLevel: teachingResponse.comprehensionAssessment,
      suggestedFollowUp: teachingResponse.nextQuestion,
      confidence: teachingResponse.confidence,
      isAIGenerated: true
    });

  } catch (error) {
    console.error('AI teaching response error:', error);
    
    // Enhanced fallback response based on context
    let fallbackResponse;
    const isFirstMessage = !studentMessage || studentMessage.trim() === '';
    
    if (isFirstMessage) {
      fallbackResponse = `Welcome! Let's explore "${objectiveText}" together. To get started, what do you already know about this topic? Don't worry if it's not much - we'll build from wherever you are!`;
    } else if (studentMessage && studentMessage.toLowerCase().includes('help')) {
      fallbackResponse = `I understand you need help with "${objectiveText}". Let me break this down into smaller, manageable pieces. What specific aspect would you like me to explain first?`;
    } else {
      fallbackResponse = `That's a thoughtful response! Let's continue exploring "${objectiveText}". What aspect of this concept interests you most, or what would you like to understand better?`;
    }

    res.json({
      aiResponse: fallbackResponse,
      teachingTechnique: 'contextual_fallback',
      comprehensionLevel: 0.7,
      suggestedFollowUp: 'What questions do you have about this concept?',
      confidence: 0.6,
      isAIGenerated: false,
      fallbackUsed: true
    });
  }
});

module.exports = router;