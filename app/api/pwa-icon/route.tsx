// app/api/pwa-icon/route.tsx
// Generates PWA icons at any size via ?size=192 or ?size=512

import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const s = parseInt(req.nextUrl.searchParams.get('size') || '512')
  const iconSize = Math.min(Math.max(s, 48), 1024)

  return new ImageResponse(
    (
      <div
        style={{
          width: iconSize,
          height: iconSize,
          background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
          borderRadius: iconSize * 0.22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: iconSize * 0.45,
          fontWeight: 700,
          fontFamily: 'system-ui',
        }}
      >
        PA
      </div>
    ),
    { width: iconSize, height: iconSize }
  )
}
