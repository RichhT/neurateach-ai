const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
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

// Serve static files from backend public directory
app.use(express.static(path.join(__dirname, 'public')));

// Frontend Routes - specific routes first
app.get('/teacher*', (req, res) => {
  console.log('Serving teacher.html for route:', req.path);
  res.set('Content-Type', 'text/html');
  res.sendFile(path.join(__dirname, 'public/teacher.html'));
});

app.get('/student*', (req, res) => {
  console.log('Serving student.html for route:', req.path);
  res.set('Content-Type', 'text/html');
  res.sendFile(path.join(__dirname, 'public/student.html'));
});

// Debug route to show HTML content
app.get('/debug-teacher-html', (req, res) => {
  const fs = require('fs');
  const htmlPath = path.join(__dirname, 'public/teacher.html');
  
  try {
    if (fs.existsSync(htmlPath)) {
      const htmlContent = fs.readFileSync(htmlPath, 'utf8');
      res.set('Content-Type', 'text/plain');
      res.send(htmlContent);
    } else {
      res.set('Content-Type', 'text/plain');
      res.send('File not found: ' + htmlPath);
    }
  } catch (err) {
    res.set('Content-Type', 'text/plain');
    res.send('Error reading file: ' + err.message);
  }
});

// Debug route to list files
app.get('/debug-files', (req, res) => {
  const fs = require('fs');
  const publicPath = path.join(__dirname, 'public');
  
  try {
    const files = fs.readdirSync(publicPath, { withFileTypes: true });
    const fileList = files.map(file => ({
      name: file.name,
      isDirectory: file.isDirectory()
    }));
    
    res.json({
      publicPath,
      files: fileList
    });
  } catch (err) {
    res.json({
      error: err.message,
      publicPath
    });
  }
});

