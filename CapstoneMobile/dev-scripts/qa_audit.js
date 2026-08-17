const fs = require('fs');
const path = require('path');

const dirs = ['./screens', './services', './components', './App.js', './index.js'];
let fileCount = 0;
let issues = [];

function checkFile(filePath) {
  fileCount++;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Check 1: Hardcoded localhost or dev IPs outside config.js
  lines.forEach((line, idx) => {
    if ((line.includes('http://localhost') || line.includes('http://127.0.0.1') || line.includes('192.168.')) && !filePath.includes('config.js')) {
      if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
        issues.push({
          type: 'HARDCODED_IP_OR_LOCALHOST',
          file: filePath,
          line: idx + 1,
          content: line.trim()
        });
      }
    }
  });

  // Check 2: Screens missing ThemeContext / useTheme that have hardcoded light backgrounds
  if (filePath.includes('screens') && !content.includes('useTheme') && !content.includes('ThemeContext')) {
    if (content.includes("backgroundColor: '#fff'") || content.includes("backgroundColor: '#FFFFFF'") || content.includes('backgroundColor: "#fff"')) {
      issues.push({
        type: 'THEME_MISSING_USE_THEME',
        file: filePath,
        line: 1,
        content: 'Screen uses hardcoded white background without theme context'
      });
    }
  }

  // Check 3: Missing SafeAreaView or safe inset handling in main screens
  if (filePath.includes('screens') && !content.includes('SafeAreaView') && !content.includes('useSafeAreaInsets') && !content.includes('MainLayout')) {
    issues.push({
      type: 'MISSING_SAFE_AREA',
      file: filePath,
      line: 1,
      content: 'Screen does not wrap content in SafeAreaView, useSafeAreaInsets, or MainLayout'
    });
  }

  // Check 4: Unhandled AsyncStorage direct reads without try/catch
  if (content.includes('AsyncStorage.getItem') && !content.includes('try {')) {
    issues.push({
      type: 'UNHANDLED_ASYNC_STORAGE',
      file: filePath,
      line: 1,
      content: 'AsyncStorage read outside try/catch block'
    });
  }
}

function scan(item) {
  if (fs.statSync(item).isDirectory()) {
    const files = fs.readdirSync(item);
    for (const f of files) scan(path.join(item, f));
  } else if (item.endsWith('.js') || item.endsWith('.jsx')) {
    checkFile(item);
  }
}

dirs.forEach(d => {
  if (fs.existsSync(d)) scan(d);
});

console.log('==================================================');
console.log('CAPSTONE MOBILE AUDIT REPORT');
console.log('==================================================');
console.log(`Total files scanned: ${fileCount}`);
console.log(`Total issues identified: ${issues.length}\n`);

issues.forEach((iss, index) => {
  console.log(`[${index + 1}] [${iss.type}] ${iss.file}:${iss.line}`);
  console.log(`    Detail: ${iss.content}\n`);
});
