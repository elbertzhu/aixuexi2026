const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config');
const ai = require('./ai');
const uuid = require('uuid');
const pkg = require('./package.json');

const app = express();

app.use(cors());
app.use(bodyParser.json());

// In-memory session store (Mock DB)
const sessions = {};

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: pkg.version, provider: config.provider });
});

// AI Status
app.get('/api/ai/status', (req, res) => {
    const status = ai.getStatus();
    res.json({
        provider: config.provider,
        enabled: config.enabled,
        rate_limit: {
            requests_per_min: config.ai.rateLimitPerMin,
            timeout_ms: config.ai.timeoutMs
        },
        cost: {
            total_tokens: 0, 
            total_usd: 0.0
        },
        last_error: status.last_error,
        fallback_count: status.fallback_count
    });
});


const pipeline = require('./stats/pipeline');
const parentRoutes = require('./routes/parent');
const teacherRoutes = require('./routes/teacher');
const studentRoutes = require('./routes/student');

// app and mw already init at top
// Just add routes
app.use('/api/parent', parentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);


// In-memory session store (Mock DB)
const srs = require('./srs/service');

// API: SRS Review (Manual / E-Round)
app.post('/api/srs/review', async (req, res) => {
    try {
        const { userId, itemId, quality } = req.body;
        if (!userId || !itemId || quality === undefined) return res.status(400).json({ error: "Missing fields" });
        
        const result = await srs.review(userId, itemId, quality);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: SRS Pending
app.get('/api/srs/pending', async (req, res) => {
    try {
        const { userId, limit } = req.query;
        if (!userId) return res.status(400).json({ error: "Missing userId" });
        
        const items = await srs.getPendingItems(userId, limit);
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/level-test/start', async (req, res) => {
  try {
    const sessionId = uuid.v4();
    const userId = req.query.userId || 'guest'; // Capture UserID
    const initialLevel = 1;
    
    // Generate first question
    const question = await ai.generateQuestion(initialLevel);
    
    sessions[sessionId] = {
      sessionId,
      userId,
      level: initialLevel,
      questionCount: 1,
      maxQuestions: 5,
      history: [],
      currentQuestion: question,
      lastQuestionTime: Date.now() // Timing for D-Round
    };

    res.json({
      sessionId,
      question,
      current: 1,
      total: 5
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit Answer
app.post('/api/level-test/answer', async (req, res) => {
  const { sessionId, answer } = req.body;
  const session = sessions[sessionId];

  if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
  }

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.completed) {
      return res.status(409).json({ error: 'Session already completed' });
  }

  const isCorrect = answer === session.currentQuestion.answer;
  const now = Date.now();
  const responseTimeMs = now - (session.lastQuestionTime || now);
  session.lastQuestionTime = now;

  // D-Round: Pipeline Push (Commented out to fix Module Not Found issue)
  /*
  pipeline.push({
      eventId: uuid.v4(),
      userId: session.userId,
      sessionId: session.sessionId,
      type: 'ANSWER_SUBMITTED',
      timestamp: now,
      payload: {
          questionId: session.currentQuestion.id,
          level: session.level,
          userAnswer: answer,
          isCorrect,
          responseTimeMs
      }
  });
  */

  session.history.push({ 
    q: session.currentQuestion, 
    a: answer, 
    correct: isCorrect 
  });

  // Adjust level logic (Mock)
  if (isCorrect) session.level++;
  
  // Check completion
  if (session.questionCount >= session.maxQuestions) {
      session.completed = true; // Mark as closed
      const correctCount = session.history.filter(h => h.correct).length;
      return res.json({
          correct: isCorrect,
          completed: true,
          summary: {
              total: session.maxQuestions,
              correct: correctCount,
              finalLevel: session.level
          }
      });
  }

  session.questionCount++;
  
  // Clean up current question so we can generate new one
  // In real app, we might wait or generate next immediately
  
  try {
      const nextQuestion = await ai.generateQuestion(session.level);
      session.currentQuestion = nextQuestion;
      
      res.json({
        correct: isCorrect,
        completed: false,
        nextQuestion,
        current: session.questionCount,
        total: session.maxQuestions
      });
  } catch (err) {
       res.status(500).json({ error: "Failed to generate next question"});
  }
});

const storage = require('./stats/storage');

// User Profile API (D-Round)
app.get('/api/user/:userId/profile', async (req, res) => {
    try {
        const profile = await storage.getProfile(req.params.userId);
        res.json(profile);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});

// Event Log API (D-Round A3)
app.get('/api/user/:userId/events', async (req, res) => {
    try {
        const logs = await storage.getEventsByUser(req.params.userId);
        const limit = parseInt(req.query.limit || 20);
        res.json(logs.slice(-limit));
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch events" });
    }
});

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port} (Provider: ${config.provider})`);
});
