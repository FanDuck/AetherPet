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

  const theme = useMemo(
    () => PET_THEME_PRESETS.find((t) => t.id === pet.themeId) || PET_THEME_PRESETS[0],
    [pet.themeId]
  );

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none transition-colors duration-700"
      style={{ background: theme.bgGradient }}
    >
      {/* Ambient Radial Aura */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full blur-[130px] opacity-30 transition-all duration-700"
        style={{ backgroundColor: theme.primaryColor }}
      />

      <Canvas
        shadows
        camera={{ position: [0, 0.35, 4.2], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Studio 3-Point Lighting */}
        <ambientLight intensity={0.85} />
        <directionalLight
          position={[4, 6, 4]}
          intensity={1.65}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight
          position={[-3.5, 2.5, -2.5]}
          intensity={1.4}
          color={theme.primaryColor}
        />
        <pointLight
          position={[3.0, -1.0, 2.5]}
          intensity={0.9}
          color={theme.accentColor}
        />

        {/* Floating Starlight Particles */}
        <Sparkles
          count={55}
          scale={[6, 4.5, 5]}
          size={pet.isSpeaking ? 3.4 : 2.1}
          speed={pet.isSpeaking ? 1.2 : 0.45}
          opacity={0.65}
          color={theme.accentColor}
        />

        {/* Floating Geometric Orbs in Background */}
        <Float speed={1.6} rotationIntensity={0.6} floatIntensity={0.8}>
          <mesh position={[-2.1, 1.1, -1.6]}>
            <octahedronGeometry args={[0.14, 0]} />
            <meshStandardMaterial
              color={theme.primaryColor}
              emissive={theme.emissiveColor}
              emissiveIntensity={0.8}
              wireframe
            />
          </mesh>
          <mesh position={[2.2, 0.85, -1.8]}>
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
            <cylinderGeometry args={[1.45, 1.62, 0.12, 64]} />
            <meshStandardMaterial
              color="#151221"
              metalness={0.65}
              roughness={0.25}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <ringGeometry args={[1.32, 1.42, 64]} />
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
          scale={5.5}
          blur={2.2}
          far={3.5}
        />

        <OrbitControls
          enablePan={false}
          minDistance={2.5}
          maxDistance={6.5}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.85}
          target={[0, -0.15, 0]}
        />
      </Canvas>
    </div>
  );
}
