const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./config/database.sqlite');

// Sample data to add for testing
const sampleData = {
  // Create a sample teacher if not exists
  teacher: {
    name: 'Dr. Sarah Johnson',
    email: 'teacher@example.com',
    password: '$2b$10$example', // This would be properly hashed
    user_type: 'teacher'
  },
  
  // Create a sample unit
  unit: {
    name: 'Introduction to Algebra',
    description: 'Learn the fundamentals of algebraic thinking and problem solving',
    user_id: 1 // Teacher ID
  },
  
  // Create sample learning objectives
  objectives: [
    'Understand variables and expressions',
    'Solve linear equations with one variable',
    'Graph linear functions on a coordinate plane',
    'Apply algebraic methods to real-world problems',
    'Simplify and manipulate algebraic expressions'
  ]
};

// Function to add sample data
async function addSampleData() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Check if teacher already exists
      db.get('SELECT id FROM users WHERE email = ?', [sampleData.teacher.email], (err, row) => {
        if (err) {
          console.error('Error checking for teacher:', err);
          return reject(err);
        }
        
        if (row) {
          console.log('Sample teacher already exists');
          resolve();
          return;
        }

        console.log('Adding sample data...');
        
        // Add teacher
        db.run(
          'INSERT INTO users (name, email, password, user_type) VALUES (?, ?, ?, ?)',
          [sampleData.teacher.name, sampleData.teacher.email, sampleData.teacher.password, sampleData.teacher.user_type],
          function(err) {
            if (err) {
              console.error('Error adding teacher:', err);
              return reject(err);
            }
            
            const teacherId = this.lastID;
            console.log(`Added teacher with ID: ${teacherId}`);
            
            // Add unit
            db.run(
              'INSERT INTO units (name, description, user_id) VALUES (?, ?, ?)',
              [sampleData.unit.name, sampleData.unit.description, teacherId],
              function(err) {
                if (err) {
                  console.error('Error adding unit:', err);
                  return reject(err);
                }
                
                const unitId = this.lastID;
                console.log(`Added unit with ID: ${unitId}`);
                
                // Add objectives
                let completed = 0;
                sampleData.objectives.forEach((objective, index) => {
                  db.run(
                    'INSERT INTO learning_objectives (unit_id, objective_text, order_index) VALUES (?, ?, ?)',
                    [unitId, objective, index],
                    function(err) {
                      if (err) {
                        console.error('Error adding objective:', err);
                        return reject(err);
                      }
                      
                      console.log(`Added objective: ${objective}`);
                      completed++;
                      
                      if (completed === sampleData.objectives.length) {
                        console.log('Sample data added successfully!');
                        console.log('\nTo test the system:');
                        console.log('1. Register as a student at http://localhost:3000/student.html');
                        console.log('2. Browse courses and enroll in "Introduction to Algebra"');
                        console.log('3. Try the Study mode and Quiz mode');
                        resolve();
                      }
                    }
                  );
                });
              }
            );
          }
        );
      });
    });
  });
}

// Run the script
addSampleData()
  .then(() => {
    db.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed to add sample data:', err);
    db.close();
    process.exit(1);
  });