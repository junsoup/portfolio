import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let waterMesh = null;
let lilyPadInstances = null;
let fishInstances = null;
const FISH_COUNT = 20;
let BOUNDS_RADIUS = 24;
let BOUNDS_Z = { min: 1, max: 12 }
let loadStage = 0;

const loader = new GLTFLoader();

export function initTank(scene) {
    loader.load('models/tank_circular.glb', function (gltf) {
        scene.add(gltf.scene);
        gltf.scene.traverse(function (child) {
            if (child.isMesh && child.name === "water") {
                waterMesh = child;
                waterMesh.geometry.computeBoundingBox();
                waterMesh.geometry.computeVertexNormals();
                loadStage += 1;
            }
        });
    }, undefined, function (error) {
        console.error(error);
    });
}

export function initFish(scene) {
    loader.load('models/beegfeesh2.glb', function (gltf) {
        let fishMesh = gltf.scene.children[0];

        const lights = []
        const lightPositions = lights.map(light => light.position);
        const lightColors = lights.map(light => light.color);
        const lightPosArray = new Float32Array(30); // Max 10 lights (10 * 3 values)
        const lightColorArray = new Float32Array(30);

        for (let i = 0; i < Math.min(lights.length, 10); i++) {
            lightPosArray.set([lightPositions[i].x, lightPositions[i].y, lightPositions[i].z], i * 3);
            lightColorArray.set([lightColors[i].r, lightColors[i].g, lightColors[i].b], i * 3);
        }

        const vertexShader = `
// Vertex Shader
uniform float uTime;
attribute float aRandomOffset;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vNoiseValue;
varying float vNoiseValue2;

vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

float cnoise(vec3 P){
  vec3 Pi0 = floor(P); // Integer part for indexing
  vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
  Pi0 = mod(Pi0, 289.0);
  Pi1 = mod(Pi1, 289.0);
  vec3 Pf0 = fract(P); // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 / 7.0;
  vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 / 7.0;
  vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
  return 2.2 * n_xyz;
}

void main() {
    vec3 pos = position;
    // Calculate noise position
    vec3 noisePos = vec3(pos.x + aRandomOffset * 100.0, pos.y, pos.z); // Unique per fish
    vec3 noisePos2 = vec3(pos.x, pos.y + aRandomOffset * 100.0, pos.z); // Unique per fish
    float noise = cnoise(noisePos * 1.5);
    float noise2 = cnoise(noisePos2 * 1.5);
    vNoiseValue = (noise + 1.0) * 0.5;
    vNoiseValue2 = (noise2 + 1.0) * 0.5;

    // Snake-like flopping motion
    pos.x += sin(-pos.z * 1.5 + uTime * 3.0 + aRandomOffset * 1000.0) * 0.3;

    // Transform to world space
    vec4 worldPos = modelMatrix * instanceMatrix * vec4(pos, 1.0);

    // Floating bobbing motion
    worldPos.y += sin(worldPos.x * 0.1 + uTime) * 0.2 + cos(worldPos.z * 0.5 + uTime) * 0.1;

    // Normal transformation
    mat3 normalMat = mat3(modelMatrix * instanceMatrix);
    vNormal = normalize(normalMat * normal);

    vPosition = worldPos.xyz;


    gl_Position = projectionMatrix * viewMatrix * worldPos;
}

`;

        const fragmentShader = `
// Fragment Shader
varying vec3 vNormal;
varying vec3 vPosition;
varying float vNoiseValue;
varying float vNoiseValue2;

uniform int uLightCount;
uniform vec3 uLightPositions[10];
uniform vec3 uLightColors[10];

void main() {
    vec3 normal = normalize(vNormal);

    // Base color
    vec3 color = vec3(1.0);

    // Apply orange spots
    if (vNoiseValue > 0.6) {
        color = vec3(1.0, 0.3, 0.2);
    }
    // Apply black spots
    if (vNoiseValue2 > 0.7) {
        color = vec3(0.1, 0.1, 0.1);
    }


    // Diffuse lighting
    vec3 lightSum = vec3(0.0);
    for (int i = 0; i < uLightCount; i++) {
        vec3 lightDir = normalize(uLightPositions[i] - vPosition);
        float diff = max(dot(normal, lightDir), 0.0);
        lightSum += uLightColors[i] * diff;
    }

    gl_FragColor = vec4(color * lightSum, 1.0);
}

`;

        const randomOffsets = new Float32Array(FISH_COUNT);
        for (let i = 0; i < FISH_COUNT; i++) {
            randomOffsets[i] = Math.random();
        }

        // Add it to the geometry as an InstancedBufferAttribute
        fishMesh.geometry.setAttribute(
            'aRandomOffset',
            new THREE.InstancedBufferAttribute(randomOffsets, 1)
        );

        // Create shader material
        const shaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: timeUniform,
                uLightCount: { value: Math.min(lights.length, 10) },
                uLightPositions: { value: lightPosArray },
                uLightColors: { value: lightColorArray },
            },
            vertexShader,
            fragmentShader
        });

        // Create InstancedMesh for fish
        const geometry = fishMesh.geometry;
        fishInstances = new THREE.InstancedMesh(geometry, shaderMaterial, FISH_COUNT);

        // Position fish randomly
        const dummy = new THREE.Object3D();
        for (let i = 0; i < FISH_COUNT; i++) {
            let x = (Math.random() - 0.5) * 35;
            let y = (Math.random() - 0.5) * 35;
            let z = 4.5;

            dummy.position.set(x, y, z);
            dummy.updateMatrix();

            fishInstances.setMatrixAt(i, dummy.matrix);
        }

        fishInstances.instanceMatrix.needsUpdate = true;
        scene.add(fishInstances);
        loadStage += 1;
    });
}

