// app/apple-icon.tsx
// Generates the Apple touch icon for PWA home screen

import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
          borderRadius: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 90,
          fontWeight: 700,
          fontFamily: 'system-ui',
        }}
      >
        PA
      </div>
    ),
    { ...size }
  )
}
