const config = require('../config');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = {
  generateQuestion: async (level, knownWords = []) => {
    const model = process.env.OPENROUTER_MODEL || 'google/gemini-pro';
    
    // HARD CAP for stability (prevent 402 errors)
    const MAX_TOKENS = 4096;

    // Prepare payload
    const payload = {
        model: model,
        max_tokens: MAX_TOKENS,
        messages: [{
            role: 'system',
            content: 'You are an English teacher. Generate a multiple-choice question for English learning. Return ONLY valid JSON in the format: { "id": "uuid", "question": "text", "options": ["A","B","C","D"], "answer": "A", "explanation": "text" }.'
        }, {
            role: 'user',
            content: `Generate a level ${level} question.`
        }]
    };

    // Log sanitized request details
    const promptChars = payload.messages.map(m => m.content).join('\n').length;
    console.log(`[OpenRouter] REQUEST: model=${payload.model}, max_tokens=${payload.max_tokens}, prompt_chars=${promptChars}`);

    // Check key AFTER logging (for verification purposes)
    const apiKey = (config.ai && config.ai.openRouterKey) || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      const err = new Error('OPENROUTER_KEY_MISSING');
      err.code = 'OPENROUTER_KEY_MISSING';
      throw err;
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://clawdbot.local', 
                'X-Title': 'Clawdbot Dev'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
             const body = await response.text();
             console.error(`[OpenRouter] Error: ${body}`);
             
             // Handle 402 specifically
             if (response.status === 402) {
                 const err = new Error('OPENROUTER_402_INSUFFICIENT_CREDITS');
                 err.code = 'OPENROUTER_402_INSUFFICIENT_CREDITS';
                 throw err;
             }
             
             throw new Error(`OpenRouter Error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        try {
            const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
            const json = JSON.parse(cleanContent);
            return json;
        } catch (jsonErr) {
             const err = new Error('BAD_PROVIDER_JSON');
             err.code = 'BAD_PROVIDER_JSON';
             throw err;
        }

    } catch (err) {
        console.error(`[OpenRouter] Exception:`, err.message);
        throw err; // Will be caught by index.js strategy and trigger fallback
    }
  }
};
