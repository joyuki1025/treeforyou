
import React, { useMemo, useRef, useLayoutEffect, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { lerp, randomVector3 } from '../utils/math';
import CustomOrnament from '../Object/CustomOrnament';

interface OrnamentData {
  chaosPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  rotation: THREE.Euler;
  color: THREE.Color;
  targetScale: THREE.Vector3;
  chaosScale: THREE.Vector3;
  chaosTilt: number;
}

interface OrnamentsProps {
  mixFactor: number;
  type: 'BALL' | 'BOX' | 'STAR' | 'CANDY' | 'CRYSTAL' | 'PHOTO';
  count: number;
  colors?: string[];
  scale?: number;
  variance?: number; // General variance
  customScale?: number; // Specific for ball.glb
  customVariance?: number; // Specific for ball.glb
  userImages?: string[];
  signatureText?: string;
}

// --- Procedural Geometry Generators ---

const createCandyCaneGeometry = () => {
    // Create a path: Line up, then curve for the hook
    const path = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -1.0, 0),
        new THREE.Vector3(0, 0.5, 0),
        new THREE.Vector3(0.1, 0.8, 0),
        new THREE.Vector3(0.4, 0.9, 0),
        new THREE.Vector3(0.6, 0.6, 0) 
    ]);
    
    // Tube
    const geometry = new THREE.TubeGeometry(path, 32, 0.12, 8, false);
    geometry.center(); // Crucial for rotation
    return geometry;
};

const createStarGeometry = (points: number, outerRadius: number, innerRadius: number, depth: number) => {
    const shape = new THREE.Shape();
    const step = (Math.PI * 2) / (points * 2);
    
    shape.moveTo(0, outerRadius);
    
    for(let i = 0; i < points * 2; i++) {
        const radius = (i % 2 === 0) ? outerRadius : innerRadius;
        const angle = i * step;
        shape.lineTo(Math.sin(angle) * radius, Math.cos(angle) * radius);
    }
    shape.closePath();
    
    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: depth,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.05,
        bevelSegments: 2
    });
    geometry.center();
    return geometry;
};

const generateCandyStripeTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 128);
    
    // Red stripes
    ctx.fillStyle = '#cc0000'; // Classic darker red
    
    // Draw diagonal stripes
    // To create a seamless spiral on the tube, we draw diagonal lines.
    // 3 stripes per tile
    for (let i = -128; i < 256; i += 42) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 20, 0);
        ctx.lineTo(i + 20 + 128, 128); // Slope of 1 (128x128)
        ctx.lineTo(i + 128, 128);
        ctx.closePath();
        ctx.fill();
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    
    // Repeat along the length (U) to create multiple spiral turns.
    // Repeat 4 times along the length, 1 time around the circumference.
    tex.repeat.set(4, 1); 
    return tex;
}

