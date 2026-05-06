const fs = require('fs');
['0','1','2','3','4','5','6'].forEach(id => {
  try {
    const content = fs.readFileSync('./src/data/questions_' + id + '.js', 'utf8');
    const matches1 = content.match(/q:\s*['"`]/g) || [];
    const matches2 = content.match(/"q":\s*['"`]/g) || [];
    console.log(id + ':', matches1.length + matches2.length);
  } catch (e) {
    console.log(id + ':', e.message);
  }
});
