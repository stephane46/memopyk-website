const express = require('express');
const path = require('path');

const app = express();
const port = 3003;

// Test if files exist
const distDir = path.resolve('dist');
const jsFile = path.join(distDir, 'assets', 'index-BmAE05Hm.js');
const fs = require('fs');

console.log('Dist directory:', distDir);
console.log('JS file exists:', fs.existsSync(jsFile));

// Simple static file serving
app.use(express.static(distDir));

app.listen(port, () => {
  console.log(`Test server running on http://localhost:${port}`);
  console.log(`Test JS file: http://localhost:${port}/assets/index-BmAE05Hm.js`);
});