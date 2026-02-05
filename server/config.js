/**
 * AI Configuration - C-Round
 * 
 * 控制 AI 服务的开关、回退、限流、成本统计
 */

require('dotenv').config();

module.exports = {
  // AI 开关
  enabled: process.env.AI_ENABLED === 'true' || true,  // 默认开启
  
  // AI Provider: 'mock' | 'minimax'
  provider: process.env.AI_PROVIDER || 'mock',
  
  // MiniMax 配置
  minimax: {
    apiKey: process.env.MINIMAX_API_KEY || '',
    baseUrl: process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat/v1/text/chatcompletion_v2',
    model: process.env.MINIMAX_MODEL || 'abab6.5s-chat',
    timeout: parseInt(process.env.MINIMAX_TIMEOUT) || 15000,
  },
  
  // 限流配置
  rateLimit: {
    // 每分钟最大请求数（0 = 不限制）
    maxRequestsPerMinute: parseInt(process.env.AI_RATE_LIMIT_PER_MIN) || 0,
    // 每日最大请求数（0 = 不限制）
    maxRequestsPerDay: parseInt(process.env.AI_RATE_LIMIT_PER_DAY) || 0,
  },
  
  // 成本配置
  cost: {
    // MiniMax 价格（每 1M tokens）
    pricePer1MTokens: {
      input: parseFloat(process.env.MINIMAX_PRICE_INPUT) || 1.0,    // USD
      output: parseFloat(process.env.MINIMAX_PRICE_OUTPUT) || 2.0, // USD
    },
    // 每日预算限制（USD，0 = 不限制）
    dailyBudget: parseFloat(process.env.AI_DAILY_BUDGET) || 0,
  },
  
  // 功能开关
  features: {
    generateQuestions: process.env.AI_FEATURE_GENERATE !== 'false',
    explainAnswer: process.env.AI_FEATURE_EXPLAIN !== 'false',
  }
};
