const fs = require('fs');
const path = require('path');

// Nettoyer screens
const screensDir = path.join(__dirname, 'screens');
const screenFiles = fs.readdirSync(screensDir).filter(f => f.endsWith('.js'));

screenFiles.forEach(file => {
  const filePath = path.join(screensDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  content = content.replace(/import\s+{[^}]*}\s+from\s+['"]\.\.\/database\/cropEngine['"];?\n?/g, '');
  content = content.replace(/import\s+{[^}]*}\s+from\s+['"]\.\.\/database\/maraicher['"];?\n?/g, '');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✓ screens/${file}`);
});

// Nettoyer services
const servicesDir = path.join(__dirname, 'services');
if (fs.existsSync(servicesDir)) {
  const serviceFiles = fs.readdirSync(servicesDir).filter(f => f.endsWith('.js'));
  
  serviceFiles.forEach(file => {
    const filePath = path.join(servicesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    content = content.replace(/import\s+{[^}]*}\s+from\s+['"]\.\.\/database\/cropEngine['"];?\n?/g, '');
    content = content.replace(/import\s+{[^}]*}\s+from\s+['"]\.\.\/database\/maraicher['"];?\n?/g, '');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ services/${file}`);
  });
}

console.log('\n✅ Nettoyage terminé');