const generateSignatureTexture = (text: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return null;
    
    // Clear background (transparent)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!text) return new THREE.CanvasTexture(canvas);

    // Text Style
    ctx.fillStyle = '#111111'; // Almost Black ink
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Responsive font sizing: pick largest font that fits within canvas width with padding
    const padding = 20;
    const maxTextWidth = canvas.width - padding * 2;
    let fontSize = 60; // starting font size
    const minFontSize = 18;

    // Try decreasing font size until it fits.
    const hasChinese = /[\u4E00-\u9FFF]/.test(text);
    const fontFamilyFallback = hasChinese ? `'Chinese', 'Damion', 'Monsieur La Doulaise', cursive` : `'Damion', 'Monsieur La Doulaise', cursive`;
    do {
        ctx.font = `bold ${fontSize}px ${fontFamilyFallback}`;
        const measured = ctx.measureText(text).width;
        if (measured <= maxTextWidth) break;
        fontSize -= 2;
    } while (fontSize >= minFontSize);

    // If still too wide (very long string), truncate with ellipsis to be safe
    let renderText = text;
    if (ctx.measureText(renderText).width > maxTextWidth) {
        // Truncate characters until it fits with ellipsis
        while (renderText.length > 0 && ctx.measureText(renderText + '…').width > maxTextWidth) {
            renderText = renderText.slice(0, -1);
        }
        renderText = renderText + '…';
    }

    // Draw the text centered vertically
    ctx.font = `bold ${fontSize}px ${fontFamilyFallback}`;
    ctx.fillText(renderText, canvas.width / 2, canvas.height / 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
}

// Default polaroid captions for the 8 default images (will repeat via modulo)
const DEFAULT_POLAROID_TEXTS = [
    'Selamat Natal',
    'Merry Christmas',
    'Feliz Navidad',
    'Sugeng Natal',
    'Wilujeng Natal',
    "Salama' Natal",
    'Rahajeng Natal',
    '圣诞快乐'
];

// Generate a nice missing texture instead of black
const generateMissingTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; 
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        // Light grey background
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(0,0, 256, 320);
        
        // Border
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 10;
        ctx.strokeRect(0,0,256,320);
        
        // Icon (Simple geometric mountain/tree)
        ctx.fillStyle = '#bbbbbb';
        ctx.beginPath();
        ctx.moveTo(64, 220);
        ctx.lineTo(128, 120);
        ctx.lineTo(192, 220);
        ctx.fill();
        
        // Sun
        ctx.beginPath();
        ctx.arc(180, 80, 20, 0, Math.PI*2);
        ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

// --- Standard Sphere Ornament Component ---
// This handles non-green balls, keeping them as spheres but with individual animation logic
const SphereOrnament: React.FC<{ item: OrnamentData, mixFactor: number }> = ({ item, mixFactor }) => {
  const groupRef = useRef<THREE.Group>(null);
  const currentMixRef = useRef(1);
  
  const vecPos = useMemo(() => new THREE.Vector3(), []);
  const vecScale = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    const speed = 2.0 * delta;
    currentMixRef.current = lerp(currentMixRef.current, mixFactor, speed);
    const t = currentMixRef.current;
    
    // Position Interpolation
    vecPos.lerpVectors(item.chaosPos, item.targetPos, t);
    groupRef.current.position.copy(vecPos);
    
    // Scale Interpolation
    vecScale.lerpVectors(item.chaosScale, item.targetScale, t);
    groupRef.current.scale.copy(vecScale);
    
    // Rotation Interpolation
    groupRef.current.rotation.copy(item.rotation);
    
    // Extra rotation in chaos mode
    if (t < 0.5) {
         groupRef.current.rotation.x += delta * 0.5;
         groupRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial 
            color={item.color} 
            roughness={0.15}
            metalness={0.6}
        />
      </mesh>
    </group>
  );
};

// --- Base Mesh Component for Photos ---
const PhotoFrameMesh: React.FC<{
    item: OrnamentData;
    mixFactor: number;
    texture: THREE.Texture;
    signatureTexture?: THREE.Texture | null;
}> = ({ item, mixFactor, texture, signatureTexture }) => {
    const groupRef = useRef<THREE.Group>(null);
    const innerRef = useRef<THREE.Group>(null); 
    const photoMatRef = useRef<THREE.MeshStandardMaterial>(null);
    const frameMatRef = useRef<THREE.MeshStandardMaterial>(null);
    const currentMixRef = useRef(1);
    
    const vecPos = useMemo(() => new THREE.Vector3(), []);
    const vecScale = useMemo(() => new THREE.Vector3(), []);
    const vecWorld = useMemo(() => new THREE.Vector3(), []);

    const { frameArgs, photoArgs, photoPos, textPos, textArgs } = useMemo(() => {
        const img = texture.image as any;
        const width = img?.width || 1;
        const height = img?.height || 1;
        const aspect = width / height;

        const maxSize = 0.85;
        let pw, ph;

        if (aspect >= 1) {
            pw = maxSize;
            ph = maxSize / aspect;
        } else {
            ph = maxSize;
            pw = maxSize * aspect;
        }

        const mSide = 0.08;
        const mTop = 0.08;
        const mBottom = 0.20;

        const fw = pw + mSide * 2;
        const fh = ph + mTop + mBottom;
        const py = (fh / 2) - mTop - (ph / 2);
        
        // Text Position: Bottom whitespace center
        const ty = -(fh / 2) + (mBottom / 2);

        return {
            frameArgs: [fw, fh, 0.05] as [number, number, number],
            photoArgs: [pw, ph] as [number, number],
            photoPos: [0, py, 0.03] as [number, number, number],
            textPos: [0, ty, 0.03] as [number, number, number],
            textArgs: [fw, mBottom] as [number, number]
        };
    }, [texture]);

    useFrame((state, delta) => {
        if (!groupRef.current || !innerRef.current) return;
        const speed = 2.0 * delta;
        currentMixRef.current = lerp(currentMixRef.current, mixFactor, speed);
        const t = currentMixRef.current;
        
        vecPos.lerpVectors(item.chaosPos, item.targetPos, t);
        groupRef.current.position.copy(vecPos);
        
        vecScale.lerpVectors(item.chaosScale, item.targetScale, t);

        // --- Responsive Scaling Logic ---
        const { width } = state.viewport;
        const isSmallScreen = width < 22; 
        
        const responsiveBaseScale = isSmallScreen ? 0.6 : 1.0;
        vecScale.multiplyScalar(responsiveBaseScale);
        // --------------------------------
        
        const effectStrength = (1.0 - t);
        
        if (t < 0.99) {
             groupRef.current.getWorldPosition(vecWorld);
             const distToCamera = vecWorld.distanceTo(state.camera.position);
             
             const maxZoom = isSmallScreen ? 1.1 : 1.5; 
             const minZoom = 0.6;

             const perspectiveFactor = THREE.MathUtils.mapLinear(distToCamera, 10, 60, maxZoom, minZoom);
             const dynamicScale = lerp(1.0, perspectiveFactor, effectStrength);
             vecScale.multiplyScalar(dynamicScale);

             if (photoMatRef.current) {
                 const brightness = THREE.MathUtils.mapLinear(distToCamera, 12, 50, 0.9, 0.2);
                // Prevent overexposure when the photo gets very close to the camera:
                // - Clamp the computed brightness to a safe range.
                // - If extremely close, force a conservative emissive intensity.
                const clampedBrightness = THREE.MathUtils.clamp(brightness, 0.15, 0.8);
                const extremelyCloseThreshold = 9.0;
                const targetEmissive = distToCamera < extremelyCloseThreshold
                    ? 0.25
                    : Math.max(0.15, clampedBrightness) * effectStrength;

                // Smoothly interpolate emissiveIntensity to avoid popping
                const current = photoMatRef.current.emissiveIntensity ?? 0.25;
                photoMatRef.current.emissiveIntensity = lerp(current, targetEmissive, 0.12);
             }
        } else {
             if (photoMatRef.current) photoMatRef.current.emissiveIntensity = 0.25;
        }

        groupRef.current.scale.copy(vecScale);

        if (t > 0.8) {
             groupRef.current.lookAt(0, groupRef.current.position.y, 0); 
             groupRef.current.rotateY(Math.PI); 
             innerRef.current.rotation.z = lerp(innerRef.current.rotation.z, 0, speed);
        } else {
             groupRef.current.lookAt(state.camera.position);
             innerRef.current.rotation.z = lerp(innerRef.current.rotation.z, item.chaosTilt, speed);
        }
    });

    return (
        <group ref={groupRef}>
            <group ref={innerRef}>
                {/* Frame */}
                <mesh>
                    <boxGeometry args={frameArgs} />
                    <meshStandardMaterial 
                        ref={frameMatRef}
                        color="#ffffff" 
                        roughness={1.0}
                        metalness={0.0}
                        emissive="#ffffff"
                        emissiveIntensity={0.6}
                        toneMapped={false} 
                    />
                </mesh>
                {/* Photo */}
                <mesh position={photoPos}>
                    <planeGeometry args={photoArgs} />
                    <meshStandardMaterial 
                        ref={photoMatRef}
                        map={texture} 
                        emissiveMap={texture} 
                        roughness={0.4} 
                        metalness={0.0}
                        color="white"
                        emissive="white" 
                        emissiveIntensity={0.25}
                        toneMapped={false} 
                    />
                </mesh>
                {/* Signature Text Plane */}
                {signatureTexture && (
                    <mesh position={textPos}>
                        <planeGeometry args={textArgs} />
                        <meshBasicMaterial 
                            map={signatureTexture}
                            transparent={true}
                            opacity={0.85}
                            depthWrite={false} 
                        />
                    </mesh>
                )}
            </group>
        </group>
    );
};

// --- Procedural Gift Box Component ---
const GiftBoxMesh: React.FC<{
    item: OrnamentData;
    mixFactor: number;
}> = ({ item, mixFactor }) => {
    const groupRef = useRef<THREE.Group>(null);
    const currentMixRef = useRef(1);
    
    const vecPos = useMemo(() => new THREE.Vector3(), []);
    const vecScale = useMemo(() => new THREE.Vector3(), []);
    
    // Auto-detect ribbon color for contrast
    const { ribbonColor, ribbonMaterial } = useMemo(() => {
        const c = item.color;
        const luminance = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
        
        let ribColorStr = "#FFD700"; // Default Gold
        
        if (c.b > c.r + 0.2 && c.b > c.g + 0.2) {
             ribColorStr = "#E0E0E0"; // Silver
        } else if (luminance > 0.6) {
             ribColorStr = "#AA0000"; // Red
        }

        return {
            ribbonColor: new THREE.Color(ribColorStr),
            ribbonMaterial: new THREE.MeshStandardMaterial({
                color: ribColorStr,
                roughness: 0.2,
                metalness: 0.8,
                emissive: ribColorStr,
                emissiveIntensity: 0.2
            })
        }
    }, [item.color]);

    useFrame((state, delta) => {
        if (!groupRef.current) return;
        const speed = 2.0 * delta;
        currentMixRef.current = lerp(currentMixRef.current, mixFactor, speed);
        const t = currentMixRef.current;
        
        vecPos.lerpVectors(item.chaosPos, item.targetPos, t);
        groupRef.current.position.copy(vecPos);
        
        vecScale.lerpVectors(item.chaosScale, item.targetScale, t);
        groupRef.current.scale.copy(vecScale);
        
        groupRef.current.rotation.copy(item.rotation);
        
        if (t < 0.5) {
             groupRef.current.rotation.x += delta * 0.5;
             groupRef.current.rotation.y += delta * 0.5;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Box Body */}
            <mesh castShadow receiveShadow>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial 
                    color={item.color} 
                    roughness={0.4}
                    metalness={0.1}
                />
            </mesh>
            
            {/* Ribbon 1 (X-Loop) */}
            <mesh scale={[0.2, 1.01, 1.01]} material={ribbonMaterial}>
                <boxGeometry args={[1, 1, 1]} />
            </mesh>

            {/* Ribbon 2 (Z-Loop) */}
            <mesh scale={[1.01, 1.01, 0.2]} material={ribbonMaterial}>
                <boxGeometry args={[1, 1, 1]} />
            </mesh>
            
            {/* Bow Knot */}
            <mesh position={[0, 0.5, 0]} rotation={[0, Math.PI / 4, 0]} material={ribbonMaterial} scale={[0.35, 0.35, 0.35]}>
                 <torusKnotGeometry args={[0.6, 0.15, 64, 8, 2, 3]} />
            </mesh>
        </group>
    );
};

const generateCardTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0,0, 256, 320);
    }
    return new THREE.CanvasTexture(canvas);
}

