/**
 * MiniMax AI Service - 真实模型接入
 * 
 * 实现出题与解析功能
 */

const axios = require('axios');
const config = require('../config');
const costTracker = require('../services/costTracker');

class MiniMaxService {
  constructor() {
    this.client = axios.create({
      baseURL: config.minimax.baseUrl,
      timeout: config.minimax.timeout,
      headers: {
        'Authorization': `Bearer ${config.minimax.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }
  
  // 计算预估费用
  calculateCost(inputTokens, outputTokens) {
    const { pricePer1MTokens } = config.cost;
    return (inputTokens / 1000000) * pricePer1MTokens.input +
           (outputTokens / 1000000) * pricePer1MTokens.output;
  }
  
  // 生成题目
  async generateQuestions(count = 5, difficulty = 2, topic = 'general') {
    const prompt = `请生成 ${count} 道 ${difficulty} 难度的选择题，主题：${topic}。
每道题包含：
- 问题描述 (prompt)
- 4 个选项 (options)
- 正确答案 (correct_answer)
- 难度级别 (difficulty: 1-3)

请以 JSON 格式返回，格式如下：
{
  "questions": [
    {
      "prompt": "...",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A",
      "difficulty": ${difficulty}
    }
  ]
}`;

    const startTime = Date.now();
    let inputTokens = 0;
    let outputTokens = 0;
    let costUSD = 0;

    try {
      const response = await this.client.post('', {
        model: config.minimax.model,
        messages: [
          { role: 'system', content: '你是一个英语教育助手，擅长出选择题。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const latency = Date.now() - startTime;
      
      // 解析响应
      const content = response.data.choices?.[0]?.message?.content || '';
      
      // 估算 token 数（简单估算：英文约 4 chars/token，中文约 1.5 chars/token）
      inputTokens = Math.ceil(prompt.length / 4);
      outputTokens = Math.ceil(content.length / 4);
      costUSD = this.calculateCost(inputTokens, outputTokens);
      
      // 解析 JSON
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        // 尝试提取 JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse AI response');
        }
      }
      
      // 记录成本
      costTracker.record('minimax', inputTokens, outputTokens, costUSD);
      
      console.log(`[MiniMax] Generated ${parsed.questions?.length || 0} questions in ${latency}ms, cost: $${costUSD.toFixed(4)}`);
      
      return {
        success: true,
        questions: parsed.questions || [],
        meta: {
          provider: 'minimax',
          latency,
          inputTokens,
          outputTokens,
          costUSD
        }
      };
      
    } catch (error) {
      console.error('[MiniMax] Error:', error.message);
      
      // 记录失败（无 cost）
      costTracker.record('minimax', inputTokens, outputTokens, 0);
      
      return {
        success: false,
        error: error.message,
        meta: {
          provider: 'minimax',
          latency: Date.now() - startTime
        }
      };
    }
  }
  
  // 解析答案
  async explainAnswer(question, userAnswer, correctAnswer) {
    const prompt = `请解释这道题的正确答案。

题目：${question}
用户答案：${userAnswer}
正确答案：${correctAnswer}

请用简洁的中文解释为什么正确答案正确，并说明用户可能犯错的地方。`;

    const startTime = Date.now();
    let inputTokens = Math.ceil(prompt.length / 4);
    let outputTokens = 0;

    try {
      const response = await this.client.post('', {
        model: config.minimax.model,
        messages: [
          { role: 'system', content: '你是一个英语教师，擅长解释题目。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 500
      });

      const content = response.data.choices?.[0]?.message?.content || '';
      outputTokens = Math.ceil(content.length / 4);
      const costUSD = this.calculateCost(inputTokens, outputTokens);
      
      costTracker.record('minimax', inputTokens, outputTokens, costUSD);
      
      return {
        success: true,
        explanation: content,
        meta: {
          provider: 'minimax',
          latency: Date.now() - startTime,
          costUSD
        }
      };
      
    } catch (error) {
      console.error('[MiniMax] Explain error:', error.message);
      costTracker.record('minimax', inputTokens, outputTokens, 0);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new MiniMaxService();
