'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { usePetStore } from '@/store/usePetStore';
import { PET_THEME_PRESETS } from '@/lib/presets';
import { voiceEngine } from '@/lib/voiceEngine';

interface BurstParticle {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: string;
  scale: number;
  life: number;
}

export default function ProceduralPet() {
  const pet = usePetStore((s) => s.pet);
  const ttsConfig = usePetStore((s) => s.ttsConfig);
  const interactWithPet = usePetStore((s) => s.interactWithPet);
  const setMouthOpen = usePetStore((s) => s.setMouthOpen);
  const setSpeaking = usePetStore((s) => s.setSpeaking);

  const theme = useMemo(
    () => PET_THEME_PRESETS.find((t) => t.id === pet.themeId) || PET_THEME_PRESETS[0],
    [pet.themeId]
  );

  // Refs for smooth spring animation
  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const leftEarRef = useRef<THREE.Group>(null);
  const rightEarRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const tailRef = useRef<THREE.Group>(null);
  const leftEyeGroupRef = useRef<THREE.Group>(null);
  const rightEyeGroupRef = useRef<THREE.Group>(null);
  const mouthMeshRef = useRef<THREE.Mesh>(null);
  const haloRingRef = useRef<THREE.Mesh>(null);
  const soundWaveRingRef = useRef<THREE.Mesh>(null);

  // Spring physics states
  const squashVel = useRef(0);
  const squashOffset = useRef(0);
  const blinkTimer = useRef(0);
  const isBlinking = useRef(false);
  const spinAngle = useRef(0);

  // Burst particles on click
  const [bursts, setBursts] = useState<BurstParticle[]>([]);

  // Periodic natural eye blink
  useEffect(() => {
    const interval = setInterval(() => {
      isBlinking.current = true;
      setTimeout(() => {
        isBlinking.current = false;
      }, 150);
    }, 3400);
    return () => clearInterval(interval);
  }, []);

  const spawnBurst = (point: THREE.Vector3) => {
    const colors = [theme.primaryColor, theme.accentColor, '#ffd166', '#ffffff', '#ff70a6'];
    const newParticles: BurstParticle[] = Array.from({ length: 12 }).map((_, idx) => ({
      id: Date.now() + idx + Math.random(),
      position: point.clone(),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 3.5,
        Math.random() * 3.2 + 1.0,
        (Math.random() - 0.5) * 3.5
      ),
      color: colors[idx % colors.length],
      scale: 0.08 + Math.random() * 0.07,
      life: 1.0,
    }));
    setBursts((prev) => [...prev.slice(-24), ...newParticles]);
  };

  const handleTouchPart = (
    e: ThreeEvent<MouseEvent>,
    part: 'head' | 'cheek' | 'belly'
  ) => {
    e.stopPropagation();
    // Apply jelly impulse
    squashVel.current = part === 'head' ? -0.42 : 0.38;
    spawnBurst(e.point);

    const interactionType =
      part === 'head' ? 'pat' : part === 'cheek' ? 'poke' : 'play';
    const result = interactWithPet(interactionType);

    if (ttsConfig.enabled && ttsConfig.autoPlay) {
      voiceEngine.speak(result.reply, ttsConfig, {
        onMouthChange: setMouthOpen,
        onSpeakingChange: setSpeaking,
      });
    }
  };

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const dt = Math.min(delta, 0.05);

    // 1. Update Hooke's Law Jelly Squash & Stretch
    const stiffness = 180;
    const damping = 12;
    const force = -stiffness * squashOffset.current - damping * squashVel.current;
    squashVel.current += force * dt;
    squashOffset.current += squashVel.current * dt;

    // 2. Root Action Animations (idle, jump, spin, wave, nod, dance, shake)
    if (rootRef.current) {
      let targetY = Math.sin(t * 2.2) * 0.08;
      let targetRotZ = 0;
      let targetRotX = 0;

      if (pet.action === 'jump') {
        targetY = Math.abs(Math.sin(t * 7.5)) * 0.68;
      } else if (pet.action === 'dance') {
        targetY = Math.abs(Math.sin(t * 8.0)) * 0.35;
        targetRotZ = Math.sin(t * 4.0) * 0.18;
      } else if (pet.action === 'nod') {
        targetRotX = Math.sin(t * 9.0) * 0.22;
      } else if (pet.action === 'shake') {
        targetRotZ = Math.sin(t * 14.0) * 0.15;
      }

      if (pet.action === 'spin') {
        spinAngle.current += dt * 8.5;
      } else {
        // Smoothly return spinAngle to nearest multiple of 2*PI
        const remainder = spinAngle.current % (Math.PI * 2);
        if (Math.abs(remainder) > 0.02) {
          spinAngle.current = THREE.MathUtils.lerp(
            spinAngle.current,
            Math.round(spinAngle.current / (Math.PI * 2)) * Math.PI * 2,
            dt * 8
          );
        }
      }

      rootRef.current.position.y = THREE.MathUtils.lerp(
        rootRef.current.position.y,
        targetY,
        dt * 10
      );
      rootRef.current.rotation.z = THREE.MathUtils.lerp(
        rootRef.current.rotation.z,
        targetRotZ,
        dt * 10
      );
      rootRef.current.rotation.x = THREE.MathUtils.lerp(
        rootRef.current.rotation.x,
        targetRotX,
        dt * 10
      );
      rootRef.current.rotation.y = spinAngle.current;
    }

    // 3. Apply Jelly Squash & Speaking Pulse to Body
    if (bodyRef.current) {
      const speakBounce = pet.isSpeaking ? pet.mouthOpen * 0.06 : 0;
      const sY = 1 + squashOffset.current + speakBounce;
      const sXZ = 1 - squashOffset.current * 0.55 - speakBounce * 0.3;
      bodyRef.current.scale.set(sXZ, sY, sXZ);
    }

    // 4. Cursor / Pointer Look-At Tracking
    if (headGroupRef.current) {
      const pointerX = state.pointer.x;
      const pointerY = state.pointer.y;
      const curiousTilt = pet.emotion === 'curious' ? 0.18 : 0;

      headGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        headGroupRef.current.rotation.y,
        pointerX * 0.45,
        dt * 6
      );
      headGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        headGroupRef.current.rotation.x,
        -pointerY * 0.3,
        dt * 6
      );
      headGroupRef.current.rotation.z = THREE.MathUtils.lerp(
        headGroupRef.current.rotation.z,
        curiousTilt - pointerX * 0.08,
        dt * 6
      );
    }

    // 5. Ears Wiggle
    if (leftEarRef.current && rightEarRef.current) {
      const earWave = Math.sin(t * 3.5) * 0.08 + (pet.isSpeaking ? pet.mouthOpen * 0.18 : 0);
      leftEarRef.current.rotation.z = 0.28 + earWave;
      rightEarRef.current.rotation.z = -0.28 - earWave;
    }

    // 6. Arms Animation
    if (leftArmRef.current && rightArmRef.current) {
      if (pet.action === 'wave' || pet.action === 'dance') {
        rightArmRef.current.rotation.z = -0.9 + Math.sin(t * 10) * 0.45;
        leftArmRef.current.rotation.z =
          pet.action === 'dance' ? 0.9 - Math.sin(t * 10) * 0.45 : 0.45 + Math.sin(t * 3) * 0.1;
      } else {
        leftArmRef.current.rotation.z = THREE.MathUtils.lerp(
          leftArmRef.current.rotation.z,
          0.42 + Math.sin(t * 2.5) * 0.08,
          dt * 8
        );
        rightArmRef.current.rotation.z = THREE.MathUtils.lerp(
          rightArmRef.current.rotation.z,
          -0.42 - Math.sin(t * 2.5) * 0.08,
          dt * 8
        );
      }
    }

    // 7. Tail Wagging
    if (tailRef.current) {
      const wagSpeed = pet.emotion === 'excited' || pet.emotion === 'love' ? 8.5 : 3.2;
      tailRef.current.rotation.y = Math.sin(t * wagSpeed) * 0.38;
    }

    // 8. Eyes Blink & Emotion Expression
    if (leftEyeGroupRef.current && rightEyeGroupRef.current) {
      blinkTimer.current += dt;
      const sleepyFactor = pet.emotion === 'sleepy' ? 0.25 : 1.0;
      const happySquint = pet.emotion === 'love' || pet.emotion === 'shy' ? 0.65 : 1.0;
      const targetEyeScaleY = isBlinking.current ? 0.06 : sleepyFactor * happySquint;

      leftEyeGroupRef.current.scale.y = THREE.MathUtils.lerp(
        leftEyeGroupRef.current.scale.y,
        targetEyeScaleY,
        dt * 22
      );
      rightEyeGroupRef.current.scale.y = THREE.MathUtils.lerp(
        rightEyeGroupRef.current.scale.y,
        targetEyeScaleY,
        dt * 22
      );
    }

    // 9. Real-time Lip-Sync Mouth Driven by Audio Analyser (`pet.mouthOpen`)
    if (mouthMeshRef.current) {
      const openAmount = pet.isSpeaking
        ? Math.max(0.18, pet.mouthOpen * 1.45)
        : pet.emotion === 'excited' || pet.emotion === 'happy'
        ? 0.28
        : 0.12;
      const widthAmount = pet.isSpeaking
        ? 0.85 + pet.mouthOpen * 0.45
        : pet.emotion === 'sad'
        ? 0.65
        : 1.0;

      mouthMeshRef.current.scale.y = THREE.MathUtils.lerp(
        mouthMeshRef.current.scale.y,
        openAmount,
        dt * 25
      );
      mouthMeshRef.current.scale.x = THREE.MathUtils.lerp(
        mouthMeshRef.current.scale.x,
        widthAmount,
        dt * 20
      );
    }

    // 10. Halo & Sound Wave Ring Animation
    if (haloRingRef.current) {
      haloRingRef.current.rotation.z = t * 0.8;
      haloRingRef.current.position.y = 1.58 + Math.sin(t * 3.0) * 0.05;
    }
    if (soundWaveRingRef.current) {
      const activeScale = pet.isSpeaking ? 1.15 + pet.mouthOpen * 0.75 : 1.0;
      soundWaveRingRef.current.scale.lerp(
        new THREE.Vector3(activeScale, activeScale, 1),
        dt * 15
      );
    }

    // 11. Update Burst Particles
    setBursts((prev) =>
      prev
        .map((p) => ({
          ...p,
          position: p.position.clone().addScaledVector(p.velocity, dt),
          velocity: new THREE.Vector3(
            p.velocity.x,
            p.velocity.y - 5.5 * dt,
            p.velocity.z
          ),
          life: p.life - dt * 1.35,
        }))
        .filter((p) => p.life > 0)
    );
  });

  const species = pet.species;

  return (
    <group position={[0, -0.35, 0]}>
      {/* Main Animated Pet Group */}
      <group ref={rootRef}>
        <group ref={headGroupRef}>
          {/* Core Jelly Body (Click to Pat/Poke) */}
          <mesh
            ref={bodyRef}
            castShadow
            receiveShadow
            onClick={(e) => handleTouchPart(e, 'belly')}
            onPointerOver={() => {
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'auto';
            }}
          >
            <sphereGeometry args={[0.92, 64, 64]} />
            <meshPhysicalMaterial
              color={theme.primaryColor}
              roughness={0.22}
              metalness={species === 'cyberfox' ? 0.25 : 0.05}
              clearcoat={0.85}
              clearcoatRoughness={0.15}
              sheen={1}
              sheenColor={theme.secondaryColor}
            />
          </mesh>

          {/* Soft Belly Patch */}
          <mesh
            position={[0, -0.18, 0.75]}
            scale={[0.58, 0.52, 0.28]}
            onClick={(e) => handleTouchPart(e, 'belly')}
          >
            <sphereGeometry args={[0.85, 32, 32]} />
            <meshStandardMaterial
              color={theme.secondaryColor}
              roughness={0.4}
            />
          </mesh>

          {/* Top Invisible Head Pat Sensor + Crown Tuft */}
          <mesh
            position={[0, 0.88, 0]}
            onClick={(e) => handleTouchPart(e, 'head')}
          >
            <sphereGeometry args={[0.22, 24, 24]} />
            <meshStandardMaterial
              color={theme.accentColor}
              emissive={theme.emissiveColor}
              emissiveIntensity={0.35}
              roughness={0.2}
            />
          </mesh>

          {/* Floating Energy Halo Above Head */}
          <mesh
            ref={haloRingRef}
            position={[0, 1.55, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[0.38, 0.032, 16, 64]} />
            <meshStandardMaterial
              color={theme.accentColor}
              emissive={theme.emissiveColor}
              emissiveIntensity={pet.isThinking ? 2.4 : 1.1}
            />
          </mesh>

          {/* Left Ear (Morphs by Species: Mochi Bunny / CyberFox / AstraCat) */}
          <group ref={leftEarRef} position={[-0.52, 0.78, 0]}>
            {species === 'mochi' && (
              <mesh
                position={[0, 0.28, 0]}
                castShadow
                onClick={(e) => handleTouchPart(e, 'head')}
              >
                <capsuleGeometry args={[0.16, 0.42, 16, 32]} />
                <meshPhysicalMaterial
                  color={theme.primaryColor}
                  clearcoat={0.6}
                  roughness={0.25}
                />
              </mesh>
            )}
            {species === 'cyberfox' && (
              <mesh
                position={[0, 0.28, 0]}
                castShadow
                onClick={(e) => handleTouchPart(e, 'head')}
              >
                <coneGeometry args={[0.26, 0.68, 32]} />
                <meshPhysicalMaterial
                  color={theme.primaryColor}
                  emissive={theme.emissiveColor}
                  emissiveIntensity={0.35}
                  metalness={0.35}
                  roughness={0.2}
                />
              </mesh>
            )}
            {species === 'astracat' && (
              <mesh
                position={[0, 0.2, 0]}
                castShadow
                onClick={(e) => handleTouchPart(e, 'head')}
              >
                <coneGeometry args={[0.28, 0.45, 4]} />
                <meshPhysicalMaterial
                  color={theme.primaryColor}
                  clearcoat={0.8}
                  roughness={0.2}
                />
              </mesh>
            )}
            {/* Inner Ear Glow */}
            <mesh position={[0, 0.24, 0.1]}>
              <sphereGeometry args={[0.11, 16, 16]} />
              <meshStandardMaterial
                color={theme.cheekColor}
                emissive={theme.cheekColor}
                emissiveIntensity={0.4}
              />
            </mesh>
          </group>

          {/* Right Ear */}
          <group ref={rightEarRef} position={[0.52, 0.78, 0]}>
            {species === 'mochi' && (
              <mesh
                position={[0, 0.28, 0]}
                castShadow
                onClick={(e) => handleTouchPart(e, 'head')}
              >
                <capsuleGeometry args={[0.16, 0.42, 16, 32]} />
                <meshPhysicalMaterial
                  color={theme.primaryColor}
                  clearcoat={0.6}
                  roughness={0.25}
                />
              </mesh>
            )}
            {species === 'cyberfox' && (
              <mesh
                position={[0, 0.28, 0]}
                castShadow
                onClick={(e) => handleTouchPart(e, 'head')}
              >
                <coneGeometry args={[0.26, 0.68, 32]} />
                <meshPhysicalMaterial
                  color={theme.primaryColor}
                  emissive={theme.emissiveColor}
                  emissiveIntensity={0.35}
                  metalness={0.35}
                  roughness={0.2}
                />
              </mesh>
            )}
            {species === 'astracat' && (
              <mesh
                position={[0, 0.2, 0]}
                castShadow
                onClick={(e) => handleTouchPart(e, 'head')}
              >
                <coneGeometry args={[0.28, 0.45, 4]} />
                <meshPhysicalMaterial
                  color={theme.primaryColor}
                  clearcoat={0.8}
                  roughness={0.2}
                />
              </mesh>
            )}
            <mesh position={[0, 0.24, 0.1]}>
              <sphereGeometry args={[0.11, 16, 16]} />
              <meshStandardMaterial
                color={theme.cheekColor}
                emissive={theme.cheekColor}
                emissiveIntensity={0.4}
              />
            </mesh>
          </group>

          {/* Left Eye with Dual Anime Highlights */}
          <group ref={leftEyeGroupRef} position={[-0.31, 0.18, 0.83]}>
            <mesh>
              <sphereGeometry args={[0.135, 32, 32]} />
              <meshStandardMaterial
                color={theme.eyeColor}
                roughness={0.1}
                metalness={0.2}
              />
            </mesh>
            {/* Big Catchlight */}
            <mesh position={[-0.04, 0.045, 0.115]}>
              <sphereGeometry args={[0.042, 16, 16]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            {/* Secondary Sparkle */}
            <mesh position={[0.045, -0.035, 0.118]}>
              <sphereGeometry args={[0.02, 16, 16]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            {/* Star/Heart Pupil Glow when Excited or Love */}
            {(pet.emotion === 'excited' || pet.emotion === 'love') && (
              <mesh position={[0, 0, 0.125]}>
                <octahedronGeometry args={[0.045, 0]} />
                <meshBasicMaterial
                  color={pet.emotion === 'love' ? '#ff4d8d' : '#ffd166'}
                />
              </mesh>
            )}
          </group>

          {/* Right Eye with Dual Anime Highlights */}
          <group ref={rightEyeGroupRef} position={[0.31, 0.18, 0.83]}>
            <mesh>
              <sphereGeometry args={[0.135, 32, 32]} />
              <meshStandardMaterial
                color={theme.eyeColor}
                roughness={0.1}
                metalness={0.2}
              />
            </mesh>
            <mesh position={[-0.04, 0.045, 0.115]}>
              <sphereGeometry args={[0.042, 16, 16]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0.045, -0.035, 0.118]}>
              <sphereGeometry args={[0.02, 16, 16]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            {(pet.emotion === 'excited' || pet.emotion === 'love') && (
              <mesh position={[0, 0, 0.125]}>
                <octahedronGeometry args={[0.045, 0]} />
                <meshBasicMaterial
                  color={pet.emotion === 'love' ? '#ff4d8d' : '#ffd166'}
                />
              </mesh>
            )}
          </group>

          {/* Glowing Blush Cheeks (Click to Poke) */}
          <mesh
            position={[-0.48, 0.02, 0.77]}
            scale={[1.2, 0.75, 0.5]}
            onClick={(e) => handleTouchPart(e, 'cheek')}
          >
            <sphereGeometry args={[0.11, 24, 24]} />
            <meshStandardMaterial
              color={theme.cheekColor}
              emissive={theme.cheekColor}
              emissiveIntensity={
                pet.emotion === 'shy' || pet.emotion === 'love' ? 1.1 : 0.45
              }
              transparent
              opacity={0.85}
            />
          </mesh>
          <mesh
            position={[0.48, 0.02, 0.77]}
            scale={[1.2, 0.75, 0.5]}
            onClick={(e) => handleTouchPart(e, 'cheek')}
          >
            <sphereGeometry args={[0.11, 24, 24]} />
            <meshStandardMaterial
              color={theme.cheekColor}
              emissive={theme.cheekColor}
              emissiveIntensity={
                pet.emotion === 'shy' || pet.emotion === 'love' ? 1.1 : 0.45
              }
              transparent
              opacity={0.85}
            />
          </mesh>

          {/* Real-time Lip-Synced Mouth */}
          <mesh
            ref={mouthMeshRef}
            position={[0, -0.05, 0.89]}
            scale={[1, 0.2, 0.5]}
          >
            <sphereGeometry args={[0.11, 24, 24]} />
            <meshStandardMaterial
              color="#d9386a"
              emissive="#ff477e"
              emissiveIntensity={pet.isSpeaking ? 0.7 : 0.2}
              roughness={0.3}
            />
          </mesh>

          {/* Cute Paws / Arms */}
          <mesh
            ref={leftArmRef}
            position={[-0.86, -0.1, 0.25]}
            rotation={[0, 0, 0.42]}
            castShadow
          >
            <capsuleGeometry args={[0.13, 0.28, 16, 24]} />
            <meshPhysicalMaterial
              color={theme.primaryColor}
              clearcoat={0.7}
              roughness={0.25}
            />
          </mesh>
          <mesh
            ref={rightArmRef}
            position={[0.86, -0.1, 0.25]}
            rotation={[0, 0, -0.42]}
            castShadow
          >
            <capsuleGeometry args={[0.13, 0.28, 16, 24]} />
            <meshPhysicalMaterial
              color={theme.primaryColor}
              clearcoat={0.7}
              roughness={0.25}
            />
          </mesh>

          {/* Cute Feet */}
          <mesh position={[-0.38, -0.84, 0.22]} scale={[1.1, 0.65, 1.35]} castShadow>
            <sphereGeometry args={[0.18, 24, 24]} />
            <meshPhysicalMaterial color={theme.primaryColor} roughness={0.3} />
          </mesh>
          <mesh position={[0.38, -0.84, 0.22]} scale={[1.1, 0.65, 1.35]} castShadow>
            <sphereGeometry args={[0.18, 24, 24]} />
            <meshPhysicalMaterial color={theme.primaryColor} roughness={0.3} />
          </mesh>

          {/* Wagging Tail */}
          <group ref={tailRef} position={[0, -0.35, -0.82]}>
            <mesh position={[0, 0.1, -0.18]} rotation={[-0.6, 0, 0]}>
              <capsuleGeometry
                args={[
                  species === 'cyberfox' ? 0.18 : 0.14,
                  species === 'mochi' ? 0.12 : 0.42,
                  16,
                  24,
                ]}
              />
              <meshPhysicalMaterial
                color={theme.accentColor}
                emissive={theme.emissiveColor}
                emissiveIntensity={0.3}
              />
            </mesh>
          </group>
        </group>
      </group>

      {/* Reactive Acoustic Sound-Wave Floor Ring */}
      <mesh
        ref={soundWaveRingRef}
        position={[0, -0.95, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[1.05, 1.16, 64]} />
        <meshBasicMaterial
          color={pet.isSpeaking ? theme.accentColor : theme.primaryColor}
          transparent
          opacity={pet.isSpeaking ? 0.75 : 0.22}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Interactive Click Burst Particles */}
      {bursts.map((b) => (
        <mesh
          key={b.id}
          position={b.position}
          scale={b.scale * Math.max(0.1, b.life)}
        >
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial
            color={b.color}
            transparent
            opacity={Math.max(0, b.life)}
          />
        </mesh>
      ))}
    </group>
  );
}
