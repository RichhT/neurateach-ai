// Script to pre-populate quiz banks for testing
const { getOrCreateQuizBank } = require('./quiz-bank-manager');

async function populateQuizBanks() {
    try {
        console.log('Populating quiz banks for common objectives...');
        
        // Common objectives and difficulty levels to pre-generate
        const objectives = [52, 53, 54, 58, 61]; // Cell biology objectives
        const difficulties = [0.3, 0.5, 0.7]; // Easy, medium, hard
        
        for (const objectiveId of objectives) {
            for (const difficulty of difficulties) {
                try {
                    console.log(`Creating quiz bank for objective ${objectiveId}, difficulty ${difficulty}`);
                    
                    // Create a fake student ID and enrollment for generation purposes
                    const tempStudentId = 999999; // Temporary ID that won't conflict
                    const tempEnrollmentId = 999999;
                    
                    const quizBank = await getOrCreateQuizBank(
                        tempStudentId, 
                        tempEnrollmentId, 
                        objectiveId, 
                        difficulty, 
                        5
                    );
                    
                    console.log(`✓ Created quiz bank ${quizBank.quizBankId} (${quizBank.source})`);
                    
                    // Remove the temporary usage record so the quiz bank is available for real students
                    const sqlite3 = require('sqlite3').verbose();
                    const db = new sqlite3.Database('./config/database.sqlite');
                    
                    await new Promise((resolve, reject) => {
                        db.run(
                            'DELETE FROM student_quiz_bank_usage WHERE student_id = ? AND quiz_bank_id = ?',
                            [tempStudentId, quizBank.quizBankId],
                            (err) => {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });
                    
                    console.log(`✓ Quiz bank ${quizBank.quizBankId} is now available for students`);
                    
                } catch (error) {
                    console.error(`Failed to create quiz bank for objective ${objectiveId}, difficulty ${difficulty}:`, error.message);
                }
            }
        }
        
        console.log('Quiz bank population completed!');
        process.exit(0);
        
    } catch (error) {
        console.error('Error populating quiz banks:', error);
        process.exit(1);
    }
}

// Run the population script
populateQuizBanks();