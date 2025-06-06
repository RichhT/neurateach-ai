-- Enhanced Multi-Agent Adaptive Learning System Database Schema (SQLite)

-- Add user_type to existing users table
ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT 'teacher';

-- Student Enrollments
CREATE TABLE IF NOT EXISTS student_enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    unit_id INTEGER NOT NULL,
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active', -- active, completed, dropped
    completion_percentage REAL DEFAULT 0.0,
    last_accessed DATETIME,
    learning_style_profile TEXT, -- JSON: patterns identified by review agent
    current_agent TEXT, -- which agent is currently active
    session_state TEXT, -- JSON: current learning session context
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    UNIQUE(student_id, unit_id)
);

-- Objective Progress (Dual Score System)
CREATE TABLE IF NOT EXISTS objective_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enrollment_id INTEGER NOT NULL,
    objective_id INTEGER NOT NULL,
    
    -- LEVEL SYSTEM (effort/time-based)
    level_score INTEGER DEFAULT 0, -- XP points from study time
    study_time_minutes INTEGER DEFAULT 0, -- total time spent studying
    study_sessions_count INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1, -- calculated from level_score
    
    -- MASTERY SYSTEM (assessment-based)
    mastery_score REAL DEFAULT 0.0, -- 0.0 to 1.0 from quiz performance
    mastery_confidence REAL DEFAULT 0.0, -- marking agent confidence
    last_quiz_taken DATETIME,
    quiz_attempts_count INTEGER DEFAULT 0,
    
    -- DECAY & SCHEDULING
    last_studied DATETIME,
    next_quiz_suggested DATETIME,
    decay_factor REAL DEFAULT 0.02,
    
    -- STUDY SESSION TRACKING
    current_study_session_start DATETIME,
    minutes_until_quiz_prompt INTEGER DEFAULT 15, -- prompt quiz after X minutes
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE CASCADE,
    FOREIGN KEY (objective_id) REFERENCES learning_objectives(id) ON DELETE CASCADE,
    UNIQUE(enrollment_id, objective_id)
);

-- Study Sessions (Teaching Agent)
CREATE TABLE IF NOT EXISTS study_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enrollment_id INTEGER NOT NULL,
    objective_id INTEGER NOT NULL,
    session_type TEXT DEFAULT 'study', -- study, review
    
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    duration_minutes INTEGER,
    xp_earned INTEGER DEFAULT 0, -- level points earned this session
    
    -- Teaching agent conversation data
    conversation_turns INTEGER DEFAULT 0,
    topics_covered TEXT, -- JSON: what was discussed
    student_questions_count INTEGER DEFAULT 0,
    comprehension_indicators TEXT, -- JSON: signs of understanding/confusion
    
    -- Session outcome
    session_quality_score REAL, -- how productive was this session
    quiz_prompted BOOLEAN DEFAULT FALSE,
    quiz_taken_after BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE CASCADE,
    FOREIGN KEY (objective_id) REFERENCES learning_objectives(id) ON DELETE CASCADE
);

-- Teaching Conversations
CREATE TABLE IF NOT EXISTS teaching_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    study_session_id INTEGER NOT NULL,
    message_sequence INTEGER NOT NULL,
    speaker TEXT NOT NULL, -- agent, student
    message_content TEXT NOT NULL,
    teaching_technique TEXT, -- explanation, example, question, encouragement
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (study_session_id) REFERENCES study_sessions(id) ON DELETE CASCADE
);

-- Quiz Sessions (Assessment Agent)
CREATE TABLE IF NOT EXISTS quiz_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enrollment_id INTEGER NOT NULL,
    objective_id INTEGER NOT NULL,
    
    quiz_type TEXT DEFAULT 'mastery_check', -- mastery_check, review, challenge
    difficulty_level REAL NOT NULL, -- 0.0-1.0
    questions_count INTEGER NOT NULL,
    
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    time_limit_minutes INTEGER,
    
    -- Results
    score_percentage REAL, -- 0-100%
    mastery_change REAL, -- how much mastery score changed (-1 to 1)
    previous_mastery REAL,
    new_mastery REAL,
    
    -- Analysis
    strengths_identified TEXT, -- JSON: what student did well
    weaknesses_identified TEXT, -- JSON: areas needing work
    recommended_study_topics TEXT, -- JSON: what to study next
    
    FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE CASCADE,
    FOREIGN KEY (objective_id) REFERENCES learning_objectives(id) ON DELETE CASCADE
);

