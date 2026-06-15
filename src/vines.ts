import * as THREE from 'three'

// Procedural ivy for the left bay — all geometry, no external assets.
// Everything sits at z ≈ 0.15 (around the book fronts) and has raycasting
// disabled so hover/click still only ever hits the books.

const VINE_COLOR = 0x1a2e0f
const LEAF_BASE = '#2D4A1E'

// Book shelves live at these Y rows (see books.ts shelfPositions).
const SHELF1_Y = 1.35
const SHELF2_Y = 0.15
const VINE_Z = 0.15

// Keep vines from ever blocking a book click.
function disableRaycast(obj: THREE.Object3D): void {
  obj.raycast = () => {}
}

// ── Leaf texture: solid green blade, darker veins, faded translucent edge ────
function createLeafTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

  // Solid base blade.
  ctx.fillStyle = LEAF_BASE
  ctx.beginPath()
  ctx.ellipse(32, 32, 28, 18, 0, 0, Math.PI * 2)
  ctx.fill()

  // Veins — slightly darker, radiating from the centre outward.
  ctx.strokeStyle = 'rgba(18,34,12,0.7)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(6, 32)
  ctx.lineTo(58, 32)
  ctx.stroke()
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue
    const x = 32 + i * 9
    const dir = i > 0 ? 8 : -8
    ctx.beginPath()
    ctx.moveTo(x, 32)
    ctx.lineTo(x + dir, 20)
    ctx.moveTo(x, 32)
    ctx.lineTo(x + dir, 44)
    ctx.stroke()
  }

  // Semi-transparent edges — radial fade erases the outer pixels.
  const fade = ctx.createRadialGradient(32, 32, 10, 32, 32, 32)
  fade.addColorStop(0, 'rgba(0,0,0,0)')
  fade.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = fade
  ctx.fillRect(0, 0, 64, 64)
  ctx.globalCompositeOperation = 'source-over'

  return new THREE.CanvasTexture(canvas)
}

// ── A single leaf, facing outward toward the camera ──────────────────────────
function placeLeaf(scene: THREE.Scene, pos: THREE.Vector3, leafTex: THREE.CanvasTexture): void {
  const geo = new THREE.PlaneGeometry(0.12, 0.08)
  const mat = new THREE.MeshStandardMaterial({
    map: leafTex,
    roughness: 0.85,
    metalness: 0.0,
    side: THREE.DoubleSide,
    transparent: true
  })
  const leaf = new THREE.Mesh(geo, mat)
  leaf.position.copy(pos)
  leaf.rotation.z = (Math.random() - 0.5) * 0.8 // ±0.4 rad
  const s = 0.7 + Math.random() * 0.6 // 0.7–1.3
  leaf.scale.setScalar(s)
  disableRaycast(leaf)
  scene.add(leaf)
}

// ── A vine: tube along the curve + leaves spaced down its length ─────────────
function buildVine(
  scene: THREE.Scene,
  curve: THREE.CatmullRomCurve3,
  leafCount: number,
  leafTex: THREE.CanvasTexture
): void {
  const tubeGeo = new THREE.TubeGeometry(curve, 80, 0.012, 6, false)
  const mat = new THREE.MeshStandardMaterial({ color: VINE_COLOR, roughness: 0.95, metalness: 0.0 })
  const tube = new THREE.Mesh(tubeGeo, mat)
  disableRaycast(tube)
  scene.add(tube)

  for (let i = 0; i < leafCount; i++) {
    const t = leafCount === 1 ? 0.5 : i / (leafCount - 1)
    placeLeaf(scene, curve.getPoint(t), leafTex)
  }
}

function leafCount(): number {
  return 12 + Math.floor(Math.random() * 7) // 12–18
}

// ── Curve generators ─────────────────────────────────────────────────────────

