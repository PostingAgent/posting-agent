const fs = require('fs');
let f = fs.readFileSync('app/api/posts/publish/route.ts', 'utf8');

// Update tokenMap to also grab page_id
f = f.replace(
  "if (t.platform === 'instagram' && t.ig_user_id) igUserId = t.ig_user_id",
  "if (t.platform === 'instagram' && t.ig_user_id) igUserId = t.ig_user_id\n    if (t.platform === 'facebook' && t.page_id) pageId = t.page_id"
);

f = f.replace(
  "let igUserId = ''",
  "let igUserId = ''\n  let pageId = ''"
);

// Pass pageId to publishToPlatform
f = f.replace(
  "await publishToPlatform(platform, fullCaption, post.image_url, tokenMap[platform], igUserId)",
  "await publishToPlatform(platform, fullCaption, post.image_url, tokenMap[platform], igUserId, pageId)"
);

// Update function signature
f = f.replace(
  "igUserId: string\n)",
  "igUserId: string,\n  pageId: string\n)"
);

// Update facebook case to pass pageId
f = f.replace(
  "await postToFacebook(caption, imageUrl, accessToken)",
  "await postToFacebook(caption, imageUrl, accessToken, pageId)"
);

// Replace the entire postToFacebook function
var oldFb = f.indexOf("async function postToFacebook(caption: string, imageUrl: string, accessToken: string) {");
if (oldFb > -1) {
  var remaining = f.slice(oldFb);
  var endFb = remaining.lastIndexOf('}');
  f = f.slice(0, oldFb) +
`async function postToFacebook(caption: string, imageUrl: string, accessToken: string, pageId: string) {
  console.log("FB posting to page:", pageId);

  if (!pageId) {
    console.log("No FB page ID found, skipping Facebook post");
    return;
  }

  const res = await fetch(
    \`https://graph.facebook.com/v21.0/\${pageId}/photos\`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: imageUrl,
        caption,
        access_token: accessToken,
      }),
    }
  )
  const data = await res.json()
  console.log("FB post response:", JSON.stringify(data));
  if (!data.id) throw new Error(\`Facebook post error: \${JSON.stringify(data)}\`)
}
`;
}

fs.writeFileSync('app/api/posts/publish/route.ts', f);
console.log('done', f.split('\n').length, 'lines');