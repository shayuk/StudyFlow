module.exports = (req, res) => {
  // Set all CORS headers immediately
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  // For OPTIONS, return immediately
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Simple response
  res.status(200).send('pong');
};
