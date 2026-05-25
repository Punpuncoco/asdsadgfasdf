import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Compass,
  Gauge,
  HelpCircle,
  Dices,
  Eye,
  Sliders,
  TrendingUp,
  Activity,
  Layers,
  Zap,
  Cpu,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Scientific Physical Material Presets
interface MaterialPreset {
  name: string;
  density: number;      // g/cm^3
  roughness: number;    // surface micro-friction roughness
  metalness: number;    // metalness index
  color: number;        // display color
  emissive: number;     // glow ambient self-illumination
}

const MATERIAL_PRESETS: Record<string, MaterialPreset> = {
  brass: {
    name: 'ทองเหลืองกลึงหรูหรา (Solid Brass)',
    density: 8.5,
    roughness: 0.12,
    metalness: 0.95,
    color: 0xd97706, // Golden bronze
    emissive: 0x221100
  },
  copper: {
    name: 'ทองแดงบริสุทธิ์ (Red Copper)',
    density: 8.96,
    roughness: 0.15,
    metalness: 0.92,
    color: 0xc2410c, // Deep copper red
    emissive: 0x210800
  },
  aluminum: {
    name: 'อลูมิเนียมเกรดการบิน (Aero Aluminum)',
    density: 2.7,
    roughness: 0.22,
    metalness: 0.88,
    color: 0x94a3b8, // Slate silver
    emissive: 0x0f172a
  },
  acrylic: {
    name: 'โพลีคาร์บอเนตโปร่งใส (Clear Acrylic)',
    density: 1.18,
    roughness: 0.08,
    metalness: 0.1,
    color: 0x0ea5e9, // Glowing sky blue
    emissive: 0x001f3f
  }
};

// Celestial Gravity Presets (cm/s^2 conversion)
interface GravityPreset {
  name: string;
  value: number; // cm/s^2
}

const GRAVITY_PRESETS: Record<string, GravityPreset> = {
  earth: { name: 'แรงโน้มถ่วงโลก (Earth - 9.807 m/s²)', value: 980.665 },
  mars: { name: 'ดาวอังคาร (Mars - 3.711 m/s²)', value: 371.1 },
  moon: { name: 'ดวงจันทร์ (Moon - 1.622 m/s²)', value: 162.2 },
  space: { name: 'ห้วงอวกาศเกือบไร้น้ำหนัก (Zero Gravity G-Glide)', value: 8.5 }
};

