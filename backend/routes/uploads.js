const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');
const { authMiddleware, teacherOnlyMiddleware } = require('../middleware/auth');
const db = require('../config/database');

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.doc'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are allowed'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.post('/', authMiddleware, teacherOnlyMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const fileExt = path.extname(fileName).toLowerCase();

    let extractedText = '';

    if (fileExt === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      extractedText = data.text;
    } else if (fileExt === '.docx' || fileExt === '.doc') {
      const result = await mammoth.extractRawText({ path: filePath });
      extractedText = result.value;
    }

    if (!extractedText.trim()) {
      return res.status(400).json({ error: 'Could not extract text from document' });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an educational curriculum expert. Analyze the provided curriculum content and generate comprehensive learning objectives. Include both the explicit objectives from the content and additional supplementary objectives that would help students master the subject. Format as a JSON array of strings."
        },
        {
          role: "user",
          content: `Analyze this curriculum content and generate learning objectives:\n\n${extractedText}`
        }
      ],
      max_tokens: 1500,
      temperature: 0.7
    });

    let objectives;
    try {
      objectives = JSON.parse(completion.choices[0].message.content);
    } catch {
      objectives = completion.choices[0].message.content.split('\n').filter(line => line.trim());
    }

    await db.query(
      'INSERT INTO file_uploads (user_id, filename, file_path, status, processed_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [req.userId, fileName, filePath, 'processed']
    );

    fs.unlinkSync(filePath);

    res.json({
      objectives: objectives,
      extractedText: extractedText.substring(0, 500) + '...'
    });

  } catch (error) {
    console.error('Upload processing error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Error processing file' });
  }
});

module.exports = router;