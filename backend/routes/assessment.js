const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getOrCreateQuizBank, recordQuizBankCompletion } = require('../quiz-bank-manager');
const { db } = require('../config/database');

const router = express.Router();

// Generate questions for an objective (Assessment Agent)
router.post('/generate-questions', authMiddleware, (req, res) => {
  const { objectiveId, difficulty, questionCount = 5 } = req.body;

  if (req.user.userType !== 'student') {
    return res.status(403).json({ error: 'Only students can request question generation' });
  }

  // Always generate fresh questions for better learning experience
  console.log(`Generating fresh questions for objective ${objectiveId} at difficulty ${difficulty}`);
  
  generateQuestionsForObjective(objectiveId, difficulty, questionCount, (err, newQuestions) => {
    if (err) {
      console.error('Question generation failed:', err);
      return res.status(500).json({ error: 'Failed to generate questions' });
    }

    console.log(`Successfully generated ${newQuestions.length} fresh questions`);
    
    res.json({
      questions: newQuestions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        options: {
          A: q.option_a,
          B: q.option_b,
          C: q.option_c,
          D: q.option_d
        },
        difficulty_level: q.difficulty_level,
        cognitive_level: q.cognitive_level
      })),
      source: 'fresh_ai_generated',
      newQuestionsGenerated: newQuestions.length
    });
  });
});

// AI-powered question generation using OpenAI
async function generateQuestionsForObjective(objectiveId, difficulty, count, callback) {
  try {
    // Get the objective text to understand what we're testing
    db.get(
      'SELECT objective_text FROM learning_objectives WHERE id = ?',
      [objectiveId],
      async (err, objective) => {
        if (err) {
          return callback(err);
        }

        try {
          const aiQuestions = await generateAIQuestions(objective.objective_text, difficulty, count);
          const insertPromises = aiQuestions.map(question => {
            return new Promise((resolve, reject) => {
              db.run(
                `INSERT INTO generated_questions 
                 (objective_id, question_text, difficulty_level, option_a, option_b, option_c, option_d, correct_option, explanation, cognitive_level, concept_focus)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  objectiveId,
                  question.question_text,
                  question.difficulty_level,
                  question.option_a,
                  question.option_b,
                  question.option_c,
                  question.option_d,
                  question.correct_option,
                  question.explanation,
                  question.cognitive_level,
                  question.concept_focus
                ],
                function(err) {
                  if (err) reject(err);
                  else resolve({ id: this.lastID, ...question });
                }
              );
            });
          });

          const questions = await Promise.all(insertPromises);
          callback(null, questions);
        } catch (aiError) {
          console.error('AI question generation failed, falling back to templates:', aiError);
          // Fallback to template questions if AI fails
          const templateQuestions = generateTemplateQuestions(objective.objective_text, difficulty, count);
          const insertPromises = templateQuestions.map(question => {
            return new Promise((resolve, reject) => {
              db.run(
                `INSERT INTO generated_questions 
                 (objective_id, question_text, difficulty_level, option_a, option_b, option_c, option_d, correct_option, explanation, cognitive_level, concept_focus)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  objectiveId,
                  question.question_text,
                  question.difficulty_level,
                  question.option_a,
                  question.option_b,
                  question.option_c,
                  question.option_d,
                  question.correct_option,
                  question.explanation,
                  question.cognitive_level,
                  question.concept_focus
                ],
                function(err) {
                  if (err) reject(err);
                  else resolve({ id: this.lastID, ...question });
                }
              );
            });
          });

          const questions = await Promise.all(insertPromises);
          callback(null, questions);
        }
      }
    );
  } catch (error) {
    callback(error);
  }
}