// --- Loading State Component for Photos ---
// Uses the same scaling logic as PhotoFrameMesh to maintain consistent size
const PhotoLoadingMesh: React.FC<{
    item: OrnamentData;
    mixFactor: number;
}> = ({ item, mixFactor }) => {
    const groupRef = useRef<THREE.Group>(null);
    const currentMixRef = useRef(1);
    
    const vecPos = useMemo(() => new THREE.Vector3(), []);
    const vecScale = useMemo(() => new THREE.Vector3(), []);
    const vecWorld = useMemo(() => new THREE.Vector3(), []);

    useFrame((state, delta) => {
        if (!groupRef.current) return;
        const speed = 2.0 * delta;
        currentMixRef.current = lerp(currentMixRef.current, mixFactor, speed);
        const t = currentMixRef.current;
        
        vecPos.lerpVectors(item.chaosPos, item.targetPos, t);
        groupRef.current.position.copy(vecPos);
        
        vecScale.lerpVectors(item.chaosScale, item.targetScale, t);

        // --- Responsive Scaling Logic (same as PhotoFrameMesh) ---
        const { width } = state.viewport;
        const isSmallScreen = width < 22; 
        
        const responsiveBaseScale = isSmallScreen ? 0.6 : 1.0;
        vecScale.multiplyScalar(responsiveBaseScale);
        // --------------------------------
        
        const effectStrength = (1.0 - t);
        
        if (t < 0.99) {
             groupRef.current.getWorldPosition(vecWorld);
             const distToCamera = vecWorld.distanceTo(state.camera.position);
             
             const maxZoom = isSmallScreen ? 1.1 : 1.5; 
             const minZoom = 0.6;

             const perspectiveFactor = THREE.MathUtils.mapLinear(distToCamera, 10, 60, maxZoom, minZoom);
             const dynamicScale = lerp(1.0, perspectiveFactor, effectStrength);
             vecScale.multiplyScalar(dynamicScale);
        }

        groupRef.current.scale.copy(vecScale);

        if (t > 0.8) {
             groupRef.current.lookAt(0, groupRef.current.position.y, 0); 
             groupRef.current.rotateY(Math.PI); 
        } else {
             groupRef.current.lookAt(state.camera.position);
        }
    });

    return (
        <group ref={groupRef}>
            <mesh>
                <boxGeometry args={[1, 1.2, 0.05]} />
                <meshStandardMaterial color="#f0f0f0" roughness={0.5} />
            </mesh>
        </group>
    );
};

