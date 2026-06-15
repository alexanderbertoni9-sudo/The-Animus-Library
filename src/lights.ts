import * as THREE from 'three'

// The candle is the one practical we breathe life into every frame.
let candle: THREE.PointLight | null = null

export function initLights(scene: THREE.Scene): void {
  // Start clean — strip anything the GLB or a previous init left behind.
  const existing: THREE.Light[] = []
  scene.traverse((obj) => {
    if ((obj as THREE.Light).isLight) existing.push(obj as THREE.Light)
  })
  for (const light of existing) light.removeFromParent()

  // Warm amber ambient — lifts the books out of the dark.
  const warmFill = new THREE.AmbientLight(0x8b6914, 2.8)
  scene.add(warmFill)

  // Desk lamp — warm key light aimed at the left bay.
  const deskLamp = new THREE.SpotLight(0xffd4a0, 8.0)
  deskLamp.position.set(-1, 3.5, 3)
  deskLamp.angle = 0.7
  deskLamp.penumbra = 0.8
  deskLamp.castShadow = true
  deskLamp.target.position.set(-1.5, 0, 0)
  scene.add(deskLamp)
  scene.add(deskLamp.target)

  // Right fill — softer amber wash over the right bay.
  const rightFill = new THREE.SpotLight(0xc9922a, 4.0)
  rightFill.position.set(3, 2, 3)
  rightFill.angle = 0.9
  rightFill.penumbra = 1.0
  rightFill.target.position.set(1.5, 0, 0)
  scene.add(rightFill)
  scene.add(rightFill.target)

  // Candle — tight, warm, practical source that flickers (see updateLights).
  candle = new THREE.PointLight(0xff9b50, 3.5, 8, 1.5)
  candle.position.set(0.5, -0.5, 2)
  scene.add(candle)

  // Moonlight — cool, directional counter to all the warmth.
  const moon = new THREE.DirectionalLight(0xc8d8ff, 1.2)
  moon.position.set(-3, 5, 4)
  scene.add(moon)
}

export function updateLights(): void {
  if (!candle) return
  candle.intensity = 3.2 + Math.sin(Date.now() * 0.003) * 0.4 + Math.random() * 0.15
}
