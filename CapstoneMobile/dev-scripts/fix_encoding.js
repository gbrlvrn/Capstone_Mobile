const fs = require('fs');
const path = require('path');

const replacements = {
  '—\x9D': '—',
  'Ã¢Å“â€¦': '✅',
  'ÃƒÂ¢Ã¢â‚¬Â\x9DÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â\x9DÃ¢â€šÂ¬': '—',
  'âœ…': '✅',
  'â–²': '▲',
  'â–¼': '▼',
  'âœ“': '✓',
  'â€¢': '•',
  'âœ•': '✕'
};

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  for (const [bad, good] of Object.entries(replacements)) {
    if (content.includes(bad)) {
      content = content.split(bad).join(good);
      changed = true;
    }
  }
  
  // also fix multiple other common corruptions:
  content = content.replace(/ÃƒÂ¢Ã¢â‚¬Â\x9DÃ¢â€šÂ¬/g, '—');
  content = content.replace(/Ã¢â‚¬â€œ/g, '—');
  content = content.replace(/Ã‚Â/g, ' ');

  if (content !== fs.readFileSync(filePath, 'utf8')) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed', filePath);
  }
}

['screens', 'components'].forEach(dir => {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    if (f.endsWith('.jsx') || f.endsWith('.js')) {
      fixFile(path.join(dir, f));
    }
  });
});