-- Generated Questions (Dynamic Question Pool)
CREATE TABLE IF NOT EXISTS generated_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    objective_id INTEGER NOT NULL,
    
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'multiple_choice', -- multiple_choice, true_false
    difficulty_level REAL NOT NULL, -- 0.0-1.0
    
    -- Multiple choice data
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT,
    option_d TEXT,
    correct_option TEXT NOT NULL, -- A, B, C, D
    explanation TEXT,
    
    -- Question metadata
    cognitive_level TEXT, -- remember, understand, apply, analyze
    concept_focus TEXT, -- what specific concept this tests
    distractor_strategy TEXT, -- why wrong answers are tempting
    
    -- Usage tracking
    times_used INTEGER DEFAULT 0,
    average_difficulty REAL, -- actual difficulty based on student performance
    discrimination_index REAL, -- how well it separates strong/weak students
    
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (objective_id) REFERENCES learning_objectives(id) ON DELETE CASCADE
);

-- Quiz Responses (Student Answers)
CREATE TABLE IF NOT EXISTS quiz_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_session_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    
    student_answer TEXT, -- A, B, C, D
    is_correct BOOLEAN NOT NULL,
    time_taken_seconds INTEGER,
    confidence_level INTEGER, -- 1-5 how sure they were
    
    -- For adaptive difficulty
    question_difficulty REAL, -- difficulty when answered
    contributed_to_mastery REAL, -- how much this answer affected mastery
    
    answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES generated_questions(id) ON DELETE CASCADE
);

-- Review Agent Decisions
CREATE TABLE IF NOT EXISTS review_decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enrollment_id INTEGER NOT NULL,
    decision_type TEXT NOT NULL, -- schedule_review, suggest_teaching, trigger_assessment
    target_objectives TEXT, -- JSON: array of objective IDs
    reasoning TEXT NOT NULL, -- why this decision was made
    priority_score REAL DEFAULT 0.5, -- 0-1, urgency of this decision
    decision_data TEXT, -- JSON: specific parameters for the decision
    implemented_at DATETIME,
    effectiveness_score REAL, -- how well did this decision work (filled later)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE CASCADE
);

-- Learning Events (Comprehensive Activity Log)
CREATE TABLE IF NOT EXISTS learning_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enrollment_id INTEGER NOT NULL,
    event_type TEXT, -- study_session_start, study_session_end, quiz_completed, mastery_updated
    objectives_involved TEXT, -- JSON: array of objective IDs
    performance_metrics TEXT, -- JSON: various performance indicators
    agent_observations TEXT, -- JSON: what agents noticed during this event
    mastery_changes TEXT, -- JSON: before/after mastery scores
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE CASCADE
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_unit ON student_enrollments(unit_id);
CREATE INDEX IF NOT EXISTS idx_progress_enrollment ON objective_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_progress_objective ON objective_progress(objective_id);
CREATE INDEX IF NOT EXISTS idx_progress_last_studied ON objective_progress(last_studied);
CREATE INDEX IF NOT EXISTS idx_study_sessions_enrollment ON study_sessions(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_objective ON study_sessions(objective_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON teaching_conversations(study_session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_enrollment ON quiz_sessions(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_objective ON quiz_sessions(objective_id);
CREATE INDEX IF NOT EXISTS idx_questions_objective ON generated_questions(objective_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON generated_questions(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_responses_quiz ON quiz_responses(quiz_session_id);
CREATE INDEX IF NOT EXISTS idx_responses_question ON quiz_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_events_enrollment ON learning_events(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON learning_events(timestamp);