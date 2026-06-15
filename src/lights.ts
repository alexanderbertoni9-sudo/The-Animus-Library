import * as THREE from 'three'

// The candle is the one practical we breathe life into every frame.
let candleLight: THREE.PointLight | null = null

export function initLights(scene: THREE.Scene): void {
  // Start clean — strip anything the GLB or a previous init left behind.
  const existing: THREE.Light[] = []
  scene.traverse((obj) => {
    if ((obj as THREE.Light).isLight) existing.push(obj as THREE.Light)
  })
  for (const light of existing) light.removeFromParent()

  // Desk lamp from upper left — warm amber, the key light.
  const spot = new THREE.SpotLight(0xc9922a, 2.5, 0, 0.4, 0.9)
  spot.position.set(-2, 4, 2)
  spot.castShadow = true
  scene.add(spot)

  // Candle — tight, warm, practical source that flickers (see updateLights).
  candleLight = new THREE.PointLight(0xff9b50, 0.8, 4, 2)
  candleLight.position.set(1, 0.5, 1.5)
  scene.add(candleLight)

  // Moonlight — cool, directional, barely there.
  const moon = new THREE.DirectionalLight(0x8b9eb7, 0.3)
  moon.position.set(3, 4, -2)
  scene.add(moon)

  // Ambient — near-black, just lifts the deepest shadows off pure void.
  const ambient = new THREE.AmbientLight(0x0d0905, 0.4)
  scene.add(ambient)
}

export function updateLights(): void {
  if (!candleLight) return
  candleLight.intensity =
    0.6 + Math.sin(Date.now() * 0.003) * 0.2 + Math.random() * 0.05
}
