// Sends the assistant's question to Google Gemini (Google AI Studio key) or Anthropic Claude.
// Gemini is used when GEMINI_API_KEY (or GOOGLE_API_KEY) is set; otherwise ANTHROPIC_API_KEY.

export class AIError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code; }
}

export function aiProvider(env) {
  const g = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
  if (g) return { name: 'gemini', key: g, model: env.AI_MODEL || 'gemini-flash-latest' };
  if (env.ANTHROPIC_API_KEY) return { name: 'anthropic', key: env.ANTHROPIC_API_KEY, model: env.AI_MODEL || 'claude-sonnet-5-5' };
  return null;
}

export async function askAI(env, system, messages) {
  const p = aiProvider(env);
  if (!p) throw new AIError(503, 'The assistant is not set up. An admin needs to add GEMINI_API_KEY (from Google AI Studio) in the hosting settings, then redeploy.', 'not_configured');
  return p.name === 'gemini' ? gemini(p, system, messages) : anthropic(p, system, messages);
}

async function gemini(p, system, messages) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(p.model)}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': p.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig: { maxOutputTokens: 4096 },
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = String((j.error && j.error.message) || '');
    console.error('Gemini error', r.status, msg.slice(0, 300));
    if (r.status === 429) throw new AIError(429, 'The assistant is busy or the Google AI usage limit was reached. Wait a minute and ask again.', 'rate_limited');
    if (r.status === 404) throw new AIError(503, `Google does not recognise the model "${p.model}". An admin should set AI_MODEL to a current Gemini model, or remove it to use gemini-flash-latest.`, 'not_configured');
    if (r.status === 401 || r.status === 403 || /api key/i.test(msg)) throw new AIError(503, 'Google rejected the AI key. An admin needs to check GEMINI_API_KEY in the hosting settings.', 'not_configured');
    throw new AIError(502, 'The assistant could not answer just now. Ask again.', 'upstream_error');
  }
  if (j.promptFeedback && j.promptFeedback.blockReason) throw new AIError(422, 'The assistant could not answer that. Try asking it differently.', 'refused');
  const c = (j.candidates || [])[0] || {};
  const text = ((c.content && c.content.parts) || []).filter((x) => x.text && !x.thought).map((x) => x.text).join('').trim();
  if (!text) {
    if (c.finishReason === 'SAFETY' || c.finishReason === 'PROHIBITED_CONTENT') throw new AIError(422, 'The assistant could not answer that. Try asking it differently.', 'refused');
    throw new AIError(502, 'No answer came back. Try rephrasing.', 'empty_completion');
  }
  return { text, truncated: c.finishReason === 'MAX_TOKENS' };
}

async function anthropic(p, system, messages) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': p.key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: p.model, max_tokens: 1500, system, messages }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error('Anthropic error', r.status, j && j.error);
    if (r.status === 429) throw new AIError(429, 'The assistant is busy. Wait a minute and ask again.', 'rate_limited');
    if (r.status === 401 || r.status === 403) throw new AIError(503, 'The AI key was rejected. An admin needs to check ANTHROPIC_API_KEY in the hosting settings.', 'not_configured');
    throw new AIError(502, 'The assistant could not answer just now. Ask again.', 'upstream_error');
  }
  const text = (j.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('').trim();
  if (!text) throw new AIError(502, 'No answer came back. Try rephrasing.', 'empty_completion');
  return { text, truncated: j.stop_reason === 'max_tokens' };
}
