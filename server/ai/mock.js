/**
 * AI Mock Service - 模拟 AI 服务
 * 
 * 用于开发测试，不产生真实费用
 */

const { v4: uuidv4 } = require('uuid');

// 题目模板库
const QUESTION_TEMPLATES = [
  { category: 'vocabulary', templates: [
    { prompt: 'What is the meaning of "{word}"?', options: ['A: Happy', 'B: Sad', 'C: Angry', 'D: Tired'], answer: 'A' },
    { prompt: 'Which word is closest in meaning to "{word}"?', options: ['A: Big', 'B: Small', 'C: Fast', 'D: Slow'], answer: 'C' },
  ]},
  { category: 'grammar', templates: [
    { prompt: 'Complete the sentence: "She _____ to school every day."', options: ['A: go', 'B: goes', 'C: going', 'D: gone'], answer: 'B' },
    { prompt: 'Choose the correct form: "If I _____ rich, I would travel the world."', options: ['A: am', 'B: was', 'C: were', 'D: be'], answer: 'C' },
  ]},
  { category: 'reading', templates: [
    { prompt: 'According to the passage, the main character is:', options: ['A: Happy', 'B: Sad', 'C: Confused', 'D: Angry'], answer: 'A' },
    { prompt: 'What can be inferred from the last paragraph?', options: ['A: The story ends', 'B: A new beginning', 'C: Nothing happened', 'D: The end'], answer: 'B' },
  ]}
];

class MockAIService {
  constructor() {
    this.requestCount = 0;
  }
  
  generateQuestions(count = 5, difficulty = 2, topic = 'general') {
    this.requestCount++;
    const startTime = Date.now();
    
    const questions = [];
    const topics = topic === 'general' 
      ? QUESTION_TEMPLATES 
      : QUESTION_TEMPLATES.filter(t => t.category === topic) || QUESTION_TEMPLATES;
    
    for (let i = 0; i < count; i++) {
      const category = topics[Math.floor(Math.random() * topics.length)];
      const template = category.templates[Math.floor(Math.random() * category.templates.length)];
      
      questions.push({
        id: uuidv4(),
        type: 'choice',
        prompt: template.prompt.replace('{word}', this.getRandomWord()),
        options: template.options,
        difficulty,
        correct_answer: template.answer,
        category: category.category
      });
    }
    
    const latency = Date.now() - startTime;
    
    console.log(`[AI Mock] Generated ${count} questions in ${latency}ms (request #${this.requestCount})`);
    
    return {
      success: true,
      questions,
      meta: {
        provider: 'mock',
        latency,
        requestCount: this.requestCount
      }
    };
  }
  
  explainAnswer(question, userAnswer, correctAnswer) {
    const isCorrect = userAnswer === correctAnswer;
    
    const explanations = {
      correct: [
        '回答正确！这道题考察的是相关知识点。',
        '正确！继续加油！',
        '完美！你掌握得不错。'
      ],
      incorrect: [
        `正确答案应该是 ${correctAnswer}。这道题主要考察对知识点的理解。`,
        `解析：正确答案是 ${correctAnswer}，建议回顾相关知识点。`
      ]
    };
    
    const pool = isCorrect ? explanations.correct : explanations.incorrect;
    const explanation = pool[Math.floor(Math.random() * pool.length)];
    
    return {
      success: true,
      explanation,
      meta: {
        provider: 'mock',
        isCorrect
      }
    };
  }
  
  getRandomWord() {
    const words = ['happy', 'beautiful', 'important', 'different', 'success', 'failure', 'problem', 'solution'];
    return words[Math.floor(Math.random() * words.length)];
  }
}

module.exports = new MockAIService();
