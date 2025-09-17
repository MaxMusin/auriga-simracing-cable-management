import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'

interface Parameters {
  depth: number
}

interface ThreeSceneProps {
  parameters: Parameters
}

export interface ThreeSceneRef {
  exportSTL: () => void
}

export const ThreeScene = forwardRef<ThreeSceneRef, ThreeSceneProps>(({ parameters }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    controls: OrbitControls
    mesh: THREE.Mesh | null
    baseGeometry: THREE.BufferGeometry | null
  } | null>(null)

  // Export STL function
  const exportSTL = () => {
    if (!sceneRef.current?.mesh) {
      console.warn('No mesh to export')
      return
    }

    const exporter = new STLExporter()
    const stlString = exporter.parse(sceneRef.current.mesh, { binary: false })
    const blob = new Blob([stlString], { type: 'application/sla' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = 'auriga_cable_guide.stl'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Expose export function to parent component
  useImperativeHandle(ref, () => ({
    exportSTL
  }))

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x001925)

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000)
    camera.position.set(150, 120, 200)

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.dampingFactor = 0.05

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 1.0) // Increased ambient light
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(100, 100, 50)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 500
    directionalLight.shadow.camera.left = -100
    directionalLight.shadow.camera.right = 100
    directionalLight.shadow.camera.top = 100
    directionalLight.shadow.camera.bottom = -100
    directionalLight.shadow.bias = -0.0001
    scene.add(directionalLight)

    // Add fill light from below to brighten shadows
    const fillLight = new THREE.DirectionalLight(0x6699ff, 0.3)
    fillLight.position.set(-50, -50, 30)
    scene.add(fillLight)

    // Add hemisphere light for better overall illumination
    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x444444, 0.4)
    scene.add(hemisphereLight)

    // Add grid
    const gridHelper = new THREE.GridHelper(400, 40, 0x00547E, 0x00344E)
    scene.add(gridHelper)

    sceneRef.current = {
      scene,
      camera,
      renderer,
      controls,
      mesh: null,
      baseGeometry: null,
    }

    // Load STL
    loadSTL()

    // Animation loop
    function animate() {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      if (!canvas.parentElement) return
      const { clientWidth, clientHeight } = canvas.parentElement
      renderer.setSize(clientWidth, clientHeight, false)
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(canvas.parentElement!)
    handleResize()

    return () => {
      resizeObserver.disconnect()
      renderer.dispose()
    }
  }, [])

  // Load STL file
  const loadSTL = async () => {
    if (!sceneRef.current) return

    try {
      const loader = new STLLoader()
      const response = await fetch('/model/4040_cableguide.stl')
      if (!response.ok) throw new Error(`Failed to load STL: ${response.status}`)
      
      const arrayBuffer = await response.arrayBuffer()
      const geometry = loader.parse(arrayBuffer)
      
      geometry.computeVertexNormals()
      geometry.computeBoundingBox()
      geometry.center()

      const material = new THREE.MeshStandardMaterial({ 
        color: 0x00AAFF, 
        metalness: 0.1, 
        roughness: 0.6 
      })
      
      const mesh = new THREE.Mesh(geometry, material)
      mesh.castShadow = true
      mesh.receiveShadow = false // Disable receiving shadows to avoid internal shadow artifacts

      // Clear existing mesh
      if (sceneRef.current.mesh) {
        sceneRef.current.scene.remove(sceneRef.current.mesh)
        sceneRef.current.mesh.geometry.dispose()
        ;(sceneRef.current.mesh.material as THREE.Material).dispose()
      }

      sceneRef.current.mesh = mesh
      sceneRef.current.baseGeometry = geometry.clone()
      sceneRef.current.scene.add(mesh)

      // Fit camera to object
      fitCameraToObject(mesh)
    } catch (error) {
      console.error('Error loading STL:', error)
    }
  }

  const fitCameraToObject = (object: THREE.Object3D) => {
    if (!sceneRef.current) return

    const box = new THREE.Box3().setFromObject(object)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())

    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = sceneRef.current.camera.fov * (Math.PI / 180)
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))
    cameraZ *= 1.5

    sceneRef.current.camera.position.set(center.x + cameraZ * 0.5, center.y + cameraZ * 0.3, center.z + cameraZ)
    sceneRef.current.camera.lookAt(center)
    sceneRef.current.controls.target.copy(center)
    sceneRef.current.controls.update()
  }

  // Apply depth scaling when parameters change
  useEffect(() => {
    if (!sceneRef.current?.mesh || !sceneRef.current?.baseGeometry) return

    const { mesh, baseGeometry } = sceneRef.current
    const targetDepth = parameters.depth

    // Calculate current depth (Z-axis)
    const positionAttribute = baseGeometry.getAttribute('position')
    if (!positionAttribute) return
    
    const bbox = new THREE.Box3().setFromBufferAttribute(positionAttribute as THREE.BufferAttribute)
    const currentDepth = bbox.max.z - bbox.min.z
    
    if (currentDepth <= 0) return

    const scale = targetDepth / currentDepth

    // Apply scaling to geometry
    const newGeometry = baseGeometry.clone()
    const scaleMatrix = new THREE.Matrix4().makeScale(1, 1, scale)
    newGeometry.applyMatrix4(scaleMatrix)
    newGeometry.computeVertexNormals()
    newGeometry.computeBoundingBox()

    // Update mesh geometry
    mesh.geometry.dispose()
    mesh.geometry = newGeometry

    // Don't reset camera view - preserve current viewing angle
  }, [parameters.depth])

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full block" 
    />
  )
})
