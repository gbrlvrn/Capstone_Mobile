const fs = require('fs');
const path = require('path');

const replacements = {
  'â†': '←',
  'â†—': '↗',
  'âœ“': '✓',
  'âœ*': '✕',
  'â€“': '–',
  'â€¢': '•',
  'âœ…': '✅',
  'â–²': '▲',
  'â–¼': '▼',
};

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  for (const [bad, good] of Object.entries(replacements)) {
    if (content.includes(bad)) {
      content = content.split(bad).join(good);
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed garbled strings in:', filePath);
  }
}

['screens', 'components'].forEach((dir) => {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach((f) => {
    if (f.endsWith('.jsx') || f.endsWith('.js')) {
      fixFile(path.join(dir, f));
    }
  });
});
