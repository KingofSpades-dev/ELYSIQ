'use client';

import { ContactShadows, OrbitControls, Grid, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import ElysiqCharacter from './ElysiqCharacter';
import { CompanionAppearance } from '@/lib/soul/types';
import { COSMETIC_BACKGROUNDS } from '@/lib/companion/cosmetics';

function LegendaryEnvironment() {
  return (
    <>
      <ambientLight intensity={0.45} />
      <spotLight position={[0, 8, 3]} angle={0.45} penumbra={1} intensity={35} distance={30} color="#FFE6A3" />
      <directionalLight position={[5, 6, 4]} intensity={2.4} color="#FFD36B" />
      <directionalLight position={[-5, 3, 2]} intensity={1.1} color="#FFF2D2" />
      <directionalLight position={[0, 4, -5]} intensity={0.9} color="#FFC75E" />
      <pointLight position={[2, 2, 2]} intensity={3} color="#FFD966" distance={10} />
      <pointLight position={[-2, 1, -2]} intensity={2} color="#FFB347" distance={8} />
      <fog attach="fog" args={['#24160A', 8, 24]} />
      <mesh position={[0, 5, -3]}>
        <planeGeometry args={[8, 8]} />
        <meshBasicMaterial color="#FFD46A" transparent opacity={0.08} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.2, 0]} receiveShadow>
        <circleGeometry args={[15, 64]} />
        <meshStandardMaterial color="#F3ECE2" roughness={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.18, 0]}>
        <ringGeometry args={[3.6, 3.8, 64]} />
        <meshBasicMaterial color="#D9A520" />
      </mesh>
      <Sparkles count={120} scale={[8, 8, 8]} size={4} speed={0.3} color="#FFD54A" />
      <mesh position={[-6, 2, -8]}>
        <boxGeometry args={[0.6, 8, 0.6]} />
        <meshStandardMaterial color="#D8D2C5" />
      </mesh>
      <mesh position={[6, 2, -8]}>
        <boxGeometry args={[0.6, 8, 0.6]} />
        <meshStandardMaterial color="#D8D2C5" />
      </mesh>
      <mesh position={[0, 5, -8]}>
        <planeGeometry args={[14, 8]} />
        <meshStandardMaterial color="#2B180D" />
      </mesh>
    </>
  );
}

// Spinning voxel wireframe box loader
function ElysiqLoader() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 1.5;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 1.2;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1.2, 1.2, 1.2]} />
      <meshStandardMaterial color="#D4633A" wireframe />
    </mesh>
  );
}

