// Script to check quiz bank statistics
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./config/database.sqlite');

async function checkQuizBanks() {
    try {
        console.log('📊 Quiz Bank Statistics\n');
        
        // Overall statistics
        const overallStats = await new Promise((resolve, reject) => {
            db.get(`
                SELECT 
                    COUNT(*) as total_banks,
                    SUM(usage_count) as total_usage,
                    AVG(usage_count) as avg_usage,
                    COUNT(DISTINCT objective_id) as objectives_covered
                FROM quiz_banks WHERE is_active = 1
            `, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        console.log('Overall Statistics:');
        console.log(`- Total Quiz Banks: ${overallStats.total_banks}`);
        console.log(`- Total Usage: ${overallStats.total_usage || 0}`);
        console.log(`- Average Usage per Bank: ${(overallStats.avg_usage || 0).toFixed(2)}`);
        console.log(`- Objectives Covered: ${overallStats.objectives_covered}`);
        
        // Per-objective breakdown
        const objectiveStats = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    qb.objective_id,
                    lo.objective_text,
                    COUNT(*) as bank_count,
                    SUM(qb.usage_count) as total_usage,
                    AVG(qb.difficulty_level) as avg_difficulty,
                    MIN(qb.difficulty_level) as min_difficulty,
                    MAX(qb.difficulty_level) as max_difficulty
                FROM quiz_banks qb
                JOIN learning_objectives lo ON qb.objective_id = lo.id
                WHERE qb.is_active = 1
                GROUP BY qb.objective_id, lo.objective_text
                ORDER BY bank_count DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('\n📋 Per-Objective Breakdown:');
        objectiveStats.forEach(stat => {
            console.log(`\nObjective ${stat.objective_id}: ${stat.objective_text.substring(0, 50)}...`);
            console.log(`  - Quiz Banks: ${stat.bank_count}`);
            console.log(`  - Total Usage: ${stat.total_usage || 0}`);
            console.log(`  - Difficulty Range: ${stat.min_difficulty.toFixed(2)} - ${stat.max_difficulty.toFixed(2)} (avg: ${stat.avg_difficulty.toFixed(2)})`);
        });
        
        // Recent activity
        const recentBanks = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    qb.id,
                    qb.objective_id,
                    lo.objective_text,
                    qb.difficulty_level,
                    qb.usage_count,
                    qb.created_at,
                    qb.last_used,
                    qb.generation_source
                FROM quiz_banks qb
                JOIN learning_objectives lo ON qb.objective_id = lo.id
                WHERE qb.is_active = 1
                ORDER BY qb.created_at DESC
                LIMIT 10
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('\n🕒 Recent Quiz Banks:');
        recentBanks.forEach(bank => {
            console.log(`\nBank ${bank.id} (${bank.generation_source})`);
            console.log(`  - Objective: ${bank.objective_text.substring(0, 40)}...`);
            console.log(`  - Difficulty: ${bank.difficulty_level.toFixed(2)}`);
            console.log(`  - Usage: ${bank.usage_count}`);
            console.log(`  - Created: ${bank.created_at}`);
            console.log(`  - Last Used: ${bank.last_used || 'Never'}`);
        });
        
        // Student usage statistics
        const studentUsage = await new Promise((resolve, reject) => {
            db.get(`
                SELECT 
                    COUNT(DISTINCT student_id) as unique_students,
                    COUNT(*) as total_usages,
                    AVG(score_percentage) as avg_score
                FROM student_quiz_bank_usage
                WHERE score_percentage IS NOT NULL
            `, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        console.log('\n👥 Student Usage:');
        console.log(`- Unique Students: ${studentUsage.unique_students || 0}`);
        console.log(`- Total Quiz Completions: ${studentUsage.total_usages || 0}`);
        console.log(`- Average Score: ${studentUsage.avg_score ? studentUsage.avg_score.toFixed(1) + '%' : 'N/A'}`);
        
        console.log('\n✅ Analysis complete!');
        
    } catch (error) {
        console.error('Error checking quiz banks:', error);
    }
    
    db.close();
}

checkQuizBanks();