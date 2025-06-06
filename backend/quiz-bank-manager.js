// Quiz Banking System - Efficient quiz management to reduce API costs
const sqlite3 = require('sqlite3').verbose();
const { generateQuestionsWithOpenAI, generateEnhancedMockQuestions } = require('./ai-integration');

const db = new sqlite3.Database('./config/database.sqlite');

/**
 * Get an available quiz bank for a student, or create one if needed
 * @param {number} studentId - The student's user ID
 * @param {number} enrollmentId - The enrollment ID
 * @param {number} objectiveId - The learning objective ID
 * @param {number} difficulty - Difficulty level (0.0 to 1.0)
 * @param {number} questionCount - Number of questions (default 5)
 * @returns {Promise<Object>} Quiz bank with questions
 */
async function getOrCreateQuizBank(studentId, enrollmentId, objectiveId, difficulty, questionCount = 5) {
    try {
        console.log(`Getting quiz bank for student ${studentId}, objective ${objectiveId}, difficulty ${difficulty}`);
        
        // First, check if there's an unused quiz bank available for this objective/difficulty
        const availableBank = await findAvailableQuizBank(studentId, objectiveId, difficulty);
        
        if (availableBank) {
            console.log(`Found existing quiz bank ${availableBank.id}, marking as used for student ${studentId}`);
            
            // Mark this quiz bank as used by this student
            await markQuizBankAsUsed(studentId, enrollmentId, availableBank.id);
            
            // Update usage statistics
            await updateQuizBankUsage(availableBank.id);
            
            // Get the questions for this quiz bank
            const questions = await getQuizBankQuestions(availableBank.id);
            
            return {
                quizBankId: availableBank.id,
                questions: questions,
                source: 'banked',
                isNew: false
            };
        }
        
        // No available quiz bank found, create a new one
        console.log(`No available quiz bank found, creating new one for objective ${objectiveId}`);
        const newBank = await createNewQuizBank(objectiveId, difficulty, questionCount);
        
        // Mark this new quiz bank as used by this student
        await markQuizBankAsUsed(studentId, enrollmentId, newBank.id);
        
        return {
            quizBankId: newBank.id,
            questions: newBank.questions,
            source: 'newly_generated',
            isNew: true
        };
        
    } catch (error) {
        console.error('Error in getOrCreateQuizBank:', error);
        throw error;
    }
}

/**
 * Find an available quiz bank that the student hasn't used yet
 */
function findAvailableQuizBank(studentId, objectiveId, difficulty) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT qb.* 
            FROM quiz_banks qb
            WHERE qb.objective_id = ?
            AND qb.difficulty_level BETWEEN ? AND ?
            AND qb.is_active = 1
            AND qb.id NOT IN (
                SELECT sqbu.quiz_bank_id 
                FROM student_quiz_bank_usage sqbu 
                WHERE sqbu.student_id = ?
            )
            ORDER BY qb.usage_count ASC, qb.created_at ASC
            LIMIT 1
        `;
        
        const difficultyRange = 0.15; // ±0.15 difficulty tolerance
        const minDifficulty = Math.max(0, difficulty - difficultyRange);
        const maxDifficulty = Math.min(1, difficulty + difficultyRange);
        
        db.get(sql, [objectiveId, minDifficulty, maxDifficulty, studentId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row || null);
            }
        });
    });
}

/**
 * Create a new quiz bank with freshly generated questions
 */
async function createNewQuizBank(objectiveId, difficulty, questionCount) {
    try {
        // Get the objective text
        const objective = await getObjectiveText(objectiveId);
        
        // Generate questions using AI or fallback
        const questions = await generateQuestions(objective.objective_text, difficulty, questionCount);
        
        // Create the quiz bank record
        const quizBankId = await createQuizBankRecord(objectiveId, difficulty, questionCount, 'ai');
        
        // Store all questions and link them to the quiz bank
        const questionIds = await storeQuestionsInBank(quizBankId, questions);
        
        // Return the quiz bank with questions formatted for the API
        const formattedQuestions = questions.map((q, index) => ({
            id: questionIds[index],
            question_text: q.question_text,
            options: {
                A: q.option_a,
                B: q.option_b,
                C: q.option_c,
                D: q.option_d
            },
            difficulty_level: q.difficulty_level,
            cognitive_level: q.cognitive_level
        }));
        
        console.log(`Created new quiz bank ${quizBankId} with ${questionIds.length} questions`);
        
        return {
            id: quizBankId,
            questions: formattedQuestions
        };
        
    } catch (error) {
        console.error('Error creating new quiz bank:', error);
        throw error;
    }
}

/**
 * Get objective text by ID
 */
function getObjectiveText(objectiveId) {
    return new Promise((resolve, reject) => {
        db.get('SELECT objective_text FROM learning_objectives WHERE id = ?', [objectiveId], (err, row) => {
            if (err) reject(err);
            else if (!row) reject(new Error('Objective not found'));
            else resolve(row);
        });
    });
}

/**
 * Generate questions using AI with fallback
 */
async function generateQuestions(objectiveText, difficulty, count) {
    try {
        // Try OpenAI first
        const aiQuestions = await generateQuestionsWithOpenAI(objectiveText, difficulty, count);
        
        // Process AI response and shuffle answers
        const questions = aiQuestions.map(aiQuestion => {
            const allOptions = [aiQuestion.correct_answer, ...aiQuestion.distractors];
            const shuffledOptions = shuffleArray([...allOptions]);
            const correctIndex = shuffledOptions.indexOf(aiQuestion.correct_answer);
            const correctLetter = ['A', 'B', 'C', 'D'][correctIndex];

            return {
                question_text: aiQuestion.question,
                difficulty_level: difficulty,
                option_a: shuffledOptions[0],
                option_b: shuffledOptions[1],
                option_c: shuffledOptions[2],
                option_d: shuffledOptions[3],
                correct_option: correctLetter,
                explanation: aiQuestion.explanation,
                cognitive_level: difficulty < 0.4 ? 'remember' : difficulty < 0.7 ? 'understand' : 'apply',
                concept_focus: objectiveText.substring(0, 100)
            };
        });

        return questions;
        
    } catch (error) {
        console.log('AI generation failed, using enhanced mock questions:', error.message);
        // Fallback to enhanced mock questions
        return generateEnhancedMockQuestions(objectiveText, difficulty, count);
    }
}

/**
 * Helper function to shuffle array
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Create quiz bank record in database
 */
function createQuizBankRecord(objectiveId, difficulty, questionCount, source) {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO quiz_banks 
            (objective_id, difficulty_level, questions_count, generation_source)
            VALUES (?, ?, ?, ?)
        `;
        
        db.run(sql, [objectiveId, difficulty, questionCount, source], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });
    });
}

