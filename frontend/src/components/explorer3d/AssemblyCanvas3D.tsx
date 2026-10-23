import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { AssemblyNodePart } from '../../types'

interface AssemblyCanvasProps {
  assemblyId: string
  nodes: AssemblyNodePart[]
  selectedNodeId: string | null
  hoveredNodeId: string | null
  explosionProgress: number // 0 to 1
  autoRotate: boolean
  wireframe: boolean
  resetTrigger: number
  onSelectNode: (nodeId: string) => void
  onHoverNode: (nodeId: string | null) => void
}

interface NodeMeshEntry {
  group: THREE.Group
  materials: THREE.MeshStandardMaterial[]
  basePos: THREE.Vector3
  explodedOffset: THREE.Vector3
}

export default function AssemblyCanvas3D({
  assemblyId,
  nodes,
  selectedNodeId,
  hoveredNodeId,
  explosionProgress,
  autoRotate,
  wireframe,
  resetTrigger,
  onSelectNode,
  onHoverNode,
}: AssemblyCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const nodeEntriesRef = useRef<Map<string, NodeMeshEntry>>(new Map())
  const assemblyRootRef = useRef<THREE.Group | null>(null)
  const animFrameIdRef = useRef<number | null>(null)

  // Initialize Three.js scene once
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth || 800
    const height = container.clientHeight || 560

    // 1. Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0b0d10) // Premium dark graphite
    scene.fog = new THREE.FogExp2(0x0b0d10, 0.04)
    sceneRef.current = scene

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(0, 1.2, 5.5)
    cameraRef.current = camera

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    rendererRef.current = renderer

    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxDistance = 14
    controls.minDistance = 2.0
    controls.target.set(0, 0, 0)
    controlsRef.current = controls

    // 5. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5)
    keyLight.position.set(5, 8, 6)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.width = 1024
    keyLight.shadow.mapSize.height = 1024
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x4a6080, 1.4)
    fillLight.position.set(-6, -2, -4)
    scene.add(fillLight)

    // Precision Crimson Rim Light for iconic silhouette
    const rimLight = new THREE.DirectionalLight(0xe32636, 1.8)
    rimLight.position.set(0, -6, 5)
    scene.add(rimLight)

    // Ground reflective circular disc
    const groundGeo = new THREE.CircleGeometry(6, 48)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x12151b,
      roughness: 0.8,
      metalness: 0.2,
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -2.2
    ground.receiveShadow = true
    scene.add(ground)

    // Subtle grid helper
    const grid = new THREE.GridHelper(10, 20, 0x252b33, 0x15191f)
    grid.position.y = -2.19
    scene.add(grid)

    // 6. Resize handling
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return
      const w = container.clientWidth
      const h = container.clientHeight
      cameraRef.current.aspect = w / h
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(w, h)
    }
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    // 7. Raycasting for hover and selection
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    let isDragging = false
    let startX = 0
    let startY = 0

    const onPointerDown = (e: MouseEvent) => {
      isDragging = false
      startX = e.clientX
      startY = e.clientY
    }

    const onPointerMove = (e: MouseEvent) => {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > 5) {
        isDragging = true
      }
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      if (assemblyRootRef.current) {
        const intersects = raycaster.intersectObjects(assemblyRootRef.current.children, true)
        if (intersects.length > 0) {
          let topNodeId: string | null = null
          for (const hit of intersects) {
            let cur: THREE.Object3D | null = hit.object
            while (cur && cur !== scene) {
              if (cur.userData?.nodeId) {
                topNodeId = cur.userData.nodeId as string
                break
              }
              cur = cur.parent
            }
            if (topNodeId) break
          }
          onHoverNode(topNodeId)
        } else {
          onHoverNode(null)
        }
      }
    }

    const onPointerUp = (e: MouseEvent) => {
      if (isDragging) return
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      if (assemblyRootRef.current) {
        const intersects = raycaster.intersectObjects(assemblyRootRef.current.children, true)
        if (intersects.length > 0) {
          for (const hit of intersects) {
            let cur: THREE.Object3D | null = hit.object
            while (cur && cur !== scene) {
              if (cur.userData?.nodeId) {
                onSelectNode(cur.userData.nodeId as string)
                return
              }
              cur = cur.parent
            }
          }
        }
      }
    }

    const domEl = renderer.domElement
    domEl.addEventListener('mousedown', onPointerDown)
    domEl.addEventListener('mousemove', onPointerMove)
    domEl.addEventListener('mouseup', onPointerUp)

    // 8. Render loop
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate)
      if (controlsRef.current) {
        controlsRef.current.update()
      }
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }
    }
    animate()

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current)
      resizeObserver.disconnect()
      domEl.removeEventListener('mousedown', onPointerDown)
      domEl.removeEventListener('mousemove', onPointerMove)
      domEl.removeEventListener('mouseup', onPointerUp)
      renderer.dispose()
      if (container.contains(domEl)) {
        container.removeChild(domEl)
      }
    }
  }, [onHoverNode, onSelectNode])

  // Build / rebuild procedural 3D model when assemblyId changes
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    // Remove old assembly group if exists
    if (assemblyRootRef.current) {
      scene.remove(assemblyRootRef.current)
      assemblyRootRef.current = null
    }
    nodeEntriesRef.current.clear()

    const assemblyRoot = new THREE.Group()
    assemblyRoot.name = `assembly_${assemblyId}`
    assemblyRootRef.current = assemblyRoot
    scene.add(assemblyRoot)

    // Create assembly-specific procedural components
    if (assemblyId === 'brakes') {
      buildBrakesGeometry(assemblyRoot, nodes, nodeEntriesRef.current)
    } else if (assemblyId === 'suspension') {
      buildSuspensionGeometry(assemblyRoot, nodes, nodeEntriesRef.current)
    } else if (assemblyId === 'timing_drive') {
      buildTimingGeometry(assemblyRoot, nodes, nodeEntriesRef.current)
    }

    // Reset camera position to default for this assembly
    if (cameraRef.current && controlsRef.current) {
      if (assemblyId === 'suspension') {
        cameraRef.current.position.set(0, 1.0, 5.2)
      } else if (assemblyId === 'timing_drive') {
        cameraRef.current.position.set(0, 0.4, 4.8)
      } else {
        cameraRef.current.position.set(0, 1.2, 5.5)
      }
      controlsRef.current.target.set(0, 0, 0)
      controlsRef.current.update()
    }
  }, [assemblyId, nodes])

  // Update exploded view positions smoothly whenever explosionProgress changes
  useEffect(() => {
    nodeEntriesRef.current.forEach((entry) => {
      entry.group.position
        .copy(entry.basePos)
        .addScaledVector(entry.explodedOffset, explosionProgress)
    })
  }, [explosionProgress])

  // Auto-rotate toggle
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate
      controlsRef.current.autoRotateSpeed = 1.8
    }
  }, [autoRotate])

  // Wireframe toggle
  useEffect(() => {
    nodeEntriesRef.current.forEach((entry) => {
      entry.materials.forEach((mat) => {
        mat.wireframe = wireframe
      })
    })
  }, [wireframe])

  // Highlight selected and hovered nodes
  useEffect(() => {
    nodeEntriesRef.current.forEach((entry, nodeId) => {
      const isSelected = nodeId === selectedNodeId
      const isHovered = nodeId === hoveredNodeId

      entry.materials.forEach((mat) => {
        if (isSelected) {
          mat.emissive.setHex(0xe32636) // Brand Crimson highlight
          mat.emissiveIntensity = 0.55
        } else if (isHovered) {
          mat.emissive.setHex(0x38bdf8) // Sky blue hover
          mat.emissiveIntensity = 0.45
        } else {
          mat.emissive.setHex(0x000000)
          mat.emissiveIntensity = 0.0
        }
      })
    })
  }, [selectedNodeId, hoveredNodeId])

  // Reset camera trigger
  useEffect(() => {
    if (resetTrigger === 0) return
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 1.2, 5.5)
      controlsRef.current.target.set(0, 0, 0)
      controlsRef.current.update()
    }
  }, [resetTrigger])

  return (
    <div
      ref={containerRef}
      className="relative size-full cursor-grab overflow-hidden active:cursor-grabbing"
      style={{ minHeight: '520px' }}
    />
  )
}

