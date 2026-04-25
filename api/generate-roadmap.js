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

  const prompt = `Ты — консультант по системному управлению бизнесом. Создай персональный Roadmap на 90 дней.

ДИАГНОСТИКА ${name || 'Руководителя'}: индекс ${index}/100. K=${scores.K}% A=${scores.A}% Q=${scores.Q}% S=${scores.S}%
Шкала: 0-39 критично, 40-59 слабо, 60-79 средне, 80-100 сильно.
K=процессы/SOP/метрики, A=автоматизация/AI/рутины, Q=KPI/контроль/качество, S=финансы/найм/рост.

Верни ТОЛЬКО JSON (без markdown, без пояснений):
{"summary":"2 предложения об общем состоянии бизнеса","profile":"2-3 слова профиль руководителя","redZones":[{"title":"проблема 1","description":"почему критично"},{"title":"проблема 2","description":"почему критично"},{"title":"проблема 3","description":"почему критично"}],"month1":{"theme":"фокус месяца 1","tasks":[{"action":"действие","axis":"K","impact":"результат"},{"action":"действие","axis":"A","impact":"результат"},{"action":"действие","axis":"Q","impact":"результат"},{"action":"действие","axis":"S","impact":"результат"}]},"month2":{"theme":"фокус месяца 2","tasks":[{"action":"действие","axis":"A","impact":"результат"},{"action":"действие","axis":"K","impact":"результат"},{"action":"действие","axis":"Q","impact":"результат"},{"action":"действие","axis":"S","impact":"результат"}]},"month3":{"theme":"фокус месяца 3","tasks":[{"action":"действие","axis":"S","impact":"результат"},{"action":"действие","axis":"A","impact":"результат"},{"action":"действие","axis":"Q","impact":"результат"},{"action":"действие","axis":"K","impact":"результат"}]},"axisInsights":{"K":"рекомендация по K","A":"рекомендация по A","Q":"рекомендация по Q","S":"рекомендация по S"},"templates":["K_registry","A_audit"]}

Замени все значения на конкретные для данного клиента. Для templates выбери 2-3 из: K_registry K_sop K_metrics K_onboard A_audit A_roi A_tools A_checklist Q_kpi Q_risks Q_errors Q_checkpoints S_pl S_cashflow S_raci S_hire — только для осей ниже 60%.`

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

    const roadmap = JSON.parse(jsonMatch[0])
    return res.status(200).json(roadmap)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
