const fs = await import('node:fs/promises')

const colors = {
  ink: '#071b22',
  water: '#10343a',
  lagoon: '#0e6d68',
  coral: '#f2a67e',
  seafoam: '#c7e7d0',
  white: '#f3f7ef',
  muted: '#b2c9bc',
}

function paint(hex, alpha = 1) {
  const value = hex.slice(1)
  return {
    type: 'SOLID',
    color: {
      r: parseInt(value.slice(0, 2), 16) / 255,
      g: parseInt(value.slice(2, 4), 16) / 255,
      b: parseInt(value.slice(4, 6), 16) / 255,
      a: alpha,
    },
    opacity: alpha,
    visible: true,
    blendMode: 'NORMAL',
  }
}

function addFrame(parent, name, x, y, width, height, options = {}) {
  const node = figma.createFrame()
  node.name = name
  node.resize(width, height)
  node.x = x
  node.y = y
  node.layoutMode = 'NONE'
  node.clipsContent = options.clipsContent ?? false
  node.cornerRadius = options.radius ?? 0
  node.fills = options.fill ? [paint(options.fill, options.opacity ?? 1)] : []
  node.strokes = options.stroke ? [{ ...paint(options.stroke, options.strokeOpacity ?? 1), weight: options.strokeWidth ?? 1, align: 'INSIDE' }] : []
  if (options.shadow) {
    node.effects = [{
      type: 'DROP_SHADOW',
      color: { r: 0, g: 0, b: 0, a: 0.32 },
      offset: { x: 0, y: 18 },
      radius: 48,
      spread: 0,
      visible: true,
      blendMode: 'NORMAL',
      showShadowBehindNode: true,
    }]
  }
  parent.appendChild(node)
  return node
}

function addText(parent, name, characters, x, y, width, height, size, color, weight = 400, options = {}) {
  if (size < 12) throw new Error(`Readable text must be at least 12px: ${name}`)
  const node = figma.createText()
  node.name = name
  node.characters = characters
  node.fontSize = size
  node.fontWeight = weight
  node.fills = [paint(color, options.opacity ?? 1)]
  node.x = x
  node.y = y
  node.resize(width, height)
  if (options.letterSpacing !== undefined) node.letterSpacing = options.letterSpacing
  if (options.italic) node.italic = true
  if (options.align) node.textAlignHorizontal = options.align
  parent.appendChild(node)
  return node
}

function addImage(parent, name, bytes, x, y, width, height, mode = 'FIT', radius = 0) {
  const image = figma.createImage(new Uint8Array(bytes))
  const node = figma.createRectangle()
  node.name = name
  node.resize(width, height)
  node.x = x
  node.y = y
  node.cornerRadius = radius
  node.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: mode }]
  node.strokes = []
  parent.appendChild(node)
  return node
}

function addDot(parent, name, x, y, diameter, color, alpha = 1) {
  const node = figma.createEllipse()
  node.name = name
  node.resize(diameter, diameter)
  node.x = x
  node.y = y
  node.fills = [paint(color, alpha)]
  node.strokes = []
  parent.appendChild(node)
  return node
}

function addRule(parent, name, x, y, width, color, alpha = 1) {
  return addFrame(parent, name, x, y, width, 1, { fill: color, opacity: alpha })
}

const fishAssets = {
  'Ocellaris clownfish': ['ocellaris-clownfish.webp', 'Amphiprion ocellaris'],
  'Blue tang': ['blue-tang.webp', 'Paracanthurus hepatus'],
  'Yellow tang': ['yellow-tang.webp', 'Zebrasoma flavescens'],
}
const services = [
  { name: 'Home Assistant', fish: 'Ocellaris clownfish', url: 'trappserv.er:8123' },
  { name: 'Jellyfin', fish: 'Blue tang', url: 'trappserv.er:8096' },
  { name: 'Immich', fish: 'Yellow tang', url: 'trappserv.er:2283' },
]

