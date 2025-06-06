-- Quiz Banking System Migration
-- This creates tables to store pre-generated quizzes and track student usage

-- Table to store complete quiz sets (a set of 5 questions for a specific objective/difficulty)
CREATE TABLE IF NOT EXISTS quiz_banks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    objective_id INTEGER NOT NULL,
    difficulty_level REAL NOT NULL,
    questions_count INTEGER DEFAULT 5,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    usage_count INTEGER DEFAULT 0,
    last_used DATETIME,
    generation_source TEXT DEFAULT 'ai', -- 'ai', 'template', 'manual'
    FOREIGN KEY (objective_id) REFERENCES learning_objectives(id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_banks_objective_difficulty ON quiz_banks(objective_id, difficulty_level, is_active);

-- Table to link quiz banks to their questions
CREATE TABLE IF NOT EXISTS quiz_bank_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_bank_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    question_order INTEGER NOT NULL, -- 1, 2, 3, 4, 5
    FOREIGN KEY (quiz_bank_id) REFERENCES quiz_banks(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES generated_questions(id) ON DELETE CASCADE,
    UNIQUE(quiz_bank_id, question_order)
);

CREATE INDEX IF NOT EXISTS idx_quiz_bank_questions_bank ON quiz_bank_questions(quiz_bank_id);

-- Table to track which quiz banks a student has already completed
CREATE TABLE IF NOT EXISTS student_quiz_bank_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    quiz_bank_id INTEGER NOT NULL,
    enrollment_id INTEGER NOT NULL,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    score_percentage REAL,
    mastery_change REAL,
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (quiz_bank_id) REFERENCES quiz_banks(id),
    FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id),
    UNIQUE(student_id, quiz_bank_id)
);

CREATE INDEX IF NOT EXISTS idx_student_quiz_usage ON student_quiz_bank_usage(student_id, enrollment_id);

-- Column quiz_bank_id already exists in quiz_sessions table