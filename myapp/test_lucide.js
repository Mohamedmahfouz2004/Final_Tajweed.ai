const fs = require('fs');
const lucide = require('lucide-react');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = dir + '/' + file;
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(filePath));
    } else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walk('./src');
const allImports = new Set();

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lucideImports = content.match(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/g);
  if (lucideImports) {
    lucideImports.forEach(imp => {
      const names = imp.match(/\{([^}]+)\}/)[1].split(',').map(s => s.trim()).filter(s => s);
      names.forEach(n => allImports.add(n));
    });
  }
});

const missing = [];
allImports.forEach(name => {
  if (!lucide[name]) {
    missing.push(name);
  }
});

console.log('Missing icons:', missing.join(', '));