export function initPads(scene) {
    const LILY_PAD_COUNT = 175;
    loader.load('models/pad.glb', function (gltf) {
        let lilyPadMesh = gltf.scene.children[0]; // Get the first child mesh
        lilyPadMesh.geometry.computeBoundingBox();
        lilyPadMesh.geometry.computeVertexNormals();

        if (!lilyPadMesh || !lilyPadMesh.isMesh) {
            console.error("Lily pad mesh not found in GLB");
            return;
        }
        const lights = []

        const lightPositions = lights.map(light => light.position);
        const lightColors = lights.map(light => light.color);
        const lightPosArray = new Float32Array(30); // Max 10 lights (10 * 3 values)
        const lightColorArray = new Float32Array(30);

        for (let i = 0; i < Math.min(lights.length, 10); i++) {
            lightPosArray.set([lightPositions[i].x, lightPositions[i].y, lightPositions[i].z], i * 3);
            lightColorArray.set([lightColors[i].r, lightColors[i].g, lightColors[i].b], i * 3);
        }

        const vertexShader = `
// Vertex Shader (lilyPadVertex.glsl)
uniform float uTime;

varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    vec3 pos = position;

    // Apply instance transformation first
    vec4 worldPos = instanceMatrix * modelMatrix * vec4(pos, 1.0);

    // Apply the wave function using the transformed world-space x, y
    worldPos.z += sin(worldPos.x * .1 + uTime) * 0.5 + cos(worldPos.y * .5 + uTime) * 0.17;

    // Pass normal and world position to fragment shader
    vNormal = normalize(normalMatrix * normal);
    vPosition = worldPos.xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;
        const fragmentShader = `
varying vec3 vNormal;
varying vec3 vPosition;

uniform int uLightCount;
uniform vec3 uLightPositions[10]; // Supports up to 10 lights
uniform vec3 uLightColors[10];

void main() {
    vec3 normal = normalize(vNormal);
    vec3 baseColor = vec3(0.133, 0.8, 0.144); // Lily pad green

    vec3 totalLight = vec3(0.0); // Start with no light

    // Loop through each light and accumulate lighting effect
    for (int i = 0; i < uLightCount; i++) {
        vec3 lightDir = normalize(uLightPositions[i] - vPosition);
        float diff = max(dot(normal, lightDir), 0.0); // Diffuse lighting
        totalLight += uLightColors[i] * diff;
    }

    // Ambient light component
    vec3 ambient = baseColor * 0.5;
    
    // Final color output
    vec3 color = ambient + (baseColor * totalLight);
    gl_FragColor = vec4(color, 1.0);
}
`;

        // Create shader material
        const shaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: timeUniform,
                uLightCount: { value: Math.min(lights.length, 10) },
                uLightPositions: { value: lightPosArray },
                uLightColors: { value: lightColorArray },
            },
            vertexShader,
            fragmentShader,
            side: THREE.DoubleSide
        });

        // Create instances
        const geometry = lilyPadMesh.geometry;
        lilyPadInstances = new THREE.InstancedMesh(geometry, shaderMaterial, LILY_PAD_COUNT);

        // Generate initial positions and scales
        let pads = [];
        for (let i = 0; i < LILY_PAD_COUNT; i++) {
            let theta = Math.random() * 2 * Math.PI;
            let magnitude = BOUNDS_RADIUS * (1 - Math.random() ** 4);
            let x = Math.sin(theta) * magnitude;
            let y = Math.cos(theta) * magnitude;
            let scale = Math.random() * Math.random() * 2 + .25;
            pads.push({
                position: new THREE.Vector3(x, y, 12),
                scale: scale
            });
        }

        // Resolve overlaps
        const MAX_ATTEMPTS = 5;
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            let moved = false;

            for (let i = 0; i < pads.length; i++) {
                for (let j = i + 1; j < pads.length; j++) {
                    const padA = pads[i];
                    const padB = pads[j];
                    const delta = new THREE.Vector2().subVectors(
                        new THREE.Vector2(padA.position.x, padA.position.y),
                        new THREE.Vector2(padB.position.x, padB.position.y)
                    );
                    const distance = delta.length();
                    const minDist = padA.scale + padB.scale;

                    if (distance < minDist && distance > 0.0001) {
                        const overlap = (minDist - distance) * 0.5;
                        delta.normalize().multiplyScalar(overlap);
                        padA.position.x += delta.x;
                        padA.position.y += delta.y;
                        padB.position.x -= delta.x;
                        padB.position.y -= delta.y;
                        moved = true;
                    }
                }
            }

            // Enforce BOUNDS_RADIUS after each pass
            for (let pad of pads) {
                const radial = new THREE.Vector2(pad.position.x, pad.position.y);
                const radialLength = radial.length();
                const maxDist = BOUNDS_RADIUS - pad.scale;
                if (radialLength > maxDist) {
                    radial.normalize().multiplyScalar(maxDist);
                    pad.position.x = radial.x;
                    pad.position.y = radial.y;
                }
            }

            if (!moved) break;
        }

        // Apply final transforms to InstancedMesh
        const dummy = new THREE.Object3D();
        for (let i = 0; i < LILY_PAD_COUNT; i++) {
            const pad = pads[i];
            dummy.position.copy(pad.position);
            dummy.scale.setScalar(pad.scale);
            dummy.rotation.set(0, 0, Math.random() * Math.PI * 2);
            dummy.updateMatrix();
            lilyPadInstances.setMatrixAt(i, dummy.matrix);
        }

        lilyPadInstances.instanceMatrix.needsUpdate = true;
        scene.add(lilyPadInstances);
        loadStage += 1;
    });
}

// Pointer setup (for feeding fish)
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let intersection = null;
let feed_allowed = false;
let feed_inprogress = false;
export function initPointer(renderer, banner) {
    var onPointerMove = function (event) {
        pointer.x = (event.clientX / renderer.domElement.width * renderer.getPixelRatio()) * 2 - 1;
        pointer.y = - (event.clientY / renderer.domElement.height * renderer.getPixelRatio()) * 2 + 1;
        feed_allowed = false;
    }
    window.addEventListener("pointermove", onPointerMove);
    banner.addEventListener("mousedown", () => { feed_allowed = true; });
    banner.addEventListener("mouseup", () => { if (feed_allowed) feed_inprogress = true; });
    loadStage += 1;
}

// Pointer logic (for feeding fish)
let foods = [];
const geometry = new THREE.IcosahedronGeometry(.5, 0);
export function updatePointer(scene, camera) {
    if (!feed_inprogress)
        return;
    // update the picking ray with the camera and pointer position
    raycaster.setFromCamera(pointer, camera);
    // calculate objects intersecting the picking ray
    const intersections = raycaster.intersectObjects(scene.children);
    intersection = (intersections.length) > 0 ? intersections[0] : null;
    if (intersection !== null) {
        intersection.point.add(new THREE.Vector3(
            THREE.MathUtils.randFloat(-1, 1),
            THREE.MathUtils.randFloat(-1, 1),
            THREE.MathUtils.randFloat(-1, 1)
        ))
        let rand_color = new THREE.Color().setRGB(
            THREE.MathUtils.randFloat(0, 1),
            THREE.MathUtils.randFloat(0, 1),
            THREE.MathUtils.randFloat(0, 1))
        const material = new THREE.MeshStandardMaterial({
            color: rand_color,
            emissive: rand_color,
            emissiveIntensity:
                // make rare shiny food!!!!
                THREE.MathUtils.randFloat(0, 2)**8,
        });
        const food = new THREE.Mesh(geometry, material);

        // Clamp to the circle edge
        intersection.point.clampLength(-BOUNDS_RADIUS+5, BOUNDS_RADIUS-5);

        food.position.set(intersection.point.x, intersection.point.y, 15);
        foods.push(food);
        scene.add(food);

    }
    feed_inprogress = false;
}

let timeUniform = { value: 0 };
export function updateTank(scene, deltaTime) {
    timeUniform.value += deltaTime / 1000;
    
    if (!waterMesh || !lilyPadInstances || !fishInstances) return;

    // Update water waves
    const position = waterMesh.geometry.attributes.position;
    const worldMatrix = waterMesh.matrixWorld; // Get world transformation

    let time = timeUniform.value;

    for (let i = 0; i < position.count; i++) {
        if (position.getZ(i) > 1) {
            // Convert local x, y to world x, y
            let localPos = new THREE.Vector3(position.getX(i), position.getY(i), position.getZ(i));
            let worldPos = localPos.applyMatrix4(worldMatrix);

            let waveHeight = Math.sin(worldPos.x * .1 + time) * 0.5 + Math.cos(worldPos.y * 0.5 + time) * 0.17 + 12;
            position.setZ(i, waveHeight);
        }
    }

    position.needsUpdate = true;
    updateFish(scene, deltaTime);
    updateLights(scene);
    updateFoodPositions(deltaTime);
}

function updateFoodPositions(deltaTime) {
    const waterLevel = 4; // The level where food slows down
    const fallSpeed = 0.05; // Base falling speed

    for (let i = 0; i < foods.length; i++) {
        let food = foods[i].position;
        let distance = Math.max(food.z - waterLevel, 0); // Distance from water level
        let fallAmount = distance * fallSpeed * deltaTime / 20; // Proportional fall speed

        food.z -= fallAmount; // Apply falling movement

        // Prevent food from going below the buoyant level
        if (food.z < waterLevel) {
            food.z = waterLevel;
        }
    }
}

export function updateLights(scene) {
    if (!lilyPadInstances || !fishInstances) return;
    // Update light positions
    const lights = getAllLights(scene);

    const lightPosArray = new Float32Array(30);
    const lightColorArray = new Float32Array(30);

    for (let i = 0; i < Math.min(lights.length, 10); i++) {
        lightPosArray.set([lights[i].position.x, lights[i].position.y, lights[i].position.z], i * 3);
        lightColorArray.set([lights[i].color.r, lights[i].color.g, lights[i].color.b], i * 3);
    }

    lilyPadInstances.material.uniforms.uLightCount.value = Math.min(lights.length, 10);
    lilyPadInstances.material.uniforms.uLightPositions.value = lightPosArray;
    lilyPadInstances.material.uniforms.uLightColors.value = lightColorArray;
    fishInstances.material.uniforms.uLightCount.value = Math.min(lights.length, 10);
    fishInstances.material.uniforms.uLightPositions.value = lightPosArray;
    fishInstances.material.uniforms.uLightColors.value = lightColorArray;

}

// Fish movement logic.
let fishVelocities;
const dummy = new THREE.Object3D();
const dummyOther = new THREE.Object3D();
export function updateFish(scene, deltaTime) {
    if (!fishInstances) return;
    if (!fishVelocities) {
        fishVelocities = new Array(fishInstances.count).fill().map(() => (
            new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5
            )
        ));
    }

    // Boids parameters
    const protectedRadius = 4;
    const visibleRadius = 10;
    const separationStrength = 0.05 * deltaTime / 8;
    const alignmentStrength = .2 * deltaTime / 8;
    const cohesionStrength = .0035 * deltaTime / 8;
    const foodStrength = .35 * deltaTime / 8;
    const maxSpeed = 0.065 * deltaTime / 8;
    const minSpeed = 0.035 * deltaTime / 8;
    const lerpForce = 0.005 * deltaTime / 8;
    const turnFactor = 0.00125 * deltaTime / 8;


    for (let i = 0; i < fishInstances.count; i++) {
        fishInstances.getMatrixAt(i, dummy.matrix);
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

        let velocity = fishVelocities[i]; // { dx, dy, dz }

        // Forces
        let separationForce = new THREE.Vector3(0, 0, 0);
        let alignmentForce = new THREE.Vector3(0, 0, 0);
        let cohesionForce = new THREE.Vector3(0, 0, 0);

        let protectedCount = 0;
        let visibleCount = 0;

        let avgPosition = new THREE.Vector3(0, 0, 0); // Track average position for cohesion

        for (let j = 0; j < fishInstances.count; j++) {
            if (i === j) continue;

            fishInstances.getMatrixAt(j, dummyOther.matrix);
            dummyOther.matrix.decompose(dummyOther.position, dummyOther.quaternion, dummyOther.scale);

            let otherVelocity = fishVelocities[j];
            let toOther = new THREE.Vector3().subVectors(dummy.position, dummyOther.position);
            let distance = toOther.length();

            if (distance < protectedRadius) {
                // Separation
                separationForce.add(toOther.divideScalar(distance));
                protectedCount++;

            } else if (distance < visibleRadius) {
                // Alignment
                alignmentForce.add(otherVelocity);

                // Cohesion
                avgPosition.add(dummyOther.position);

                visibleCount++;
            }

        }

        // Compute averaged forces
        if (protectedCount > 0) {
            // Separation
            separationForce.multiplyScalar(separationStrength);
        }
        if (visibleCount > 0) {
            // Alignment
            alignmentForce.divideScalar(visibleCount).multiplyScalar(alignmentStrength);

            // Cohesion
            avgPosition.divideScalar(visibleCount);
            let toCenter = new THREE.Vector3().subVectors(avgPosition, dummy.position);
            cohesionForce.copy(toCenter.multiplyScalar(cohesionStrength));
        }

        // Food force logic
        let foodForce = new THREE.Vector3(0, 0, 0);
        foods = foods.filter(food => {
            let distance = dummy.position.distanceTo(food.position);
            if (distance <= 0.5) {
                scene.remove(food);
                return false
            }
            return true
        });

        if (foods.length > 0) {
            let closestFood = null;
            let minDistance = Infinity;

            // Find the closest food particle
            for (let food of foods) {
                let distance = dummy.position.distanceTo(food.position);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestFood = food;
                }
            }

            if (closestFood) {
                // Strength is proportional to inverse distance
                let distance = clamp(minDistance, 0.01, 100);

                // Compute direction towards food
                foodForce.subVectors(closestFood.position, dummy.position).normalize().multiplyScalar(foodStrength).divideScalar(distance);
            }
        }

        // Combine forces
        let desiredVelocity = new THREE.Vector3()
        desiredVelocity
            .add(separationForce)
            .add(alignmentForce)
            .add(cohesionForce)
            .add(foodForce);

        // Boundary avoidance logic (should not be lerped)
        const pos2D = new THREE.Vector2(dummy.position.x, dummy.position.y);
        const dist = pos2D.length();
        const inward = pos2D.clone().normalize().negate(); // Direction toward center
        const strength = turnFactor / Math.max(BOUNDS_RADIUS - dist, 0.001); // Stronger if farther out
        velocity.x += inward.x * strength;
        velocity.y += inward.y * strength;
        velocity.z += turnFactor / Math.max(dummy.position.z - BOUNDS_Z.min, 0.001);
        velocity.z -= turnFactor / Math.max(BOUNDS_Z.max - dummy.position.z, 0.001);
        velocity.z *= 0.9909;

        // Lerp old velocity to new desired velocity
        velocity.lerp(desiredVelocity, lerpForce);
        // Normalize velocity to maintain constant speed
        velocity.clampLength(minSpeed, maxSpeed)

        // Move the fish
        dummy.position.add(velocity)

        // Align rotation with movement direction
        let direction = new THREE.Vector3(velocity.x, velocity.y, velocity.z).normalize();

        if (direction.lengthSq() > 0) {
            let quaternion = new THREE.Quaternion();
            let up = new THREE.Vector3(0, 0, 1);
            let matrix = new THREE.Matrix4().lookAt(new THREE.Vector3(), direction, up);
            quaternion.setFromRotationMatrix(matrix);
            dummy.quaternion.copy(quaternion);
        }

        dummy.updateMatrix();
        fishInstances.setMatrixAt(i, dummy.matrix);

        fishVelocities[i] = velocity; // Store updated velocity
    }

    fishInstances.instanceMatrix.needsUpdate = true;
}

// helper functions
function clamp(number, min, max) {
    return Math.max(min, Math.min(number, max));
}

// Get all active lights in scene.
function getAllLights(object, lightArray = []) {
    if (object.isLight) {
        lightArray.push(object);
    }
    if (object.children.length > 0) {
        object.children.forEach(child => getAllLights(child, lightArray));
    }
    return lightArray;
}
