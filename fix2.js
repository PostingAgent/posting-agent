const fs = require('fs');
let f = fs.readFileSync('app/api/posts/publish/route.ts', 'utf8');

// Update tokenMap to include ig_user_id
f = f.replace(
  "const tokenMap: Record<string, string> = {}\n  tokens?.forEach((t: { platform: string, access_token: string }) => {\n    tokenMap[t.platform] = t.access_token\n  })",
  "const tokenMap: Record<string, string> = {}\n  let igUserId = ''\n  tokens?.forEach((t: any) => {\n    tokenMap[t.platform] = t.access_token\n    if (t.platform === 'instagram' && t.ig_user_id) igUserId = t.ig_user_id\n  })"
);

// Update publishToPlatform call to pass igUserId
f = f.replace(
  "await publishToPlatform(platform, fullCaption, post.image_url, tokenMap[platform])",
  "await publishToPlatform(platform, fullCaption, post.image_url, tokenMap[platform], igUserId)"
);

// Update publishToPlatform signature
f = f.replace(
  "async function publishToPlatform(\n  platform: Platform,\n  caption: string,\n  imageUrl: string,\n  accessToken: string | undefined\n)",
  "async function publishToPlatform(\n  platform: Platform,\n  caption: string,\n  imageUrl: string,\n  accessToken: string | undefined,\n  igUserId: string\n)"
);

// Update instagram case to pass igUserId
f = f.replace(
  "await postToInstagram(caption, imageUrl, accessToken)",
  "await postToInstagram(caption, imageUrl, accessToken, igUserId)"
);

// Replace the entire postToInstagram function
var oldIgFunc = f.indexOf("async function postToInstagram(caption: string, imageUrl: string, accessToken: string) {");
var endIgFunc = f.indexOf("// ── Facebook");
if (oldIgFunc > -1 && endIgFunc > -1) {
  f = f.slice(0, oldIgFunc) +
`async function postToInstagram(caption: string, imageUrl: string, accessToken: string, igUserId: string) {
  console.log("IG posting to account:", igUserId);
  console.log("IG image URL:", imageUrl);

  if (!igUserId) throw new Error('No Instagram user ID found')

  // Step 1: Create media container
  const containerRes = await fetch(
    \`https://graph.facebook.com/v21.0/\${igUserId}/media\`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: accessToken,
      }),
    }
  )
  const containerData = await containerRes.json()
  console.log("IG container response:", JSON.stringify(containerData));
  if (!containerData.id) throw new Error(\`Instagram container error: \${JSON.stringify(containerData)}\`)

  // Step 2: Publish
  const publishRes = await fetch(
    \`https://graph.facebook.com/v21.0/\${igUserId}/media_publish\`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerData.id,
        access_token: accessToken,
      }),
    }
  )
  const publishData = await publishRes.json()
  console.log("IG publish response:", JSON.stringify(publishData));
  if (!publishData.id) throw new Error(\`Instagram publish error: \${JSON.stringify(publishData)}\`)
}
` + f.slice(endIgFunc);
}

// Replace Facebook function to use page token directly
var oldFbFunc = f.indexOf("async function postToFacebook(caption: string, imageUrl: string, accessToken: string) {");
if (oldFbFunc > -1) {
  f = f.slice(0, oldFbFunc) +
`async function postToFacebook(caption: string, imageUrl: string, accessToken: string) {
  console.log("FB posting with token:", accessToken?.slice(0,20) + "...");

  // Get pages with this token
  const meRes = await fetch(
    \`https://graph.facebook.com/v21.0/me/accounts?access_token=\${accessToken}\`
  )
  const meData = await meRes.json()
  console.log("FB pages response:", JSON.stringify(meData));
  const page = meData.data?.[0]
  if (!page) {
    console.log("No FB page found, skipping Facebook post");
    return;
  }

  const res = await fetch(
    \`https://graph.facebook.com/v21.0/\${page.id}/photos\`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: imageUrl,
        caption,
        access_token: page.access_token,
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