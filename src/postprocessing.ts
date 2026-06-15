import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js'

// Heavy cinematic vignette. As the terminal pass it also performs the
// linear → sRGB output conversion the composer would otherwise skip (there is
// no OutputPass in the chain), so the dark wood reads correctly instead of
// crushing to mud.
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null }
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D( tDiffuse, vUv );

      // Darken toward the edges — pow() makes the falloff steep and moody.
      float vignette = pow( length( vUv - 0.5 ) * 1.6, 2.0 ) * 0.85;
      color.rgb *= clamp( 1.0 - vignette, 0.0, 1.0 );

      // sRGB OETF for correct on-screen tonality (terminal pass only).
      color.rgb = pow( color.rgb, vec3( 1.0 / 2.2 ) );

      gl_FragColor = color;
    }
  `
}

export function initPostprocessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera
): EffectComposer {
  const composer = new EffectComposer(renderer)
  composer.setSize(window.innerWidth, window.innerHeight)

  // RenderPass → FilmPass → vignette. No bloom (reads AI). No FXAA (we want
  // the slight natural aliasing).
  composer.addPass(new RenderPass(scene, camera))

  // Newer three FilmPass takes (intensity, grayscale); scanlines were removed,
  // which matches the spec's scanlinesIntensity 0 / scanlinesCount 0 intent.
  composer.addPass(new FilmPass(0.35, false))

  composer.addPass(new ShaderPass(VignetteShader))

  return composer
}
