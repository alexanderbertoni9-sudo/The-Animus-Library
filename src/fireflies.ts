import * as THREE from 'three'

interface Firefly {
  mesh: THREE.Mesh
  light: THREE.PointLight
  origin: THREE.Vector3
  speed: number
  radius: number
  phase: number
}

const fireflies: Firefly[] = []

export function initFireflies(scene: THREE.Scene): void {
  // Share one tiny sphere across all 14 motes.
  const geometry = new THREE.SphereGeometry(0.012, 8, 8)

  for (let i = 0; i < 14; i++) {
    const material = new THREE.MeshBasicMaterial({ color: 0xffd580 })
    const mesh = new THREE.Mesh(geometry, material)

    const light = new THREE.PointLight(0xffd580, 0.2, 0.9, 2)

    // Scattered in front of the shelves, spanning both bays.
    const origin = new THREE.Vector3(
      (Math.random() - 0.5) * 5, // x across the full shelf span
      -2.5 + Math.random() * 4, // y over the shelf height
      0.5 + Math.random() * 1.0 // z 0.5–1.5, in front of the wood
    )

    mesh.position.copy(origin)
    light.position.copy(origin)

    scene.add(mesh)
    scene.add(light)

    fireflies.push({
      mesh,
      light,
      origin,
      speed: 0.3 + Math.random() * 0.6,
      radius: 0.1 + Math.random() * 0.25,
      phase: Math.random() * Math.PI * 2
    })
  }
}

export function updateFireflies(time: number): void {
  for (const f of fireflies) {
    const x = f.origin.x + Math.sin(time * f.speed + f.phase) * f.radius
    const y = f.origin.y + Math.cos(time * f.speed * 0.7 + f.phase) * f.radius * 0.5
    const z = f.origin.z + Math.sin(time * f.speed * 0.4) * 0.1

    f.mesh.position.set(x, y, z)
    f.light.position.set(x, y, z)

    f.light.intensity = 0.2 + Math.sin(time * 3 + f.phase) * 0.08
  }
}
