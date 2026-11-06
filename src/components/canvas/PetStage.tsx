'use client';

import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  ContactShadows,
  OrbitControls,
  Sparkles,
  Float,
} from '@react-three/drei';
import { usePetStore } from '@/store/usePetStore';
import { PET_THEME_PRESETS } from '@/lib/presets';
import ProceduralPet from './ProceduralPet';
import CustomModelPet from './CustomModelPet';

export default function PetStage() {
  const pet = usePetStore((s) => s.pet);
  const setPetScale = usePetStore((s) => s.setPetScale);
  const setContextMenu = usePetStore((s) => s.setContextMenu);

  const theme = useMemo(
    () => PET_THEME_PRESETS.find((t) => t.id === pet.themeId) || PET_THEME_PRESETS[0],
    [pet.themeId]
  );

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const delta = e.deltaY < 0 ? 0.06 : -0.06;
    setPetScale((pet.petScale || 1.0) + delta);
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none transition-colors duration-700"
      style={{ background: theme.bgGradient }}
      onWheel={handleWheel}
      onClick={() => setContextMenu({ open: false, x: 0, y: 0 })}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({ open: true, x: e.clientX, y: e.clientY });
      }}
    >
      {/* Ambient Radial Aura */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] rounded-full blur-[135px] opacity-30 transition-all duration-700"
        style={{ backgroundColor: theme.primaryColor }}
      />

      <Canvas
        shadows
        camera={{ position: [0, 0.35, 4.3], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Studio 3-Point Lighting */}
        <ambientLight intensity={0.88} />
        <directionalLight
          position={[4, 6, 4]}
          intensity={1.65}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight
          position={[-3.5, 2.5, -2.5]}
          intensity={1.45}
          color={theme.primaryColor}
        />
        <pointLight
          position={[3.0, -1.0, 2.5]}
          intensity={0.95}
          color={theme.accentColor}
        />

        {/* Floating Deep-Sea Starlight & Bubble Sparkles */}
        <Sparkles
          count={65}
          scale={[6.5, 4.8, 5]}
          size={pet.isSpeaking ? 3.5 : 2.2}
          speed={pet.isSpeaking ? 1.25 : 0.45}
          opacity={0.68}
          color={theme.accentColor}
        />

        {/* Floating Geometric Orbs in Background */}
        <Float speed={1.6} rotationIntensity={0.6} floatIntensity={0.8}>
          <mesh position={[-2.2, 1.15, -1.6]}>
            <octahedronGeometry args={[0.14, 0]} />
            <meshStandardMaterial
              color={theme.primaryColor}
              emissive={theme.emissiveColor}
              emissiveIntensity={0.8}
              wireframe
            />
          </mesh>
          <mesh position={[2.25, 0.85, -1.8]}>
            <icosahedronGeometry args={[0.16, 0]} />
            <meshStandardMaterial
              color={theme.accentColor}
              emissive={theme.accentColor}
              emissiveIntensity={0.7}
              wireframe
            />
          </mesh>
        </Float>

        {/* Main 3D Pet Character */}
        <Suspense fallback={null}>
          {pet.species === 'custom_model' && pet.customModelUrl ? (
            <CustomModelPet url={pet.customModelUrl} />
          ) : (
            <ProceduralPet />
          )}
        </Suspense>

        {/* Holographic Stage Pedestal */}
        <group position={[0, -1.32, 0]}>
          <mesh receiveShadow position={[0, -0.06, 0]}>
            <cylinderGeometry args={[1.65, 1.82, 0.12, 64]} />
            <meshStandardMaterial
              color="#0d1326"
              metalness={0.65}
              roughness={0.25}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <ringGeometry args={[1.52, 1.62, 64]} />
            <meshBasicMaterial
              color={theme.primaryColor}
              transparent
              opacity={0.55}
            />
          </mesh>
        </group>

        <ContactShadows
          position={[0, -1.3, 0]}
          opacity={0.55}
          scale={5.8}
          blur={2.2}
          far={3.5}
        />

        <OrbitControls
          enabled={!pet.isDragging}
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.85}
          target={[0, -0.15, 0]}
        />
      </Canvas>
    </div>
  );
}