// AI Question Generation Function
async function generateAIQuestions(objectiveText, difficulty, count) {
  // This is where you would integrate with OpenAI API
  // For now, I'll create a mock AI function that you can replace with actual API calls
  
  const difficultyLevel = difficulty < 0.4 ? 'beginner' : difficulty < 0.7 ? 'intermediate' : 'advanced';
  
  const prompt = `Create ${count} multiple-choice questions about "${objectiveText}" at ${difficultyLevel} level.

For each question, provide:
1. A clear, specific question
2. One correct answer
3. Three plausible but incorrect distractors
4. A brief explanation of why the correct answer is right

Format each question as JSON:
{
  "question": "Your question here",
  "correct_answer": "The correct answer",
  "distractors": ["Wrong answer 1", "Wrong answer 2", "Wrong answer 3"],
  "explanation": "Why the correct answer is right"
}

Make sure questions test understanding, not just memorization. Distractors should be believable but clearly wrong to someone who understands the concept.`;

  // Mock AI response for now - replace this with actual OpenAI API call
  const mockAIResponse = await mockAIGeneration(objectiveText, difficulty, count);
  
  // Process AI response and shuffle answers
  const questions = mockAIResponse.map(aiQuestion => {
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
}

// Import AI integration functions
const { generateQuestionsWithOpenAI, generateEnhancedMockQuestions } = require('../ai-integration');

// AI function - uses real OpenAI integration with fallback
async function mockAIGeneration(objectiveText, difficulty, count) {
  try {
    // Try OpenAI first
    return await generateQuestionsWithOpenAI(objectiveText, difficulty, count);
  } catch (error) {
    console.log('OpenAI failed, using enhanced mock questions:', error.message);
    // Fallback to enhanced mock questions
    return generateEnhancedMockQuestions(objectiveText, difficulty, count);
  }
}

// Subject-specific AI question generators
function generateBiologyAIQuestions(objectiveText, count) {
  const templates = [
    {
      question: "What is the primary function of the cell membrane?",
      correct_answer: "To control what enters and exits the cell",
      distractors: [
        "To produce energy for the cell",
        "To store the cell's genetic material",
        "To manufacture proteins"
      ],
      explanation: "The cell membrane acts as a selective barrier, controlling the passage of substances in and out of the cell."
    },
    {
      question: "Which process allows plants to convert sunlight into chemical energy?",
      correct_answer: "Photosynthesis",
      distractors: [
        "Cellular respiration",
        "Fermentation",
        "Glycolysis"
      ],
      explanation: "Photosynthesis is the process by which plants use chlorophyll to capture sunlight and convert it into glucose and oxygen."
    },
    {
      question: "What type of organism is characterized by having no nucleus?",
      correct_answer: "Prokaryote",
      distractors: [
        "Eukaryote",
        "Virus",
        "Fungus"
      ],
      explanation: "Prokaryotes, such as bacteria, lack a membrane-bound nucleus and have their genetic material freely floating in the cytoplasm."
    },
    {
      question: "Which organelle is known as the 'powerhouse of the cell'?",
      correct_answer: "Mitochondria",
      distractors: [
        "Nucleus",
        "Ribosome",
        "Golgi apparatus"
      ],
      explanation: "Mitochondria generate most of the cell's ATP (energy) through cellular respiration, earning them the nickname 'powerhouse of the cell'."
    },
    {
      question: "What is the basic unit of heredity?",
      correct_answer: "Gene",
      distractors: [
        "Chromosome",
        "DNA molecule",
        "Protein"
      ],
      explanation: "A gene is a specific sequence of DNA that codes for a particular trait and is passed from parents to offspring."
    }
  ];
  
  return templates.slice(0, count);
}

function generateMathAIQuestions(objectiveText, count) {
  const templates = [
    {
      question: "Solve for x: 3x + 7 = 22",
      correct_answer: "x = 5",
      distractors: [
        "x = 3",
        "x = 7",
        "x = 15"
      ],
      explanation: "Subtract 7 from both sides: 3x = 15, then divide by 3: x = 5"
    },
    {
      question: "What is the slope of the line passing through points (2, 4) and (6, 12)?",
      correct_answer: "2",
      distractors: [
        "3",
        "4",
        "1/2"
      ],
      explanation: "Using the slope formula: (12-4)/(6-2) = 8/4 = 2"
    },
    {
      question: "Simplify: 4x + 3x - 2x",
      correct_answer: "5x",
      distractors: [
        "9x",
        "3x",
        "x"
      ],
      explanation: "Combine like terms: (4 + 3 - 2)x = 5x"
    },
    {
      question: "If y = 2x + 3, what is the y-intercept?",
      correct_answer: "3",
      distractors: [
        "2",
        "-3",
        "0"
      ],
      explanation: "In the form y = mx + b, the y-intercept is b, which is 3"
    }
  ];
  
  return templates.slice(0, count);
}

function generateChemistryAIQuestions(objectiveText, count) {
  const templates = [
    {
      question: "What is the chemical symbol for Gold?",
      correct_answer: "Au",
      distractors: [
        "Go",
        "Gd",
        "Ag"
      ],
      explanation: "Gold's symbol Au comes from its Latin name 'aurum'"
    },
    {
      question: "How many electrons does a neutral carbon atom have?",
      correct_answer: "6",
      distractors: [
        "4",
        "12",
        "8"
      ],
      explanation: "Carbon has atomic number 6, meaning it has 6 protons and 6 electrons in its neutral state"
    }
  ];
  
  return templates.slice(0, count);
}

function generateGenericAIQuestions(objectiveText, count) {
  const templates = [
    {
      question: `Which concept best relates to "${objectiveText}"?`,
      correct_answer: "The primary concept being taught",
      distractors: [
        "A related but different concept",
        "A common misconception",
        "An unrelated topic"
      ],
      explanation: `This directly addresses the learning objective: ${objectiveText}`
    }
  ];
  
  return templates.slice(0, count);
}

// Enhanced question generator with subject-specific templates
function generateTemplateQuestions(objectiveText, difficulty, count) {
  const questions = [];
  const cognitiveLevel = difficulty < 0.4 ? 'remember' : difficulty < 0.7 ? 'understand' : 'apply';
  
  // Detect subject area and question type
  const subjectTemplates = getSubjectTemplates(objectiveText);
  
  for (let i = 0; i < count; i++) {
    const template = subjectTemplates[i % subjectTemplates.length];
    const question = generateQuestionFromTemplate(template, objectiveText, difficulty, cognitiveLevel);
    questions.push(question);
  }

  return questions;
}

// Get subject-specific question templates
function getSubjectTemplates(objectiveText) {
  const text = objectiveText.toLowerCase();
  
  if (text.includes('algebra') || text.includes('equation') || text.includes('variable')) {
    return getMathTemplates();
  } else if (text.includes('biology') || text.includes('cell') || text.includes('organism') || text.includes('dna')) {
    return getBiologyTemplates();
  } else if (text.includes('history') || text.includes('war') || text.includes('century')) {
    return getHistoryTemplates();
  } else if (text.includes('chemistry') || text.includes('element') || text.includes('compound')) {
    return getChemistryTemplates();
  } else {
    return getGenericTemplates();
  }
}

// Math question templates
function getMathTemplates() {
  return [
    {
      type: 'solve_equation',
      question: 'Solve for x: {equation}',
      equations: ['2x + 5 = 13', '3x - 7 = 14', '4x + 8 = 20', '5x - 3 = 17'],
      solutions: ['x = 4', 'x = 7', 'x = 3', 'x = 4'],
      distractors: [
        ['x = 2', 'x = 6', 'x = 8'],
        ['x = 3', 'x = 5', 'x = 9'],
        ['x = 1', 'x = 5', 'x = 7'],
        ['x = 2', 'x = 6', 'x = 8']
      ]
    },
    {
      type: 'simplify_expression',
      question: 'Simplify the expression: {expression}',
      expressions: ['3x + 2x', '5y - 2y + y', '4a + 3b - 2a', '2(x + 3)'],
      solutions: ['5x', '4y', '2a + 3b', '2x + 6'],
      distractors: [
        ['6x', '3x + 2', '5x²'],
        ['3y', '8y', '5y - 2'],
        ['5ab', '4a + 3b', '2a + b'],
        ['2x + 3', '5x', 'x + 6']
      ]
    },
    {
      type: 'word_problem',
      question: 'If Sarah has {num1} apples and buys {num2} more, how many apples does she have in total?',
      scenarios: [
        { num1: 5, num2: 3, answer: 8, distractors: [5, 11, 2] },
        { num1: 7, num2: 4, answer: 11, distractors: [3, 28, 7] },
        { num1: 12, num2: 8, answer: 20, distractors: [4, 96, 12] }
      ]
    }
  ];
}

// Biology question templates
function getBiologyTemplates() {
  return [
    {
      type: 'cell_structure',
      question: 'Which organelle is responsible for {function}?',
      functions: [
        { func: 'producing energy (ATP)', answer: 'Mitochondria', distractors: ['Nucleus', 'Ribosome', 'Endoplasmic Reticulum'] },
        { func: 'protein synthesis', answer: 'Ribosome', distractors: ['Mitochondria', 'Golgi Apparatus', 'Lysosome'] },
        { func: 'controlling cell activities', answer: 'Nucleus', distractors: ['Mitochondria', 'Chloroplast', 'Vacuole'] }
      ]
    },
    {
      type: 'classification',
      question: 'Which of the following is a characteristic of {group}?',
      groups: [
        { group: 'mammals', answer: 'They are warm-blooded', distractors: ['They lay eggs', 'They have scales', 'They breathe through gills'] },
        { group: 'plants', answer: 'They perform photosynthesis', distractors: ['They move freely', 'They eat other organisms', 'They have nervous systems'] },
        { group: 'bacteria', answer: 'They are prokaryotic', distractors: ['They have a nucleus', 'They are multicellular', 'They reproduce sexually'] }
      ]
    },
    {
      type: 'process',
      question: 'During {process}, what happens?',
      processes: [
        { process: 'photosynthesis', answer: 'Light energy is converted to chemical energy', distractors: ['Oxygen is consumed', 'Carbon dioxide is released', 'Water is broken down completely'] },
        { process: 'cellular respiration', answer: 'Glucose is broken down to release energy', distractors: ['Glucose is created', 'Oxygen is produced', 'Carbon dioxide is absorbed'] }
      ]
    }
  ];
}

// Generic templates for other subjects
function getGenericTemplates() {
  return [
    {
      type: 'definition',
      question: 'What is the definition of {concept}?',
      generateOptions: (concept) => ({
        correct: `The accurate definition of ${concept}`,
        distractors: [
          `A partial definition of ${concept}`,
          `A common misconception about ${concept}`,
          `An unrelated concept to ${concept}`
        ]
      })
    },
    {
      type: 'application',
      question: 'Which example best demonstrates {concept}?',
      generateOptions: (concept) => ({
        correct: `A clear example of ${concept}`,
        distractors: [
          `An example that seems related but isn't ${concept}`,
          `A common confusion with ${concept}`,
          `An opposite example to ${concept}`
        ]
      })
    }
  ];
}

// History templates
function getHistoryTemplates() {
  return [
    {
      type: 'chronology',
      question: 'In which century did {event} occur?',
      events: [
        { event: 'the American Revolution', answer: '18th century', distractors: ['17th century', '19th century', '16th century'] },
        { event: 'World War I', answer: '20th century', distractors: ['19th century', '21st century', '18th century'] }
      ]
    },
    {
      type: 'cause_effect',
      question: 'What was a major cause of {event}?',
      events: [
        { event: 'the American Revolution', answer: 'Taxation without representation', distractors: ['Religious persecution', 'Territorial expansion', 'Trade disputes with France'] }
      ]
    }
  ];
}

// Chemistry templates
function getChemistryTemplates() {
  return [
    {
      type: 'periodic_table',
      question: 'What is the chemical symbol for {element}?',
      elements: [
        { element: 'Hydrogen', answer: 'H', distractors: ['He', 'Hy', 'Hg'] },
        { element: 'Oxygen', answer: 'O', distractors: ['Ox', 'O2', 'Om'] },
        { element: 'Carbon', answer: 'C', distractors: ['Ca', 'Cb', 'Ch'] }
      ]
    },
    {
      type: 'chemical_reaction',
      question: 'In the reaction {reaction}, what type of reaction is this?',
      reactions: [
        { reaction: '2H2 + O2 → 2H2O', answer: 'Synthesis reaction', distractors: ['Decomposition reaction', 'Single replacement', 'Double replacement'] }
      ]
    }
  ];
}

// Generate a specific question from a template
function generateQuestionFromTemplate(template, objectiveText, difficulty, cognitiveLevel) {
  let question_text, correct_answer, distractors, explanation;

  if (template.type === 'solve_equation') {
    const index = Math.floor(Math.random() * template.equations.length);
    question_text = template.question.replace('{equation}', template.equations[index]);
    correct_answer = template.solutions[index];
    distractors = template.distractors[index];
    explanation = `To solve this equation, isolate x by performing inverse operations on both sides.`;
  } 
  else if (template.type === 'word_problem') {
    const scenario = template.scenarios[Math.floor(Math.random() * template.scenarios.length)];
    question_text = template.question.replace('{num1}', scenario.num1).replace('{num2}', scenario.num2);
    correct_answer = scenario.answer.toString();
    distractors = scenario.distractors.map(d => d.toString());
    explanation = `Add the initial amount (${scenario.num1}) to the additional amount (${scenario.num2}) to get the total.`;
  }
  else if (template.type === 'cell_structure') {
    const func = template.functions[Math.floor(Math.random() * template.functions.length)];
    question_text = template.question.replace('{function}', func.func);
    correct_answer = func.answer;
    distractors = func.distractors;
    explanation = `${func.answer} is specifically responsible for ${func.func} in the cell.`;
  }
  else if (template.type === 'classification') {
    const group = template.groups[Math.floor(Math.random() * template.groups.length)];
    question_text = template.question.replace('{group}', group.group);
    correct_answer = group.answer;
    distractors = group.distractors;
    explanation = `This is a defining characteristic that distinguishes ${group.group} from other groups.`;
  }
  else if (template.type === 'definition') {
    const concept = extractKeyTerm(objectiveText);
    question_text = template.question.replace('{concept}', concept);
    const options = template.generateOptions(concept);
    correct_answer = options.correct;
    distractors = options.distractors;
    explanation = `This definition captures the essential meaning and key characteristics of ${concept}.`;
  }
  else {
    // Fallback for other templates
    const concept = extractKeyTerm(objectiveText);
    question_text = `Which of the following best relates to: ${objectiveText}?`;
    correct_answer = `The correct application of this concept`;
    distractors = ['A common misconception', 'An unrelated concept', 'A partially correct but incomplete answer'];
    explanation = `This answer directly addresses the learning objective: ${objectiveText}`;
  }

  // Shuffle options
  const allOptions = [correct_answer, ...distractors];
  const shuffled = shuffleArray([...allOptions]);
  const correctIndex = shuffled.indexOf(correct_answer);
  const correctLetter = ['A', 'B', 'C', 'D'][correctIndex];

  return {
    question_text,
    difficulty_level: difficulty,
    option_a: shuffled[0],
    option_b: shuffled[1],
    option_c: shuffled[2],
    option_d: shuffled[3],
    correct_option: correctLetter,
    explanation,
    cognitive_level: cognitiveLevel,
    concept_focus: objectiveText.substring(0, 100)
  };
}

// Helper function to extract key terms from objective text
function extractKeyTerm(objectiveText) {
  const text = objectiveText.toLowerCase();
  const keywords = ['algebra', 'equation', 'variable', 'cell', 'mitochondria', 'photosynthesis', 'revolution', 'element', 'atom'];
  
  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      return keyword;
    }
  }
  
  // Fallback: use first significant word
  const words = objectiveText.split(' ').filter(word => word.length > 3);
  return words[0] || 'concept';
}

