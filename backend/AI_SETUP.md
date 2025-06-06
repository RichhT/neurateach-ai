# AI Integration Setup Guide

## Current Status
✅ **Enhanced Mock Questions**: The system currently uses intelligent mock question generation with subject-specific templates and shuffled answers.

✅ **Answer Shuffling**: Correct answers are randomly positioned (A, B, C, or D) for each question.

✅ **Subject Detection**: Automatically detects Biology, Math, Chemistry, History, etc., and generates appropriate questions.

## Enable Real AI Integration

### Option 1: OpenAI Integration

1. **Install OpenAI Package**
   ```bash
   npm install openai
   ```

2. **Set Environment Variable**
   ```bash
   export OPENAI_API_KEY="your-openai-api-key-here"
   ```
   Or add to your `.env` file:
   ```
   OPENAI_API_KEY=your-openai-api-key-here
   ```

3. **Uncomment Code in `ai-integration.js`**
   - Uncomment the OpenAI import and client setup
   - Uncomment the OpenAI API call in `generateQuestionsWithOpenAI()`

### Option 2: Claude (Anthropic) Integration

1. **Install Anthropic Package**
   ```bash
   npm install @anthropic-ai/sdk
   ```

2. **Set Environment Variable**
   ```bash
   export ANTHROPIC_API_KEY="your-anthropic-api-key-here"
   ```

3. **Uncomment Code in `ai-integration.js`**
   - Uncomment the Anthropic import and client setup
   - Uncomment the Claude API call in `generateQuestionsWithClaude()`

## How It Works

### Fallback System
1. **Try OpenAI first** - If API key configured
2. **Try Claude second** - If OpenAI fails and Claude API key configured  
3. **Use Enhanced Mock** - If all AI providers fail or not configured

### Question Generation Process
1. **AI receives learning objective** (e.g., "Understand cell membrane functions")
2. **AI creates appropriate questions** with 1 correct answer + 3 distractors
3. **System shuffles answer order** so correct answer isn't always A
4. **Questions stored in database** for reuse

### Current Mock Quality
Even without AI, the current system generates high-quality questions:

**Biology Example:**
- Question: "What is the primary function of the cell membrane?"
- A) To manufacture proteins (distractor)
- B) To control what enters and exits the cell (correct - shuffled to position B)
- C) To store genetic material (distractor)  
- D) To produce energy (distractor)

**Math Example:**
- Question: "Solve for x: 3x + 7 = 22"
- A) x = 7 (distractor)
- B) x = 3 (distractor)
- C) x = 5 (correct - shuffled to position C)
- D) x = 15 (distractor)

## Testing

Try taking a Biology or Math quiz to see the improved questions with shuffled answers!

The system automatically:
- ✅ Detects subject area from learning objectives
- ✅ Generates appropriate question types
- ✅ Creates plausible but incorrect distractors
- ✅ Shuffles answer positions
- ✅ Provides explanations for correct answers
- ✅ Falls back gracefully if AI is unavailable