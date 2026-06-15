import * as THREE from 'three'
import gsap from 'gsap'

interface BookData {
  id: number
  title: string
  author: string
  color: number
}

interface BookUserData {
  id: number
  title: string
  author: string
  originalY: number
  originalZ: number
}

// Existing book data array — kept as-is.
const books: BookData[] = [
  { id: 1, title: 'Crime and Punishment', author: 'Fyodor Dostoevsky', color: 0x6b2737 },
  { id: 2, title: 'The Idiot', author: 'Fyodor Dostoevsky', color: 0x2d4a3e },
  { id: 3, title: 'Confessions', author: 'Saint Augustine', color: 0x1c2b4a },
  { id: 4, title: 'Summa Theologica', author: 'Saint Thomas Aquinas', color: 0x8b7355 },
  { id: 5, title: 'The Bible', author: 'Various Authors', color: 0x4a1b3c }
]

export function initBooks(scene: THREE.Scene, camera: THREE.Camera): void {
  const bookMeshes: THREE.Mesh[] = []

  // Existing shelf positions — kept as-is.
  const shelfPositions = [
    { y: 1.2, xStart: -2 }, // top shelf
    { y: 0.0, xStart: -2.5 }, // middle shelf
    { y: -1.2, xStart: -2.5 } // bottom shelf
  ]
  const shelfOffsets = [0, 0, 0]

  // ── Spine texture: 256 × 1024 leather-bound spine ─────────────────────────
  function createSpineTexture(title: string, hexColor: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 1024
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

    const r = (hexColor >> 16) & 255
    const g = (hexColor >> 8) & 255
    const b = hexColor & 255

    // Base: leather tone derived from the book colour, darkened by 40%.
    const lr = Math.floor(r * 0.6)
    const lg = Math.floor(g * 0.6)
    const lb = Math.floor(b * 0.6)
    ctx.fillStyle = `rgb(${lr}, ${lg}, ${lb})`
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Noise: 200 faint 1px strokes at random angles — leather grain.
    ctx.lineWidth = 1
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const angle = Math.random() * Math.PI * 2
      const len = 8 + Math.random() * 24
      const opacity = 0.03 + Math.random() * 0.03
      ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len)
      ctx.stroke()
    }

    // Gold rule lines — two horizontal bands.
    ctx.strokeStyle = 'rgba(201, 146, 42, 0.7)'
    ctx.lineWidth = 2
    for (const y of [80, 944]) {
      ctx.beginPath()
      ctx.moveTo(18, y)
      ctx.lineTo(canvas.width - 18, y)
      ctx.stroke()
    }

    // Title — IM Fell English serif, gold, rotated -90°, centred on the spine.
    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.font = '42px "IM Fell English", serif'
    ctx.fillStyle = '#D4A853'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(title, 0, 0)
    ctx.restore()

    // Wear marks — 3–5 scattered dark ellipses.
    const wearCount = 3 + Math.floor(Math.random() * 3)
    for (let i = 0; i < wearCount; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const rx = 6 + Math.random() * 22
      const ry = 10 + Math.random() * 40
      const opacity = 0.08 + Math.random() * 0.07
      ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`
      ctx.beginPath()
      ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }

    return new THREE.CanvasTexture(canvas)
  }

  function addBook(bookData: BookData, shelfIndex: number): THREE.Mesh {
    // Every book unique: random height, width, lean, spine variation.
    const width = 0.08 + Math.random() * 0.05 // 0.08–0.13
    const height = 0.55 + Math.random() * 0.3 // 0.55–0.85
    const depth = 0.32

    const geometry = new THREE.BoxGeometry(width, height, depth)

    const spineTexture = createSpineTexture(bookData.title, bookData.color)
    const coverMaterial = () =>
      new THREE.MeshStandardMaterial({ color: bookData.color, roughness: 0.85 })

    // Box face order: +x, -x, +y, -y, +z (spine, faces camera), -z.
    const materials: THREE.MeshStandardMaterial[] = [
      coverMaterial(),
      coverMaterial(),
      coverMaterial(),
      coverMaterial(),
      new THREE.MeshStandardMaterial({ map: spineTexture, roughness: 0.8 }),
      coverMaterial()
    ]

    const book = new THREE.Mesh(geometry, materials)
    book.castShadow = true
    book.receiveShadow = true

    const shelf = shelfPositions[shelfIndex]
    const x = shelf.xStart + shelfOffsets[shelfIndex] + width / 2
    const alignedY = shelf.y + height / 2 // sit the spine on the shelf

    book.position.set(x, alignedY, 0)
    book.rotation.z = (Math.random() - 0.5) * 0.06 // slight random lean

    const userData: BookUserData = {
      id: bookData.id,
      title: bookData.title,
      author: bookData.author,
      originalY: alignedY,
      originalZ: 0
    }
    book.userData = userData

    shelfOffsets[shelfIndex] += width + 0.02

    scene.add(book)
    bookMeshes.push(book)
    return book
  }

  books.forEach((book, i) => {
    addBook(book, Math.floor(i / 5))
  })

  // ── Hover + click ─────────────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  let hoveredBook: THREE.Mesh | null = null

  function animateBook(book: THREE.Mesh, hovering: boolean): void {
    const data = book.userData as BookUserData
    gsap.to(book.position, {
      z: hovering ? 0.3 : data.originalZ,
      y: hovering ? data.originalY + 0.05 : data.originalY,
      duration: 0.3,
      ease: 'power2.out'
    })
  }

  window.addEventListener('mousemove', (e: MouseEvent) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1

    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(bookMeshes)

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh
      if (hoveredBook !== hit) {
        if (hoveredBook) animateBook(hoveredBook, false)
        hoveredBook = hit
        animateBook(hit, true)
        document.body.style.cursor = 'pointer'
      }
    } else if (hoveredBook) {
      animateBook(hoveredBook, false)
      hoveredBook = null
      document.body.style.cursor = 'default'
    }
  })

  window.addEventListener('click', () => {
    if (!hoveredBook) return
    openBookPanel(hoveredBook.userData as BookUserData)
  })

  // ── Book panel ────────────────────────────────────────────────────────────
  const panel = document.getElementById('book-panel') as HTMLElement | null
  const panelTitle = document.getElementById('panel-title') as HTMLElement | null
  const panelAuthor = document.getElementById('panel-author') as HTMLElement | null
  const panelClose = document.getElementById('panel-close') as HTMLElement | null

  function openBookPanel(data: BookUserData): void {
    if (!panel) return
    if (panelTitle) panelTitle.textContent = data.title
    if (panelAuthor) panelAuthor.textContent = data.author

    panel.style.display = 'block'
    gsap.fromTo(
      panel,
      { opacity: 0, x: 40 },
      { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }
    )
  }

  function closeBookPanel(): void {
    if (!panel) return
    gsap.to(panel, {
      opacity: 0,
      x: 40,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        panel.style.display = 'none'
      }
    })
  }

  if (panelClose) panelClose.addEventListener('click', closeBookPanel)
}