// Helper function to shuffle array
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Start a quiz session
router.post('/start-quiz', authMiddleware, (req, res) => {
  const { enrollmentId, objectiveId, difficulty = 0.5, questionCount = 5 } = req.body;
  const studentId = req.user.userId;

  if (req.user.userType !== 'student') {
    return res.status(403).json({ error: 'Only students can start quizzes' });
  }

  // Verify enrollment
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

      // Get current mastery to determine difficulty
      db.get(
        'SELECT mastery_score FROM objective_progress WHERE enrollment_id = ? AND objective_id = ?',
        [enrollmentId, objectiveId],
        (err, progress) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          const currentMastery = progress ? progress.mastery_score : 0;
          const adaptiveDifficulty = Math.max(0.1, Math.min(0.9, currentMastery + 0.2)); // Slightly above current mastery

          // Get or create quiz bank for this student/objective/difficulty
          getOrCreateQuizBank(studentId, enrollmentId, objectiveId, adaptiveDifficulty, questionCount)
            .then(quizBank => {
              console.log(`Using quiz bank: ${quizBank.source}, isNew: ${quizBank.isNew}`);
              
              // Create quiz session with quiz bank reference
              db.run(
                'INSERT INTO quiz_sessions (enrollment_id, objective_id, difficulty_level, questions_count, previous_mastery, quiz_bank_id) VALUES (?, ?, ?, ?, ?, ?)',
                [enrollmentId, objectiveId, adaptiveDifficulty, questionCount, currentMastery, quizBank.quizBankId],
                function(err) {
                  if (err) {
                    return res.status(500).json({ error: 'Failed to create quiz session' });
                  }

                  const quizSessionId = this.lastID;

                  res.json({
                    quizSessionId,
                    questions: quizBank.questions.map((q, index) => ({
                      id: q.id,
                      questionNumber: index + 1,
                      question_text: q.question_text,
                      options: q.options,
                      difficulty_level: q.difficulty_level
                    })),
                    timeLimit: questionCount * 2, // 2 minutes per question
                    difficulty: adaptiveDifficulty,
                    source: quizBank.source, // 'banked' or 'newly_generated'
                    isNewQuizBank: quizBank.isNew
                  });
                }
              );
            })
            .catch(err => {
              console.error('Failed to get/create quiz bank:', err);
              return res.status(500).json({ error: 'Failed to prepare quiz questions' });
            });
        }
      );
    }
  );
});

