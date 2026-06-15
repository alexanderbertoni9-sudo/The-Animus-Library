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

    // Leather gradient — darker at edges
    const grad = ctx.createLinearGradient(0, 0, 256, 0)
    grad.addColorStop(0, `rgb(${Math.max(0, r - 40)},${Math.max(0, g - 30)},${Math.max(0, b - 20)})`)
    grad.addColorStop(0.3, `rgb(${r},${g},${b})`)
    grad.addColorStop(0.7, `rgb(${Math.min(255, r + 15)},${Math.min(255, g + 10)},${Math.min(255, b + 8)})`)
    grad.addColorStop(1, `rgb(${Math.max(0, r - 35)},${Math.max(0, g - 25)},${Math.max(0, b - 15)})`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 256, 1024)

    // Leather grain lines
    for (let i = 0; i < 400; i++) {
      const y = Math.random() * 1024
      ctx.strokeStyle = `rgba(0,0,0,${0.02 + Math.random() * 0.05})`
      ctx.lineWidth = Math.random() * 1.5
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(256, y + (Math.random() - 0.5) * 8)
      ctx.stroke()
    }

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
    ctx.lineWidth = 2
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

  function addBook(bookData: BookData, shelfIndex: number): THREE.Mesh {
    // Every book unique: random height, width, lean, spine variation.
    const width = 0.08 + Math.random() * 0.05 // 0.08–0.13
    const height = 0.55 + Math.random() * 0.3 // 0.55–0.85
    const depth = 0.32

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
