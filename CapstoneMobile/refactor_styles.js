const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, 'screens');
const files = fs.readdirSync(screensDir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const filePath = path.join(screensDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Skip files that don't have StyleSheet.create or useTheme
  if (!content.includes('StyleSheet.create({') || !content.includes('useTheme()')) {
    return;
  }

  let modified = false;

  // 1. Add useMemo to React import if missing
  const reactImportRegex = /import\s+React\s*(?:,\s*\{([^}]+)\})?\s*from\s+['"]react['"]/;
  const match = content.match(reactImportRegex);
  if (match) {
    const existingNamedImports = match[1] ? match[1].split(',').map(s => s.trim()) : [];
    if (!existingNamedImports.includes('useMemo')) {
      existingNamedImports.push('useMemo');
      const newImport = `import React, { ${existingNamedImports.join(', ')} } from "react"`;
      content = content.replace(reactImportRegex, newImport);
      modified = true;
    }
  }

  // 2. Change const styles = StyleSheet.create({ to const getStyles = (C) => StyleSheet.create({
  if (content.includes('const styles = StyleSheet.create({')) {
    content = content.replace('const styles = StyleSheet.create({', 'const getStyles = (C) => StyleSheet.create({');
    modified = true;
  }

  // 3. In the component, find `const { colors } = useTheme();` and inject `const styles = React.useMemo(() => getStyles(C), [C]);`
  const themeRegex = /const\s+\{\s*colors\s*\}\s*=\s*useTheme\(\);/;
  if (themeRegex.test(content) && !content.includes('getStyles(C)')) {
    content = content.replace(themeRegex, `const { colors } = useTheme();\n  const C = colors;\n  const styles = useMemo(() => getStyles(C), [C]);`);
    modified = true;
  }

  // remove duplicated `const C = colors;` just in case
  const redundantC = /const\s+C\s*=\s*colors;\s*const\s+C\s*=\s*colors;/g;
  if (redundantC.test(content)) {
    content = content.replace(redundantC, 'const C = colors;');
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${file}`);
  }
});
