module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    let body = {};
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    } catch (e) {}

    const { username, password } = body;

    if (username === process.env.SITE_USERNAME && password === process.env.SITE_PASSWORD) {
      return res.status(200).json({ success: true });
    }
    return res.status(401).json({ success: false });
  }
  res.status(405).json({ success: false });
};
