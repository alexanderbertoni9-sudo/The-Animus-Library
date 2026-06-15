import * as THREE from 'three'
import gsap from 'gsap'

declare global {
  interface Window {
    closePanel: () => void
  }
}

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

// Existing book data array — kept as-is, then extended to fill the lower shelves.
const books: BookData[] = [
  { id: 1, title: 'Crime and Punishment', author: 'Fyodor Dostoevsky', color: 0x6b2737 },
  { id: 2, title: 'The Idiot', author: 'Fyodor Dostoevsky', color: 0x2d4a3e },
  { id: 3, title: 'Confessions', author: 'Saint Augustine', color: 0x1c2b4a },
  { id: 4, title: 'Summa Theologica', author: 'Saint Thomas Aquinas', color: 0x8b7355 },
  { id: 5, title: 'The Bible', author: 'Various Authors', color: 0x4a1b3c },
  { id: 6, title: 'The Brothers Karamazov', author: 'Fyodor Dostoevsky', color: 0x4a1520 },
  { id: 7, title: 'Thus Spoke Zarathustra', author: 'Friedrich Nietzsche', color: 0x1a3a2a },
  { id: 8, title: 'Meditations', author: 'Marcus Aurelius', color: 0x2a3545 },
  { id: 9, title: 'The Republic', author: 'Plato', color: 0x3d2b1a },
  { id: 10, title: 'Beyond Good and Evil', author: 'Friedrich Nietzsche', color: 0x2a1535 },
  { id: 11, title: 'The Divine Comedy', author: 'Dante Alighieri', color: 0x4a2510 },
  { id: 12, title: 'War and Peace', author: 'Leo Tolstoy', color: 0x1a3530 },
  { id: 13, title: 'Anna Karenina', author: 'Leo Tolstoy', color: 0x3a1a25 },
  { id: 14, title: 'Don Quixote', author: 'Miguel de Cervantes', color: 0x2a3020 },
  { id: 15, title: 'Faust', author: 'Johann Wolfgang von Goethe', color: 0x1a2040 },
  { id: 16, title: 'The Iliad', author: 'Homer', color: 0x402510 },
  { id: 17, title: 'The Odyssey', author: 'Homer', color: 0x253040 },
  { id: 18, title: 'Hamlet', author: 'William Shakespeare', color: 0x301525 },
  { id: 19, title: 'King Lear', author: 'William Shakespeare', color: 0x152530 },
  { id: 20, title: 'Paradise Lost', author: 'John Milton', color: 0x251530 }
]