export default function App() {
  // --- STATE VARS ---
  // Object geometry dimensions
  const [toySides, setToySides] = useState<number>(4); // Regular Polygon sides 3,4,5,6,8,10
  const [toyRadius, setToyRadius] = useState<number>(3.5); // Average major radius (cm)
  const [toyThickness, setToyThickness] = useState<number>(0.8); // Core thickness (cm)
  const [domeHeight, setDomeHeight] = useState<number>(0.5); // Spherical dome cap height (cm)
  const [activeMaterial, setActiveMaterial] = useState<string>('brass'); // material choice

  // Slanted Stage dimensions
  const [rampAngleDeg, setRampAngleDeg] = useState<number>(23); // angle in deg
  const [rampLength, setRampLength] = useState<number>(15.3); // Horizontal base length of ramp (cm)
  const rampHeight = rampLength * Math.tan((rampAngleDeg * Math.PI) / 180);

  const [rampLengthInput, setRampLengthInput] = useState<string>('15.3');
  const [rampAngleInput, setRampAngleInput] = useState<string>('23');

  // Sync inputs with state on change
  useEffect(() => {
    setRampLengthInput(rampLength.toString());
  }, [rampLength]);

  useEffect(() => {
    setRampAngleInput(rampAngleDeg.toString());
  }, [rampAngleDeg]);
  const [frictionMew, setFrictionMew] = useState<number>(0.45); // friction coefficient (Mew)
  const [isUneven, setIsUneven] = useState<boolean>(false); // wavy table mesh
  const [waveHeight, setWaveHeight] = useState<number>(0.8); // table crest size

  // Physics dynamic constants & custom configurations
  const [activeGravity, setActiveGravity] = useState<string>('earth');
  const [substepsLimit, setSubstepsLimit] = useState<number>(45); // Substepping frequency
  const [customElasticityK, setCustomElasticityK] = useState<number>(48000); // Spring modulus
  const [customDampingC, setCustomDampingC] = useState<number>(180); // Contact damper
  const [airDragLinear, setAirDragLinear] = useState<number>(0.015); // Hydrodynamic resistances
  const [airDragAngular, setAirDragAngular] = useState<number>(0.012);

  // Playback control states
  const [isPaused, setIsPaused] = useState<boolean>(true);
  const [isCameraLocked, setIsCameraLocked] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [isAutoRolling, setIsAutoRolling] = useState<boolean>(false);
  const [activePlacement, setActivePlacement] = useState<string>('flip_wall'); // stand perpendicular by default!
  const [timeScale, setTimeScale] = useState<number>(1.0); // 0.1, 0.25, 0.5, 1.0, 2.0

  // Active UI Tabs
  const [activeConfigTab, setActiveConfigTab] = useState<string>('object'); // 'object', 'slope', 'physics'
  const [isDeepPhysicsOpen, setIsDeepPhysicsOpen] = useState<boolean>(false);

  // Precision Telemetry Outputs
  const [flipCount, setFlipCount] = useState<number>(0);
  const [speedStat, setSpeedStat] = useState<string>('0.0');
  const [kineticState, setKineticState] = useState<string>('ระบบพร้อมปล่อย');
  const [surfaceTilt, setSurfaceTilt] = useState<string>('สโลป (0.0°)');
  const [gravityXOffset, setGravityXOffset] = useState<number>(0);
  const [gravityYOffset, setGravityYOffset] = useState<number>(0);

  // Scientific derived outputs
  const [derivedMass, setDerivedMass] = useState<number>(18.5); // g
  const [derivedIzz, setDerivedIzz] = useState<number>(55.2);   // g*cm^2
  const [derivedIxx, setDerivedIxx] = useState<number>(38.4);   // g*cm^2
  const [derivedEnergy, setDerivedEnergy] = useState<number>(0.0); // mJ
  const [contactForceN, setContactForceN] = useState<number>(0.0); // N

  // --- REFS ---
  const audioCtxRef = useRef<AudioContext | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Core High-Frequency Physics Ref (prevents React render lagging)
  const physicsRef = useRef({
    pos: new THREE.Vector3(0, 0, 1.5),
    vel: new THREE.Vector3(0, 0, 0),
    omega: new THREE.Vector3(0, 0, 0),       // angular velocity in world coordinates
    quat: new THREE.Quaternion(0, 0, 0, 1),
    toyMass: 0.024,                      // mass (kg)
    derivedIzz: 55.2,
    derivedIxx: 38.4,
    trailPoints: [] as THREE.Vector3[],
    flipCount: 0,
    lastZDot: 1.0,
    freshlyPlaced: false,
    autoRollTimer: 0,
    isAiming: false,
    dragStartPoint: null as THREE.Vector3 | null,
    history: [] as Array<{ omegaX: number; omegaY: number; vel: number; fn: number }>,
    normalForceAccum: 0,
    accumulator: 0,
  });

  // Keep paramsRef synchronized with React state
  const paramsRef = useRef({
    toySides,
    toyRadius,
    toyThickness,
    domeHeight,
    activeMaterial,
    rampAngleDeg,
    rampLength,
    rampHeight,
    frictionMew,
    isUneven,
    waveHeight,
    activeGravity,
    substepsLimit,
    customElasticityK,
    customDampingC,
    airDragLinear,
    airDragAngular,
    isPaused,
    isAutoRolling,
    timeScale,
  });

  useEffect(() => {
    paramsRef.current = {
      toySides,
      toyRadius,
      toyThickness,
      domeHeight,
      activeMaterial,
      rampAngleDeg,
      rampLength,
      rampHeight,
      frictionMew,
      isUneven,
      waveHeight,
      activeGravity,
      substepsLimit,
      customElasticityK,
      customDampingC,
      airDragLinear,
      airDragAngular,
      isPaused,
      isAutoRolling,
      timeScale,
    };
  }, [
    toySides,
    toyRadius,
    toyThickness,
    domeHeight,
    activeMaterial,
    rampAngleDeg,
    rampLength,
    frictionMew,
    isUneven,
    waveHeight,
    activeGravity,
    substepsLimit,
    customElasticityK,
    customDampingC,
    airDragLinear,
    airDragAngular,
    isPaused,
    isAutoRolling,
    timeScale,
  ]);

  // Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const toyMeshRef = useRef<THREE.Group | null>(null);
  const tableMeshRef = useRef<THREE.Mesh | null>(null);
  const rampMeshRef = useRef<THREE.Mesh | null>(null);
  const trailLineRef = useRef<THREE.Line | null>(null);
  const aimArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const collisionProxyPointsRef = useRef<THREE.Vector3[]>([]);

  // Lazy initialize Audio context
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  const playSynthesizerTone = (frequency: number, duration: number) => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + duration);

      gainNode.gain.setValueAtTime(0.18, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.start();
      osc.stop(ctx.currentTime + duration + 0.05);
    } catch (e) {
      console.warn('Audio synthesis initialized failure:', e);
    }
  };

  // Height map containing Triangular Ramp Profile and sinusoidal custom uneven tiles
  const getSurfaceHeightAndNormal = (
    x: number,
    y: number,
    optRampLength?: number,
    optRampAngleDeg?: number,
    optIsUneven?: boolean,
    optWaveHeight?: number
  ) => {
    const L = optRampLength !== undefined ? optRampLength : paramsRef.current.rampLength;
    const angleDeg = optRampAngleDeg !== undefined ? optRampAngleDeg : paramsRef.current.rampAngleDeg;
    const uneven = optIsUneven !== undefined ? optIsUneven : paramsRef.current.isUneven;
    const wHeight = optWaveHeight !== undefined ? optWaveHeight : paramsRef.current.waveHeight;

    const xStart = -35;
    const rampAngleRad = (angleDeg * Math.PI) / 180;
    const xEnd = xStart + L;
    const yHalfWidth = 15;

    // Inside the rigid 3D ramp boundary
    if (x >= xStart && x <= xEnd && y >= -yHalfWidth && y <= yHalfWidth) {
      const height = (xEnd - x) * Math.tan(rampAngleRad);
      const nx = Math.sin(rampAngleRad);
      const ny = 0;
      const nz = Math.cos(rampAngleRad);
      return {
        height,
        normal: new THREE.Vector3(nx, ny, nz).normalize(),
        onRamp: true,
      };
    }

    // On standard wavy/uneven desk
    if (uneven) {
      const freq = 0.25;
      const height = wHeight * (Math.sin(x * freq) * Math.cos(y * freq));

      const dzdx = wHeight * freq * Math.cos(x * freq) * Math.cos(y * freq);
      const dzdy = -wHeight * freq * Math.sin(x * freq) * Math.sin(y * freq);
      const normal = new THREE.Vector3(-dzdx, -dzdy, 1).normalize();

      return { height, normal, onRamp: false };
    }

    return {
      height: 0,
      normal: new THREE.Vector3(0, 0, 1),
      onRamp: false,
    };
  };

  // Preset Placement Solver:
  // Aligns the toy on the ramp sloped surface in three different orientations.
  // CRITICAL FIX: Resolved Left-Handed coordinates bug for 'flip_wall' and correctly updates physicsRef.current.quat to persist orientation across frames.
  const placeOnRampWithOrientation = (type: string) => {
    setIsPaused(true);
    setActivePlacement(type);
    physicsRef.current.freshlyPlaced = true;

    const rampAngleRad = (rampAngleDeg * Math.PI) / 180;
    const L = rampLength;
    const xStart = -35;
    const xEnd = xStart + L;

    // Normal and tangents of the slanted ramp
    const normal = new THREE.Vector3(Math.sin(rampAngleRad), 0, Math.cos(rampAngleRad)).normalize();
    const tangentDown = new THREE.Vector3(Math.cos(rampAngleRad), 0, -Math.sin(rampAngleRad)).normalize();
    const transverse = new THREE.Vector3(0, 1, 0);

    const matrix = new THREE.Matrix4();
    const q = new THREE.Quaternion();

    if (type === 'flat') {
      // 1. Classical lying flat: Local Z axis aligns with slope Normal
      matrix.makeBasis(tangentDown, transverse, normal);
      q.setFromRotationMatrix(matrix);
    } else if (type === 'roll') {
      // 2. Upright standing - oriented parallel to slope like a rolling wheel/coin
      // Local Z axis points transverse (rolls down-slope)
      matrix.makeBasis(normal, tangentDown, transverse);
      q.setFromRotationMatrix(matrix);
    } else {
      // 3. Upright standing - oriented perpendicular/facing slope (THE REQUESTED OPTION!)
      // Local Z axis points parallel to slope direction (looks like a wall blocking the path)
      // This is "ตั้งฉากกับพื้นผิวแบบไม่ใช่เหรียญที่พร้อมกลิ้ง" (Perpendicular, non-rolling wall)
      // FIX: Inverted transverse vector to maintain right-handed system (Determinant = 1).
      const invTransverse = transverse.clone().negate();
      matrix.makeBasis(normal, invTransverse, tangentDown);
      q.setFromRotationMatrix(matrix);
    }

    // Solve exact collision offset so it rest securely on the slope
    let minDot = Infinity;
    const lowestLocal = new THREE.Vector3();

    collisionProxyPointsRef.current.forEach((tempV) => {
      const tempVRot = tempV.clone().applyQuaternion(q);
      const dot = tempVRot.dot(normal);
      if (dot < minDot) {
        minDot = dot;
        lowestLocal.copy(tempV);
      }
    });

    // Place 35% from top of the ramp
    const x_place = xStart + L * 0.35;
    const y_place = 0.0;
    const z_place = (xEnd - x_place) * Math.tan(rampAngleRad);
    const contactSlopeWorld = new THREE.Vector3(x_place, y_place, z_place);

    // Coordinate offset
    physicsRef.current.pos.copy(contactSlopeWorld).sub(lowestLocal.clone().applyQuaternion(q));
    physicsRef.current.pos.z += 0.02; // Tiny fractional safety gap

    // Clear forces and momentum
    physicsRef.current.vel.set(0, 0, 0);
    physicsRef.current.omega.set(0, 0, 0);
    physicsRef.current.lastZDot = new THREE.Vector3(0, 0, 1).applyQuaternion(q).z;
    physicsRef.current.accumulator = 0;

    // FIX: Core quaternion reference updated so position doesn't glitch/override on the next game loop frame
    physicsRef.current.quat.copy(q);

    if (toyMeshRef.current) {
      toyMeshRef.current.position.copy(physicsRef.current.pos);
      toyMeshRef.current.quaternion.copy(q);
    }

    physicsRef.current.trailPoints = [];
    if (trailLineRef.current) {
      trailLineRef.current.geometry.setFromPoints([]);
    }

    playSynthesizerTone(280, 0.1);
  };

  // Re-build 3D wedge geometry forming the right-triangular launcher ramp
  const rebuildRampMesh = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (rampMeshRef.current) {
      scene.remove(rampMeshRef.current);
      rampMeshRef.current.geometry.dispose();
    }

    const rampAngleRad = (rampAngleDeg * Math.PI) / 180;
    const L = rampLength;
    const xStart = -35;
    const xEnd = xStart + L;
    const yHalfWidth = 15;
    const H = rampHeight;

    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      xStart, -yHalfWidth, 0, // 0
      xStart, yHalfWidth, 0, // 1
      xStart, -yHalfWidth, H, // 2
      xStart, yHalfWidth, H, // 3
      xEnd, -yHalfWidth, 0, // 4
      xEnd, yHalfWidth, 0, // 5
    ]);

    const indices = [
      // Back Cap
      0, 2, 1, 1, 2, 3,
      // Base Floor
      0, 1, 4, 1, 5, 4,
      // Main ramp sloped face
      2, 4, 3, 3, 4, 5,
      // Outward side profile cheeks
      0, 4, 2, 1, 3, 5,
    ];

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x111e38, // Sleek slate navy
      roughness: 0.15,
      metalness: 0.8,
      flatShading: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);
    rampMeshRef.current = mesh;
  };

  // Re-build custom table plane (with ripples if enabled)
  const rebuildTableMesh = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (tableMeshRef.current) {
      scene.remove(tableMeshRef.current);
      tableMeshRef.current.geometry.dispose();
    }

    const tableWidth = Math.max(160, (rampLength + 45) * 2);
    const tableDepth = Math.max(160, (rampLength + 45) * 2);
    const geometry = new THREE.PlaneGeometry(tableWidth, tableDepth, 80, 80);
    const posAttr = geometry.attributes.position;
    const tempV = new THREE.Vector3();

    for (let i = 0; i < posAttr.count; i++) {
      tempV.fromBufferAttribute(posAttr, i);
      const data = getSurfaceHeightAndNormal(tempV.x, tempV.y, rampLength, rampAngleDeg, isUneven, waveHeight);
      if (data.onRamp) {
        posAttr.setZ(i, -0.05); // slightly recessed under the ramp structure
      } else {
        posAttr.setZ(i, data.height);
      }
    }

    geometry.computeVertexNormals();
    geometry.attributes.position.needsUpdate = true;

    const material = new THREE.MeshStandardMaterial({
      color: 0x070c1b,
      roughness: 0.5,
      metalness: 0.2,
      flatShading: isUneven,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    scene.add(mesh);
    tableMeshRef.current = mesh;
  };

  // Generate 3D polygonal double-dome Flipo mesh and calculate physical collision points
  const rebuildToyGeometry = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (toyMeshRef.current) {
      scene.remove(toyMeshRef.current);
      toyMeshRef.current.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }

    const group = new THREE.Group();
    const preset = MATERIAL_PRESETS[activeMaterial];

    // 1. Core central cylindrical/polygonal block
    const coreThickness = Math.max(0.1, toyThickness - 0.2);
    const coreGeo = new THREE.CylinderGeometry(toyRadius, toyRadius, coreThickness, toySides, 1);
    coreGeo.rotateY(Math.PI / toySides); // Rotate by half-sector to stand flat on edge
    coreGeo.rotateX(Math.PI / 2); // Orient Z-axis as the disk symmetry height axis

    // Physical Material with beautiful self-glow component to fix "โครตมืด" (extremely dark) layout!
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: preset.color,
      metalness: preset.metalness,
      roughness: preset.roughness,
      clearcoat: 0.9,
      clearcoatRoughness: 0.05,
      emissive: preset.emissive,
      emissiveIntensity: 0.35,
    });
    
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.castShadow = true;
    coreMesh.receiveShadow = true;
    group.add(coreMesh);

    // 2. Dome layers (top and bottom caps to ensure beautiful, realistic rolling/tumbling)
    const capMat = new THREE.MeshPhysicalMaterial({
      color: preset.color,
      metalness: preset.metalness * 0.9,
      roughness: preset.roughness * 0.8,
      clearcoat: 0.8,
      emissive: preset.emissive,
      emissiveIntensity: 0.45,
    });

    // Top Dome Light Highlight
    const topCapGeo = new THREE.ConeGeometry(toyRadius, domeHeight, toySides, 1, false);
    topCapGeo.rotateY(Math.PI / toySides); // Match edge-flat rotation
    topCapGeo.rotateX(Math.PI / 2);
    topCapGeo.translate(0, 0, coreThickness / 2 + domeHeight / 2);
    const topCap = new THREE.Mesh(topCapGeo, capMat);
    topCap.castShadow = true;
    group.add(topCap);

    // Bottom Dome Light Highlight
    const botCapGeo = new THREE.ConeGeometry(toyRadius, domeHeight, toySides, 1, false);
    botCapGeo.rotateY(Math.PI / toySides); // Match edge-flat rotation
    botCapGeo.rotateX(-Math.PI / 2);
    botCapGeo.translate(0, 0, -(coreThickness / 2 + domeHeight / 2));
    const botCap = new THREE.Mesh(botCapGeo, capMat);
    botCap.castShadow = true;
    group.add(botCap);

    group.position.copy(physicsRef.current.pos);
    group.quaternion.copy(physicsRef.current.quat);
    scene.add(group);
    toyMeshRef.current = group;

    // 3. Compute static outer collision probe points matching exact edges of Cap Dome + Polygonal Core
    const probes: THREE.Vector3[] = [];
    const hHalfCore = coreThickness / 2;
    const vertexAngleDelta = (Math.PI * 2) / toySides;

    // Top and bottom apex points
    probes.push(new THREE.Vector3(0, 0, hHalfCore + domeHeight));
    probes.push(new THREE.Vector3(0, 0, -(hHalfCore + domeHeight)));

    // Ring of vertex rim paths representing core outer boundary
    const angleOffset = Math.PI / toySides;
    for (let i = 0; i < toySides; i++) {
      const angle = i * vertexAngleDelta + angleOffset;
      const x = toyRadius * Math.cos(angle);
      const y = toyRadius * Math.sin(angle);

      // Top corner vertices
      probes.push(new THREE.Vector3(x, y, hHalfCore));
      // Bottom corner vertices
      probes.push(new THREE.Vector3(x, y, -hHalfCore));

      // Side edge middle-points (crucial for flat polygon side face lying resting states!)
      const midAngle = angle + vertexAngleDelta / 2;
      const rInner = toyRadius * Math.cos(vertexAngleDelta / 2);
      const mx = rInner * Math.cos(midAngle);
      const my = rInner * Math.sin(midAngle);

      probes.push(new THREE.Vector3(mx, my, hHalfCore));
      probes.push(new THREE.Vector3(mx, my, -hHalfCore));
      probes.push(new THREE.Vector3(mx, my, 0)); // Flat side balance point
    }

    collisionProxyPointsRef.current = probes;

    // --- ACCURATE RECONSOLIDATION OF MASS & MOMENT OF INERTIA ---
    const sidesN = toySides;
    const BaseArea = 0.5 * sidesN * toyRadius * toyRadius * Math.sin((2 * Math.PI) / sidesN);
    const VolumeCore = BaseArea * coreThickness;
    const VolumeDome = (2 / 3) * Math.PI * toyRadius * toyRadius * domeHeight; // spherical dome approximations
    const totalVolume = VolumeCore + VolumeDome; // cm^3
    
    const densityVal = preset.density; // g/cm^3
    const totalGrams = totalVolume * densityVal;
    const massKg = totalGrams / 1000;

    physicsRef.current.toyMass = Math.max(0.001, massKg);

    setDerivedMass(totalGrams);

    // Compute Principal Moments of Inertia in g*cm^2 (fully rigorous polygonal system)
    const massCoreG = VolumeCore * densityVal;
    const massCapG = VolumeDome * densityVal;

    // Symmetric vertical rotational shaft (Z-axis)
    const IzzCore = 0.5 * massCoreG * toyRadius * toyRadius * (1 - (2 / 3) * Math.sin(Math.PI / sidesN) * Math.sin(Math.PI / sidesN));
    const IzzCaps = 0.3 * massCapG * toyRadius * toyRadius;
    const theoreticalIzz = IzzCore + IzzCaps;

    // Transverse rotating shaft (X-axis/Y-axis)
    const IxxCore = massCoreG * ( (coreThickness * coreThickness) / 12 + (toyRadius * toyRadius) / 4 );
    const CoM_Dome_Offset = coreThickness / 2 + domeHeight * 0.38; // CoM centroid of spherical cap
    const IxxCaps = massCapG * ( 0.15 * toyRadius * toyRadius + 0.05 * domeHeight * domeHeight + CoM_Dome_Offset * CoM_Dome_Offset );
    const theoreticalIxx = IxxCore + IxxCaps;

    physicsRef.current.derivedIzz = theoreticalIzz;
    physicsRef.current.derivedIxx = theoreticalIxx;

    setDerivedIzz(theoreticalIzz);
    setDerivedIxx(theoreticalIxx);
  };

  // Run a single tiny high-precision sub-stepped Euler Integration iteration with explicit scientific constants
  const physicsIntegrateSubstep = (dt: number) => {
    const params = paramsRef.current;
    if (params.isPaused || !toyMeshRef.current) return;

    const pState = physicsRef.current;
    const tempVWorld = new THREE.Vector3();
    const totalForce = new THREE.Vector3();
    const totalTorque = new THREE.Vector3();

    const m = pState.toyMass;
    const gravityVal = GRAVITY_PRESETS[params.activeGravity].value; // in cm/s^2
    const k_tangent = 650.0; // Stiffer micro-slip friction matches real solid materials catching

    // Momemts of inertia in generic simulation system (transformed to kg*cm^2 or absolute scale compatible)
    // Scale derived moments (g*cm^2) into kg and standard integrator units
    const Izz = Math.max(0.01, (pState.derivedIzz / 1000));
    const Ixx = Math.max(0.01, (pState.derivedIxx / 1000));
    const Iyy = Ixx;

    let normalForceTotal = 0;

    // 1. Loop through lightweight static probe points checking collisions
    collisionProxyPointsRef.current.forEach((tempVLocal) => {
      // Rotate and translate local point to world space coords
      tempVWorld.copy(tempVLocal).applyQuaternion(pState.quat).add(pState.pos);

      const surface = getSurfaceHeightAndNormal(tempVWorld.x, tempVWorld.y);
      const depth = surface.height - tempVWorld.z;

      // Contact and compression detected
      if (depth > 0) {
        const rPos = tempVWorld.clone().sub(pState.pos); // Lever vector arm from center of mass
        const vVertex = pState.vel.clone().add(pState.omega.clone().cross(rPos)); // Total relative contact velocity

        // Normal-axis penalty spring calculator with self-correcting critical damping formulation.
        // This ensures consistent physical behavior (neither bouncy jitter nor sticky behavior)
        // for any materials, radii, thicknesses, or masses by dynamically adapting the damper
        // to critical damping based on the current elasticity value.
        const vNormalMag = vVertex.dot(surface.normal);
        const effMass = m / 8.0; // Assume 8 contact points are distributed roughly on the boundary
        const cCritical = 2.0 * Math.sqrt(params.customElasticityK * effMass);
        const actualDamping = (params.customDampingC / 180.0) * cCritical;

        let forceNormalMag = params.customElasticityK * depth - actualDamping * vNormalMag;
        forceNormalMag = Math.max(0, forceNormalMag);
        normalForceTotal += forceNormalMag;

        const fNormalVec = surface.normal.clone().multiplyScalar(forceNormalMag);

        // Friction calculations using exact coefficient
        const vTangentVec = vVertex.clone().sub(surface.normal.clone().multiplyScalar(vNormalMag));
        const vtLen = vTangentVec.length();

        const fFrictionVec = new THREE.Vector3();
        if (vtLen > 0.001) {
          const maxFriction = params.frictionMew * forceNormalMag;
          fFrictionVec.copy(vTangentVec).normalize().multiplyScalar(-Math.min(maxFriction, vtLen * k_tangent));
        }

        // Apply action forces
        const fContact = fNormalVec.add(fFrictionVec);
        totalForce.add(fContact);
        totalTorque.add(rPos.cross(fContact));

        // Sound synthesis triggers proportionally with structural velocity
        if (depth < 0.08 && vNormalMag < -8.0 && Math.random() < 0.15) {
          playSynthesizerTone(190 + Math.min(Math.abs(vNormalMag) * 2.8, 180), 0.08);
        }
      }
    });

    pState.normalForceAccum = normalForceTotal;

    // 2. Add planetary gravity (cm/s^2)
    const gravityForce = new THREE.Vector3(0, 0, -gravityVal * m);
    totalForce.add(gravityForce);

    // 3. Add air hydrodynamic envelope drag resistances
    const linearDragForce = pState.vel.clone().multiplyScalar(-params.airDragLinear * m);
    totalForce.add(linearDragForce);

    // 4. Update translation velocities
    const acc = totalForce.divideScalar(m);
    pState.vel.addScaledVector(acc, dt);

    // Safely threshold maximum speeds to avoid numerical integration explosions/crashing
    if (pState.vel.length() > 80.0) pState.vel.setLength(80.0);

    // 5. Angular momentum integrations with full gyroscopic coupling
    // Express global world torque and world angular velocity into local body coordinates
    const localTorque = totalTorque.clone().applyQuaternion(pState.quat.clone().invert());
    const localOmega = pState.omega.clone().applyQuaternion(pState.quat.clone().invert());

    // Euler gyroscopic torque: omega x (I * omega)
    const localIOmega = new THREE.Vector3(
      Ixx * localOmega.x,
      Iyy * localOmega.y,
      Izz * localOmega.z
    );
    const gyroTorque = localOmega.clone().cross(localIOmega);

    // Air rotational resistance torque (applied in body frame)
    const rotDampingTorque = localOmega.clone().multiplyScalar(-params.airDragAngular * Ixx);

    // Euler equation of rigid body: I * alpha = Tau_ext - omega x (I * omega) + Tau_drag
    const netLocalTorque = localTorque.clone().sub(gyroTorque).add(rotDampingTorque);

    const localAlpha = new THREE.Vector3(
      netLocalTorque.x / Ixx,
      netLocalTorque.y / Iyy,
      netLocalTorque.z / Izz
    );

    // Convert local angular acceleration back into world coordinates
    const worldAlpha = localAlpha.applyQuaternion(pState.quat);
    pState.omega.addScaledVector(worldAlpha, dt);

    // High angular rates are physically allowed but capped for numerical safety
    if (pState.omega.length() > 65.0) pState.omega.setLength(65.0);

    // 6. Integrate translation position
    pState.pos.addScaledVector(pState.vel, dt);

    // 7. Integrate rotation quaternion
    const omegaLen = pState.omega.length();
    if (omegaLen > 0.0001) {
      const deltaRot = new THREE.Quaternion().setFromAxisAngle(
        pState.omega.clone().normalize(),
        omegaLen * dt
      );
      pState.quat.premultiply(deltaRot).normalize();
    }

    // Border boundary fence constraint
    const b = 39.5;
    if (pState.pos.x > b) { pState.pos.x = b; pState.vel.x = -pState.vel.x * 0.35; }
    if (pState.pos.x < -b) { pState.pos.x = -b; pState.vel.x = -pState.vel.x * 0.35; }
    if (pState.pos.y > b) { pState.pos.y = b; pState.vel.y = -pState.vel.y * 0.35; }
    if (pState.pos.y < -b) { pState.pos.y = -b; pState.vel.y = -pState.vel.y * 0.35; }

    // 8. Mechanical flip tracker (Checks face inversion via the local Z unit vector projection in World Z-axis)
    const localZInWorld = new THREE.Vector3(0, 0, 1).applyQuaternion(pState.quat);
    if (Math.sign(localZInWorld.z) !== Math.sign(pState.lastZDot) && Math.abs(localZInWorld.z) > 0.18) {
      pState.flipCount++;
      pState.lastZDot = localZInWorld.z;
      setFlipCount(pState.flipCount);
      playSynthesizerTone(340 + Math.min(pState.omega.length() * 12, 280), 0.15); // Clear acoustic chime on perfect flip
    }
  };

  // Slingshot Aim vector raycasting setup
  const setupAimRaycasting = (canvas: HTMLCanvasElement) => {
    const handlePointerDown = (clientX: number, clientY: number) => {
      if (!cameraRef.current || !toyMeshRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((clientX - rect.left) / canvas.clientWidth) * 2 - 1,
        -((clientY - rect.top) / canvas.clientHeight) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      const intersects = raycaster.intersectObjects(toyMeshRef.current.children, true);
      if (intersects.length > 0) {
        physicsRef.current.isAiming = true;
        physicsRef.current.dragStartPoint = physicsRef.current.pos.clone();
        if (controlsRef.current) controlsRef.current.enabled = false;
      }
    };

    const handlePointerMove = (clientX: number, clientY: number) => {
      const p = physicsRef.current;
      if (!p.isAiming || !cameraRef.current || !aimArrowRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((clientX - rect.left) / canvas.clientWidth) * 2 - 1,
        -((clientY - rect.top) / canvas.clientHeight) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      const hPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -p.pos.z);
      const intersectionVec = new THREE.Vector3();
      raycaster.ray.intersectPlane(hPlane, intersectionVec);

      const pullVec = intersectionVec.clone().sub(p.pos);
      const intensity = Math.min(pullVec.length(), 20.0);

      if (intensity > 0.2) {
        aimArrowRef.current.position.copy(p.pos);
        aimArrowRef.current.setDirection(pullVec.clone().normalize());
        aimArrowRef.current.setLength(intensity, 1.2, 0.6);
        aimArrowRef.current.visible = true;
      }
    };

    const handlePointerUp = (clientX: number, clientY: number) => {
      const p = physicsRef.current;
      if (!p.isAiming) return;
      p.isAiming = false;

      if (aimArrowRef.current) aimArrowRef.current.visible = false;
      if (controlsRef.current) controlsRef.current.enabled = true;

      if (!cameraRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((clientX - rect.left) / canvas.clientWidth) * 2 - 1,
        -((clientY - rect.top) / canvas.clientHeight) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      const hPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -p.pos.z);
      const intersectionVec = new THREE.Vector3();
      raycaster.ray.intersectPlane(hPlane, intersectionVec);

      const forceVec = intersectionVec.clone().sub(p.pos);
      const magnitude = Math.min(forceVec.length() * 2.3, 50.0);

      // Launch physical launch impulse
      if (magnitude > 1.2) {
        setIsPaused(false);
        const dir = forceVec.normalize();
        p.omega.y += dir.x * magnitude * 0.95;
        p.omega.x += -dir.y * magnitude * 0.95;
        p.omega.z += (Math.random() - 0.5) * magnitude * 0.25;
        playSynthesizerTone(310, 0.15);
      }
    };

    const onMouseDown = (e: MouseEvent) => handlePointerDown(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
    const onMouseUp = (e: MouseEvent) => handlePointerUp(e.clientX, e.clientY);

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length > 0) handlePointerUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  };

  // Re-run geometry rebuilds on React state dependencies change
  useEffect(() => {
    rebuildToyGeometry();
  }, [toySides, toyRadius, toyThickness, domeHeight, activeMaterial]);

  useEffect(() => {
    rebuildRampMesh();
    rebuildTableMesh();
    placeOnRampWithOrientation(activePlacement);
  }, [rampAngleDeg, rampLength, isUneven, waveHeight, activePlacement]);

  // Main 3D Initializer mount hook
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create scene with bright, high-contrast atmospheric tone
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070c1b); // dark celestial blue
    scene.fog = new THREE.FogExp2(0x070c1b, 0.004);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.up.set(0, 0, 1);
    camera.position.set(-32, -50, 26);
    cameraRef.current = camera;

    // WebGL Renderer with robust antiantialiasing & shadow support
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Camera orbit controller
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.03; // prevent clipping through table floor
    controls.minDistance = 6;
    controls.maxDistance = 400;
    controls.target.set(-6, 0, 1.5);
    controlsRef.current = controls;

    // --- MAGNIFICENT HIGH-LUMINOSITY LIGHTING CONFIG (Fixes 'โครตมืด' completely) ---
    // Bright white active ambient sunlight
    const ambient = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambient);

    // Overhead high shadow casting directional light
    const mainLight = new THREE.DirectionalLight(0xffffff, 2.5);
    mainLight.position.set(30, 50, 90);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 350;
    const dShadow = 160;
    mainLight.shadow.camera.left = -dShadow;
    mainLight.shadow.camera.right = dShadow;
    mainLight.shadow.camera.top = dShadow;
    mainLight.shadow.camera.bottom = -dShadow;
    mainLight.shadow.bias = -0.0004;
    scene.add(mainLight);

    // Cyan Neon Fill light
    const fillLight = new THREE.DirectionalLight(0x0ea5e9, 1.8);
    fillLight.position.set(-25, -25, 12);
    scene.add(fillLight);

    // Warm amber rim highlights (makes golden facets and polygon bevels pop spectacularly!)
    const rimLight = new THREE.DirectionalLight(0xf59e0b, 1.4);
    rimLight.position.set(20, -15, -6);
    scene.add(rimLight);

    // Space table safety glow boundary line
    const borderGeo = new THREE.BoxGeometry(80.2, 80.2, 0.15);
    const borderEdges = new THREE.EdgesGeometry(borderGeo);
    const borderLine = new THREE.LineSegments(borderEdges, new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 }));
    borderLine.position.z = 0.02;
    scene.add(borderLine);

    // Motion Trailing ribbon
    const trailMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 3,
      transparent: true,
      opacity: 0.9,
    });
    const trailGeo = new THREE.BufferGeometry();
    const line = new THREE.Line(trailGeo, trailMat);
    scene.add(line);
    trailLineRef.current = line;

    // Interactive launch drag slingshot helper arrow
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1.0, 0x10b981, 1.1, 0.6);
    arrow.visible = false;
    scene.add(arrow);
    aimArrowRef.current = arrow;

    // Bind aim mouse inputs
    const cleanDragEvents = setupAimRaycasting(renderer.domElement);

    // Rebuild configurations once
    rebuildRampMesh();
    rebuildTableMesh();
    rebuildToyGeometry();
    placeOnRampWithOrientation('flip_wall'); // Stand upright (non-rolling) by default!

    // High Density responsive resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      }
    });
    resizeObserver.observe(container);

    // Render loop and integration frame runner
    let lastTime = performance.now();
    let frameId: number;

    const gameLoop = (now: number) => {
      frameId = requestAnimationFrame(gameLoop);

      let dt = (now - lastTime) / 1000;
      lastTime = now;

      if (dt > 0.08) dt = 0.08; // Cap delta steps to prevent background tab stuttering glitches

      const p = physicsRef.current;
      const params = paramsRef.current;

      const simDt = dt * params.timeScale; // Apply Dynamic Time Dilation!

      if (!params.isPaused) {
        // Use a fixed physics substepping timestep decoupled from frame-rate fluctuations (e.g. 60Hz vs 144Hz monitors)
        // and decoupled from time dilation timescale. The fixed delta-time is based on the selected substep frequency.
        p.accumulator = (p.accumulator || 0) + simDt;

        // Prevent accumulator explosion if there is a massive framing spike (e.g., during window focus/blur or tab suspends)
        if (p.accumulator > 0.08) {
          p.accumulator = 0.08;
        }

        const fixedDt = 1.0 / (60.0 * params.substepsLimit);
        // Step the simulation by the exact fixed timestep, ensuring identical physics simulation results at all time scales
        while (p.accumulator >= fixedDt) {
          physicsIntegrateSubstep(fixedDt);
          p.accumulator -= fixedDt;
        }

        // Push real-time telemetry into oscilloscope buffer helper
        const kineticE = calculateKineticEnergy();
        setDerivedEnergy(kineticE);
        setContactForceN(p.normalForceAccum);

        p.history.push({
          omegaX: p.omega.x,
          omegaY: p.omega.y,
          vel: p.vel.length(),
          fn: p.normalForceAccum,
        });
        if (p.history.length > 200) p.history.shift();

        // Handle auto-rolling impulse in local body coordinate frames
        if (params.isAutoRolling) {
          p.autoRollTimer += simDt;
          if (p.autoRollTimer > 1.3) {
            p.autoRollTimer = 0;
            const localOmega = p.omega.clone().applyQuaternion(p.quat.clone().invert());
            localOmega.y += (Math.random() - 0.5) * 16;
            localOmega.x += (Math.random() - 0.5) * 16;
            localOmega.z += (Math.random() - 0.5) * 6;
            p.omega.copy(localOmega.applyQuaternion(p.quat));
            playSynthesizerTone(210, 0.1);
          }
        }
      }

      // Sync active ribbon trail mesh positions
      if (!params.isPaused && toyMeshRef.current) {
        p.trailPoints.push(p.pos.clone().add(new THREE.Vector3(0, 0, 0.08)));
        if (p.trailPoints.length > 70) {
          p.trailPoints.shift();
        }
        trailLineRef.current?.geometry.setFromPoints(p.trailPoints);
      }

      // Sync 3D Visual mesh orientation and translational vectors
      if (toyMeshRef.current) {
        toyMeshRef.current.position.copy(p.pos);
        toyMeshRef.current.quaternion.copy(p.quat);
      }

      // Target lock orbit controls to CoM of toy
      if (params.isCameraLocked && controlsRef.current && cameraRef.current) {
        const prevTarget = controlsRef.current.target.clone();
        controlsRef.current.target.copy(p.pos);
        cameraRef.current.position.x += p.pos.x - prevTarget.x;
        cameraRef.current.position.y += p.pos.y - prevTarget.y;
      }

      // Telemetry statistics
      const velMag = p.vel.length();
      setSpeedStat((velMag * 2.2).toFixed(1)); // scaled velocity cm/s

      let stateText = 'สถานะพักนิ่ง';
      if (params.isPaused) {
        stateText = '⏸️ จำลองหยุดเคลื่อนที่';
      } else if (velMag > 6.0) {
        stateText = p.omega.length() > 15.0 ? '🌀 หมุนตีลังกา (True Flipping)' : '🛹 ไถลลื่นไถลตัว';
      } else if (velMag > 0.8) {
        stateText = '📶 โคลงเคลงเตรียมพลิก';
      }
      setKineticState(stateText);

      // Slanted stage tilt readings
      const underlying = getSurfaceHeightAndNormal(p.pos.x, p.pos.y);
      const slopeDeg = (Math.acos(underlying.normal.dot(new THREE.Vector3(0, 0, 1))) * 180) / Math.PI;
      setSurfaceTilt(underlying.onRamp ? `ทางลาดเอียง (${slopeDeg.toFixed(1)}°)` : `พื้นโต๊ะราบ (${slopeDeg.toFixed(1)}°)`);

      setGravityXOffset(underlying.normal.x * 16.0);
      setGravityYOffset(-underlying.normal.y * 16.0);

      controls.update();
      renderer.render(scene, camera);
    };

    frameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      cleanDragEvents();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Compute live kinetic mechanical energy (Translation E_k + Rotational E_r) in mJ
  const calculateKineticEnergy = () => {
    const p = physicsRef.current;
    const m = p.toyMass; // kg
    const Izz = derivedIzz / 1000; // in simulation scaling units
    const Ixx = derivedIxx / 1000;
    
    const v2 = p.vel.lengthSq(); // cm^2 / s^2
    const translationE = 0.5 * m * (v2 / 10000); // converting cm^2 to m^2 (Joules)
    
    // Rotational Joules
    const rotE = 0.5 * (Ixx * (p.omega.x * p.omega.x) + Ixx * (p.omega.y * p.omega.y) + Izz * (p.omega.z * p.omega.z)) / 10000;
    
    const totalJoules = translationE + rotE;
    return totalJoules * 1000000; // Return in Millijoules (mJ) for clear readable science scales
  };

  // Render the Oscilloscope Waveform onto Canvas Ref
  useEffect(() => {
    const canvas = chartCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const drawOscilloscope = () => {
      animId = requestAnimationFrame(drawOscilloscope);

      // Clear with sleek tech theme background
      ctx.fillStyle = '#060a14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw faint tech coordinates gridlines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      const numLines = 6;
      for (let i = 0; i < numLines; i++) {
        // Vertical grids
        const vx = (canvas.width / numLines) * i;
        ctx.beginPath();
        ctx.moveTo(vx, 0);
        ctx.lineTo(vx, canvas.height);
        ctx.stroke();

        // Horizontal grids
        const hy = (canvas.height / numLines) * i;
        ctx.beginPath();
        ctx.moveTo(0, hy);
        ctx.lineTo(canvas.width, hy);
        ctx.stroke();
      }

      const history = physicsRef.current.history;
      if (history.length < 2) {
        // Draw idle center lines
        ctx.fillStyle = '#475569';
        ctx.font = '10px font-mono, monospace';
        ctx.fillText('สแตนด์บาย Oscillometer... รันตัวส่งข้อมูล', 15, canvas.height / 2 + 4);
        return;
      }

      const drawWave = (
        color: string,
        accessor: (item: typeof history[0]) => number,
        scale: number,
        label: string,
        yOffset: number = canvas.height / 2
      ) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6;

        const maxPoints = 200;
        const dx = canvas.width / maxPoints;

        history.forEach((item, idx) => {
          const val = accessor(item);
          const px = idx * dx;
          const py = yOffset - val * scale;
          if (idx === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        });
        ctx.stroke();

        // Draw live value on right margin
        if (history.length > 0) {
          const lastVal = accessor(history[history.length - 1]);
          ctx.fillStyle = color;
          ctx.font = '9px font-mono, monospace';
          ctx.fillText(`${label}: ${lastVal.toFixed(1)}`, 8, yOffset - 12);
        }
      };

      // Draw three wave layers: OmegaX (cyan), OmegaY (green), and impact Normal Force (amber)
      drawOscilloscopeZeroLine(ctx, canvas);
      drawWave('#0ea5e9', (d) => d.omegaX, 1.25, 'ωx (Pitch/Roll)', canvas.height / 2);
      drawWave('#10b981', (d) => d.omegaY, 1.25, 'ωy (Tumble)', canvas.height / 2);
      drawWave('#f59e0b', (d) => d.fn / 15.0, 1.5, 'Normal Force F_N (N)', canvas.height - 15);
    };

    const drawOscilloscopeZeroLine = (c: CanvasRenderingContext2D, cv: HTMLCanvasElement) => {
      c.strokeStyle = '#334155';
      c.setLineDash([4, 2]);
      c.beginPath();
      c.moveTo(0, cv.height / 2);
      c.lineTo(cv.width, cv.height / 2);
      c.stroke();
      c.setLineDash([]);
    };

    animId = requestAnimationFrame(drawOscilloscope);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Soft Reset Workspace Handler
  const handleResetSimulation = () => {
    setIsPaused(true);
    const p = physicsRef.current;
    
    // Find the actual surface height at (0, 0) to prevent getting buried under the ramp or table
    const tableHeightAtCenter = getSurfaceHeightAndNormal(0, 0, rampLength, rampAngleDeg, isUneven, waveHeight).height;
    
    // Set position safely above the active surface
    p.pos.set(0, 0, tableHeightAtCenter + toyThickness / 2 + domeHeight + 1.2);
    p.vel.set(0, 0, 0);
    p.omega.set(0, 0, 0);
    p.quat.set(0, 0, 0, 1);
    p.flipCount = 0;
    p.lastZDot = 1.0;
    p.normalForceAccum = 0;
    p.history = [];
    p.accumulator = 0;
    setFlipCount(0);

    if (toyMeshRef.current) {
      toyMeshRef.current.position.copy(p.pos);
      toyMeshRef.current.quaternion.copy(p.quat);
    }
    p.trailPoints = [];
    if (trailLineRef.current) trailLineRef.current.geometry.setFromPoints([]);

    playSynthesizerTone(180, 0.1);
  };

  // Launch initial angular impulse "Flick" action
  const flickObject = () => {
    setIsPaused(false);
    const p = physicsRef.current;
    
    // Core physical angular momentum twist calculated in local coordinate frame
    const localOmega = p.omega.clone().applyQuaternion(p.quat.clone().invert());
    
    const twistDirY = (Math.random() > 0.5 ? 1 : -1) * (18 + Math.random() * 8); // Sideways rolling impulse
    const twistDirX = (Math.random() - 0.5) * 8;
    const twistDirZ = (Math.random() - 0.5) * 6;

    localOmega.y += twistDirY;
    localOmega.x += twistDirX;
    localOmega.z += twistDirZ;

    // Convert local angular impulses back to global world velocities
    p.omega.copy(localOmega.applyQuaternion(p.quat));

    playSynthesizerTone(380, 0.12);
  };

  // Keyboard Shortcut Event Listener: Spacebar to toggle Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' || 
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#02050c] text-slate-100 flex flex-col font-sans selection:bg-sky-500/30">
      
      {/* Visual Header */}
      <header className="bg-[#060a15]/95 border-b border-slate-800/60 px-6 py-4 sticky top-0 z-40 backdrop-blur-md flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-sky-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-sky-500/10">
            <Sparkles className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h1 className="text-xl font-black bg-gradient-to-r from-sky-400 via-teal-400 to-amber-300 bg-clip-text text-transparent tracking-tight">
              FLIPO-FLIP 3D PHYSICS LAB
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              ระบบวิเคราะห์กลศาสตร์สามมิติแบบแรงตึงสปริง เพื่อคำนวณการจัดระเบียบต้านแนวระนาบเอียง
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition duration-200 ${
              soundEnabled
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 animate-bounce" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{soundEnabled ? 'เปิดเสียงบีปสังเคราะห์' : 'ปิดเสียง'}</span>
          </button>

          {/* Time State Badge */}
          <div
            className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 shadow-sm transition duration-150 ${
              isPaused
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-ping'}`} />
            <span>{isPaused ? 'สแตนด์บาย' : 'กำลังจำลองสด'}</span>
          </div>
        </div>
      </header>

      {/* Main Grid Workbench */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-5 p-4 md:p-5 max-w-[1700px] w-full mx-auto">
        
        {/* Left Column: 3D Scene + Oscilloscope Waveform */}
        <section className="md:col-span-7 xl:col-span-8 flex flex-col gap-4">
          
          {/* Interactive 3D Canvas */}
          <div className="relative w-full h-[470px] bg-[#03060d] rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden group">
            
            {/* Top HUD layer */}
            <div className="absolute top-4 left-4 z-10 select-none max-w-sm flex flex-col gap-1.5 pointer-events-none">
              <span className="bg-slate-950/90 text-slate-300 px-3 py-2 rounded-xl border border-slate-800/80 text-[11px] font-medium shadow-md backdrop-blur-sm flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-sky-400" />
                <span>มุมกล้อง: คลิกขวาลาก | ส่งแรงเหนี่ยว: คลิกเมาส์ซ้ายลากถอยบนตัวโมเดล</span>
              </span>
              {physicsRef.current.isAiming && (
                <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-lg border border-emerald-500/40 text-[10.5px] font-bold animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1" />
                  กำลังเหนี่ยวยึดโครงสปริงลอน... ปล่อยเพื่อปล่อยตัวต่อ!
                </span>
              )}
            </div>

            {/* Camera Lock toggle */}
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => setIsCameraLocked(!isCameraLocked)}
                className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 shadow-md backdrop-blur-sm transition duration-150 ${
                  isCameraLocked
                    ? 'bg-sky-950/45 border-sky-400 text-sky-400'
                    : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>ล็อกกล้องติดตามวัตถุ: {isCameraLocked ? 'เปิดแล้ว' : 'ปิด'}</span>
              </button>
            </div>

            {/* Core 3D Canvas Mount Point */}
            <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-crosshair" />

            {/* Gravity surface tilt indicator widget */}
            <div className="absolute bottom-4 left-4 z-10 bg-[#040813]/95 p-3 rounded-xl border border-slate-800/70 shadow-lg backdrop-blur-sm flex items-center gap-3">
              <div className="relative w-10 h-10 bg-slate-950 rounded-full border border-slate-800/80 flex items-center justify-center overflow-hidden">
                <div
                  className="absolute w-2.5 h-2.5 bg-red-500 rounded-full transition-transform duration-75 shadow-lg shadow-red-500/50"
                  style={{
                    transform: `translate(${gravityXOffset}px, ${gravityYOffset}px)`,
                  }}
                />
                <div className="w-full h-[1px] bg-slate-800/80 absolute" />
                <div className="h-full w-[1px] bg-slate-800/80 absolute" />
              </div>
              <div>
                <div className="text-[9px] text-slate-500 uppercase tracking-wider font-extrabold">องศาระนาบผิวสัมผัส</div>
                <div className="text-[11px] font-mono font-bold text-slate-300">{surfaceTilt}</div>
              </div>
            </div>

            {/* Real-time statistics telemetry overlay */}
            <div className="absolute bottom-4 right-4 z-10 bg-[#040813]/95 px-3.5 py-2.5 rounded-xl border border-slate-800/70 shadow-md backdrop-blur-sm flex items-center gap-4 text-xs font-mono">
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 uppercase">ยอดการพลิก (FLIPS)</span>
                <span className="text-base font-black text-amber-400">{flipCount}</span>
              </div>
              <div className="w-px h-7 bg-slate-800" />
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 uppercase">ความเร็วในระนาบ</span>
                <span className="text-xs font-bold text-sky-400">{speedStat} cm/s</span>
              </div>
              <div className="w-px h-7 bg-slate-800" />
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 uppercase">พฤติกรรมกลศาสตร์</span>
                <span className="text-xs font-bold text-emerald-400 leading-tight">{kineticState}</span>
              </div>
            </div>
          </div>

          {/* Real-time Oscilloscope Telemetry Panel ("ระดับ science โหดๆ") */}
          <div className="bg-[#050917]/70 border border-slate-800/60 p-4 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800/40 pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-bold tracking-wider text-slate-200 uppercase font-mono">
                  Oscilloscope วิเคราะห์ความเร็วเชิงมุมและแรงปะทะสด (Dynamic Physics Waveforms)
                </h3>
              </div>
              {/* Colored legends */}
              <div className="flex items-center gap-3 text-[9px] font-mono">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#0ea5e9]" /> pitch / roll (ωx)</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> tumbles (ωy)</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" /> normal force (Fn)</span>
              </div>
            </div>
            
            <canvas ref={chartCanvasRef} width={650} height={110} className="w-full h-[110px] bg-[#03060c] rounded-xl border border-slate-800/80 shadow-inner" />
          </div>

          {/* Live Action Commands Toolbar */}
          <div className="bg-[#060a15]/50 border border-slate-800/60 p-4 rounded-xl flex flex-wrap justify-between items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsPaused(false)}
                className={`px-4 py-2 bg-sky-500 hover:bg-sky-400 active:translate-y-0.5 text-slate-950 rounded-lg text-xs font-black shadow-lg shadow-sky-500/10 transition flex items-center gap-1.5 ${
                  !isPaused ? 'ring-2 ring-sky-300' : ''
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>จำลองการเคลื่อนที่</span>
              </button>
              <button
                onClick={() => setIsPaused(true)}
                className={`px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  isPaused ? 'ring-2 ring-amber-400/80 bg-slate-700' : ''
                }`}
              >
                <Pause className="w-3.5 h-3.5 fill-slate-200" />
                <span>หยุดพักสด</span>
              </button>

              {/* Time dilation selector */}
              <div className="flex items-center gap-1 bg-slate-950/80 p-1.5 rounded-lg border border-slate-800/60 text-xs shadow-inner">
                <span className="text-[10px] text-slate-400 px-1.5 font-bold uppercase whitespace-nowrap">ควบคุมกาลเวลา:</span>
                <button
                  onClick={() => setTimeScale(0.1)}
                  className={`px-2 py-1 rounded font-mono text-[10px] font-extrabold transition ${
                    timeScale === 0.1
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'text-slate-400 hover:bg-slate-805 hover:text-slate-200'
                  }`}
                  title="สโลว์โมชั่นละเอียดมาก 0.1 เท่า"
                >
                  0.1x
                </button>
                <button
                  onClick={() => setTimeScale(0.25)}
                  className={`px-2 py-1 rounded font-mono text-[10px] font-extrabold transition ${
                    timeScale === 0.25
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'text-slate-400 hover:bg-slate-805 hover:text-slate-200'
                  }`}
                  title="สโลว์โมชั่น 0.25 เท่า"
                >
                  0.25x
                </button>
                <button
                  onClick={() => setTimeScale(0.5)}
                  className={`px-2 py-1 rounded font-mono text-[10px] font-extrabold transition ${
                    timeScale === 0.5
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'text-slate-400 hover:bg-slate-805 hover:text-slate-200'
                  }`}
                  title="สโลว์โมชั่น 0.5 เท่า"
                >
                  0.5x
                </button>
                <button
                  onClick={() => setTimeScale(1.0)}
                  className={`px-2 py-1 rounded font-mono text-[10px] font-extrabold transition ${
                    timeScale === 1.0
                      ? 'bg-sky-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:bg-slate-805 hover:text-slate-200'
                  }`}
                  title="เวลาปกติโลกจริง 1.0 เท่า"
                >
                  1.0x (ปกติ)
                </button>
                <button
                  onClick={() => setTimeScale(2.0)}
                  className={`px-2 py-1 rounded font-mono text-[10px] font-extrabold transition ${
                    timeScale === 2.0
                      ? 'bg-sky-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:bg-slate-805 hover:text-slate-200'
                  }`}
                  title="เร่งเวลาจำลอง 2.0 เท่า"
                >
                  2.0x
                </button>
              </div>

              <button
                onClick={() => setIsAutoRolling(!isAutoRolling)}
                className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${
                  isAutoRolling
                    ? 'bg-purple-950/40 border-purple-500/50 text-purple-300 shadow-md'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-300'
                }`}
              >
                🔄 ดันลมตีควงป้อนซ้ำ: {isAutoRolling ? 'เปิดใช้งาน' : 'ปิด'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={flickObject}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 active:scale-95 text-slate-950 rounded-lg text-xs font-black shadow-md transition transform"
              >
                🎯 ดีดมุมบิด (Flick Action)
              </button>
              <button
                onClick={handleResetSimulation}
                className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold border border-slate-700/60 transition flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>รีเซ็ตที่ว่าง</span>
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: High Scientific Parameter Controls */}
        <section className="md:col-span-5 xl:col-span-4 flex flex-col gap-4">
          
          {/* Standing Alignment Preset Block (THE CORE FIX FOR 'flip_wall') */}
          <div className="bg-[#060a15]/80 border border-slate-800/70 rounded-xl p-4 shadow-lg space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800/50 pb-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                1. ทิศทางการควบคุมปล่อย (Orientation Presets)
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {/* Option 3: Vertical Flip Wall (Default state, completely fixed determinant) */}
              <button
                onClick={() => placeOnRampWithOrientation('flip_wall')}
                className={`p-3 rounded-xl border text-left transition ${
                  activePlacement === 'flip_wall'
                    ? 'bg-emerald-950/25 border-emerald-500/80 text-slate-100 shadow-md ring-1 ring-emerald-500/20'
                    : 'bg-[#03060c]/50 border-slate-800/50 text-slate-400 hover:border-slate-700/80 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs text-emerald-400">
                  <span>🔵 ขนานหน้าขวางทางลาด (Upright Perpendicular Flip Wall)</span>
                  {activePlacement === 'flip_wall' && <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded uppercase font-mono font-black animate-pulse">Active</span>}
                </div>
                <p className="text-[10.5px] mt-1.5 text-slate-400 leading-relaxed font-normal">
                  <strong>[ตามโจทย์ผู้ใช้งาน]</strong> จัดสมมาตรแนวสันแบนตั้งมุมเฉือนต้านแนวลาดเอียง <em>ไม่ใช่ลักษณะเหรียญกลิ้ง!</em> วัตถุจะล้มคว่ำหมุนทวนแบบ Toppling ลงมาตามระนาบชันแทน
                </p>
              </button>

              {/* Option 1: Horizontal Flat */}
              <button
                onClick={() => placeOnRampWithOrientation('flat')}
                className={`p-3 rounded-xl border text-left transition ${
                  activePlacement === 'flat'
                    ? 'bg-sky-950/20 border-sky-500/80 text-slate-100 shadow-md ring-1 ring-sky-500/20'
                    : 'bg-[#03060c]/50 border-slate-800/50 text-slate-400 hover:border-slate-700/80 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs">
                  <span>🟢 วางราบขนานระนาบชัน (Lying Flat)</span>
                  {activePlacement === 'flat' && <span className="text-[9px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded uppercase font-mono font-black">Active</span>}
                </div>
                <p className="text-[10.5px] mt-1.5 text-slate-400 leading-relaxed font-normal">
                  ชิ้นหน้าตัดใหญ่แนบสนิทไปตามสเตจลาดเอียงลื่นไถลสัมผัสผิวเรียบด้านล่าง
                </p>
              </button>

              {/* Option 2: Vertical Coin Orientation */}
              <button
                onClick={() => placeOnRampWithOrientation('roll')}
                className={`p-3 rounded-xl border text-left transition ${
                  activePlacement === 'roll'
                    ? 'bg-amber-950/20 border-amber-500/80 text-slate-100 shadow-md ring-1 ring-amber-500/20'
                    : 'bg-[#03060c]/50 border-slate-800/50 text-slate-400 hover:border-slate-700/80 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs">
                  <span>🟡 ตั้งตรงพร้อมกลิ้ง (Coin-Roll Edge Alignment)</span>
                  {activePlacement === 'roll' && <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded uppercase font-mono font-black">Active</span>}
                </div>
                <p className="text-[10.5px] mt-1.5 text-slate-400 leading-relaxed font-normal">
                  ตั้งมุมหมนขนานกับทิศตกของแรงตลกล้อกลม วิ่งด้วยความเร็วตรงแนวดิ่ง
                </p>
              </button>
            </div>
          </div>

          {/* Card 2: 2. ตั้งค่าระนาบและความชันทางลาด (Slope & Incline Controls) - ALWAYS VISIBLE, FIXED BY THE USER DIRECT REQUEST */}
          <div className="bg-[#060a15]/80 border border-slate-800/70 rounded-xl p-4 shadow-lg space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-800/50 pb-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                2. ปรับความลาดชันและขนาดทางลาด (Ramp & Slope Config)
              </h2>
            </div>

            <div className="space-y-3.5">
              {/* Delta theta */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-300 font-bold">ความชันทางลาดชัน (theta)</span>
                  <div className="flex items-center gap-1">
                    <input
                      id="ramp-angle-numeric-input"
                      type="number"
                      min="10"
                      max="75"
                      step="1"
                      value={rampAngleInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setRampAngleInput(raw);
                        const parsed = parseFloat(raw);
                        if (!isNaN(parsed) && parsed >= 10 && parsed <= 75) {
                          setRampAngleDeg(parsed);
                        }
                      }}
                      className="w-14 px-1 py-0.5 bg-slate-950 text-sky-400 text-center text-[11px] font-bold border border-slate-800 rounded focus:outline-none focus:border-sky-500 font-mono"
                    />
                    <span className="text-sky-450 font-bold bg-sky-500/10 px-1.5 py-0.5 rounded text-sky-450 text-[10px]">deg</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="12"
                  max="45"
                  value={rampAngleDeg}
                  step="1"
                  onChange={(e) => setRampAngleDeg(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-950 rounded appearance-none cursor-pointer accent-sky-500"
                />
              </div>

              {/* Length horizontal L-ramp */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-300 font-bold">ความยาวฐานทางลาด (L-ramp)</span>
                  <div className="flex items-center gap-1">
                    <input
                      id="ramp-length-numeric-input"
                      type="number"
                      min="3"
                      max="250"
                      step="0.1"
                      value={rampLengthInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setRampLengthInput(raw);
                        const parsed = parseFloat(raw);
                        if (!isNaN(parsed) && parsed >= 3.0 && parsed <= 250.0) {
                          setRampLength(parsed);
                        }
                      }}
                      className="w-14 px-1 py-0.5 bg-slate-950 text-sky-400 text-center text-[11px] font-bold border border-slate-800 rounded focus:outline-none focus:border-sky-500 font-mono"
                    />
                    <span className="text-sky-450 font-bold bg-sky-500/10 px-1.5 py-0.5 rounded text-sky-450 text-[10px]">cm</span>
                  </div>
                </div>
                <input
                  id="ramp-length-slider-control"
                  type="range"
                  min="5.0"
                  max="200.0"
                  value={rampLength}
                  step="0.1"
                  onChange={(e) => setRampLength(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-950 rounded appearance-none cursor-pointer accent-sky-500"
                />
                <div className="flex justify-between items-center text-[10px] font-mono bg-slate-950/30 px-2.5 py-1.5 border border-slate-900 rounded-lg">
                  <span className="text-slate-400">ความสูงแนวตั้งตัวแปรผัน (H-ramp):</span>
                  <span className="text-amber-450 font-bold">{rampHeight.toFixed(2)} cm</span>
                </div>
              </div>

              {/* Sliding friction */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300 font-bold">ค่าความเสียดทานทางลาด (μ)</span>
                  <span className="text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded">{frictionMew.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.2"
                  value={frictionMew}
                  step="0.02"
                  onChange={(e) => setFrictionMew(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-950 rounded appearance-none cursor-pointer accent-sky-500"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>0.05 (ลื่นมาก)</span>
                  <span>1.20 (ฝืดหนืดสูง)</span>
                </div>
              </div>

              {/* Rippled wave structure */}
              <div className="pt-2 border-t border-slate-800/40 space-y-2">
                <label className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-slate-800/60 cursor-pointer hover:bg-slate-950/70 transition">
                  <div className="flex flex-col select-none text-left">
                    <span className="text-[11px] font-bold text-slate-300">ลอนลาดโต๊ะเว้าขรุขระ (Rippled Waves)</span>
                    <span className="text-[9px] text-slate-500">จำลองบนสนามเนินแบบไซน์ซอยด์</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isUneven}
                    onChange={(e) => setIsUneven(e.target.checked)}
                    className="w-3.5 h-3.5 accent-sky-455 cursor-pointer"
                  />
                </label>

                {isUneven && (
                  <div className="space-y-1 animate-fadeIn">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-450">ขนาดแอมพลิจูดความสูงคลื่น</span>
                      <span className="text-sky-400 font-bold">{waveHeight.toFixed(1)} cm</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.0"
                      value={waveHeight}
                      step="0.1"
                      onChange={(e) => setWaveHeight(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-950 rounded appearance-none cursor-pointer accent-sky-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: 3. โครงสร้างเรขาคณิตวัตถุ (Toy Shape & Geometry) - ALWAYS VISIBLE */}
          <div className="bg-[#060a15]/80 border border-slate-800/70 rounded-xl p-4 shadow-lg space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-800/50 pb-2">
              <Dices className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                3. รูปทรงวัตถุบิดพลิก (Toy Shape & Materials)
              </h2>
            </div>

            <div className="space-y-3.5">
              {/* Sides */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300 font-bold">จำนวนเหลี่ยมรูปคลื่นแกนกลาง</span>
                  <span className="text-emerald-400 font-extrabold bg-emerald-500/10 px-2 py-0.5 rounded">
                    N = {toySides} ({toySides === 4 ? 'Square - ดีสุด' : `${toySides} เหลี่ยม`})
                  </span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="10"
                  value={toySides}
                  step="1"
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if ([3, 4, 5, 6, 8, 10].includes(val)) {
                      setToySides(val);
                    }
                  }}
                  className="w-full h-1.5 bg-slate-950 rounded appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Radius */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300 font-bold">รัศมีแกนหลักวัตถุ (Radius)</span>
                  <span className="text-emerald-400 font-bold">{toyRadius.toFixed(1)} cm</span>
                </div>
                <input
                  type="range"
                  min="2.5"
                  max="5.0"
                  value={toyRadius}
                  step="0.1"
                  onChange={(e) => setToyRadius(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-950 rounded appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Thickness */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300 font-bold">ความหนาแผ่นกลาง (Thickness)</span>
                  <span className="text-emerald-400 font-bold">{toyThickness.toFixed(2)} cm</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="1.5"
                  value={toyThickness}
                  step="0.05"
                  onChange={(e) => setToyThickness(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-950 rounded appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Dome height */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300 font-bold">ความนูนฝาบนล่าง (Dome Height)</span>
                  <span className="text-emerald-400 font-bold">{domeHeight.toFixed(2)} cm</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="5.0"
                  value={domeHeight}
                  step="0.05"
                  onChange={(e) => setDomeHeight(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-950 rounded appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Material selection with Density previews */}
              <div className="space-y-2 pt-2 border-t border-slate-800/40">
                <label className="text-xs font-mono text-slate-400">วัสดุกายภาพและสัมประสิทธิ์สเปกตรัม</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(MATERIAL_PRESETS).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => setActiveMaterial(key)}
                      className={`p-2 rounded-lg border text-left transition ${
                        activeMaterial === key
                          ? 'bg-emerald-950/20 border-emerald-500 text-slate-100 ring-1 ring-emerald-500/20'
                          : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-[10.5px] font-bold truncate">{value.name.split(' (')[0]}</div>
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5">ρ = {value.density} g/cm³</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: 4. ดุลภาพจำลองเชิงลึก (Advanced/Deep Physical Constants) - COLLAPSIBLE FOR BEST UX SPACING */}
          <div className="bg-[#060a15]/80 border border-slate-800/70 rounded-xl p-4 shadow-lg flex flex-col">
            <button
              onClick={() => setIsDeepPhysicsOpen(!isDeepPhysicsOpen)}
              className="flex items-center justify-between pointer-events-auto transition text-left focus:outline-none"
            >
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-500" />
                <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  4. กลศาสตร์จำลองเชิงลึก (Advanced Physics)
                </h2>
              </div>
              <div>
                {isDeepPhysicsOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>

            {isDeepPhysicsOpen && (
              <div className="space-y-3.5 mt-3.5 pt-3.5 border-t border-slate-800/50 animate-fadeIn">
                {/* Gravity Preset Select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-400">แรงโน้มถ่วงจำลองเชิงพิกัดดาว</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(GRAVITY_PRESETS).map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() => setActiveGravity(key)}
                        className={`p-2 rounded-lg border text-left transition ${
                          activeGravity === key
                            ? 'bg-amber-950/25 border-amber-500/80 text-slate-100 font-bold'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="text-[10px] truncate">{value.name.split(' (')[0]}</div>
                        <div className="text-[9px] text-slate-500 font-mono mt-0.5">{value.value.toFixed(1)} cm/s²</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Substepping Frequency Solver limit */}
                <div className="space-y-1 pt-2 border-t border-slate-800/40">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">ความถี่จำลองซับสเต็ปฟิสิกส์</span>
                    <span className="text-amber-400 font-black">{substepsLimit}x</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="110"
                    value={substepsLimit}
                    step="5"
                    onChange={(e) => setSubstepsLimit(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-950 rounded appearance-none cursor-pointer accent-amber-500"
                  />
                  <p className="text-[9px] text-slate-500 leading-tight">
                    * ปรับซับสเต็ปสูงเพื่อเพิ่มความแม่นยำสูงสุดในการเลื่อนไหลปราบสั่นสปริง
                  </p>
                </div>

                {/* Spring Modulus Elasticity */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">สัมประสิทธิ์ยืดหยุ่นสปริง (Stiffness K)</span>
                    <span className="text-amber-400 font-bold">{customElasticityK} N/m</span>
                  </div>
                  <input
                    type="range"
                    min="15000"
                    max="75000"
                    value={customElasticityK}
                    step="1000"
                    onChange={(e) => setCustomElasticityK(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-950 rounded appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* Contact Damping Value */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">สเกลลดแรงปะทะจุดชน (Damper C)</span>
                    <span className="text-amber-400 font-bold">{customDampingC} Ns/m</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="350"
                    value={customDampingC}
                    step="10"
                    onChange={(e) => setCustomDampingC(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-950 rounded appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* Aerodynamic Air envelope resistances */}
                <div className="space-y-2 pt-2 border-t border-slate-800/40">
                  <div className="text-[11px] font-mono text-slate-400">แรงต้านอากาศความดันบรรยากาศ (Air Fluid Drag)</div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10.5px] font-mono text-slate-400">
                      <span>แรงต้านเลื่อนไหล (Linear CD)</span>
                      <span>{airDragLinear.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.000"
                      max="0.080"
                      value={airDragLinear}
                      step="0.002"
                      onChange={(e) => setAirDragLinear(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-950 rounded appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10.5px] font-mono text-slate-400">
                      <span>แรงต้านหมุนปั่น (Angular CD)</span>
                      <span>{airDragAngular.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.000"
                      max="0.080"
                      value={airDragAngular}
                      step="0.002"
                      onChange={(e) => setAirDragAngular(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-950 rounded appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mathematical & Analytical Science Real-time Output Lab Card ("ระดับ science โหดๆ") */}
          <div className="bg-[#050917]/90 border border-slate-800/80 rounded-xl p-4 shadow-xl space-y-3.5">
            <h3 className="text-[11px] font-black text-slate-200 uppercase tracking-widest font-mono flex items-center gap-1.5 border-b border-slate-800/50 pb-2">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>รายงานสมการวิเคราะห์จลนจลนศาสตร์เรียลไทม์ (Live Scientific Readings)</span>
            </h3>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="bg-[#03060c] p-2 rounded border border-slate-800/40">
                <div className="text-slate-500">มวลคำนวณจริง (Mass: m)</div>
                <div className="text-sm font-black text-emerald-400 mt-0.5">{derivedMass.toFixed(2)} g</div>
                <div className="text-[8px] text-slate-500">m = ∫ ρ dV</div>
              </div>
              <div className="bg-[#03060c] p-2 rounded border border-slate-800/40">
                <div className="text-slate-500">พลังงานจลน์เหนี่ยวนำ (Ek)</div>
                <div className="text-sm font-black text-sky-400 mt-0.5">{derivedEnergy.toFixed(2)} mJ</div>
                <div className="text-[8px] text-slate-500">E = ½mv² + ½Iω²</div>
              </div>
              <div className="bg-[#03060c] p-2 rounded border border-slate-800/40">
                <div className="text-slate-500">แอนไอโซทรอปตาเฉื่อย (I_zz)</div>
                <div className="text-xs font-bold text-amber-200 mt-0.5">{derivedIzz.toFixed(1)} g·cm²</div>
                <div className="text-[8.5px] text-slate-500">(สมมาตรแกนระงับ)</div>
              </div>
              <div className="bg-[#03060c] p-2 rounded border border-slate-800/40">
                <div className="text-slate-500">แอนไอโซทรอปตาเฉื่อย (I_xx)</div>
                <div className="text-xs font-bold text-amber-200 mt-0.5">{derivedIxx.toFixed(1)} g·cm²</div>
                <div className="text-[8.5px] text-slate-500">(แนวแกนระนาบตัด)</div>
              </div>
            </div>

            <div className="bg-[#03060c] p-2.5 rounded-lg border border-slate-800/60 flex items-center justify-between text-[10.5px] font-mono">
              <span className="text-slate-400">แรงต้านสัมพัทธ์แนวตั้งผิวชน (F_Normal):</span>
              <span className="text-xs font-black text-red-400">{contactForceN.toFixed(1)} N</span>
            </div>

            <div className="text-[10px] text-slate-400 font-sans leading-relaxed pt-1.5 border-t border-slate-800/40 space-y-1.5">
              <p>
                * ทฤษฎีความเสถียรของของเล่นยอดตีลังกา <strong>Flipo Flip</strong> เกิดขึ้นได้สมบูรณ์ในระดับการหมุนพลิกสลับสันตัดเมื่อเพลาเฉื่อยเฉลี่ย <span className="font-mono text-slate-300">I_zz / I_xx &gt; 1.35</span> ของสี่เหลี่ยมจัตุรัสขวางสโลปทแยงปฏิกิริยา ซึ่งตั้งจุดต้านสมมาตรขวางแนวดิ่งได้อย่างมั่นคง
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
