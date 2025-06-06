const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./config/database.sqlite');

// Test the available units query directly
const studentId = 6; // Richard Taylor's student ID

const query = `
  SELECT 
    u.id,
    u.name,
    u.description,
    u.created_at,
    teacher.name as teacher_name,
    COUNT(lo.id) as objectives_count,
    CASE WHEN e.id IS NOT NULL THEN 1 ELSE 0 END as is_enrolled
  FROM units u
  JOIN users teacher ON u.user_id = teacher.id
  LEFT JOIN learning_objectives lo ON u.id = lo.unit_id
  LEFT JOIN student_enrollments e ON u.id = e.unit_id AND e.student_id = ?
  GROUP BY u.id
  ORDER BY u.created_at DESC
`;

console.log('Testing available units query...');
console.log('Student ID:', studentId);

db.all(query, [studentId], (err, units) => {
  if (err) {
    console.error('Database error:', err);
    return;
  }

  console.log('\nAvailable units:');
  console.log(JSON.stringify(units, null, 2));

  // Also check enrollments for this student
  db.all('SELECT * FROM student_enrollments WHERE student_id = ?', [studentId], (err, enrollments) => {
    if (err) {
      console.error('Error checking enrollments:', err);
      return;
    }

    console.log('\nCurrent enrollments:');
    console.log(JSON.stringify(enrollments, null, 2));

    db.close();
  });
});