export default function ElysiqStage({
  expression = 'NEUTRAL',
  appearance
}: {
  expression?: string;
  appearance?: CompanionAppearance;
}) {
  const bgId = appearance?.background || 'default';
  const bgColor = COSMETIC_BACKGROUNDS[bgId]?.value || '#F5F0E8';

  return (
    <div className="stage-container">
      <Canvas
        shadows="percentage"
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.5, 4.5], fov: 45 }}
        gl={{
          powerPreference: "high-performance",
          antialias: true,
          preserveDrawingBuffer: true, // Crucial for taking screenshots/canvas export!
          failIfMajorPerformanceCaveat: false
        }}
      >
        {/* Background */}
        <color attach="background" args={[bgId === 'default' ? '#F6F2EA' : bgColor]} />

        {/* New Default Lighting Setup */}
        {bgId === 'default' && (
          <>
            <ambientLight intensity={0.55} />
            <hemisphereLight intensity={0.6} args={["#ffffff", "#d7d2ca"]} />
            <directionalLight castShadow position={[4, 6, 5]} intensity={1.8} color="#fffdf8" shadow-mapSize={[1024, 1024]} shadow-bias={-0.00008} />
            <directionalLight position={[-5, 3, 4]} intensity={0.55} color="#edf2ff" />
            <directionalLight position={[0, 4, -5]} intensity={0.75} color="#fff7d5" />
            <spotLight castShadow position={[0, 8, 1]} intensity={12} angle={0.45} penumbra={1} distance={20} />
          </>
        )}

        {/* Fallback dimmed base lighting for other themes (except studio_neon which has its own) */}
        {bgId !== 'default' && bgId !== 'studio_neon' && (
          <>
            <ambientLight intensity={0.2} />
            <directionalLight castShadow position={[5, 8, 5]} intensity={0.5} shadow-mapSize={[512, 512]} shadow-bias={-0.0002} />
            <directionalLight position={[-5, 3, -2]} intensity={0.25} />
            <directionalLight position={[0, 5, -5]} intensity={0.4} color="#F5F0E8" />
          </>
        )}

        {/* Themed Custom Environment Lights */}
        {bgId === 'studio_neon' && (
          <>
            <color attach="background" args={["#181124"]} />

            <ambientLight intensity={0.35} />

            <hemisphereLight
              args={["#8fdcff", "#1d1326"]}
              intensity={0.5}
            />

            {/* Main Light */}
            <directionalLight
              position={[3, 5, 4]}
              intensity={2.8}
              color="#ffffff"
              castShadow
            />

            {/* Blue Fill */}
            <directionalLight
              position={[-4, 2, 3]}
              intensity={0.7}
              color="#87d8ff"
            />

            {/* Pink Rim */}
            <directionalLight
              position={[0, 3, -6]}
              intensity={1.2}
              color="#ff4fc3"
            />

            <spotLight
              position={[0, 6, 4]}
              angle={0.45}
              penumbra={0.8}
              intensity={20}
              castShadow
            />
          </>
        )}

        {bgId === 'cyberpunk' && (
          <>
            {/* Ambient */}
            <ambientLight intensity={0.18} />

            {/* Main White */}
            <directionalLight
              position={[4, 6, 4]}
              intensity={1.8}
              color="#ffffff"
              castShadow
            />

            {/* Cyan */}
            <directionalLight
              position={[6, 3, 1]}
              intensity={1.2}
              color="#00F5FF"
            />

            {/* Pink */}
            <directionalLight
              position={[-6, 3, -4]}
              intensity={1.2}
              color="#FF00D4"
            />

            {/* Rim */}
            <directionalLight
              position={[0, 3, -6]}
              intensity={0.8}
              color="#6E5BFF"
            />

            <fog attach="fog" args={['#0B1020', 8, 24]} />

            <Grid
              position={[0, -2.18, 0]}
              args={[40, 40]}
              cellSize={1}
              cellThickness={0.4}
              cellColor="#00F5FF"
              sectionSize={5}
              sectionThickness={1}
              sectionColor="#FF00D4"
              fadeDistance={40}
              fadeStrength={1.5}
              infiniteGrid
            />

            {/* Neon Walls */}
            <mesh position={[-7, 2, -6]}>
              <planeGeometry args={[0.2, 6]} />
              <meshBasicMaterial color="#FF00D4" />
            </mesh>
            <mesh position={[7, 2, -6]}>
              <planeGeometry args={[0.2, 6]} />
              <meshBasicMaterial color="#00F5FF" />
            </mesh>
            <mesh position={[0, 5, -6]}>
              <planeGeometry args={[8, 0.2]} />
              <meshBasicMaterial color="#FF00D4" />
            </mesh>

            <EffectComposer>
              <Bloom
                intensity={0.6}
                luminanceThreshold={0.3}
                mipmapBlur
              />
            </EffectComposer>
          </>
        )}

        {bgId === 'legendary' && <LegendaryEnvironment />}

        <Suspense fallback={<ElysiqLoader />}>
          {/* The character itself */}
          <ElysiqCharacter expression={expression} appearance={appearance} />

          {/* Concrete pedestal base */}
          <mesh position={[0, -1.35, 0]} receiveShadow>
            <cylinderGeometry args={[1.2, 1.3, 0.2, 16]} />
            <meshStandardMaterial
              color={bgId === 'default' ? '#D9D5CF' : '#2A2925'}
              roughness={0.7}
            />
          </mesh>

          {/* Pedestal column */}
          <mesh position={[0, -1.8, 0]} receiveShadow>
            <cylinderGeometry args={[1.0, 1.0, 0.8, 16]} />
            <meshStandardMaterial
              color={bgId === 'default' ? '#EDE8DE' : '#1F1E1B'}
              roughness={0.8}
            />
          </mesh>
        </Suspense>

        {/* Optimized ContactShadows */}
        <ContactShadows
          position={[0, -2.19, 0]}
          opacity={bgId === 'default' ? 0.5 : 0.8}
          scale={5}
          blur={2.2}
          far={2.5}
          resolution={128}
        />

        {/* Orbit controls with rotation boundaries */}
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={3.0}
          maxDistance={7.0}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.8}
          autoRotate={true}
          autoRotateSpeed={0.6}
          makeDefault
        />
      </Canvas>

      <style jsx>{`
        .stage-container {
          width: 100%;
          height: 100%;
          min-height: 400px;
          position: relative;
        }
      `}</style>
    </div>
  );
}
