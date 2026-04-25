module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API not configured' })

  const { name, index, scores } = req.body || {}
  if (!scores || typeof index !== 'number') return res.status(400).json({ error: 'Missing data' })

  const prompt = `You are a business management consultant. Generate a 90-day roadmap based on K-AQS diagnostic results.

Client: ${name || 'Owner'}, Index: ${index}/100, K=${scores.K}%, A=${scores.A}%, Q=${scores.Q}%, S=${scores.S}%
Scale: 0-39 critical, 40-59 weak, 60-79 medium, 80-100 strong.
K=knowledge/processes/SOP, A=automation/AI/tools, Q=quality/KPI/control, S=scale/finance/hiring.

Return ONLY valid JSON, no markdown, no comments, no trailing commas. Use Russian language for all text values.

Required structure:
{
  "summary": "2 sentences about business state",
  "profile": "2-3 word manager profile",
  "redZones": [
    {"title": "problem name", "description": "why critical"},
    {"title": "problem name", "description": "why critical"},
    {"title": "problem name", "description": "why critical"}
  ],
  "month1": {
    "theme": "month focus name",
    "tasks": [
      {"action": "specific action", "axis": "K", "impact": "result"},
      {"action": "specific action", "axis": "A", "impact": "result"},
      {"action": "specific action", "axis": "Q", "impact": "result"},
      {"action": "specific action", "axis": "S", "impact": "result"}
    ]
  },
  "month2": {
    "theme": "month focus name",
    "tasks": [
      {"action": "specific action", "axis": "A", "impact": "result"},
      {"action": "specific action", "axis": "K", "impact": "result"},
      {"action": "specific action", "axis": "Q", "impact": "result"},
      {"action": "specific action", "axis": "S", "impact": "result"}
    ]
  },
  "month3": {
    "theme": "month focus name",
    "tasks": [
      {"action": "specific action", "axis": "S", "impact": "result"},
      {"action": "specific action", "axis": "A", "impact": "result"},
      {"action": "specific action", "axis": "Q", "impact": "result"},
      {"action": "specific action", "axis": "K", "impact": "result"}
    ]
  },
  "axisInsights": {
    "K": "recommendation for K axis",
    "A": "recommendation for A axis",
    "Q": "recommendation for Q axis",
    "S": "recommendation for S axis"
  },
  "templates": ["K_registry", "A_audit"]
}

For templates pick 2-3 from: K_registry K_sop K_metrics K_onboard A_audit A_roi A_tools A_checklist Q_kpi Q_risks Q_errors Q_checkpoints S_pl S_cashflow S_raci S_hire. Only for axes below 60%.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'AI error' })

    const text = data.content?.[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return res.status(500).json({ error: 'Invalid AI response', raw: text })

    // Strip JS comments and trailing commas before parsing
    const cleaned = jsonMatch[0]
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/,(\s*[}\]])/g, '$1')

    const roadmap = JSON.parse(cleaned)
    return res.status(200).json(roadmap)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
