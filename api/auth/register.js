export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Only POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  const { email } = req.body || {};
  
  if (!email) {
    res.status(400).json({ error: 'Email required' });
    return;
  }
  
  // Mock response
  res.status(200).json({
    success: true,
    user: {
      id: 'user-123',
      email: email,
      role: 'student'
    },
    token: 'jwt-token-' + Date.now()
  });
}
