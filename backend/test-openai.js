// Test OpenAI integration
require('dotenv').config({ path: '../.env' });
const { generateQuestionsWithOpenAI } = require('./ai-integration');

async function testOpenAI() {
  try {
    console.log('Testing OpenAI integration...');
    console.log('API Key available:', !!process.env.OPENAI_API_KEY);
    
    const questions = await generateQuestionsWithOpenAI(
      "Understand the basic structure and function of cell membranes",
      0.5,
      2
    );
    
    console.log('Success! Generated questions:');
    console.log(JSON.stringify(questions, null, 2));
    
  } catch (error) {
    console.error('OpenAI test failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  }
}

testOpenAI();