// Submit quiz answer
router.post('/submit-answer', authMiddleware, (req, res) => {
  const { quizSessionId, questionId, answer, timeTaken, confidenceLevel } = req.body;
  const studentId = req.user.userId;

  // Verify quiz session ownership
  db.get(
    `SELECT qs.*, se.student_id 
     FROM quiz_sessions qs
     JOIN student_enrollments se ON qs.enrollment_id = se.id
     WHERE qs.id = ? AND se.student_id = ?`,
    [quizSessionId, studentId],
    (err, session) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!session) {
        return res.status(404).json({ error: 'Quiz session not found' });
      }

      // Get question details
      db.get(
        'SELECT * FROM generated_questions WHERE id = ?',
        [questionId],
        (err, question) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          const isCorrect = answer.toUpperCase() === question.correct_option.toUpperCase();

          // Record the response
          db.run(
            'INSERT INTO quiz_responses (quiz_session_id, question_id, student_answer, is_correct, time_taken_seconds, confidence_level, question_difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [quizSessionId, questionId, answer.toUpperCase(), isCorrect, timeTaken, confidenceLevel, question.difficulty_level],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Failed to record answer' });
              }

              res.json({
                responseId: this.lastID,
                isCorrect,
                correctAnswer: question.correct_option,
                explanation: question.explanation,
                message: 'Answer recorded successfully'
              });
            }
          );
        }
      );
    }
  );
});

