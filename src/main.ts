import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';

// DOM Elements
const canvas = document.getElementById('three-canvas') as HTMLCanvasElement;
const resetScaleBtn = document.getElementById('resetScale') as HTMLButtonElement;
const exportBtn = document.getElementById('exportSTL') as HTMLButtonElement;

// Parameter controls
const widthRange = document.getElementById('widthRange') as HTMLInputElement;
const widthValue = document.getElementById('widthValue') as HTMLOutputElement;
const heightRange = document.getElementById('heightRange') as HTMLInputElement;
const heightValue = document.getElementById('heightValue') as HTMLOutputElement;
const depthRange = document.getElementById('depthRange') as HTMLInputElement;
const depthValue = document.getElementById('depthValue') as HTMLOutputElement;
const thicknessRange = document.getElementById('thicknessRange') as HTMLInputElement;
const thicknessValue = document.getElementById('thicknessValue') as HTMLOutputElement;
const holeDiameterRange = document.getElementById('holeDiameterRange') as HTMLInputElement;
const holeDiameterValue = document.getElementById('holeDiameterValue') as HTMLOutputElement;
const holeCountRange = document.getElementById('holeCountRange') as HTMLInputElement;
const holeCountValue = document.getElementById('holeCountValue') as HTMLOutputElement;

// Axis is fixed to Z for depth
const DEPTH_AXIS: 'x' | 'y' | 'z' = 'z';

function getSelectedAxis(): 'x' | 'y' | 'z' {
  return DEPTH_AXIS;
}

// Three.js basics
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f14);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
camera.position.set(150, 120, 200);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lights
const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.8);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(1, 2, 3);
scene.add(dir);

// Helpers
const grid = new THREE.GridHelper(1000, 100, 0x2a3a4a, 0x1b2735);
(grid.material as THREE.Material).transparent = true;
scene.add(grid);
const axes = new THREE.AxesHelper(50);
scene.add(axes);

// Model state
let mesh: THREE.Mesh | null = null;
let baseGeometry: THREE.BufferGeometry | null = null; // original unscaled geometry

function fitCameraToObject(object: THREE.Object3D, offset = 1.25) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs((maxDim / 2) / Math.tan(fov / 2)) * offset;

  camera.position.set(center.x + cameraZ * 0.3, center.y + cameraZ * 0.35, center.z + cameraZ);
  camera.near = cameraZ / 100;
  camera.far = cameraZ * 100;
  camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.update();
}

function computeAxisLengths(geometry: THREE.BufferGeometry) {
  const g = geometry.clone();
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  return {
    x: bb.max.x - bb.min.x,
    y: bb.max.y - bb.min.y,
    z: bb.max.z - bb.min.z,
  };
}

// Axis is fixed, so no auto-detect needed

function updateCurrentDepthDisplay(geometry: THREE.BufferGeometry, axis: 'x' | 'y' | 'z') {
  const lens = computeAxisLengths(geometry);
  const val = lens[axis];
  if (depthValue) depthValue.value = `${Math.round(val)}`;
}

function clearModel() {
  if (mesh) {
    scene.remove(mesh);
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    mesh = null;
  }
  baseGeometry?.dispose();
  baseGeometry = null;
}

async function loadSTLFromArrayBuffer(arrayBuffer: ArrayBuffer) {
  const loader = new STLLoader();
  const geo = loader.parse(arrayBuffer);
  geo.computeVertexNormals();

  // Center geometry at origin for predictable scaling and viewing
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const center = new THREE.Vector3().addVectors(bb.min, bb.max).multiplyScalar(0.5);
  geo.translate(-center.x, -center.y, -center.z);

  const mat = new THREE.MeshStandardMaterial({ color: 0x90caf9, metalness: 0.1, roughness: 0.6 });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;

  clearModel();
  mesh = m;
  baseGeometry = geo.clone(); // keep original state for reset and scaling calculations
  scene.add(mesh);

  updateCurrentDepthDisplay(geo, DEPTH_AXIS);
  // Initialize slider to current depth within min/max bounds
  if (depthRange) {
    const min = Number(depthRange.min) || 20;
    const max = Number(depthRange.max) || 300;
    const current = Math.min(Math.max(Math.round(computeAxisLengths(geo)[DEPTH_AXIS]), min), max);
    depthRange.value = String(current);
    if (depthValue) depthValue.value = String(current);
  }

  fitCameraToObject(mesh);
  enableControls();
}

