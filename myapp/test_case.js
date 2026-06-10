const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}
const files = walk('./src');
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const matches = content.match(/from\s+['"](.*?)['"]/g) || [];
  matches.forEach(m => {
    const importPath = m.match(/['"](.*?)['"]/)[1];
    if (importPath.startsWith('.')) {
      const resolved = path.resolve(path.dirname(f), importPath);
      let found = false;
      const extensions = ['.js', '.jsx', '/index.js', '/index.jsx'];
      for (const ext of extensions) {
        if (fs.existsSync(resolved + ext)) {
           const dir = path.dirname(resolved + ext);
           const base = path.basename(resolved + ext);
           const filesInDir = fs.readdirSync(dir);
           if (!filesInDir.includes(base)) {
              console.log('CASE SENSITIVITY ERROR:', f, 'imports', importPath, 'as', base, 'but actual is different');
           }
           found = true;
           break;
        }
      }
      if (!found && fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
         console.log('DIR IMPORT WITHOUT INDEX:', f, importPath);
      }
    }
  });
});
console.log('Done');