// Snakes rightward across a shelf plank, curling up and down. When `drape`,
// a couple of control points dip below the plank to hang over the edge.
function horizontalVineCurve(baseY: number, drape: boolean): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = []
  const endX = -0.4 + Math.random() * 0.7 // ends inside the bay (< 0.5)
  const segs = 6
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    const px = -2.8 + t * (endX + 2.8)
    let py = baseY + Math.sin(t * Math.PI * 2 + Math.random() * 0.5) * 0.16
    if (drape && (i === 2 || i === 4)) py = baseY - 0.25 - Math.random() * 0.2
    const pz = VINE_Z + (Math.random() - 0.5) * 0.03
    pts.push(new THREE.Vector3(px, py, pz))
  }
  return new THREE.CatmullRomCurve3(pts)
}

// Climbs the left frame from low to high with a gentle horizontal wobble.
function verticalVineCurve(): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = []
  const baseX = -2.75
  const segs = 6
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    const py = -2.0 + t * 3.5 // -2.0 → 1.5
    const px = baseX + Math.sin(t * Math.PI * 3) * 0.12
    pts.push(new THREE.Vector3(px, py, VINE_Z))
  }
  return new THREE.CatmullRomCurve3(pts)
}

// Hangs down from the top crown area.
function crownHangCurve(): THREE.CatmullRomCurve3 {
  const x = -2.2 + Math.random() * 1.4
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(x, 1.7, VINE_Z),
    new THREE.Vector3(x + 0.1, 1.3, VINE_Z),
    new THREE.Vector3(x - 0.08, 0.9, VINE_Z),
    new THREE.Vector3(x + 0.06, 0.5, VINE_Z)
  ])
}

// Tight little spiral that curls around a frame/shelf corner.
function cornerCurlCurve(cx: number, cy: number): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(cx, cy, VINE_Z),
    new THREE.Vector3(cx + 0.12, cy + 0.06, VINE_Z),
    new THREE.Vector3(cx + 0.05, cy + 0.17, VINE_Z),
    new THREE.Vector3(cx - 0.05, cy + 0.08, VINE_Z)
  ])
}

// Drapes across the bottom-left corner of the first shelf, partly covering it.
function cornerDrapeCurve(): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.8, 1.6, VINE_Z),
    new THREE.Vector3(-2.6, 1.35, VINE_Z),
    new THREE.Vector3(-2.4, 1.1, VINE_Z),
    new THREE.Vector3(-2.5, 0.85, VINE_Z),
    new THREE.Vector3(-2.3, 0.7, VINE_Z)
  ])
}

export function initVines(scene: THREE.Scene): void {
  const leafTex = createLeafTexture()

  // 2 vines along the top of shelf plank 1 (one drapes over the edge).
  buildVine(scene, horizontalVineCurve(SHELF1_Y, false), leafCount(), leafTex)
  buildVine(scene, horizontalVineCurve(SHELF1_Y, true), leafCount(), leafTex)

  // 2 vines along shelf plank 2.
  buildVine(scene, horizontalVineCurve(SHELF2_Y, false), leafCount(), leafTex)
  buildVine(scene, horizontalVineCurve(SHELF2_Y, true), leafCount(), leafTex)

  // 1 vine climbing the left frame, 1 hanging from the crown.
  buildVine(scene, verticalVineCurve(), leafCount(), leafTex)
  buildVine(scene, crownHangCurve(), leafCount(), leafTex)

  // FIX 4 — overgrown accents.
  // 3 tight corner curls where shelf meets frame.
  buildVine(scene, cornerCurlCurve(-2.7, 1.2), 4, leafTex)
  buildVine(scene, cornerCurlCurve(-2.7, 0.0), 4, leafTex)
  buildVine(scene, cornerCurlCurve(-2.7, -1.2), 4, leafTex)

  // 1 vine draping across the bottom-left corner of the first shelf.
  buildVine(scene, cornerDrapeCurve(), 10, leafTex)

  // 8 fallen leaves settled on the shelf planks, overlapping the book bases.
  for (let i = 0; i < 8; i++) {
    const x = -2.5 + Math.random() * 1.4
    const shelfY = Math.random() < 0.5 ? SHELF1_Y : SHELF2_Y
    placeLeaf(scene, new THREE.Vector3(x, shelfY + 0.02, 0.17), leafTex)
  }
}
