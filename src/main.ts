import { scene, camera, renderer, focal, loadBookshelf } from './scene'
import { initLights, updateLights } from './lights'
import { initBooks } from './books'
import { initFireflies, updateFireflies } from './fireflies'
import { initPostprocessing } from './postprocessing'

// Lights are independent of the GLB — set the mood immediately.
initLights(scene)

const composer = initPostprocessing(renderer, scene, camera)

// On GLB load: anisotropy is applied inside loadBookshelf, then we populate
// the shelves, release the fireflies, and fade the UI in.
loadBookshelf(() => {
  initBooks(scene, camera)
  initFireflies(scene)
  revealUI()
})

function revealUI(): void {
  // Stagger the fade so it feels like the room settling, not a flash.
  window.setTimeout(() => {
    for (const id of ['side-arrow', 'side-label', 'scroll-hint', 'scroll-progress']) {
      document.getElementById(id)?.classList.add('visible')
    }
  }, 400)
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
})

function animate(): void {
  requestAnimationFrame(animate)
  const time = Date.now() * 0.001
  updateLights()
  updateFireflies(time)
  camera.position.x = focal.x
  focal.y = camera.position.y
  camera.lookAt(focal.x, focal.y, 0)
  composer.render()
}
animate()
