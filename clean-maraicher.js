const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, 'screens');
const files = fs.readdirSync(screensDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(screensDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Supprime les imports maraicher
  content = content.replace(/import\s+{[^}]*}\s+from\s+['"]\.\.\/database\/maraicher['"];?\n?/g, '');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✓ ${file}`);
});

console.log('\n✅ Nettoyage terminé');