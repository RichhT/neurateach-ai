const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Neurateach API is running' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/units', require('./routes/units'));
app.use('/api/objectives', require('./routes/objectives'));
app.use('/api/enrollments', require('./routes/enrollments'));
app.use('/api/teaching', require('./routes/teaching'));
app.use('/api/assessment', require('./routes/assessment'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
  console.error('Server error:', err);
});