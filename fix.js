const fs = require('fs');
let f = fs.readFileSync('app/dashboard/connect/page.tsx', 'utf8');
f = f.replace(
  'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement',
  'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management'
);
fs.writeFileSync('app/dashboard/connect/page.tsx', f);
console.log('done');
```

Save, close Notepad, then run:
```
node fix.js