const tankImage = await fs.readFile('public/reef-tank-front.webp')
const mainPage = figma.root.children.find((page) => page.name === 'Main aquarium') ?? figma.currentPage
for (const page of [...figma.root.children]) {
  if (page.id !== mainPage.id) page.remove()
}
for (const child of [...mainPage.children]) child.remove()
mainPage.name = 'Main aquarium'

const main = addFrame(mainPage, 'Main aquarium · 1440 × 900', 0, 0, 1440, 900, { fill: colors.water, clipsContent: true })
addImage(main, 'Front-on reef tank photograph', tankImage, 0, 0, 1440, 900, 'FILL')

const fishInTank = [
  { service: 'Home Assistant', species: 'Ocellaris clownfish', file: 'ocellaris-clownfish.webp', x: 522, y: 340, w: 142, h: 72, pillX: 670, pillY: 362, pillW: 176 },
  { service: 'Jellyfin', species: 'Blue tang', file: 'blue-tang.webp', x: 836, y: 230, w: 152, h: 76, pillX: 994, pillY: 255, pillW: 118 },
  { service: 'Immich', species: 'Yellow tang', file: 'yellow-tang.webp', x: 1030, y: 436, w: 128, h: 84, pillX: 1162, pillY: 463, pillW: 96 },
]

for (const fish of fishInTank) {
  addImage(main, `Clickable fish · ${fish.species}`, await fs.readFile(`public/fish/${fish.file}`), fish.x, fish.y, fish.w, fish.h, 'FIT')
  addFrame(main, `Fish service pill · ${fish.service}`, fish.pillX, fish.pillY, fish.pillW, 34, {
    fill: colors.ink,
    opacity: 0.82,
    stroke: colors.seafoam,
    strokeOpacity: 0.36,
    radius: 17,
  })
  addDot(main, `Fish pill accent · ${fish.service}`, fish.pillX + 12, fish.pillY + 14, 6, colors.coral)
  addText(main, `Fish service name · ${fish.service}`, fish.service, fish.pillX + 27, fish.pillY + 8, fish.pillW - 35, 18, 12, colors.white, 650)
}

// Small, glassy controls with no persistent header or service panel.
const controls = [
  { name: 'Open On the reef modal', x: 1264 },
  { name: 'Pause aquarium animation', x: 1318 },
  { name: 'Open settings', x: 1372 },
]
for (const control of controls) {
  addFrame(main, control.name, control.x, 28, 42, 42, { fill: colors.ink, opacity: 0.6, stroke: colors.white, strokeOpacity: 0.55, radius: 21 })
}
addFrame(main, 'Services icon line one', 1274, 39, 22, 3, { fill: colors.white, radius: 2 })
addFrame(main, 'Services icon line two', 1274, 47, 22, 3, { fill: colors.white, radius: 2 })
addFrame(main, 'Services icon line three', 1274, 55, 22, 3, { fill: colors.white, radius: 2 })
addFrame(main, 'Pause icon bar one', 1333, 40, 3, 17, { fill: colors.white, radius: 2 })
addFrame(main, 'Pause icon bar two', 1341, 40, 3, 17, { fill: colors.white, radius: 2 })
addFrame(main, 'Settings icon ring', 1386, 40, 14, 14, { stroke: colors.white, strokeOpacity: 0.95, strokeWidth: 1.5, radius: 7 })
addDot(main, 'Settings icon center', 1391, 45, 4, colors.white)
addFrame(main, 'Settings icon tooth top', 1391, 36, 4, 5, { fill: colors.white, radius: 2 })
addFrame(main, 'Settings icon tooth bottom', 1391, 53, 4, 5, { fill: colors.white, radius: 2 })
addFrame(main, 'Settings icon tooth left', 1382, 45, 5, 4, { fill: colors.white, radius: 2 })
addFrame(main, 'Settings icon tooth right', 1399, 45, 5, 4, { fill: colors.white, radius: 2 })

