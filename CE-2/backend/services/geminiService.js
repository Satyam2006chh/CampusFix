// ============================================================
// CampusFix — Gemini & AI Orchestration Service
// File: backend/services/geminiService.js
// ============================================================

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_PRIMARY_MODEL || 'openai/gpt-oss-120b';

/**
 * Call Google Gemini API (with Groq and deterministic fallback)
 * @param {string} prompt - Prompt text
 * @param {object} options - Options: jsonFormat, systemInstruction, maxTokens
 */
async function generateAiContent(prompt, options = {}) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  // 1. Try Google Gemini API if key is present
  if (geminiKey && geminiKey.trim() !== '' && geminiKey !== 'your_gemini_api_key_here') {
    try {
      const url = `${GEMINI_API_BASE}/${DEFAULT_GEMINI_MODEL}:generateContent?key=${geminiKey.trim()}`;
      
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: options.maxTokens || 1200,
        }
      };

      if (options.systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: options.systemInstruction }]
        };
      }

      if (options.jsonFormat) {
        payload.generationConfig.responseMimeType = 'application/json';
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      } else {
        console.warn('Gemini API returned error or empty response, falling back:', data.error || data);
      }
    } catch (geminiErr) {
      console.warn('Gemini API call failed, attempting fallback:', geminiErr.message);
    }
  }

  // 2. Fallback to Groq API if configured
  if (groqKey && groqKey.trim() !== '') {
    try {
      const messages = [];
      if (options.systemInstruction) {
        messages.push({ role: 'system', content: options.systemInstruction });
      }
      messages.push({ role: 'user', content: prompt });

      const payload = {
        model: GROQ_MODEL,
        messages,
        temperature: 0.2,
      };

      if (options.jsonFormat) {
        payload.response_format = { type: 'json_object' };
      }

      const res = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.choices && data.choices[0]?.message?.content) {
        return data.choices[0].message.content;
      }
    } catch (groqErr) {
      console.warn('Groq fallback failed:', groqErr.message);
    }
  }

  // 3. If no external API succeeds, throw error to trigger local deterministic engine
  throw new Error('AI external generation services unavailable. Local deterministic engine engaged.');
}

module.exports = {
  generateAiContent
};
