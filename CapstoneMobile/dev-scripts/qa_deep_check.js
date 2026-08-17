const fs = require('fs');
const path = require('path');

const dirs = ['./screens', './components', './services'];

let totalFiles = 0;
let errors = [];

dirs.forEach((dir) => {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    if (file.endsWith('.js') || file.endsWith('.jsx')) {
      totalFiles++;
      const filePath = path.join(dir, file);
      let rawContent = fs.readFileSync(filePath, 'utf8');
      // Strip comments
      const content = rawContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

      // Check for broken imports like require('../assets/...') that don't exist
      const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
      let match;
      while ((match = requireRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('.')) {
          const resolved = path.resolve(dir, importPath);
          const hasFile = fs.existsSync(resolved) ||
            fs.existsSync(resolved + '.png') ||
            fs.existsSync(resolved + '.jpg') ||
            fs.existsSync(resolved + '.js') ||
            fs.existsSync(resolved + '.jsx') ||
            fs.existsSync(resolved + '.json');
          if (!hasFile) {
            errors.push(`Missing asset/file import in ${filePath}: ${importPath}`);
          }
        }
      }

      // Check for ES6 import statements of relative paths
      const es6ImportRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
      while ((match = es6ImportRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('.')) {
          const resolved = path.resolve(dir, importPath);
          const hasFile = fs.existsSync(resolved) ||
            fs.existsSync(resolved + '.js') ||
            fs.existsSync(resolved + '.jsx') ||
            fs.existsSync(resolved + '.json') ||
            fs.existsSync(resolved + '/index.js');
          if (!hasFile) {
            errors.push(`Missing relative module import in ${filePath}: ${importPath}`);
          }
        }
      }
    }
  });
});

console.log('--- DEEP IMPORT & ASSET AUDIT REPORT ---');
console.log(`Scanned ${totalFiles} files.`);
if (errors.length === 0) {
  console.log('✅ ZERO missing imports or missing asset files found!');
} else {
  console.log(`❌ Found ${errors.length} broken import references:`);
  errors.forEach((e) => console.log('  - ' + e));
}
