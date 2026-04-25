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

  const prompt = `Ты — стратегический консультант по системному управлению малым бизнесом. Создай персональный Roadmap на 90 дней по методологии K-AQS™.

РЕЗУЛЬТАТЫ ДИАГНОСТИКИ:
- Имя: ${name || 'Руководитель'}
- Общий индекс управляемости: ${index}/100
- K (Знания/Системность): ${scores.K}%
- A (Автоматизация): ${scores.A}%
- Q (Качество/Контроль): ${scores.Q}%
- S (Масштаб/Рост): ${scores.S}%

ЧТО ОЗНАЧАЕТ КАЖДАЯ ОСЬ:
- K (Knowledge): описаны ли процессы, есть ли SOP, метрики, система онбординга
- A (Automation): автоматизированы ли рутины, есть ли AI-инструменты, считается ли ROI
- Q (Quality): есть ли KPI, контроль ошибок, стандарты качества, точки контроля
- S (Scale): готовность к росту — P&L, Cash Flow, найм, делегирование, RACI

ШКАЛА: 0–39% = красная зона (критично), 40–59% = слабо (требует внимания), 60–79% = средне, 80–100% = сильно.

Верни ТОЛЬКО валидный JSON без markdown, пояснений и дополнительного текста:
{
  "summary": "2-3 предложения: честная оценка текущего состояния бизнеса — что работает, что тормозит рост, в чём главный риск",
  "profile": "название профиля руководителя — точное и образное, 2-4 слова (примеры: 'Эксперт без системы', 'Деятельный старт', 'Зрелый управленец', 'Перегруженный основатель')",
  "redZones": [
    {"title": "краткое название проблемы", "description": "1-2 предложения: что происходит сейчас и почему это критично для бизнеса"},
    {"title": "...", "description": "..."},
    {"title": "...", "description": "..."}
  ],
  "month1": {
    "theme": "название фокуса первого месяца (например: 'Фиксация основ')",
    "tasks": [
      {"action": "конкретное действие, которое можно выполнить за 1-2 недели", "axis": "K", "impact": "что изменится после этого действия"},
      {"action": "...", "axis": "A", "impact": "..."},
      {"action": "...", "axis": "Q", "impact": "..."},
      {"action": "...", "axis": "S", "impact": "..."},
      {"action": "...", "axis": "K", "impact": "..."}
    ]
  },
  "month2": {
    "theme": "название фокуса второго месяца",
    "tasks": [
      {"action": "...", "axis": "A", "impact": "..."},
      {"action": "...", "axis": "A", "impact": "..."},
      {"action": "...", "axis": "Q", "impact": "..."},
      {"action": "...", "axis": "K", "impact": "..."},
      {"action": "...", "axis": "S", "impact": "..."}
    ]
  },
  "month3": {
    "theme": "название фокуса третьего месяца",
    "tasks": [
      {"action": "...", "axis": "S", "impact": "..."},
      {"action": "...", "axis": "S", "impact": "..."},
      {"action": "...", "axis": "A", "impact": "..."},
      {"action": "...", "axis": "Q", "impact": "..."},
      {"action": "...", "axis": "K", "impact": "..."}
    ]
  },
  "axisInsights": {
    "K": "конкретная рекомендация по оси K — что делать исходя из результата ${scores.K}%",
    "A": "конкретная рекомендация по оси A — что делать исходя из результата ${scores.A}%",
    "Q": "конкретная рекомендация по оси Q — что делать исходя из результата ${scores.Q}%",
    "S": "конкретная рекомендация по оси S — что делать исходя из результата ${scores.S}%"
  },
  "templates": ["K_registry", "A_audit"]
}

Для поля templates выбирай только шаблоны для осей с результатом ниже 60%.
Доступные шаблоны: K_registry, K_sop, K_metrics, K_onboard, A_audit, A_roi, A_tools, A_checklist, Q_kpi, Q_risks, Q_errors, Q_checkpoints, S_pl, S_cashflow, S_raci, S_hire.
Выбирай 2-3 самых важных шаблона, не больше.

Важно: будь конкретен, избегай общих фраз. Каждое действие должно быть чётким и выполнимым.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2500,
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