// Complete quiz and calculate results
router.post('/complete-quiz', authMiddleware, (req, res) => {
  const { quizSessionId } = req.body;
  const studentId = req.user.userId;

  // Verify ownership and get quiz session
  db.get(
    `SELECT qs.*, se.student_id 
     FROM quiz_sessions qs
     JOIN student_enrollments se ON qs.enrollment_id = se.id
     WHERE qs.id = ? AND se.student_id = ?`,
    [quizSessionId, studentId],
    (err, session) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!session) {
        return res.status(404).json({ error: 'Quiz session not found' });
      }

      // Get all responses for this quiz
      db.all(
        'SELECT * FROM quiz_responses WHERE quiz_session_id = ?',
        [quizSessionId],
        (err, responses) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          // Calculate results
          const totalQuestions = responses.length;
          const correctAnswers = responses.filter(r => r.is_correct).length;
          const scorePercentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

          // Calculate new mastery score
          const masteryChange = calculateMasteryChange(session.previous_mastery, scorePercentage / 100, responses);
          const newMastery = Math.max(0, Math.min(1, session.previous_mastery + masteryChange));

          // Update quiz session
          db.run(
            'UPDATE quiz_sessions SET completed_at = CURRENT_TIMESTAMP, score_percentage = ?, mastery_change = ?, new_mastery = ? WHERE id = ?',
            [scorePercentage, masteryChange, newMastery, quizSessionId],
            (err) => {
              if (err) {
                return res.status(500).json({ error: 'Failed to update quiz session' });
              }

              // Update objective progress
              db.run(
                'UPDATE objective_progress SET mastery_score = ?, last_quiz_taken = CURRENT_TIMESTAMP, quiz_attempts_count = quiz_attempts_count + 1 WHERE enrollment_id = ? AND objective_id = ?',
                [newMastery, session.enrollment_id, session.objective_id],
                (err) => {
                  if (err) {
                    return res.status(500).json({ error: 'Failed to update progress' });
                  }

                  // Log learning event
                  db.run(
                    'INSERT INTO learning_events (enrollment_id, event_type, objectives_involved, performance_metrics) VALUES (?, ?, ?, ?)',
                    [
                      session.enrollment_id,
                      'quiz_completed',
                      JSON.stringify([session.objective_id]),
                      JSON.stringify({
                        score_percentage: scorePercentage,
                        mastery_change: masteryChange,
                        new_mastery: newMastery,
                        questions_count: totalQuestions,
                        correct_answers: correctAnswers,
                        quiz_bank_id: session.quiz_bank_id
                      })
                    ]
                  );

                  // Record quiz bank completion if quiz bank was used
                  if (session.quiz_bank_id) {
                    recordQuizBankCompletion(studentId, session.quiz_bank_id, scorePercentage, masteryChange)
                      .then(() => {
                        console.log(`Recorded quiz bank ${session.quiz_bank_id} completion for student ${studentId}`);
                      })
                      .catch(err => {
                        console.error('Failed to record quiz bank completion:', err);
                      });
                  }

                  res.json({
                    quizResults: {
                      scorePercentage,
                      correctAnswers,
                      totalQuestions,
                      masteryChange,
                      newMastery: Math.round(newMastery * 100),
                      previousMastery: Math.round(session.previous_mastery * 100),
                      improvementMessage: getImprovementMessage(masteryChange, scorePercentage)
                    }
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

// Helper function to calculate mastery change based on quiz performance
function calculateMasteryChange(currentMastery, quizScore, responses) {
  const baseChange = (quizScore - currentMastery) * 0.3; // 30% weight to quiz performance
  
  // Consider response confidence and time taken
  const avgConfidence = responses.reduce((sum, r) => sum + (r.confidence_level || 3), 0) / responses.length;
  const confidenceBonus = (avgConfidence - 3) * 0.05; // Bonus/penalty for confidence
  
  // Consider question difficulty
  const avgDifficulty = responses.reduce((sum, r) => sum + r.question_difficulty, 0) / responses.length;
  const difficultyBonus = avgDifficulty * 0.1; // Bonus for harder questions
  
  return Math.max(-0.3, Math.min(0.3, baseChange + confidenceBonus + difficultyBonus));
}

// Helper function to generate improvement message
function getImprovementMessage(masteryChange, scorePercentage) {
  if (masteryChange > 0.1) {
    return "Excellent progress! Your understanding has improved significantly.";
  } else if (masteryChange > 0.05) {
    return "Good work! You're making steady progress.";
  } else if (masteryChange > 0) {
    return "Nice job! Small improvements add up over time.";
  } else if (masteryChange > -0.05) {
    return "Keep practicing! Every attempt helps you learn.";
  } else {
    return "Don't worry! This topic needs more study time. Try reviewing the material again.";
  }
}

// Helper function to generate questions for a specific quiz
function generateQuestionsForQuiz(objectiveId, difficulty, count, callback) {
  // Try to get a mix of existing and new questions
  db.all(
    'SELECT * FROM generated_questions WHERE objective_id = ? AND difficulty_level BETWEEN ? AND ? AND is_active = 1 ORDER BY times_used ASC LIMIT ?',
    [objectiveId, difficulty - 0.15, difficulty + 0.15, count],
    (err, questions) => {
      if (err) {
        return callback(err);
      }

      if (questions.length >= count) {
        // Update usage count
        const questionIds = questions.slice(0, count).map(q => q.id);
        db.run(
          `UPDATE generated_questions SET times_used = times_used + 1, last_used = CURRENT_TIMESTAMP WHERE id IN (${questionIds.map(() => '?').join(',')})`,
          questionIds
        );
        return callback(null, questions.slice(0, count));
      }

      // Need to generate more questions
      const needed = count - questions.length;
      generateQuestionsForObjective(objectiveId, difficulty, needed, (err, newQuestions) => {
        if (err) return callback(err);
        callback(null, [...questions, ...newQuestions]);
      });
    }
  );
}

module.exports = router;