import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import gsap from 'gsap'

// ── Camera / dolly constants ────────────────────────────────────────────────
// FOV 22 fills the frame with shelf wood so the dark void never shows.
// Two bays sit at ±1.5 on X. Camera only ever dollies — never orbits.
const FOV = 22
const CAM_Z = 3.8
export const BAY_LEFT = -1.5
export const BAY_RIGHT = 1.5
const CAM_Y_MAX = 1.4
const CAM_Y_MIN = -2.6

// ── Core singletons ─────────────────────────────────────────────────────────
export const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0d0905)

export const camera = new THREE.PerspectiveCamera(
  FOV,
  window.innerWidth / window.innerHeight,
  0.1,
  100
)
camera.position.set(BAY_LEFT, CAM_Y_MAX, CAM_Z)
camera.lookAt(BAY_LEFT, CAM_Y_MAX, 0)

export const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

// focal drives BOTH camera.position.x and lookAt.x every frame (see main.ts),
// so a side switch is a pure horizontal dolly with zero angle lurch.
// focal.y tracks the live camera height so the look stays dead level.
export const focal = { x: BAY_LEFT, y: CAM_Y_MAX }

// ── Kill all default input ──────────────────────────────────────────────────
// The user must see exactly the framing we choose: no zoom, no pan, no orbit.
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault())
renderer.domElement.addEventListener('mousedown', (e) => e.preventDefault())
window.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false })

// ── Vertical scroll → camera.position.y ─────────────────────────────────────
let targetCamY = CAM_Y_MAX
let scrollLocked = false

const progressFill = document.getElementById('scroll-progress-fill') as HTMLElement | null

function updateProgress(): void {
  const t = 1 - (camera.position.y - CAM_Y_MIN) / (CAM_Y_MAX - CAM_Y_MIN)
  if (progressFill) progressFill.style.height = `${(t * 100).toFixed(1)}%`
}

window.addEventListener(
  'wheel',
  (e: WheelEvent) => {
    e.preventDefault()
    if (scrollLocked) return

    targetCamY = THREE.MathUtils.clamp(
      targetCamY - e.deltaY * 0.0018,
      CAM_Y_MIN,
      CAM_Y_MAX
    )

    gsap.to(camera.position, {
      y: targetCamY,
      duration: 0.55,
      ease: 'power3.out',
      overwrite: 'auto',
      onUpdate: () => {
        focal.y = camera.position.y
        updateProgress()
      }
    })
  },
  { passive: false }
)

// ── Side switch (pure horizontal dolly) ─────────────────────────────────────
let currentSide: 0 | 1 = 0 // 0 = left, 1 = right

const arrowBtn = document.getElementById('arrow-btn') as HTMLElement | null
const arrowIcon = document.getElementById('arrow-icon') as HTMLElement | null
const arrowLabel = document.getElementById('arrow-label') as HTMLElement | null
const sideLabel = document.getElementById('side-label') as HTMLElement | null

function switchSide(): void {
  if (scrollLocked) return
  scrollLocked = true
  if (arrowBtn) arrowBtn.style.pointerEvents = 'none'

  const nextSide: 0 | 1 = currentSide === 0 ? 1 : 0
  const targetX = nextSide === 0 ? BAY_LEFT : BAY_RIGHT

  // Reset height to the top of the shelf for the switch.
  targetCamY = CAM_Y_MAX
  gsap.to(camera.position, {
    y: CAM_Y_MAX,
    duration: 1.4,
    ease: 'power2.inOut',
    overwrite: 'auto'
  })

  gsap.to(focal, {
    x: targetX,
    duration: 1.4,
    ease: 'power2.inOut',
    onUpdate: () => {
      focal.y = camera.position.y
      updateProgress()
    },
    onComplete: () => {
      currentSide = nextSide
      scrollLocked = false
      if (arrowBtn) arrowBtn.style.pointerEvents = 'auto'

      // Flip the chevron + labels to point back the other way.
      if (arrowIcon) {
        arrowIcon.innerHTML =
          nextSide === 1
            ? '<polyline points="15 18 9 12 15 6" />'
            : '<polyline points="9 18 15 12 9 6" />'
      }
      if (arrowLabel) arrowLabel.textContent = nextSide === 1 ? 'Left side' : 'Right side'
      if (sideLabel) sideLabel.textContent = nextSide === 1 ? 'Right' : 'Left'
    }
  })
}

if (arrowBtn) arrowBtn.addEventListener('click', switchSide)

// ── GLB loading ─────────────────────────────────────────────────────────────
export function loadBookshelf(onLoaded: () => void): void {
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath(
    'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/'
  )

  const loader = new GLTFLoader()
  loader.setDRACOLoader(dracoLoader)

  loader.load(
    '/bookshelf.glb',
    (gltf) => {
      gltf.scene.scale.set(3, 3, 3)
      gltf.scene.position.set(0, -3, 0)
      gltf.scene.rotation.y = -(Math.PI / 2)

      const maxAniso = renderer.capabilities.getMaxAnisotropy()

      gltf.scene.traverse((node) => {
        const mesh = node as THREE.Mesh
        if (!mesh.isMesh) return

        mesh.castShadow = true
        mesh.receiveShadow = true

        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const mat of materials) {
          const std = mat as THREE.MeshStandardMaterial
          if (std.map) {
            std.map.anisotropy = maxAniso
            std.map.needsUpdate = true
          }
        }
      })

      scene.add(gltf.scene)
      onLoaded()
    },
    undefined,
    (err) => console.error('GLB load failed:', err)
  )
}