/* =========================================================================
   PROCEDURAL 3D GEOMETRY BUILDERS
   Ultra-high fidelity automotive mechanical components with PBR materials
   ========================================================================= */

function registerNodeEntry(
  map: Map<string, NodeMeshEntry>,
  nodeId: string,
  group: THREE.Group,
  materials: THREE.MeshStandardMaterial[],
  basePos: THREE.Vector3,
  nodes: AssemblyNodePart[],
  defaultOffset: [number, number, number],
) {
  group.userData = { nodeId }
  group.position.copy(basePos)

  const nodeMeta = nodes.find((n) => n.node_id === nodeId)
  const offsetArr = nodeMeta?.exploded_offset ?? defaultOffset
  const explodedOffset = new THREE.Vector3(offsetArr[0], offsetArr[1], offsetArr[2])

  map.set(nodeId, {
    group,
    materials,
    basePos: basePos.clone(),
    explodedOffset,
  })
}

/**
 * 1. BRAKE ASSEMBLY (Brake Disc, Inner & Outer Pads, Race Caliper, Braided Hose)
 */
function buildBrakesGeometry(
  root: THREE.Group,
  nodes: AssemblyNodePart[],
  map: Map<string, NodeMeshEntry>,
) {
  // A. BRAKE DISC ROTOR (Ventilated dual disc with central hub hat and 5 lug studs)
  const discGroup = new THREE.Group()
  const rotorMat = new THREE.MeshStandardMaterial({
    color: 0x9ca3af,
    metalness: 0.9,
    roughness: 0.25,
  })
  const hatMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.8,
    roughness: 0.35,
  })

  // Outer rotor disc ring 1
  const rotorRing1 = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.08, 48), rotorMat)
  rotorRing1.rotation.x = Math.PI / 2
  rotorRing1.position.z = -0.06
  discGroup.add(rotorRing1)

  // Outer rotor disc ring 2
  const rotorRing2 = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.08, 48), rotorMat)
  rotorRing2.rotation.x = Math.PI / 2
  rotorRing2.position.z = 0.06
  discGroup.add(rotorRing2)

  // Ventilation vanes between rotor plates
  const vaneGeo = new THREE.BoxGeometry(0.04, 0.7, 0.06)
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2
    const vane = new THREE.Mesh(vaneGeo, hatMat)
    vane.position.set(Math.cos(angle) * 1.45, Math.sin(angle) * 1.45, 0)
    vane.rotation.z = angle + 0.3
    discGroup.add(vane)
  }

  // Central mounting hat
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.35, 32), hatMat)
  hat.rotation.x = Math.PI / 2
  hat.position.z = 0.16
  discGroup.add(hat)

  // Center bore
  const centerBore = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.36, 24), rotorMat)
  centerBore.rotation.x = Math.PI / 2
  centerBore.position.z = 0.165
  discGroup.add(centerBore)

  // 5 Wheel Lug Studs
  const studGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.2, 16)
  const studMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.95, roughness: 0.15 })
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2
    const stud = new THREE.Mesh(studGeo, studMat)
    stud.rotation.x = Math.PI / 2
    stud.position.set(Math.cos(angle) * 0.6, Math.sin(angle) * 0.6, 0.32)
    discGroup.add(stud)
  }

  root.add(discGroup)
  registerNodeEntry(map, 'brake_disc', discGroup, [rotorMat, hatMat, studMat], new THREE.Vector3(0, 0, 0), nodes, [0, 0, -1.8])

  // B. INNER BRAKE PAD
  const innerPadGroup = new THREE.Group()
  const padBackMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.4 })
  const padFrictionMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.3, roughness: 0.85 })

  const innerBack = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.07), padBackMat)
  const innerFriction = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.09), padFrictionMat)
  innerFriction.position.z = 0.07
  innerPadGroup.add(innerBack, innerFriction)
  innerPadGroup.position.set(0, 1.35, -0.22)
  root.add(innerPadGroup)
  registerNodeEntry(map, 'brake_pads_inner', innerPadGroup, [padBackMat, padFrictionMat], new THREE.Vector3(0, 1.35, -0.22), nodes, [0, 0, -0.7])

  // C. OUTER BRAKE PAD
  const outerPadGroup = new THREE.Group()
  const outerBack = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.07), padBackMat.clone())
  const outerFriction = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.09), padFrictionMat.clone())
  outerFriction.position.z = -0.07
  outerPadGroup.add(outerBack, outerFriction)
  outerPadGroup.position.set(0, 1.35, 0.22)
  root.add(outerPadGroup)
  registerNodeEntry(map, 'brake_pads_outer', outerPadGroup, [outerBack.material as THREE.MeshStandardMaterial], new THREE.Vector3(0, 1.35, 0.22), nodes, [0, 0, 1.6])

  // D. BRAKE CALIPER (Performance Red Cast Caliper Body with twin hydraulic pistons)
  const caliperGroup = new THREE.Group()
  const caliperMat = new THREE.MeshStandardMaterial({
    color: 0xd92635, // Precision Crimson
    metalness: 0.45,
    roughness: 0.32,
  })
  const pistonMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, metalness: 0.95, roughness: 0.1 })

  // Caliper main bridge spanning across the rotor top
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.8), caliperMat)
  bridge.position.set(0, 1.85, 0)
  caliperGroup.add(bridge)

  // Caliper outer body face
  const outerFace = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.75, 0.25), caliperMat)
  outerFace.position.set(0, 1.45, 0.35)
  caliperGroup.add(outerFace)

  // Caliper inner hydraulic body housing
  const innerFace = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 0.35), caliperMat)
  innerFace.position.set(0, 1.45, -0.35)
  caliperGroup.add(innerFace)

  // Twin hydraulic pistons
  const piston1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.2, 24), pistonMat)
  piston1.rotation.x = Math.PI / 2
  piston1.position.set(-0.4, 1.4, -0.16)
  const piston2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.2, 24), pistonMat)
  piston2.rotation.x = Math.PI / 2
  piston2.position.set(0.4, 1.4, -0.16)
  caliperGroup.add(piston1, piston2)

  // Bleeder nipple on top
  const bleeder = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.25, 12), studMat)
  bleeder.position.set(0.5, 2.15, -0.2)
  caliperGroup.add(bleeder)

  root.add(caliperGroup)
  registerNodeEntry(map, 'brake_caliper', caliperGroup, [caliperMat, pistonMat], new THREE.Vector3(0, 0, 0), nodes, [0, 0.6, 0.9])

  // E. BRAKE HOSE (Flexible hydraulic braided line)
  const hoseGroup = new THREE.Group()
  const hoseMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8, metalness: 0.2 })
  const fittingMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.3 }) // Brass/bronze banjo fitting

  // Curved hose tube
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.5, 1.95, -0.35),
    new THREE.Vector3(0.9, 2.3, -0.7),
    new THREE.Vector3(1.4, 2.5, -1.2),
    new THREE.Vector3(1.8, 2.3, -1.8),
  ])
  const hoseMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.05, 12, false), hoseMat)
  hoseGroup.add(hoseMesh)

  // Banjo fitting hex bolt
  const banjo = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.15, 6), fittingMat)
  banjo.position.set(0.5, 1.95, -0.35)
  hoseGroup.add(banjo)

  root.add(hoseGroup)
  registerNodeEntry(map, 'brake_hose', hoseGroup, [hoseMat, fittingMat], new THREE.Vector3(0, 0, 0), nodes, [0.8, 0.9, -1.2])
}

