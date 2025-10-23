const express = require('express');
const path = require('path');

const app = express();
const clientDist = path.resolve(process.cwd(), 'dist');

console.log('Testing static file serving from:', clientDist);

// Serve static files with correct MIME types
app.use(express.static(clientDist));

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.includes('.')) {
    res.sendFile(path.join(clientDist, 'index.html'));
  } else {
    res.status(404).send('Not found');
  }
});

app.listen(3002, () => {
  console.log('Simple test server running on port 3002');
});