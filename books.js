//three.js library is for our books and etc..

import * as THREE from 'three'
//add as many boopks as u want here
const books = [
  { id: 1, title: "Crime and Punishment", author: "Fyodor Dostoevsky", color: 0x6B2737 },
  { id: 2, title: "The Idiot", author: "Fyodor Dostoevsky", color: 0x2D4A3E },
  { id: 3, title: "Confessions", author: "Saint Augustine", color: 0x1C2B4A },
  { id: 4, title: "Summa Theologica", author: "Saint Thomas Aquinas", color: 0x8B7355 },
  { id: 5, title: "The Bible", author: "Various Authors", color: 0x4A1B3C }
]

export function initBooks(scene, camera) {
  const bookMeshes = []

  const shelfPositions = [
    { y: 1.2, xStart: -2 }, //top shelf
    { y: 0.0, xStart: -2.5 },//middle shelf
    { y: -1.2, xStart: -2.5 }//bottom shelf
  ]

  const shelfOffsets = [0, 0, 0]

  function createSpineTexture(title, hexColor) {
    const canvas = document.createElement('canvas')
    canvas.width = 128//can make resoultion better
    canvas.height = 512//same here

    const ctx = canvas.getContext('2d')

    const r = (hexColor >> 16) & 255
    const g = (hexColor >> 8) & 255
    const b = hexColor & 255

    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.font = 'bold 48px Pinyon Script, cursive'//font change here 

    ctx.save()
    ctx.translate(128, 880)//this moves the text up and down 
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(title.substring(0, 22), 0, 0)
    ctx.restore()

    return new THREE.CanvasTexture(canvas)
  }

  function addBook(bookData, shelfIndex = 0) {
   //scale books factor
    const scaleFactor = 0.5 

    const width = (0.18 + Math.random() * 0.12) * scaleFactor
    const height = (1.2 + Math.random() * 0.6) * scaleFactor
    const depth = 0.7 * scaleFactor

    const geometry = new THREE.BoxGeometry(width, height, depth)

    const spineTexture = createSpineTexture(
      bookData.title,
      bookData.color
    )

    const materials = [
      new THREE.MeshStandardMaterial({ color: bookData.color }),
      new THREE.MeshStandardMaterial({ color: bookData.color }),
      new THREE.MeshStandardMaterial({ color: bookData.color }),
      new THREE.MeshStandardMaterial({ color: bookData.color }),
      new THREE.MeshStandardMaterial({ map: spineTexture }),
      new THREE.MeshStandardMaterial({ color: bookData.color })
    ]

    const book = new THREE.Mesh(geometry, materials)

    const shelf = shelfPositions[shelfIndex]

    const x =
      shelf.xStart +
      shelfOffsets[shelfIndex] +
      width / 2

// This aligns the bottom of the book to the shelf Y position
const alignedY = shelf.y + (height / 2)

book.position.set(x, alignedY, 0)

    book.userData = {
      id: bookData.id,
      title: bookData.title,
      author: bookData.author,
      originalY: alignedY,      
      originalZ: 0
    }

    shelfOffsets[shelfIndex] += width + 0.02

    scene.add(book)
    bookMeshes.push(book)

    return book
  }

  books.forEach((book, i) => {
    const shelfIndex = Math.floor(i / 5)
    addBook(book, shelfIndex)
  })

  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()

  let hoveredBook = null

  function animateBook(book, hovering) {
    if (!window.gsap) return

    gsap.to(book.position, {
      z: hovering ? 0.3 : book.userData.originalZ,
      y: hovering
        ? book.userData.originalY + 0.05
        : book.userData.originalY,
      duration: 0.3,
      ease: 'power2.out'
    })
  }

  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1

    raycaster.setFromCamera(mouse, camera)

    const intersects = raycaster.intersectObjects(bookMeshes)

    if (intersects.length > 0) {
      const hit = intersects[0].object

      if (hoveredBook !== hit) {
        if (hoveredBook) {
          animateBook(hoveredBook, false)
        }

        hoveredBook = hit
        animateBook(hit, true)

        document.body.style.cursor = 'pointer'
      }
    } else {
      if (hoveredBook) {
        animateBook(hoveredBook, false)
        hoveredBook = null
      }

      document.body.style.cursor = 'default'
    }
  })

  window.addEventListener('click', () => {
    if (!hoveredBook) return

    openBookPanel(hoveredBook.userData)
  })

  function openBookPanel(data) {
    const panel = document.getElementById('book-panel')

    if (!panel) return

    document.getElementById('panel-title').textContent =
      data.title

    document.getElementById('panel-author').textContent =
      data.author

    panel.style.display = 'block'

    if (window.gsap) {
      gsap.fromTo(
        panel,
        {
          opacity: 0,
          x: 40
        },
        {
          opacity: 1,
          x: 0,
          duration: 0.4,
          ease: 'power2.out'
        }
      )
    }
  }
}