const UserPhotoOrnament: React.FC<{
    item: OrnamentData;
    mixFactor: number;
    url: string;
    signatureTexture?: THREE.Texture | null;
}> = ({ item, mixFactor, url, signatureTexture }) => {
    const [texture, setTexture] = useState<THREE.Texture | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;
        let activeUrl: string | null = null;

        const load = async () => {
            try {
                // Robustness: Fetch the image as a blob first.
                // This validates existence and avoids some cross-origin pitfalls with direct TextureLoader 
                // on certain development servers or when switching protocols.
                const res = await fetch(url);
                if (!res.ok) {
                    throw new Error(`HTTP error ${res.status}`);
                }
                
                const blob = await res.blob();
                if (!isMounted) return;
                
                activeUrl = URL.createObjectURL(blob);
                
                const loader = new THREE.TextureLoader();
                // When loading from a blob URL, we don't need crossOrigin anonymous usually, 
                // but setting it doesn't hurt for blobs.
                // However, fetching verified we have access.
                
                loader.load(
                    activeUrl,
                    (tex) => {
                        if (!isMounted) return;
                        tex.colorSpace = THREE.SRGBColorSpace;
                        tex.minFilter = THREE.LinearFilter;
                        tex.magFilter = THREE.LinearFilter;
                        setTexture(tex);
                        setError(false);
                    },
                    undefined,
                    (err) => {
                        console.warn("Texture decode failed:", err);
                        if (isMounted) setError(true);
                    }
                );
            } catch (e) {
                // Silently handle errors - don't throw to prevent React error #310
                console.warn(`Failed to fetch photo: ${url}`, e);
                if (isMounted) {
                    setError(true);
                }
            }
        };

        load();

        return () => { 
            isMounted = false; 
            if (activeUrl) URL.revokeObjectURL(activeUrl);
        };
    }, [url]);

    if (error) {
        // Fallback: Use the generated missing texture so it looks intentional, not just broken
        const fallbackTex = useMemo(() => generateMissingTexture(), []);
        return <PhotoFrameMesh item={item} mixFactor={mixFactor} texture={fallbackTex} signatureTexture={null} />;
    }

    if (!texture) {
        // Loading State: Use PhotoLoadingMesh with same scaling logic as PhotoFrameMesh
        return <PhotoLoadingMesh item={item} mixFactor={mixFactor} />;
    }

    return <PhotoFrameMesh item={item} mixFactor={mixFactor} texture={texture} signatureTexture={signatureTexture} />;
};

