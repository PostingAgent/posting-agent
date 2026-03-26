const fs = require('fs');
let f = fs.readFileSync('app/dashboard/review/page.tsx', 'utf8');

// Find where the component starts its return/JSX
var idx = f.indexOf('<h1');
if (idx > -1) {
  f = f.slice(0, idx) +
`<div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Review posts</h1>
          <p className="text-sm text-gray-500">Posting Agent wrote these captions from your new photos. Edit anything, then approve.</p>
        </div>
        <button
          onClick={async () => {
            setChecking(true)
            await fetch('/api/watch')
            window.location.reload()
          }}
          disabled={checking}
          className="btn-primary"
        >
          {checking ? 'Checking...' : 'Check for new photos'}
        </button>
      </div>` +
  f.slice(f.indexOf('</p>', idx) + 4);
}

// Add checking state
if (f.includes('useState')) {
  f = f.replace(
    "const [saving, setSaving] = useState",
    "const [checking, setChecking] = useState(false)\n  const [saving, setSaving] = useState"
  );
}

fs.writeFileSync('app/dashboard/review/page.tsx', f);
console.log('done', f.split('\n').length, 'lines');