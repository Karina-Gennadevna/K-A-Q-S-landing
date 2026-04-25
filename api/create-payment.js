const { randomUUID } = require('crypto')

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const shopId = process.env.YOOKASSA_SHOP_ID
  const secretKey = process.env.YOOKASSA_SECRET_KEY
  const promoCode = process.env.PROMO_CODE_100
  if (!shopId || !secretKey) return res.status(500).json({ error: 'Payment not configured' })

  const { promo } = req.body || {}
  const isPromo = promoCode && promo && promo.trim().toUpperCase() === promoCode.toUpperCase()
  const amount = isPromo ? '1.00' : '14990.00'

  const origin = req.headers.origin || req.headers.referer || 'https://k-a-q-s-landing-1zsr.vercel.app'
  const returnUrl = origin.replace(/\/$/, '') + '/roadmap.html'

  try {
    const response = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': randomUUID(),
        'Authorization': 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64'),
      },
      body: JSON.stringify({
        amount: { value: amount, currency: 'RUB' },
        confirmation: { type: 'redirect', return_url: returnUrl },
        description: isPromo ? 'Roadmap K-A-Q-S™ [тест]' : 'Roadmap K-A-Q-S™ на 90 дней',
        capture: true,
      }),
    })

    const data = await response.json()
    if (!response.ok) return res.status(500).json({ error: data.description || 'Payment error' })

    return res.status(200).json({ url: data.confirmation.confirmation_url })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