/**
 * 2. SUSPENSION MACPHERSON STRUT (Shock Absorber, Coil Spring, Strut Mount, Tie Rod)
 */
function buildSuspensionGeometry(
  root: THREE.Group,
  nodes: AssemblyNodePart[],
  map: Map<string, NodeMeshEntry>,
) {
  // A. SHOCK ABSORBER (Damper body + chrome piston rod + bottom knuckle mount)
  const shockGroup = new THREE.Group()
  const damperMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.75, roughness: 0.3 })
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.98, roughness: 0.05 })
  const mountMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.6, roughness: 0.4 })

  // Main damper cylinder tube
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 2.2, 32), damperMat)
  tube.position.y = -0.5
  shockGroup.add(tube)

  // Polished chrome rod
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.8, 24), chromeMat)
  rod.position.y = 0.9
  shockGroup.add(rod)

  // Bottom knuckle clevis bracket
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.5), mountMat)
  bracket.position.y = -1.7
  shockGroup.add(bracket)

  // Lower spring perch seat
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.4, 0.15, 32), damperMat)
  seat.position.y = 0.2
  shockGroup.add(seat)

  root.add(shockGroup)
  registerNodeEntry(map, 'shock_absorber', shockGroup, [damperMat, chromeMat, mountMat], new THREE.Vector3(0, 0, 0), nodes, [0, -1.8, 0])

  // B. HELICAL COIL SPRING
  const springGroup = new THREE.Group()
  const springMat = new THREE.MeshStandardMaterial({
    color: 0xe32636, // Sport Crimson Spring
    metalness: 0.6,
    roughness: 0.28,
  })

  // Generate 3D helical coil curve
  class HelixCurve extends THREE.Curve<THREE.Vector3> {
    radius: number
    height: number
    turns: number
    constructor(radius = 0.65, height = 1.8, turns = 5.5) {
      super()
      this.radius = radius
      this.height = height
      this.turns = turns
    }
    getPoint(t: number): THREE.Vector3 {
      const angle = t * Math.PI * 2 * this.turns
      const x = Math.cos(angle) * this.radius
      const y = t * this.height - this.height / 2 + 1.1
      const z = Math.sin(angle) * this.radius
      return new THREE.Vector3(x, y, z)
    }
  }

  const helix = new HelixCurve(0.65, 1.8, 5.5)
  const springMesh = new THREE.Mesh(new THREE.TubeGeometry(helix, 120, 0.08, 16, false), springMat)
  springGroup.add(springMesh)

  root.add(springGroup)
  registerNodeEntry(map, 'spring', springGroup, [springMat], new THREE.Vector3(0, 0, 0), nodes, [0, 0.4, 0])

  // C. UPPER STRUT MOUNT BEARING
  const mountGroup = new THREE.Group()
  const rubberMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.2, roughness: 0.85 })
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 })

  // Upper perch plate
  const topPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.2, 32), steelMat)
  topPlate.position.y = 2.05
  mountGroup.add(topPlate)

  // Rubber isolation dome
  const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.3, 32), rubberMat)
  dome.position.y = 2.3
  mountGroup.add(dome)

  // 3 Upper chassis studs
  const studMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.2 })
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2
    const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.25, 12), studMat)
    stud.position.set(Math.cos(angle) * 0.55, 2.45, Math.sin(angle) * 0.55)
    mountGroup.add(stud)
  }

  root.add(mountGroup)
  registerNodeEntry(map, 'strut_mount', mountGroup, [rubberMat, steelMat, studMat], new THREE.Vector3(0, 0, 0), nodes, [0, 2.0, 0])

  // D. STEERING TIE ROD (Lateral link with ball joint)
  const tieGroup = new THREE.Group()
  const tieMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.85, roughness: 0.3 })

  // Main tie rod bar
  const tieBar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.8, 16), tieMat)
  tieBar.rotation.z = Math.PI / 2
  tieBar.position.set(1.1, -1.6, 0.2)
  tieGroup.add(tieBar)

  // Outer ball joint socket
  const ballSocket = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 24), tieMat)
  ballSocket.position.set(2.0, -1.6, 0.2)
  tieGroup.add(ballSocket)

  // Knuckle stud
  const ballStud = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.35, 12), steelMat)
  ballStud.position.set(2.0, -1.35, 0.2)
  tieGroup.add(ballStud)

  root.add(tieGroup)
  registerNodeEntry(map, 'tie_rod', tieGroup, [tieMat, steelMat], new THREE.Vector3(0, 0, 0), nodes, [1.8, -0.6, 0])
}