export function initBooks(scene: THREE.Scene, camera: THREE.Camera): void {
  const bookMeshes: THREE.Mesh[] = []

  // Shelf rows: Y raised +0.15 so books sit on top of the plank, not inside it.
  // xStart unified to the left edge of the shelf interior so books fill the bay
  // from the left and pack right.
  const shelfPositions = [
    { y: 1.35, xStart: -2.5 }, // top shelf
    { y: 0.15, xStart: -2.5 }, // middle shelf
    { y: -1.05, xStart: -2.5 } // bottom shelf
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

    // Leather gradient — darker at edges
    const grad = ctx.createLinearGradient(0, 0, 256, 0)
    grad.addColorStop(0, `rgb(${Math.max(0, r - 40)},${Math.max(0, g - 30)},${Math.max(0, b - 20)})`)
    grad.addColorStop(0.3, `rgb(${r},${g},${b})`)
    grad.addColorStop(0.7, `rgb(${Math.min(255, r + 15)},${Math.min(255, g + 10)},${Math.min(255, b + 8)})`)
    grad.addColorStop(1, `rgb(${Math.max(0, r - 35)},${Math.max(0, g - 25)},${Math.max(0, b - 15)})`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 256, 1024)

    // Leather grain lines
    for (let i = 0; i < 800; i++) {
      const y = Math.random() * 1024
      ctx.strokeStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.05})`
      ctx.lineWidth = Math.random() * 1.5
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(256, y + (Math.random() - 0.5) * 8)
      ctx.stroke()
    }

    // Vertical gradient — top/bottom shading plus a soft central sheen.
    const vertGrad = ctx.createLinearGradient(0, 0, 0, 1024)
    vertGrad.addColorStop(0, 'rgba(0,0,0,0.3)')
    vertGrad.addColorStop(0.15, 'rgba(255,255,255,0.06)')
    vertGrad.addColorStop(0.85, 'rgba(255,255,255,0.06)')
    vertGrad.addColorStop(1, 'rgba(0,0,0,0.3)')
    ctx.fillStyle = vertGrad
    ctx.fillRect(0, 0, 256, 1024)

    // Edge vignette — worn leather edges
    const edgeGrad = ctx.createLinearGradient(0, 0, 256, 0)
    edgeGrad.addColorStop(0, 'rgba(0,0,0,0.4)')
    edgeGrad.addColorStop(0.12, 'rgba(0,0,0,0)')
    edgeGrad.addColorStop(0.88, 'rgba(0,0,0,0)')
    edgeGrad.addColorStop(1, 'rgba(0,0,0,0.35)')
    ctx.fillStyle = edgeGrad
    ctx.fillRect(0, 0, 256, 1024)

    // Gold rule lines
    ctx.strokeStyle = 'rgba(201,162,39,0.75)'
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(12, 55); ctx.lineTo(244, 55); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(12, 62); ctx.lineTo(244, 62); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(12, 962); ctx.lineTo(244, 962); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(12, 969); ctx.lineTo(244, 969); ctx.stroke()

    // Engraved title — three pass rendering for depth illusion
    ctx.save()
    ctx.translate(128, 820)
    ctx.rotate(-Math.PI / 2)
    const displayTitle = title.length > 24 ? title.substring(0, 22) + '…' : title
    ctx.font = 'bold 38px "IM Fell English", Georgia, serif'
    ctx.textAlign = 'center'
    // Shadow pass
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillText(displayTitle, 2, 2)
    // Highlight pass
    ctx.fillStyle = 'rgba(255,220,140,0.25)'
    ctx.fillText(displayTitle, -1, -1)
    // Gold text
    ctx.fillStyle = '#D4A853'
    ctx.fillText(displayTitle, 0, 0)
    ctx.restore()

    // Random scratches
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = `rgba(0,0,0,${0.06 + Math.random() * 0.1})`
      ctx.lineWidth = Math.random() * 2
      ctx.beginPath()
      ctx.moveTo(Math.random() * 256, Math.random() * 1024)
      ctx.lineTo(Math.random() * 256, Math.random() * 1024)
      ctx.stroke()
    }

    return new THREE.CanvasTexture(canvas)
  }

  function addBook(bookData: BookData, shelfIndex: number): THREE.Mesh | null {
    // Every book unique: random height, width, lean, spine variation.
    // Width reverted to its original range; only height keeps a 1.2× scale.
    const width = 0.08 + Math.random() * 0.05 // 0.08–0.13
    const height = (0.55 + Math.random() * 0.3) * 1.2 // 0.66–1.02
    const depth = 0.32

    // Hard clamp: never let a book cross the right edge of the bay
    // (xStart + 2.8). If this book would overflow, stop filling the row.
    if (shelfOffsets[shelfIndex] + width > 2.8) {
      return null
    }

    const geometry = new THREE.BoxGeometry(width, height, depth)

    const spineTexture = createSpineTexture(bookData.title, bookData.color)
    // Leather, not plastic — high roughness, zero metalness.
    const coverMaterial = () =>
      new THREE.MeshStandardMaterial({ color: bookData.color, roughness: 0.9, metalness: 0.0 })

    // Box face order: +x, -x, +y, -y, +z (spine, faces camera), -z.
    const materials: THREE.MeshStandardMaterial[] = [
      coverMaterial(),
      coverMaterial(),
      coverMaterial(),
      coverMaterial(),
      new THREE.MeshStandardMaterial({ map: spineTexture, roughness: 0.85, metalness: 0.0 }),
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

    shelfOffsets[shelfIndex] += width + 0.01

    scene.add(book)
    bookMeshes.push(book)
    return book
  }

  // 7 books per row spreads all 20 across the three existing shelves
  // (rows 0–2); the old divisor of 5 would index a 4th, non-existent shelf.
  books.forEach((book, i) => {
    addBook(book, Math.floor(i / 7))
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
  const panelNotes = document.getElementById('panel-notes') as HTMLTextAreaElement | null

  let notesBookId: number | null = null

  function openBookPanel(data: BookUserData): void {
    if (!panel) return
    if (panelTitle) panelTitle.textContent = data.title
    if (panelAuthor) panelAuthor.textContent = data.author

    // Load this book's saved note (per-book localStorage key).
    notesBookId = data.id
    if (panelNotes) {
      panelNotes.value = localStorage.getItem(`animus_notes_${data.id}`) ?? ''
    }

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

  // Persist notes on every keystroke, keyed to the open book.
  if (panelNotes) {
    panelNotes.addEventListener('input', () => {
      if (notesBookId === null) return
      localStorage.setItem(`animus_notes_${notesBookId}`, panelNotes.value)
    })
  }

  // The panel's "Dismiss" button calls this via inline onclick.
  window.closePanel = closeBookPanel

  // ── Add your own book ─────────────────────────────────────────────────────
  // Colours drawn from the existing spine palette.
  const palette = books.map((b) => b.color)
  let nextId = books.reduce((max, b) => Math.max(max, b.id), 0) + 1

  const addTrigger = document.getElementById('add-book-trigger') as HTMLElement | null
  const addForm = document.getElementById('add-book-form') as HTMLFormElement | null
  const addOverlay = document.getElementById('add-book-overlay') as HTMLElement | null
  const addTitle = document.getElementById('add-book-title') as HTMLInputElement | null
  const addAuthor = document.getElementById('add-book-author') as HTMLInputElement | null

  function openAddForm(): void {
    if (!addOverlay) return
    addOverlay.style.display = 'flex'
    addTitle?.focus()
  }

  function closeAddForm(): void {
    if (!addOverlay) return
    addOverlay.style.display = 'none'
    addForm?.reset()
  }

  if (addTrigger) addTrigger.addEventListener('click', openAddForm)

  // Click the dim backdrop (but not the card) to dismiss.
  if (addOverlay) {
    addOverlay.addEventListener('click', (e) => {
      if (e.target === addOverlay) closeAddForm()
    })
  }

  if (addForm) {
    addForm.addEventListener('submit', (e) => {
      e.preventDefault()
      const title = (addTitle?.value ?? '').trim()
      const author = (addAuthor?.value ?? '').trim()
      if (!title || !author) return

      const color = palette[Math.floor(Math.random() * palette.length)]
      addBook({ id: nextId++, title, author, color }, 0)

      closeAddForm()
    })
  }
}
