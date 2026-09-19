const fs = require('fs');
const glob = require('glob');
const files = glob.sync('src/**/*.{ts,tsx}');
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/import\s+\{([^}]+)\}\s+from\s+['"](.*types.*)['"]/g, 'import type { $1 } from \'$2\'');
  fs.writeFileSync(f, c);
});