/**
 * 3. ENGINE TIMING DRIVE (Belt, Camshaft Sprocket, Crankshaft Gear, Tensioner, Water Pump)
 */
function buildTimingGeometry(
  root: THREE.Group,
  nodes: AssemblyNodePart[],
  map: Map<string, NodeMeshEntry>,
) {
  const gearMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.88, roughness: 0.25 })
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.9, metalness: 0.15 })
  const alloyMat = new THREE.MeshStandardMaterial({ color: 0xa1a1aa, metalness: 0.75, roughness: 0.4 })

  // A. CAMSHAFT SPROCKET (Large upper gear with lightening cutouts)
  const camGroup = new THREE.Group()
  const camGear = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.22, 48), gearMat)
  camGear.rotation.x = Math.PI / 2
  camGroup.add(camGear)

  // 4 Lightening holes
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2
    const cutout = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.24, 20), beltMat)
    cutout.rotation.x = Math.PI / 2
    cutout.position.set(Math.cos(angle) * 0.65, Math.sin(angle) * 0.65, 0)
    camGroup.add(cutout)
  }
  camGroup.position.set(0, 1.3, 0)
  root.add(camGroup)
  registerNodeEntry(map, 'camshaft_sprocket', camGroup, [gearMat], new THREE.Vector3(0, 1.3, 0), nodes, [0, 1.6, 0.8])

  // B. CRANKSHAFT SPROCKET (Smaller lower drive gear)
  const crankGroup = new THREE.Group()
  const crankGear = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.24, 36), gearMat.clone())
  crankGear.rotation.x = Math.PI / 2
  crankGroup.add(crankGear)

  // Center shaft keyway
  const centerHub = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.26, 24), alloyMat)
  centerHub.rotation.x = Math.PI / 2
  crankGroup.add(centerHub)

  crankGroup.position.set(0, -1.3, 0)
  root.add(crankGroup)
  registerNodeEntry(map, 'crankshaft_sprocket', crankGroup, [crankGear.material as THREE.MeshStandardMaterial, alloyMat], new THREE.Vector3(0, -1.3, 0), nodes, [0, -1.6, 0.8])

  // C. BELT TENSIONER PULLEY (Eccentric roller on mounting arm)
  const tensionerGroup = new THREE.Group()
  const tensionerRoller = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.22, 32), gearMat.clone())
  tensionerRoller.rotation.x = Math.PI / 2
  tensionerGroup.add(tensionerRoller)

  // Bracket arm
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.1), alloyMat)
  arm.position.set(0.2, -0.2, -0.1)
  tensionerGroup.add(arm)

  tensionerGroup.position.set(-1.1, 0.1, 0)
  root.add(tensionerGroup)
  registerNodeEntry(map, 'tensioner_pulley', tensionerGroup, [tensionerRoller.material as THREE.MeshStandardMaterial, alloyMat], new THREE.Vector3(-1.1, 0.1, 0), nodes, [-1.7, 0.2, 0.8])

  // D. WATER PUMP (Housing body with coolant impeller drive pulley)
  const pumpGroup = new THREE.Group()
  const pumpPulley = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.22, 32), gearMat.clone())
  pumpPulley.rotation.x = Math.PI / 2
  pumpGroup.add(pumpPulley)

  // Pump scroll housing behind pulley
  const pumpHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.35, 24), alloyMat)
  pumpHousing.rotation.x = Math.PI / 2
  pumpHousing.position.z = -0.25
  pumpGroup.add(pumpHousing)

  pumpGroup.position.set(1.15, -0.2, 0)
  root.add(pumpGroup)
  registerNodeEntry(map, 'water_pump', pumpGroup, [pumpPulley.material as THREE.MeshStandardMaterial, alloyMat], new THREE.Vector3(1.15, -0.2, 0), nodes, [1.8, -0.2, 0.8])

  // E. CONTINUOUS TIMING BELT LOOP
  const beltGroup = new THREE.Group()
  // Loop passing around camshaft (top), water pump (right), crank (bottom), and tensioner (left)
  const beltCurve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0, 2.5, 0),
      new THREE.Vector3(1.1, 1.4, 0),
      new THREE.Vector3(1.7, -0.2, 0),
      new THREE.Vector3(0.6, -1.3, 0),
      new THREE.Vector3(0, -1.95, 0),
      new THREE.Vector3(-0.6, -1.3, 0),
      new THREE.Vector3(-1.6, 0.1, 0),
      new THREE.Vector3(-1.1, 1.4, 0),
    ],
    true,
  )
  const beltMesh = new THREE.Mesh(new THREE.TubeGeometry(beltCurve, 80, 0.08, 12, true), beltMat)
  beltGroup.add(beltMesh)

  root.add(beltGroup)
  registerNodeEntry(map, 'timing_belt', beltGroup, [beltMat], new THREE.Vector3(0, 0, 0), nodes, [0, 0, -1.6])
}

