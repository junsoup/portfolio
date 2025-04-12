import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { initTank, initPads, initFish, initPointer, updateTank, updatePointer } from './tank.js';

// Scene & camera & controls setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, 3000);
// const camera = new THREE.OrthographicCamera(window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, -1000, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, physicallyCorrectLights: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x111111);
camera.position.set(-10.2, -22.9, 15.24);
camera.up = new THREE.Vector3(0, 0, 1);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target = new THREE.Vector3(0, 0, 5);
controls.enablePan = false;
controls.minDistance = 30;
controls.maxDistance = 65;
controls.maxPolarAngle = 96*Math.PI/180;

// Window setup
const banner = document.getElementById('banner')
renderer.setSize(banner.offsetWidth, banner.offsetHeight);
banner.appendChild(renderer.domElement);

// Initalize scene objects
initTank(scene);
initPads(scene);
initFish(scene);
initPointer(renderer, banner);


// Render logic
let stats = new Stats();
// document.body.appendChild(stats.dom);
let lastUpdateTime = 0
let deltaTime = 0
function renderPass() {
    const currentTime = performance.now();
    deltaTime = currentTime - lastUpdateTime
    lastUpdateTime = currentTime;
    // Keep deltaTime between 1ms ~ 1 second.
    // (fish velocity gets out of proportions when tabbing in after a while.)
    deltaTime = Math.max(1, Math.min(deltaTime, 1000));
    
    updateTank(scene, deltaTime);
    // camera.position.clampLength(30, 55);
    controls.update();
    updatePointer(scene, camera);
    stats.update();
    renderer.render(scene, camera);
    renderer.setAnimationLoop(renderPass);
}
renderPass()

// Dom control
function resizeCanvas() {
    const width = banner.offsetWidth;
    const height = banner.offsetHeight;

    // Update camera
    // camera.left = -width / .5;
    // camera.right = width / .5;
    // camera.top = height / 2;
    // camera.bottom = -height / 2;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // Resize renderer
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
}
// Observe size changes of the banner
const resizeObserver = new ResizeObserver(() => {
    resizeCanvas();
});

resizeObserver.observe(banner);

// Also call on window resize
window.addEventListener("resize", resizeCanvas);