// Defines phase offsets for different ornament types to prevent overlap
const getTypeOffsetIndex = (type: string) => {
    switch(type) {
        case 'BALL': return 0;
        case 'BOX': return 1;
        case 'STAR': return 2;
        case 'CANDY': return 3;
        case 'CRYSTAL': return 4;
        case 'PHOTO': return 5;
        default: return 0;
    }
}

const Ornaments: React.FC<OrnamentsProps> = ({ mixFactor, type, count, colors, scale = 1, variance, customScale, customVariance, userImages = [], signatureText }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const currentMixRef = useRef(1);

  const candyTexture = useMemo(() => {
      if (type === 'CANDY') return generateCandyStripeTexture();
      return null;
  }, [type]);

  // Generate signature texture
  // Only generate if type is PHOTO and we have text
  const signatureTexture = useMemo(() => {
      if (type === 'PHOTO' && signatureText) {
          return generateSignatureTexture(signatureText);
      }
      return null;
  }, [type, signatureText]);

  // Default signature textures (one per default polaroid text). Generated once for performance.
  const defaultSignatureTextures = useMemo(() => {
      if (type !== 'PHOTO') return [];
      return DEFAULT_POLAROID_TEXTS.map(t => generateSignatureTexture(t));
  }, [type]);

  // Generate specific geometry based on type
  const geometry = useMemo(() => {
      switch(type) {
          case 'CANDY':
              return createCandyCaneGeometry();
          case 'CRYSTAL': // Snowflake
              return createStarGeometry(6, 1.0, 0.3, 0.1); 
          case 'STAR':
              return createStarGeometry(5, 1.0, 0.5, 0.2);
          case 'BALL':
              return new THREE.SphereGeometry(1, 16, 16);
          case 'BOX':
          default:
              return new THREE.BoxGeometry(1, 1, 1);
      }
  }, [type]);

  const data = useMemo(() => {
    const items: OrnamentData[] = [];
    
    // Golden Spiral Constants
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~2.399 rads
    const treeHeight = 18;
    const treeRadiusBase = 7.5;
    const apexY = 9; // Top of the foliage volume
    
    // Phase offset per type to avoid different ornaments overlapping
    const typeIndex = getTypeOffsetIndex(type);
    const angleOffset = typeIndex * (Math.PI * 2 / 6); // Spread 6 types over 360 deg

    for (let i = 0; i < count; i++) {
      // --- Deterministic Golden Spiral Position ---
      const progress = Math.sqrt((i + 1) / count) * 0.9; // 0 (Top) -> 0.9 (Near Bottom)
      
      const r = progress * treeRadiusBase;
      const y = apexY - progress * treeHeight;
      const theta = i * goldenAngle + angleOffset;

      // Convert polar to Cartesian
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      
      const tPos = new THREE.Vector3(x, y, z);
      
      // Push out slightly to sit on surface
      const pushOut = (type === 'STAR' || type === 'PHOTO') ? 1.15 : 1.08;
      tPos.multiplyScalar(pushOut);

      // --- Chaos Position (Random) ---
      let cPos: THREE.Vector3;
      let chaosTilt = 0;
      
      if (type === 'PHOTO') {
          // Special chaos arrangement for photos
          const chaosRadius = 18;
          const chaosHeightRange = 12;
          const chaosY = ((i / count) - 0.5) * chaosHeightRange;
          // Use simple spiral for chaos too, just wider
          const chaosTheta = i * goldenAngle;
          cPos = new THREE.Vector3(chaosRadius * Math.cos(chaosTheta), chaosY, chaosRadius * Math.sin(chaosTheta));
          chaosTilt = ((i % 5) - 2) * 0.15; 
      } else {
          cPos = randomVector3(25);
      }

      const colorHex = colors ? colors[Math.floor(Math.random() * colors.length)] : '#ffffff';
      
      // --- Determine Scale Logic ---
      // Check if this specific item is the 'Custom Ornament' (Ball GLB)
      // The convention is Green (#1B5E20) for the Ball.glb
      const isCustomModel = type === 'BALL' && colorHex.toLowerCase() === '#1b5e20';
      
      const activeScaleBase = (isCustomModel && customScale !== undefined) ? customScale : scale;
      const activeVariance = (isCustomModel && customVariance !== undefined) ? customVariance : (variance !== undefined ? variance : 0.2);

      const baseScaleVec = new THREE.Vector3(1, 1, 1);
      
      // -- Random Scale Logic --
      const rand = Math.random();
      
      // Determine random scalar based on variance prop or default behavior
      // Range: 1.0 +/- variance
      // e.g. variance 0.2 -> 0.8 to 1.2
      const randScale = 1.0 + (rand - 0.5) * activeVariance * 2.0;
      
      if (type === 'CANDY') {
          baseScaleVec.setScalar(0.7); 
      } else if (type === 'CRYSTAL') {
          baseScaleVec.setScalar(0.6); // Snowflakes
      } else if (type === 'STAR') {
          baseScaleVec.setScalar(0.7);
      } else if (type === 'BOX') {
          // Randomized aspect ratio for gift boxes
          baseScaleVec.set(
              1.0 + Math.random() * 0.3, 
              0.7 + Math.random() * 0.4, 
              1.0 + Math.random() * 0.3
          );
      }

      const targetScale = baseScaleVec.clone().multiplyScalar(activeScaleBase * randScale);
      
      let chaosScale = targetScale.clone();
      if (type === 'PHOTO') {
          const photoScale = 3.5 + Math.random() * 1.5;
          chaosScale.multiplyScalar(photoScale);
      }

      items.push({
        chaosPos: cPos,
        targetPos: tPos,
        rotation: new THREE.Euler(Math.random()*Math.PI, Math.random()*Math.PI, 0),
        color: new THREE.Color(colorHex),
        targetScale: targetScale,
        chaosScale: chaosScale,
        chaosTilt: chaosTilt
      });
    }
    return items;
  }, [count, type, colors, scale, variance, customScale, customVariance]); 

  const fallbackTextures = useMemo(() => {
      if (type !== 'PHOTO') return [];
      return [generateCardTexture()];
  }, [type]);

  useLayoutEffect(() => {
     // Skip instanced logic for types that use individual meshes
     if (!meshRef.current || type === 'PHOTO' || type === 'BOX' || type === 'BALL') return;
     
     data.forEach((item, i) => {
         // If Candy, we force white so texture renders correctly.
         // If other types, we use the random assigned color.
         const color = type === 'CANDY' ? new THREE.Color('#ffffff') : item.color;
         
         meshRef.current!.setColorAt(i, color);
         dummy.position.copy(item.targetPos);
         dummy.scale.copy(item.targetScale);
         dummy.rotation.copy(item.rotation);
         dummy.updateMatrix();
         meshRef.current!.setMatrixAt(i, dummy.matrix);
     });
     
     if (meshRef.current.instanceColor) {
         meshRef.current.instanceColor.needsUpdate = true;
     }
     meshRef.current.instanceMatrix.needsUpdate = true;
  }, [data, type, dummy]);

  useFrame((state, delta) => {
    // Skip instanced update for complex types
    if (!meshRef.current || type === 'PHOTO' || type === 'BOX' || type === 'BALL') return;

    const speed = 2.0 * delta;
    currentMixRef.current = lerp(currentMixRef.current, mixFactor, speed);
    const t = currentMixRef.current;
    
    const currentPos = new THREE.Vector3();
    const currentScale = new THREE.Vector3();

    data.forEach((item, i) => {
      currentPos.lerpVectors(item.chaosPos, item.targetPos, t);
      dummy.position.copy(currentPos);
      
      if (type === 'STAR' && t > 0.8) {
         dummy.lookAt(0, currentPos.y, 0); 
         dummy.rotateZ(Math.PI / 2); // Orient star to face out
      } else if (type === 'CRYSTAL' && t > 0.8) {
         dummy.lookAt(0, currentPos.y, 0); 
      } else {
         dummy.rotation.copy(item.rotation);
         // Spin the ornaments in chaos mode
         if (t < 0.5) {
             dummy.rotation.x += delta * 0.5;
             dummy.rotation.y += delta * 0.5;
         }
      }

      currentScale.lerpVectors(item.chaosScale, item.targetScale, t);
      dummy.scale.copy(currentScale); 

      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (type === 'PHOTO') {
      return (
          <group>
              {data.map((item, i) => {
                  let imgSrc: string | undefined = undefined;
                  if (userImages && userImages.length > 0) {
                      // Safety check for array index
                      if (i < userImages.length) {
                           imgSrc = userImages[i];
                      }
                  }

                  // Per-photo signature selection:
                  // - If user provided a global signatureText, use that (signatureTexture).
                  // - Otherwise use the default polaroid captions, repeating via modulo.
                  const perPhotoSignature: THREE.Texture | null = signatureTexture ?? (defaultSignatureTextures.length ? defaultSignatureTextures[i % defaultSignatureTextures.length] : null);

                  // Use fallback texture logic if no image URL is present.
                  if (imgSrc) {
                      return <UserPhotoOrnament key={i} item={item} mixFactor={mixFactor} url={imgSrc} signatureTexture={perPhotoSignature} />;
                  } else {
                      const fallback = fallbackTextures[i % fallbackTextures.length];
                      return <PhotoFrameMesh key={i} item={item} mixFactor={mixFactor} texture={fallback} signatureTexture={perPhotoSignature} />;
                  }
              })}
          </group>
      )
  }

  // Use Detailed GiftBox Mesh
  if (type === 'BOX') {
      return (
          <group>
              {data.map((item, i) => (
                  <GiftBoxMesh key={i} item={item} mixFactor={mixFactor} />
              ))}
          </group>
      )
  }

  // Handle BALL type: Check if green to use Custom Model, else Sphere
  if (type === 'BALL') {
      return (
          <group>
              {data.map((item, i) => {
                  // Check against the Dark Green color defined in Experience.tsx (#1B5E20)
                  // THREE.Color.getHexString() returns lowercase 6-char string (no hash)
                  if (item.color.getHexString() === '1b5e20') {
                      return <CustomOrnament key={i} item={item} mixFactor={mixFactor} />;
                  }
                  return <SphereOrnament key={i} item={item} mixFactor={mixFactor} />;
              })}
          </group>
      )
  }

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, count]}>
      <meshStandardMaterial 
        map={candyTexture}
        roughness={type === 'CANDY' ? 0.2 : 0.15} 
        metalness={type === 'CRYSTAL' ? 0.9 : 0.5} 
        emissive={type === 'CRYSTAL' ? "#112244" : "#000000"}
        emissiveIntensity={0.2}
      />
    </instancedMesh>
  );
};

export default Ornaments;
