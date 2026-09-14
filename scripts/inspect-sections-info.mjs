import fs from 'node:fs';
import path from 'node:path';

function inspectDir(name, dir) {
  console.log(`\n=== ${name} (${dir}) ===`);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  files.forEach(f => {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    console.log(`${f.padEnd(45)} count: ${data.length}  IDs: ${data[0]?.id}..${data[data.length - 1]?.id}`);
  });
}

inspectDir('Texnologiya (Dizayn)', 'fan 4/Texnologiya (Dizayn)/bolimlar');
inspectDir('Texnologiya (Servis)', 'fan 4/Texnologiya (Servis)/bolimlar');
inspectDir('Fizika', 'fan 4/Fizika/bolimlar');