// No axis UI

function enableControls() {
  resetScaleBtn.disabled = false;
  exportBtn.disabled = false;
}

function getScaleForTargetLength(geometry: THREE.BufferGeometry, axis: 'x' | 'y' | 'z', target: number) {
  const lengths = computeAxisLengths(geometry);
  const cur = lengths[axis];
  return cur > 0 ? (target / cur) : 1;
}

function bakeScaleAlongAxis(axis: 'x' | 'y' | 'z', scale: number) {
  if (!mesh || !baseGeometry) return;

  // Start from original geometry to avoid cumulative errors
  const geo = baseGeometry.clone();

  const s = new THREE.Vector3(1, 1, 1);
  if (axis === 'x') s.x = scale;
  if (axis === 'y') s.y = scale;
  if (axis === 'z') s.z = scale;

  const mat = new THREE.Matrix4().makeScale(s.x, s.y, s.z);
  geo.applyMatrix4(mat);
  geo.computeVertexNormals();
  geo.computeBoundingBox();

  mesh.geometry.dispose();
  mesh.geometry = geo;

  // Update current depth display
  updateCurrentDepthDisplay(geo, axis);
  fitCameraToObject(mesh);
}

function exportCurrentMeshAsSTL() {
  if (!mesh) return;
  const exporter = new STLExporter();
  const stlString = exporter.parse(mesh, { binary: false }) as string; // ascii for readability
  const blob = new Blob([stlString], { type: 'application/sla' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `auriga-simracing-cable-guide-${Date.now()}.stl`;
  a.click();
  URL.revokeObjectURL(url);
}

// Auto-load provided STL from public assets
async function autoLoadProvidedSTL() {
  try {
    // Load from public/model/ per user's provided path
    const res = await fetch('/model/4040_cableguide.stl');
    if (!res.ok) throw new Error(`Failed to load /model/4040_cableguide.stl: ${res.status}`);
    const buf = await res.arrayBuffer();
    await loadSTLFromArrayBuffer(buf);
  } catch (err) {
    console.error(err);
  }
}

// Event listeners for all parameters
function setupEventListeners() {
  // Width parameter
  widthRange.addEventListener('input', () => {
    widthValue.textContent = widthRange.value;
    // TODO: Apply width scaling when parametric generation is implemented
  });

  // Height parameter
  heightRange.addEventListener('input', () => {
    heightValue.textContent = heightRange.value;
    // TODO: Apply height scaling when parametric generation is implemented
  });

  // Depth parameter (currently the only one that works)
  depthRange.addEventListener('input', () => {
    if (!mesh) return;
    const target = Number(depthRange.value);
    depthValue.textContent = String(target);
    const scale = getScaleForTargetLength(baseGeometry ?? mesh.geometry, DEPTH_AXIS, target);
    bakeScaleAlongAxis(DEPTH_AXIS, scale);
  });

  // Bracket thickness
  thicknessRange.addEventListener('input', () => {
    thicknessValue.textContent = thicknessRange.value;
    // TODO: Apply thickness when parametric generation is implemented
  });

  // Hole diameter
  holeDiameterRange.addEventListener('input', () => {
    holeDiameterValue.textContent = holeDiameterRange.value;
    // TODO: Apply hole diameter when parametric generation is implemented
  });

  // Hole count
  holeCountRange.addEventListener('input', () => {
    holeCountValue.textContent = holeCountRange.value;
    // TODO: Apply hole count when parametric generation is implemented
  });
}

setupEventListeners();

resetScaleBtn.addEventListener('click', () => {
  if (!mesh || !baseGeometry) return;
  // Restore original geometry
  mesh.geometry.dispose();
  mesh.geometry = baseGeometry.clone();

  updateCurrentDepthDisplay(mesh.geometry, DEPTH_AXIS);
  fitCameraToObject(mesh);
});

exportBtn.addEventListener('click', () => exportCurrentMeshAsSTL());

window.addEventListener('resize', onResize);
function onResize() {
  const { clientWidth, clientHeight } = canvas.parentElement as HTMLElement;
  renderer.setSize(clientWidth, clientHeight, false);
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
}

// Initial sizing after DOM ready
requestAnimationFrame(() => {
  onResize();
  autoLoadProvidedSTL();
});

// Render loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
