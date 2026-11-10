'use client';

import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CompanionAppearance } from '@/lib/soul/types';
import { COSMETIC_COLORS } from '@/lib/companion/cosmetics';

// Configure Draco decoder path globally
useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

// GLTF Accessory loaded helper with auto-scaling and centering on sockets
function GLTFAccessory({
  url,
  socketType,
  scaleMultiplier = 1.0,
  yOffset = 0.0,
  zOffset = 0.0,
  xOffset = 0.0,
  rotation
}: {
  url: string;
  socketType: 'head' | 'face' | 'neck';
  scaleMultiplier?: number;
  yOffset?: number;
  zOffset?: number;
  xOffset?: number;
  rotation?: [number, number, number];
}) {
  const { scene } = useGLTF(url);
  const cloned = scene.clone();

  useEffect(() => {
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.roughness = 0.85;
          mat.metalness = 0.05;
        }
      }
    });
  }, [cloned]);

  // Compute bounding box to normalize scale
  const box = new THREE.Box3().setFromObject(cloned);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1.0;

  // Normalize accessory size (e.g. height should be ~0.8 units for hats)
  const targetHeight = socketType === 'head' ? 0.7 : 0.4;
  const scale = (targetHeight / maxDim) * scaleMultiplier;

  const center = box.getCenter(new THREE.Vector3());

  // Sockets positioning relative to character origin
  let posX = -center.x * scale;
  let posZ = -center.z * scale;
  let posY = -box.min.y * scale;

  if (socketType === 'head') {
    posY += 1.02 + yOffset; // Place on top of head
    posZ -= 0.05 - zOffset;
    posX += xOffset;
  } else if (socketType === 'face') {
    posY += 0.45 + yOffset;
    posZ += 0.52 + zOffset;
    posX += xOffset;
  } else if (socketType === 'neck') {
    posY -= 0.4 - yOffset;
    posZ += zOffset;
    posX += xOffset;
  }

  return (
    <primitive
      object={cloned}
      position={[posX, posY, posZ]}
      scale={[scale, scale, scale]}
      rotation={rotation}
    />
  );
}

// Procedural Accessory Renderer Component
function CompanionAccessories({ accessories }: { accessories: string[] }) {
  if (!accessories || accessories.length === 0) return null;

  return (
    <group>
      {accessories.map((accId) => {
        if (accId === 'hat_top_hat') {
          return (
            <GLTFAccessory
              key={accId}
              url="/models/accessories/top_hat.glb"
              socketType="head"
              scaleMultiplier={2}
              yOffset={0.05}
              zOffset={0.05}
            />
          );
        }

        if (accId === 'glasses_monocle') {
          return (
            <GLTFAccessory
              key={accId}
              url="/models/accessories/monocle.glb"
              socketType="face"
              scaleMultiplier={1.9}
              yOffset={-0.4}
              zOffset={-0.05}
              xOffset={0.7}
            />
          );
        }

        if (accId === 'crown_laurel') {
          return (
            <GLTFAccessory
              key={accId}
              url="/models/accessories/laurel.glb"
              socketType="head"
              scaleMultiplier={2.3}
              yOffset={0.1}
            />
          );
        }

        if (accId === 'crown_royal') {
          return (
            <GLTFAccessory
              key={accId}
              url="/models/accessories/royal_crown.glb"
              socketType="head"
              scaleMultiplier={2.5}
              yOffset={-0.1}
              zOffset={0.07}
            />
          );
        }

        if (accId === 'weapon_hammer') {
          return (
            <GLTFAccessory
              key={accId}
              url="/models/accessories/hammer.glb"
              socketType="neck"
              scaleMultiplier={3}
              yOffset={-0.3}
              zOffset={1.1}
              xOffset={1}
              rotation={[-0.15, -0.65, -0.25]}

            />
          );
        }

        if (accId === 'helmet_lantern') {
          return (
            <GLTFAccessory
              key={accId}
              url="/models/accessories/lantern_helmet.glb"
              socketType="head"
              scaleMultiplier={2.6}
              yOffset={-0.15}
              zOffset={0.05}
            />
          );
        }

        if (accId === 'weapon_sword') {
          return (
            <GLTFAccessory
              key={accId}
              url="/models/accessories/sword.glb"
              socketType="neck"
              scaleMultiplier={4}
              yOffset={-0.3}
              zOffset={1}
              xOffset={1}
              rotation={[-0.15, 0.65, -0.25]}
            />
          );
        }

        if (accId === 'golden_wreath') {
          return (
            <GLTFAccessory
              key={accId}
              url="/models/accessories/golden_cube_wreath.glb"
              socketType="neck"
              scaleMultiplier={2.5}
              yOffset={0.3}
              zOffset={1}
              xOffset={1}
            />
          );
        }

        return null;
      })}
    </group>
  );
}

