import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { initTank, initPads, initFish, initPointer, updateTank, updatePointer } from './tank.js';

// Scene & camera & controls setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
const dummyCamera = new THREE.OrthographicCamera(window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, -1000, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, physicallyCorrectLights: true });
renderer.autoClear = false;
renderer.setClearColor(new THREE.Color().setRGB(0.02,0.02,0.02))
renderer.domElement.style.imageRendering="pixelated";

camera.position.set(0, -40, 30);
camera.up = new THREE.Vector3(0, 0, 1);
dummyCamera.position.set(0, -40, 30);
dummyCamera.up = new THREE.Vector3(0, 0, 1);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target = new THREE.Vector3(0, 0, 5);

let dummyScene = new THREE.Scene();

let rtTexture = new THREE.WebGLRenderTarget(
    window.innerWidth / 4, //resolution x
    window.innerHeight / 4, //resolution y
    {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBFormat
    });
var materialScreen = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rtTexture.texture } },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
        `,
    fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D tDiffuse;

        void main() {
            gl_FragColor = texture2D( tDiffuse, vUv );
        }
        `,
    depthWrite: false
});

var plane = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
// plane to display rendered texture
let quad = new THREE.Mesh(plane, materialScreen);
quad.position.y = - 40;
dummyScene.add(quad);
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
document.body.appendChild(stats.dom);
let lastUpdateTime = 0
let deltaTime = 0
function renderPass() {
    const currentTime = performance.now();
    deltaTime = currentTime - lastUpdateTime
    lastUpdateTime = currentTime;

    updateTank(scene, deltaTime);
    controls.update();
    updatePointer(scene, camera);
    stats.update();

    renderer.setRenderTarget(rtTexture);
    renderer.clear();
    renderer.render(scene, camera);
    // Render full screen quad with generated texture
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(dummyScene, dummyCamera);
}
renderer.setAnimationLoop(renderPass);

// Dom control
function resizeCanvas() {
    const width = banner.offsetWidth;
    const height = banner.offsetHeight;

    // Update camera
    camera.left = -width / 1;
    camera.right = width / 1;
    camera.top = height / 2;
    camera.bottom = -height / 2;
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