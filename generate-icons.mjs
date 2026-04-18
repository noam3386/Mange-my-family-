import { Resvg } from '@resvg/resvg-js'
import { writeFileSync } from 'fs'

const svg = `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="512" height="512" rx="110" fill="#0ea5e9"/>

  <!-- M-House: walls + M-shaped double-peak roof as one shape -->
  <path d="
    M90,420
    L90,250
    L175,135
    L256,200
    L337,135
    L422,250
    L422,420
    Z"
    fill="white"/>

  <!-- Door -->
  <rect x="210" y="300" width="92" height="120" rx="12" fill="#0ea5e9"/>
</svg>`

for (const size of [192, 512]) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } })
  const png = resvg.render().asPng()
  writeFileSync(`public/pwa-${size}x${size}.png`, png)
  console.log(`✅ pwa-${size}x${size}.png`)
}

// Also apple touch icon (180x180)
const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 180 } })
const png = resvg.render().asPng()
writeFileSync('public/apple-touch-icon.png', png)
console.log('✅ apple-touch-icon.png')