// Test route with React CDN
app.get('/test-react-cdn', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>React CDN Test</title>
      <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
      <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    </head>
    <body>
      <div id="root"></div>
      <div id="status">React CDN Test Loading...</div>
      
      <script>
        console.log('Script starting...');
        console.log('React:', typeof React);
        console.log('ReactDOM:', typeof ReactDOM);
        
        const { createElement, useState } = React;
        const { createRoot } = ReactDOM;
        
        function TestApp() {
          console.log('TestApp component rendering');
          const [count, setCount] = useState(0);
          
          return createElement('div', { 
            style: { 
              padding: '20px', 
              backgroundColor: '#f0f8ff',
              border: '2px solid #007bff',
              borderRadius: '10px',
              margin: '20px'
            } 
          },
            createElement('h1', null, 'React CDN Test - SUCCESS!'),
            createElement('p', null, 'Current count: ' + count),
            createElement('button', { 
              onClick: () => setCount(count + 1),
              style: { padding: '10px 20px', fontSize: '16px' }
            }, 'Click me!'),
            createElement('p', null, 'Timestamp: ' + new Date().toISOString())
          );
        }
        
        try {
          console.log('Creating root...');
          const root = createRoot(document.getElementById('root'));
          console.log('Rendering TestApp...');
          root.render(createElement(TestApp));
          document.getElementById('status').innerHTML = 'React mounted successfully!';
          document.getElementById('status').style.color = 'green';
        } catch (error) {
          console.error('React error:', error);
          document.getElementById('status').innerHTML = 'React error: ' + error.message;
          document.getElementById('status').style.color = 'red';
        }
      </script>
    </body>
    </html>
  `);
});

// Test route to debug
app.get('/test-teacher', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Teacher Portal</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .test { background: #f0f0f0; padding: 20px; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="test">
        <h1>Test Teacher Portal</h1>
        <p>This is a test page to verify the route is working.</p>
        <p>If you see this, the server routing is working correctly.</p>
        <a href="/teacher">Go to actual teacher portal</a>
        <br><br>
        <a href="/test-js">Test JavaScript loading</a>
      </div>
    </body>
    </html>
  `);
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Neurateach AI - Intelligent Learning Platform</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
          line-height: 1.6;
          color: #333;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }
        
        .header {
          text-align: center;
          padding: 60px 0 40px;
          color: white;
        }
        
        .logo {
          font-size: 3.5rem;
          font-weight: 700;
          margin-bottom: 20px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .tagline {
          font-size: 1.3rem;
          opacity: 0.9;
          margin-bottom: 40px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .hero-section {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 20px;
          padding: 60px;
          margin: 40px 0;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          backdrop-filter: blur(10px);
        }
        
        .hero-title {
          font-size: 2.5rem;
          color: #2c3e50;
          margin-bottom: 30px;
          text-align: center;
        }
        
        .hero-description {
          font-size: 1.2rem;
          color: #5a6c7d;
          text-align: center;
          margin-bottom: 50px;
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .portals {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-top: 50px;
        }
        
        .portal-card {
          background: white;
          border-radius: 15px;
          padding: 40px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .portal-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }
        
        .portal-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 5px;
          background: linear-gradient(90deg, #667eea, #764ba2);
        }
        
        .portal-icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }
        
        .teacher-icon {
          color: #3498db;
        }
        
        .student-icon {
          color: #e74c3c;
        }
        
        .portal-title {
          font-size: 1.8rem;
          color: #2c3e50;
          margin-bottom: 15px;
          font-weight: 600;
        }
        
        .portal-description {
          color: #7f8c8d;
          margin-bottom: 30px;
          line-height: 1.8;
        }
        
        .portal-button {
          display: inline-block;
          padding: 15px 40px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-decoration: none;
          border-radius: 50px;
          font-weight: 600;
          font-size: 1.1rem;
          transition: all 0.3s ease;
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        
        .portal-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
        }
        
        .features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 30px;
          margin: 60px 0;
        }
        
        .feature {
          background: rgba(255, 255, 255, 0.1);
          padding: 30px;
          border-radius: 15px;
          text-align: center;
          color: white;
        }
        
        .feature-icon {
          font-size: 2.5rem;
          margin-bottom: 15px;
        }
        
        .feature-title {
          font-size: 1.3rem;
          margin-bottom: 10px;
          font-weight: 600;
        }
        
        .feature-description {
          opacity: 0.9;
        }
        
        .footer {
          text-align: center;
          padding: 40px 0;
          color: rgba(255, 255, 255, 0.8);
        }
        
        @media (max-width: 768px) {
          .portals {
            grid-template-columns: 1fr;
            gap: 30px;
          }
          
          .hero-section {
            padding: 40px 20px;
          }
          
          .logo {
            font-size: 2.5rem;
          }
          
          .hero-title {
            font-size: 2rem;
          }
          
          .features {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <header class="header">
          <h1 class="logo">Neurateach AI</h1>
          <p class="tagline">Transforming Education with Intelligent Learning Objectives</p>
        </header>
        
        <section class="hero-section">
          <h2 class="hero-title">Welcome to the Future of Learning</h2>
          <p class="hero-description">
            Neurateach AI revolutionizes curriculum development by generating personalized learning objectives 
            and assessments. Our intelligent platform adapts to both educators and students, creating 
            meaningful educational experiences.
          </p>
          
          <div class="portals">
            <div class="portal-card">
              <div class="portal-icon teacher-icon">👨‍🏫</div>
              <h3 class="portal-title">Teacher Portal</h3>
              <p class="portal-description">
                Create curriculum, upload materials, generate AI-powered learning objectives, 
                and track student progress with advanced analytics.
              </p>
              <a href="/teacher" class="portal-button">Enter Teacher Portal</a>
            </div>
            
            <div class="portal-card">
              <div class="portal-icon student-icon">👨‍🎓</div>
              <h3 class="portal-title">Student Portal</h3>
              <p class="portal-description">
                Access personalized learning materials, take adaptive assessments, 
                and track your progress through intelligent study modes.
              </p>
              <a href="/student" class="portal-button">Enter Student Portal</a>
            </div>
          </div>
        </section>
        
        <section class="features">
          <div class="feature">
            <div class="feature-icon">🤖</div>
            <h3 class="feature-title">AI-Powered</h3>
            <p class="feature-description">Advanced AI generates personalized learning objectives and assessments</p>
          </div>
          
          <div class="feature">
            <div class="feature-icon">📊</div>
            <h3 class="feature-title">Analytics</h3>
            <p class="feature-description">Comprehensive tracking and insights into learning progress</p>
          </div>
          
          <div class="feature">
            <div class="feature-icon">🎯</div>
            <h3 class="feature-title">Adaptive</h3>
            <p class="feature-description">Content adapts to individual learning styles and pace</p>
          </div>
          
          <div class="feature">
            <div class="feature-icon">📚</div>
            <h3 class="feature-title">Comprehensive</h3>
            <p class="feature-description">Complete curriculum management and assessment tools</p>
          </div>
        </section>
        
        <footer class="footer">
          <p>&copy; 2024 Neurateach AI. Empowering educators and students worldwide.</p>
        </footer>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
  console.error('Server error:', err);
});