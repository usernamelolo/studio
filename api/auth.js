module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { password } = req.body || {};
    const correct = process.env.SITE_PASSWORD;

    if (!correct) return res.status(500).json({ success: false, message: 'Пароль не настроен' });
    if (password === correct) return res.status(200).json({ success: true });
    return res.status(401).json({ success: false });
  }

  res.status(405).json({ success: false });
};