/**
 * Store questions in the database and link them to quiz bank
 */
async function storeQuestionsInBank(quizBankId, questions) {
    const questionIds = [];
    
    for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        
        // Insert question
        const questionId = await new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO generated_questions 
                (objective_id, question_text, difficulty_level, option_a, option_b, option_c, option_d, correct_option, explanation, cognitive_level, concept_focus)
                SELECT qb.objective_id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                FROM quiz_banks qb WHERE qb.id = ?
            `;
            
            db.run(sql, [
                question.question_text,
                question.difficulty_level,
                question.option_a,
                question.option_b,
                question.option_c,
                question.option_d,
                question.correct_option,
                question.explanation,
                question.cognitive_level,
                question.concept_focus,
                quizBankId
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
        
        // Link question to quiz bank
        await new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO quiz_bank_questions 
                (quiz_bank_id, question_id, question_order)
                VALUES (?, ?, ?)
            `;
            
            db.run(sql, [quizBankId, questionId, i + 1], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        questionIds.push(questionId);
    }
    
    return questionIds;
}

/**
 * Mark a quiz bank as used by a student
 */
function markQuizBankAsUsed(studentId, enrollmentId, quizBankId) {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT OR IGNORE INTO student_quiz_bank_usage 
            (student_id, quiz_bank_id, enrollment_id)
            VALUES (?, ?, ?)
        `;
        
        db.run(sql, [studentId, quizBankId, enrollmentId], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

/**
 * Update quiz bank usage statistics
 */
function updateQuizBankUsage(quizBankId) {
    return new Promise((resolve, reject) => {
        const sql = `
            UPDATE quiz_banks 
            SET usage_count = usage_count + 1, last_used = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        db.run(sql, [quizBankId], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

/**
 * Get questions for a quiz bank
 */
function getQuizBankQuestions(quizBankId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT gq.id, gq.question_text, gq.option_a, gq.option_b, gq.option_c, gq.option_d, 
                   gq.difficulty_level, gq.cognitive_level, qbq.question_order
            FROM generated_questions gq
            JOIN quiz_bank_questions qbq ON gq.id = qbq.question_id
            WHERE qbq.quiz_bank_id = ?
            ORDER BY qbq.question_order
        `;
        
        db.all(sql, [quizBankId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                const questions = rows.map(row => ({
                    id: row.id,
                    question_text: row.question_text,
                    options: {
                        A: row.option_a,
                        B: row.option_b,
                        C: row.option_c,
                        D: row.option_d
                    },
                    difficulty_level: row.difficulty_level,
                    cognitive_level: row.cognitive_level
                }));
                resolve(questions);
            }
        });
    });
}

/**
 * Record quiz bank completion results
 */
function recordQuizBankCompletion(studentId, quizBankId, scorePercentage, masteryChange) {
    return new Promise((resolve, reject) => {
        const sql = `
            UPDATE student_quiz_bank_usage 
            SET score_percentage = ?, mastery_change = ?, completed_at = CURRENT_TIMESTAMP
            WHERE student_id = ? AND quiz_bank_id = ?
        `;
        
        db.run(sql, [scorePercentage, masteryChange, studentId, quizBankId], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

/**
 * Get quiz bank statistics for an objective
 */
function getQuizBankStats(objectiveId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT 
                COUNT(*) as total_banks,
                SUM(usage_count) as total_usage,
                AVG(usage_count) as avg_usage,
                MIN(created_at) as oldest_bank,
                MAX(created_at) as newest_bank
            FROM quiz_banks 
            WHERE objective_id = ? AND is_active = 1
        `;
        
        db.get(sql, [objectiveId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

module.exports = {
    getOrCreateQuizBank,
    recordQuizBankCompletion,
    getQuizBankStats
};