/**
 * AI Service - 统一入口
 * 
 * 支持 Mock/MiniMax 切换、可开关、可回退、可限流、可统计成本
 */

const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const costTracker = require('../services/costTracker');

// Import providers
const mockService = require('./mock');
const minimaxService = require('./minimax');
const openrouterService = require('./openrouter');

// 简单的内存限流
const rateLimiter = {
  requestsThisMinute: 0,
  requestsToday: 0,
  resetMinute: Date.now(),
  resetDay: new Date().setHours(0, 0, 0, 0),
  
  check() {
    const now = Date.now();
    const { rateLimit } = config;
    
    // 重置计数器
    if (now - this.resetMinute > 60000) {
      this.requestsThisMinute = 0;
      this.resetMinute = now;
    }
    if (now > this.resetDay + 86400000) {
      this.requestsToday = 0;
      this.resetDay = now;
    }
    
    // 检查限流
    if (rateLimit.maxRequestsPerMinute > 0 && 
        this.requestsThisMinute >= rateLimit.maxRequestsPerMinute) {
      return { allowed: false, reason: 'Rate limit exceeded (per minute)' };
    }
    if (rateLimit.maxRequestsPerDay > 0 && 
        this.requestsToday >= rateLimit.maxRequestsPerDay) {
      return { allowed: false, reason: 'Rate limit exceeded (per day)' };
    }
    
    // 检查预算
    const todayStats = costTracker.getTodayStats();
    if (config.cost.dailyBudget > 0 && 
        todayStats.costUSD >= config.cost.dailyBudget) {
      return { allowed: false, reason: 'Daily budget exceeded' };
    }
    
    this.requestsThisMinute++;
    this.requestsToday++;
    
    return { allowed: true };
  }
};

class AIService {
  constructor() {
    this.provider = config.provider;
    this.enabled = config.enabled;
  }
  
  // 获取当前 Provider
  getProvider() {
    if (!this.enabled) {
      return { name: 'disabled', generateQuestions: null, explainAnswer: null };
    }
    
    switch (this.provider) {
      case 'openrouter':
        return {
          name: 'openrouter',
          generateQuestions: openrouterService.generateQuestion.bind(openrouterService)
        };
      case 'minimax':
        return {
          name: 'minimax',
          generateQuestions: minimaxService.generateQuestions.bind(minimaxService),
          explainAnswer: minimaxService.explainAnswer.bind(minimaxService)
        };
      case 'mock':
      default:
        return {
          name: 'mock',
          generateQuestions: mockService.generateQuestions.bind(mockService),
          explainAnswer: mockService.explainAnswer.bind(mockService)
        };
    }
  }
  
  // 出题
  async generateQuestions(count = 5, difficulty = 2, topic = 'general') {
    // 检查开关
    if (!this.enabled) {
      return { 
        success: false, 
        error: 'AI service is disabled',
        provider: 'disabled'
      };
    }
    
    // 检查限流
    const rateCheck = rateLimiter.check();
    if (!rateCheck.allowed) {
      console.warn(`[AI] Rate limited: ${rateCheck.reason}`);
      return {
        success: false,
        error: rateCheck.reason,
        provider: this.provider
      };
    }
    
    const provider = this.getProvider();
    
    // 调用 Provider
    if (provider.generateQuestions) {
      try {
        return await provider.generateQuestions(count, difficulty, topic);
      } catch (err) {
        // Fallback to mock if primary provider fails
        console.warn(`[AI] Provider ${this.provider} failed: ${err.message}. Falling back to mock.`);
        this.provider = 'mock'; // Auto-switch
        const mockProvider = this.getProvider();
        return await mockProvider.generateQuestions(count, difficulty, topic);
      }
    }
    
    return {
      success: false,
      error: 'No question generator available',
      provider: provider.name
    };
  }
  
  // 解析
  async explainAnswer(question, userAnswer, correctAnswer) {
    if (!this.enabled) {
      return { success: false, error: 'AI service is disabled' };
    }
    
    const provider = this.getProvider();
    
    if (provider.explainAnswer) {
      return await provider.explainAnswer(question, userAnswer, correctAnswer);
    }
    
    return {
      success: false,
      error: 'No explainer available',
      provider: provider.name
    };
  }
  
  // 获取服务状态
  getStatus() {
    return {
      enabled: this.enabled,
      provider: this.provider,
      rateLimit: config.rateLimit,
      costStats: costTracker.getStats(),
      todayCost: costTracker.getTodayStats().costUSD,
      budget: config.cost.dailyBudget
    };
  }
  
  // 切换 Provider（运行时）
  setProvider(newProvider) {
    if (['mock', 'minimax', 'openrouter'].includes(newProvider)) {
      this.provider = newProvider;
      console.log(`[AI] Provider switched to: ${newProvider}`);
      return true;
    }
    return false;
  }
  
  // 开关 AI（运行时）
  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    console.log(`[AI] Service ${this.enabled ? 'enabled' : 'disabled'}`);
    return this.enabled;
  }
}

module.exports = new AIService();
