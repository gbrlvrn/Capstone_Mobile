const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const dirs = ['./screens', './components', './services'];

let totalFiles = 0;
let errors = [];

dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    if (file.endsWith('.js') || file.endsWith('.jsx')) {
      totalFiles++;
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      try {
        parser.parse(content, {
          sourceType: 'module',
          plugins: ['jsx'],
        });
      } catch (err) {
        errors.push(`${filePath}: ${err.message}`);
      }
    }
  });
});

console.log('--- BABEL SYNTAX AUDIT REPORT ---');
console.log(`Parsed ${totalFiles} JavaScript/JSX files.`);
if (errors.length === 0) {
  console.log('✅ ZERO syntax or JSX parsing errors found across all files!');
} else {
  console.log(`❌ Found ${errors.length} syntax/parsing errors:`);
  errors.forEach((e) => console.log('  - ' + e));
}
