const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Data Store (MVP In-Memory)
const sessions = {};

// --- AI Mock Service ---
const AIMockService = {
  generateQuestions: (count = 5) => {
    const questions = [];
    for (let i = 0; i < count; i++) {
      const id = uuidv4();
      // Hardcoded logic for deterministic mock
      const type = 'choice';
      const difficulty = Math.floor(Math.random() * 3) + 1; // 1-3
      const prompt = `Question ${i+1}: Which is the correct form? (Level ${difficulty})`;
      const options = ['Option A', 'Option B', 'Option C', 'Option D'];
      const correctIndex = Math.floor(Math.random() * 4);
      const correctAnswer = options[correctIndex];

      questions.push({
        id,
        type,
        prompt,
        options,
        difficulty,
        correct_answer: correctAnswer // In real app, don't send this to client
      });
    }
    return questions;
  }
};

// --- API Routes ---

// 1. Start Level Test
app.post('/api/level-test/start', (req, res) => {
  const { userId } = req.body;
  const sessionId = uuidv4();
  
  const questions = AIMockService.generateQuestions(5);
  
  sessions[sessionId] = {
    id: sessionId,
    user_id: userId || 'guest',
    status: 'in_progress',
    questions: questions,
    current_index: 0,
    score: 0,
    created_at: new Date().toISOString()
  };

  // Send first question
  const firstQ = questions[0];
  // Hide correct_answer for client
  const clientQ = { ...firstQ };
  delete clientQ.correct_answer;

  res.json({
    success: true,
    data: {
      session_id: sessionId,
      status: 'in_progress',
      total: questions.length,
      current_question: clientQ
    }
  });
});

// 2. Submit Answer & Next
app.post('/api/level-test/answer', (req, res) => {
  const { session_id, question_id, answer } = req.body;
  
  const session = sessions[session_id];
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const currentQ = session.questions[session.current_index];
  
  // Check Answer
  const isCorrect = (answer === currentQ.correct_answer);
  if (isCorrect) session.score++;

  // Prepare Next
  session.current_index++;
  
  if (session.current_index >= session.questions.length) {
    // Test Complete
    session.status = 'completed';
    const result = {
      session_id: session_id,
      status: 'completed',
      total_score: session.score,
      max_score: session.questions.length,
      analysis: "AI Analysis: Your grammar is solid, but vocabulary needs expansion."
    };
    res.json({ success: true, data: result });
  } else {
    // Next Question
    const nextQ = session.questions[session.current_index];
    const clientNextQ = { ...nextQ };
    delete clientNextQ.correct_answer;

    res.json({
      success: true,
      data: {
        session_id: session_id,
        status: 'in_progress',
        current_index: session.current_index + 1,
        total: session.questions.length,
        is_correct: isCorrect,
        current_question: clientNextQ
      }
    });
  }
});

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
