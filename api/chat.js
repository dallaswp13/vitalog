// api/chat.js — Vercel Serverless Function
// Secure proxy between Vitalog frontend and Anthropic API.
// Updated: supports multimodal messages (text + image for nutrition label scanning)

export default async function handler(req, res) {
  // CORS headers — required for browser fetch calls
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set');
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { messages, system, max_tokens = 1024 } = body || {};
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // Validate and sanitize messages — allow text strings and multimodal arrays
  const sanitizedMessages = messages.map(msg => {
    // If content is a string, wrap in text block
    if (typeof msg.content === 'string') {
      return { role: msg.role, content: msg.content };
    }
    // If content is an array (multimodal: text + image blocks), pass through
    if (Array.isArray(msg.content)) {
      return { role: msg.role, content: msg.content };
    }
    return msg;
  });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens,
        system: system || 'You are a helpful health and nutrition assistant.',
        messages: sanitizedMessages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic error:', response.status, err);
      return res.status(response.status).json({ error: `Anthropic error: ${response.status} — ${err}` });
    }

    const data = await response.json();
    const text = data.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    return res.status(200).json({ text });
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