export default function ElysiqCharacter({
  expression = 'NEUTRAL',
  appearance
}: {
  expression?: string;
  appearance?: CompanionAppearance;
}) {
  // Load the model from public/models/elysiq.glb
  const { scene } = useGLTF('/models/elysiq.glb');
  const characterRef = useRef<THREE.Group>(null);

  // References for procedural animation nodes
  const mustacheRef = useRef<THREE.Object3D | null>(null);
  const eyeLRef = useRef<THREE.Object3D | null>(null);
  const eyeRRef = useRef<THREE.Object3D | null>(null);

  const [blinking, setBlinking] = useState(false);

  // Traverse and apply cosmetic configurations dynamically when loaded or changed
  useEffect(() => {
    if (!scene) return;

    scene.traverse((child) => {
      const name = child.name.toLowerCase();

      // Override material colors and properties
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat) {
          // Force matte look
          mat.roughness = 0.85;
          mat.metalness = 0.05;

          const matName = mat.name.toLowerCase();

          // Apply dynamic or default color codes
          if (
            name.includes('body') ||
            name.includes('badan') ||
            name.includes('skin') ||
            matName.includes('body') ||
            matName.includes('terracotta')
          ) {
            const bodyColorHex = COSMETIC_COLORS[appearance?.bodyVariant || 'terracotta']?.value || '#D4633A';
            mat.color.set(bodyColorHex);
          } else if (
            name.includes('stache') ||
            name.includes('mustache') ||
            name.includes('kumis') ||
            matName.includes('stache') ||
            matName.includes('mustache') ||
            matName.includes('kumis')
          ) {
            mat.color.set('#1A1814'); // Matte Charcoal #1A1814
          } else if (
            name.includes('eye') ||
            name.includes('mata') ||
            matName.includes('eye') ||
            matName.includes('mata')
          ) {
            if (!name.includes('white') && !matName.includes('white') && !name.includes('sclera')) {
              mat.color.set('#1A1814');
            }
          } else if (
            name.includes('base') ||
            name.includes('pedestal') ||
            name.includes('floor') ||
            name.includes('tatakan') ||
            matName.includes('base') ||
            matName.includes('pedestal') ||
            matName.includes('concrete')
          ) {
            mat.color.set('#D9D5CF'); // Base concrete-light #D9D5CF
          }
        }
      }

      // Look for mustache node
      if (
        name.includes('mustache') ||
        name.includes('stache') ||
        name.includes('kumis')
      ) {
        mustacheRef.current = child;
      }

      // Look for eye nodes
      if (name.includes('eye') || name.includes('mata')) {
        if (name.includes('l') || name.includes('left')) {
          eyeLRef.current = child;
        } else if (name.includes('r') || name.includes('right')) {
          eyeRRef.current = child;
        } else if (!eyeLRef.current) {
          eyeLRef.current = child;
        } else if (!eyeRRef.current) {
          eyeRRef.current = child;
        }
      }
    });

    // Reset scale and position before measuring to avoid compound scaling when cached
    scene.scale.set(1, 1, 1);
    scene.position.set(0, 0, 0);
    scene.updateMatrixWorld(true);

    // Auto-scale and center
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    const scale = 2.5 / maxDim;
    scene.scale.set(scale, scale, scale);

    const center = box.getCenter(new THREE.Vector3());
    scene.position.x = -center.x * scale;
    scene.position.z = -center.z * scale;
    scene.position.y = -box.min.y * scale - 1.25; // Sit on the pedestal
  }, [scene, appearance?.bodyVariant]);

  // Blink interval
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 140);
    }, 3000 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, []);

  // Frame animation loop
  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // 1. Procedural Breathing
    if (characterRef.current) {
      let speed = 1.8;
      let amp = 0.05;
      if (expression === 'ALERT' || expression === 'THREAT') {
        speed = 3.5;
        amp = 0.08;
      } else if (expression === 'SCANNING') {
        speed = 2.8;
        amp = 0.06;
      } else if (expression === 'THINKING' || expression === 'SKEPTICAL') {
        speed = 1.2;
        amp = 0.03;
      } else if (expression === 'SATISFIED') {
        speed = 1.0;
        amp = 0.04;
      }

      characterRef.current.position.y = Math.sin(t * speed) * amp;
      const scalePulse = 1 + Math.sin(t * speed) * 0.01;
      characterRef.current.scale.set(scalePulse, scalePulse, scalePulse);
    }

    // 2. Procedural Mustache Wiggle
    if (mustacheRef.current) {
      if (expression === 'ALERT' || expression === 'THREAT') {
        mustacheRef.current.rotation.z = Math.sin(t * 6.0) * 0.07;
      } else if (expression === 'SCANNING') {
        mustacheRef.current.rotation.z = Math.sin(t * 4.0) * 0.05;
      } else if (expression === 'SATISFIED') {
        mustacheRef.current.rotation.z = Math.sin(t * 1.5) * 0.01;
      } else if (expression === 'SKEPTICAL') {
        mustacheRef.current.rotation.z = 0.05;
      } else {
        mustacheRef.current.rotation.z = Math.sin(t * 3.5) * 0.03;
      }
    }

    // 3. Procedural Blink
    if (eyeLRef.current) {
      if (expression === 'SKEPTICAL' || expression === 'THINKING') {
        eyeLRef.current.scale.y = 0.5;
      } else {
        eyeLRef.current.scale.y = blinking ? 0.1 : 1.0;
      }
    }
    if (eyeRRef.current) {
      if (expression === 'SKEPTICAL' || expression === 'THINKING') {
        eyeRRef.current.scale.y = 0.5;
      } else {
        eyeRRef.current.scale.y = blinking ? 0.1 : 1.0;
      }
    }
  });

  return (
    <group ref={characterRef} rotation={[0, -Math.PI / 2, 0]}>
      <primitive object={scene} />
      {/* Dynamic Accessories overlay */}
      {appearance && <CompanionAccessories accessories={appearance.accessories} />}
    </group>
  );
}

useGLTF.preload('/models/elysiq.glb');
useGLTF.preload('/models/accessories/top_hat.glb');
useGLTF.preload('/models/accessories/monocle.glb');
