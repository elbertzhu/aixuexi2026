/**
 * AI Cost Tracker - 成本统计服务
 * 
 * 统计 AI API 调用次数、token 使用量、预估费用
 */

const fs = require('fs');
const path = require('path');

const COST_LOG_PATH = path.join(__dirname, '../data/ai_cost_log.json');

class CostTracker {
  constructor() {
    this.stats = {
      totalRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUSD: 0,
      byDate: {},
      byProvider: {}
    };
    this.loadFromDisk();
  }
  
  loadFromDisk() {
    try {
      if (fs.existsSync(COST_LOG_PATH)) {
        const data = fs.readFileSync(COST_LOG_PATH, 'utf-8');
        const loaded = JSON.parse(data);
        this.stats = { ...this.stats, ...loaded };
      }
    } catch (e) {
      console.warn('[AI Cost] Failed to load cost log:', e.message);
    }
  }
  
  saveToDisk() {
    try {
      const dir = path.dirname(COST_LOG_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(COST_LOG_PATH, JSON.stringify(this.stats, null, 2));
    } catch (e) {
      console.error('[AI Cost] Failed to save cost log:', e.message);
    }
  }
  
  // 记录一次 API 调用
  record(provider, inputTokens, outputTokens, costUSD) {
    const today = new Date().toISOString().split('T')[0];
    
    this.stats.totalRequests++;
    this.stats.totalInputTokens += inputTokens;
    this.stats.totalOutputTokens += outputTokens;
    this.stats.totalCostUSD += costUSD;
    
    // 按日期统计
    if (!this.stats.byDate[today]) {
      this.stats.byDate[today] = {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        costUSD: 0
      };
    }
    this.stats.byDate[today].requests++;
    this.stats.byDate[today].inputTokens += inputTokens;
    this.stats.byDate[today].outputTokens += outputTokens;
    this.stats.byDate[today].costUSD += costUSD;
    
    // 按 provider 统计
    if (!this.stats.byProvider[provider]) {
      this.stats.byProvider[provider] = {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        costUSD: 0
      };
    }
    this.stats.byProvider[provider].requests++;
    this.stats.byProvider[provider].inputTokens += inputTokens;
    this.stats.byProvider[provider].outputTokens += outputTokens;
    this.stats.byProvider[provider].costUSD += costUSD;
    
    this.saveToDisk();
  }
  
  // 获取今日统计
  getTodayStats() {
    const today = new Date().toISOString().split('T')[0];
    return this.stats.byDate[today] || {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      costUSD: 0
    };
  }
  
  // 获取完整统计
  getStats() {
    return this.stats;
  }
  
  // 重置（仅用于测试）
  reset() {
    this.stats = {
      totalRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUSD: 0,
      byDate: {},
      byProvider: {}
    };
    this.saveToDisk();
  }
}

// Singleton instance
const costTracker = new CostTracker();

module.exports = costTracker;
