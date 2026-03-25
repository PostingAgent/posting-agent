const fs = require('fs');
const lines = fs.readFileSync('app/dashboard/connect/page.tsx', 'utf8').split('\n');
const out = [];

for (let i = 0; i < lines.length; i++) {
  // Add metaConnected state after saved state
  if (lines[i].includes('const [saved, setSaved] = useState(false)')) {
    out.push(lines[i]);
    out.push('  const [metaConnected, setMetaConnected] = useState(false)');
    continue;
  }

  // Add connectMeta and checkMetaConnection after createClient
  if (lines[i].includes('const supabase = createClient()')) {
    out.push(lines[i]);
    out.push('');
    out.push('  function connectMeta() {');
    out.push('    const params = new URLSearchParams({');
    out.push('      client_id: "2452114718572183",');
    out.push('      redirect_uri: window.location.origin + "/api/meta/callback",');
    out.push('      scope: "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement",');
    out.push('      response_type: "code",');
    out.push('    })');
    out.push('    window.location.href = "https://www.facebook.com/v21.0/dialog/oauth?" + params');
    out.push('  }');
    out.push('');
    out.push('  async function checkMetaConnection() {');
    out.push('    const { data: { user } } = await supabase.auth.getUser()');
    out.push('    const { data } = await supabase');
    out.push('      .from("social_tokens")');
    out.push('      .select("platform")');
    out.push('      .eq("user_id", user.id)');
    out.push('      .eq("platform", "instagram")');
    out.push('      .single()');
    out.push('    if (data) setMetaConnected(true)');
    out.push('  }');
    continue;
  }

  // Add checkMetaConnection call after loadProfile
  if (lines[i].includes('loadProfile()') && lines[i+1] && lines[i+1].includes('}, [])')) {
    out.push(lines[i]);
    out.push('    checkMetaConnection()');
    continue;
  }

  // Add Step 4 before saving indicator
  if (lines[i].includes('{saving && <p className="text-sm text-gray-400">Saving...</p>}')) {
    out.push('      {/* Step 4: Connect Instagram & Facebook */}');
    out.push('      <div className="card mb-6">');
    out.push('        <div className="flex items-center justify-between">');
    out.push('          <div>');
    out.push('            <h2 className="text-sm font-semibold text-gray-800">Step 4 \u2014 Connect Instagram & Facebook</h2>');
    out.push('            <p className="text-xs text-gray-500 mt-1">');
    out.push('              Connect your Instagram Business account to publish posts automatically.');
    out.push('            </p>');
    out.push('          </div>');
    out.push('          {metaConnected ? (');
    out.push('            <span className="text-xs bg-green-50 text-green-700 font-medium px-3 py-1.5 rounded-full">');
    out.push('              Connected \u2713');
    out.push('            </span>');
    out.push('          ) : (');
    out.push('            <button onClick={connectMeta} className="btn-primary">');
    out.push('              Connect Instagram');
    out.push('            </button>');
    out.push('          )}');
    out.push('        </div>');
    out.push('      </div>');
    out.push('');
    out.push(lines[i]);
    continue;
  }

  out.push(lines[i]);
}

fs.writeFileSync('app/dashboard/connect/page.tsx', out.join('\n'));
console.log('done', out.length, 'lines');