// The second page represents the services control opening a modal over the tank.
const modalPage = figma.createPage()
modalPage.name = 'On the reef modal'
const modalBoard = addFrame(modalPage, 'Aquarium with services modal · 1440 × 900', 0, 0, 1440, 900, { fill: colors.water, clipsContent: true })
addImage(modalBoard, 'Modal state · front-on reef tank', tankImage, 0, 0, 1440, 900, 'FILL')
for (const fish of fishInTank) {
  addImage(modalBoard, `Modal background fish · ${fish.species}`, await fs.readFile(`public/fish/${fish.file}`), fish.x, fish.y, fish.w, fish.h, 'FIT')
}
addFrame(modalBoard, 'Modal backdrop', 0, 0, 1440, 900, { fill: colors.ink, opacity: 0.46 })
const modal = addFrame(modalBoard, 'On the reef · service picker', 440, 130, 560, 640, {
  fill: colors.ink,
  opacity: 0.97,
  stroke: colors.seafoam,
  strokeOpacity: 0.19,
  radius: 24,
  shadow: true,
})
addText(modal, 'Modal title', 'On the reef', 32, 28, 330, 38, 26, colors.white, 700)
addText(modal, 'Modal subtitle', 'Choose a shortcut to swim over to.', 32, 72, 420, 20, 14, colors.muted, 400)
addFrame(modal, 'Close modal button', 500, 24, 36, 36, { fill: colors.water, opacity: 0.9, stroke: colors.seafoam, strokeOpacity: 0.2, radius: 18 })
addText(modal, 'Close modal icon', '×', 511, 28, 16, 23, 21, colors.white, 400)
addFrame(modal, 'Modal service search field', 32, 112, 496, 48, { fill: colors.water, opacity: 0.77, stroke: colors.seafoam, strokeOpacity: 0.15, radius: 10 })
addText(modal, 'Modal search icon', '⌕', 46, 120, 24, 28, 24, colors.seafoam, 400)
addText(modal, 'Modal search placeholder', 'Find a service', 80, 127, 260, 18, 14, colors.seafoam, 400, { opacity: 0.72 })

for (const [index, service] of services.entries()) {
  const y = 178 + index * 84
  const row = addFrame(modal, `Modal service row · ${service.name}`, 24, y, 512, 72, {
    fill: colors.water,
    opacity: 0.77,
    stroke: colors.seafoam,
    strokeOpacity: 0.1,
    radius: 12,
  })
  addFrame(row, `${service.fish} modal image backing`, 10, 13, 66, 46, { fill: colors.ink, opacity: 0.55, radius: 23 })
  addImage(row, `${service.fish} modal fish`, await fs.readFile(`public/fish/${fishAssets[service.fish][0]}`), 8, 11, 70, 50, 'FIT')
  addText(row, `${service.name} modal name`, service.name, 88, 13, 230, 20, 15, colors.white, 650)
  addText(row, `${service.fish} modal species`, service.fish, 88, 40, 180, 17, 12, colors.muted, 400)
  addText(row, `${service.name} modal address`, service.url, 306, 28, 166, 18, 12, colors.seafoam, 400, { opacity: 0.78, align: 'RIGHT' })
  addText(row, `${service.name} modal open icon`, '↗', 490, 26, 16, 18, 14, colors.seafoam, 500)
}

addFrame(modal, 'Add service button', 24, 442, 512, 50, { fill: colors.lagoon, opacity: 0.35, stroke: colors.seafoam, strokeOpacity: 0.22, radius: 11 })
addText(modal, 'Add service plus', '+', 225, 453, 20, 24, 22, colors.seafoam, 400)
addText(modal, 'Add service label', 'Add a service', 253, 459, 150, 18, 14, colors.white, 650)
addRule(modal, 'Modal footer divider', 24, 518, 512, colors.seafoam, 0.12)
addText(modal, 'Modal example note', 'Example links · service status is not checked', 28, 542, 490, 20, 12, colors.seafoam, 400, { opacity: 0.65 })

return { pages: [mainPage.name, modalPage.name], mainArtboard: main.id, modalArtboard: modalBoard.id, mainLayers: main.children.length, modalLayers: modalBoard.children.length }
