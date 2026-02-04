const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// AI Service - 统一入口
const aiService = require('./ai');

// Configuration
const config = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// --- Auth Middleware ---
const { authenticate, requireRole } = require('./auth/middleware');

// --- Routes ---
const parentRoutes = require('./routes/parent');

// Data Store (MVP In-Memory)
const sessions = {};
const db = require('./stats/db');

// --- API Routes ---

// 1. AI Service Status & Configuration
app.get('/api/ai/status', (req, res) => {
  const status = aiService.getStatus();
  res.json({
    success: true,
    data: status
  });
});

// 2. Toggle AI Provider (Admin only - for testing)
app.post('/api/ai/config', (req, res) => {
  const { provider, enabled } = req.body;
  
  if (provider && aiService.setProvider(provider)) {
    // 不重启服务，直接切换
  }
  
  if (enabled !== undefined) {
    aiService.setEnabled(enabled);
  }
  
  res.json({
    success: true,
    data: aiService.getStatus()
  });
});

// 3. Parent Routes (Auth required)
app.use('/api/parent', authenticate, requireRole('parent'), parentRoutes);

// Dev: Seed Data (No Auth)
app.post('/api/dev/seed', async (req, res) => {
    try {
        const db = require('./stats/db');
        const authService = require('./auth/service');
        
        // Clean up first (middleware may have auto-created with wrong role)
        db.run('DELETE FROM users WHERE id IN ("parent_1", "student_1")');
        db.run('DELETE FROM relations WHERE parent_id = "parent_1"');
        
        await authService.createUser('parent_1', 'Parent Bob', 'parent');
        await authService.createUser('student_1', 'Alice', 'student');
        await authService.linkUsers('parent_1', 'student_1');
        res.json({ message: 'Seeded parent_1 (parent) -> student_1' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. SRS Routes (TODO: create router for SRS)
// app.use('/api/srs', verifyToken, require('./srs/service'));

// --- Level Test Routes (Legacy) ---

// Start Level Test
app.post('/api/level-test/start', async (req, res) => {
  const { userId, count = 5, difficulty = 2, topic = 'general' } = req.body;
  const sessionId = require('uuid').v4();
  
  // 调用 AI 服务生成题目
  const aiResult = await aiService.generateQuestions(count, difficulty, topic);
  
  if (!aiResult.success) {
    return res.status(500).json({
      success: false,
      error: aiResult.error,
      provider: aiService.provider
    });
  }
  
  const questions = aiResult.questions.map(q => ({
    ...q,
    // 隐藏正确答案发送给客户端
    correct_answer: undefined
  }));
  
  sessions[sessionId] = {
    id: sessionId,
    user_id: userId || 'guest',
    status: 'in_progress',
    questions: aiResult.questions, // 保存完整数据（含正确答案）
    current_index: 0,
    score: 0,
    created_at: new Date().toISOString()
  };

  res.json({
    success: true,
    data: {
      session_id: sessionId,
      status: 'in_progress',
      total: questions.length,
      current_question: questions[0],
      ai_meta: aiResult.meta
    }
  });
});

// Submit Answer & Next (with AI Explanation)
app.post('/api/level-test/answer', async (req, res) => {
  const { session_id, question_id, answer } = req.body;
  
  const session = sessions[session_id];
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const currentQ = session.questions[session.current_index];
  
  // Check Answer
  const isCorrect = (answer === currentQ.correct_answer);
  if (isCorrect) session.score++;

  // AI 解析（如果功能开启）
  let explanation = null;
  if (config.features.explainAnswer && session.status !== 'completed') {
    const explainResult = await aiService.explainAnswer(
      currentQ.prompt, 
      answer, 
      currentQ.correct_answer
    );
    if (explainResult.success) {
      explanation = explainResult.explanation;
    }
  }

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
      analysis: "Level test completed."
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
        explanation,
        current_question: clientNextQ
      }
    });
  }
});

// Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    ai: aiService.getStatus()
  });
});

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// DB auto-initialized via stats/db.js

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`AI Provider: ${aiService.provider}, Enabled: ${aiService.enabled}`);
});
