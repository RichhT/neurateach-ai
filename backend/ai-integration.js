// AI Integration for Question Generation
// This file contains functions to integrate with OpenAI API for dynamic question generation

// To use OpenAI, install the package: npm install openai
const { OpenAI } = require('openai');

// Configure OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate questions using OpenAI GPT API
 * @param {string} objectiveText - The learning objective to create questions for
 * @param {number} difficulty - Difficulty level (0.0 to 1.0)
 * @param {number} count - Number of questions to generate
 * @returns {Promise<Array>} Array of question objects
 */
async function generateQuestionsWithOpenAI(objectiveText, difficulty, count) {
  // Check if OpenAI is configured
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const difficultyLevel = difficulty < 0.4 ? 'beginner' : difficulty < 0.7 ? 'intermediate' : 'advanced';
  const timestamp = Date.now();
  const randomSeed = Math.floor(Math.random() * 1000000);
  
  const prompt = `You are an expert educational assessment designer. Create ${count} high-quality multiple-choice questions about "${objectiveText}" at ${difficultyLevel} level.

IMPORTANT: Generate completely unique questions each time. Use this generation ID for uniqueness: ${timestamp}-${randomSeed}

Requirements:
1. Each question should test understanding, not just memorization
2. Provide exactly 4 options (one correct, three plausible distractors)
3. Distractors should be believable but clearly wrong to someone who understands the concept
4. Include a brief explanation for the correct answer
5. Questions should be appropriate for the difficulty level
6. MUST be unique - avoid repeating questions from previous generations

Format your response as a JSON array:
[
  {
    "question": "Your question here",
    "correct_answer": "The correct answer",
    "distractors": ["Wrong answer 1", "Wrong answer 2", "Wrong answer 3"],
    "explanation": "Brief explanation of why the correct answer is right"
  }
]

Learning Objective: "${objectiveText}"
Difficulty: ${difficultyLevel}
Number of questions: ${count}
Generation ID: ${timestamp}-${randomSeed}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert educational assessment designer. You create high-quality, pedagogically sound multiple-choice questions. Always respond with valid JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const responseText = completion.choices[0].message.content;
    console.log('OpenAI Response:', responseText);
    
    // Clean the response to ensure it's valid JSON
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
    }
    
    const questions = JSON.parse(cleanedResponse);
    
    return questions;
    
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

/**
 * Generate questions using Claude API (Anthropic)
 * @param {string} objectiveText - The learning objective
 * @param {number} difficulty - Difficulty level (0.0 to 1.0)
 * @param {number} count - Number of questions
 */
async function generateQuestionsWithClaude(objectiveText, difficulty, count) {
  // To use Claude, install: npm install @anthropic-ai/sdk
  // const Anthropic = require('@anthropic-ai/sdk');
  
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured');
  }

  const difficultyLevel = difficulty < 0.4 ? 'beginner' : difficulty < 0.7 ? 'intermediate' : 'advanced';
  
  /*
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const prompt = `Create ${count} multiple-choice questions about "${objectiveText}" at ${difficultyLevel} level...`;

  const message = await anthropic.messages.create({
    model: "claude-3-sonnet-20240229",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const questions = JSON.parse(message.content[0].text);
  return questions;
  */
  
  throw new Error('Claude integration not yet configured');
}

/**
 * Main function to generate AI questions with fallback
 * @param {string} objectiveText 
 * @param {number} difficulty 
 * @param {number} count 
 * @returns {Promise<Array>}
 */
async function generateAIQuestions(objectiveText, difficulty, count) {
  // Try OpenAI first, then Claude, then fallback to mock
  const providers = [
    { name: 'OpenAI', func: generateQuestionsWithOpenAI },
    { name: 'Claude', func: generateQuestionsWithClaude }
  ];

  for (const provider of providers) {
    try {
      console.log(`Attempting question generation with ${provider.name}...`);
      const questions = await provider.func(objectiveText, difficulty, count);
      console.log(`Successfully generated ${questions.length} questions with ${provider.name}`);
      return questions;
    } catch (error) {
      console.log(`${provider.name} failed: ${error.message}`);
      continue;
    }
  }

  // If all AI providers fail, use enhanced mock
  console.log('All AI providers failed, using enhanced mock generation');
  return generateEnhancedMockQuestions(objectiveText, difficulty, count);
}

/**
 * Enhanced mock question generation
 * This provides better questions than basic templates while we wait for AI integration
 */
function generateEnhancedMockQuestions(objectiveText, difficulty, count) {
  const text = objectiveText.toLowerCase();
  
  // Subject detection and appropriate question generation
  if (text.includes('cell') || text.includes('biology') || text.includes('organism') || text.includes('dna')) {
    return generateBiologyQuestions(objectiveText, count);
  } else if (text.includes('algebra') || text.includes('equation') || text.includes('variable') || text.includes('solve')) {
    return generateMathQuestions(objectiveText, count);
  } else if (text.includes('chemistry') || text.includes('element') || text.includes('compound') || text.includes('atom')) {
    return generateChemistryQuestions(objectiveText, count);
  } else if (text.includes('history') || text.includes('war') || text.includes('revolution') || text.includes('century')) {
    return generateHistoryQuestions(objectiveText, count);
  } else {
    return generateGenericQuestions(objectiveText, count);
  }
}

// Subject-specific question generators (improved versions)
function generateBiologyQuestions(objectiveText, count) {
  const questionPool = [
    {
      question: "What is the primary function of the cell membrane?",
      correct_answer: "To control what enters and exits the cell",
      distractors: [
        "To produce energy for the cell",
        "To store the cell's genetic material", 
        "To manufacture proteins"
      ],
      explanation: "The cell membrane acts as a selective barrier, controlling the passage of substances in and out of the cell through various transport mechanisms."
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
    },
    {
      question: "During which phase of mitosis do chromosomes align at the cell's equator?",
      correct_answer: "Metaphase",
      distractors: [
        "Prophase",
        "Anaphase",
        "Telophase"
      ],
      explanation: "During metaphase, chromosomes line up at the metaphase plate (cell's equator) before being separated to opposite poles."
    },
    {
      question: "What is the role of ribosomes in the cell?",
      correct_answer: "Protein synthesis",
      distractors: [
        "Energy production",
        "DNA replication",
        "Waste removal"
      ],
      explanation: "Ribosomes are the cellular structures responsible for translating mRNA into proteins through the process of translation."
    }
  ];

  // Randomly select questions from the pool
  const shuffled = questionPool.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, questionPool.length));
}

function generateMathQuestions(objectiveText, count) {
  const questionPool = [
    {
      question: "Solve for x: 3x + 7 = 22",
      correct_answer: "x = 5",
      distractors: ["x = 3", "x = 7", "x = 15"],
      explanation: "Subtract 7 from both sides: 3x = 15, then divide by 3: x = 5"
    },
    {
      question: "What is the slope of the line passing through points (2, 4) and (6, 12)?",
      correct_answer: "2",
      distractors: ["3", "4", "1/2"],
      explanation: "Using the slope formula: (12-4)/(6-2) = 8/4 = 2"
    },
    {
      question: "Simplify: 4x + 3x - 2x",
      correct_answer: "5x",
      distractors: ["9x", "3x", "x"],
      explanation: "Combine like terms: (4 + 3 - 2)x = 5x"
    },
    {
      question: "If y = 2x + 3, what is the y-intercept?",
      correct_answer: "3",
      distractors: ["2", "-3", "0"],
      explanation: "In the form y = mx + b, the y-intercept is b, which is 3"
    },
    {
      question: "Solve for x: 2x - 8 = 10",
      correct_answer: "x = 9",
      distractors: ["x = 1", "x = 18", "x = 2"],
      explanation: "Add 8 to both sides: 2x = 18, then divide by 2: x = 9"
    }
  ];

  const shuffled = questionPool.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, questionPool.length));
}

function generateChemistryQuestions(objectiveText, count) {
  const questionPool = [
    {
      question: "What is the chemical symbol for Gold?",
      correct_answer: "Au",
      distractors: ["Go", "Gd", "Ag"],
      explanation: "Gold's symbol Au comes from its Latin name 'aurum'"
    },
    {
      question: "How many electrons does a neutral carbon atom have?",
      correct_answer: "6",
      distractors: ["4", "12", "8"],
      explanation: "Carbon has atomic number 6, meaning it has 6 protons and 6 electrons in its neutral state"
    },
    {
      question: "What type of bond is formed when electrons are shared between atoms?",
      correct_answer: "Covalent bond",
      distractors: ["Ionic bond", "Metallic bond", "Hydrogen bond"],
      explanation: "Covalent bonds form when atoms share electrons to achieve stable electron configurations"
    }
  ];

  const shuffled = questionPool.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, questionPool.length));
}

function generateHistoryQuestions(objectiveText, count) {
  const questionPool = [
    {
      question: "In which century did the American Revolution occur?",
      correct_answer: "18th century",
      distractors: ["17th century", "19th century", "16th century"],
      explanation: "The American Revolution took place from 1775-1783, which is in the 18th century"
    }
  ];

  const shuffled = questionPool.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, questionPool.length));
}

function generateGenericQuestions(objectiveText, count) {
  return [
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
}

module.exports = {
  generateAIQuestions,
  generateQuestionsWithOpenAI,
  generateQuestionsWithClaude,
  generateEnhancedMockQuestions
};