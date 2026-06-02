import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'src', 'components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/,\s*\{\s*label:\s*"Credits"[^}]+\}/g, '');
  content = content.replace(/\{\s*label:\s*"Credits"[^}]+\},\s*/g, '');
  content = content.replace(/\{\s*label:\s*"Credits"[^}]+\}/g, '');
  fs.writeFileSync(filePath, content);
}
console.log('Done');
