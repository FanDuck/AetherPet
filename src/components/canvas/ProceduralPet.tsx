'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
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
  isBubble?: boolean;
}

export default function ProceduralPet() {
  const pet = usePetStore((s) => s.pet);
  const ttsConfig = usePetStore((s) => s.ttsConfig);
  const interactWithPet = usePetStore((s) => s.interactWithPet);
  const setMouthOpen = usePetStore((s) => s.setMouthOpen);
  const setSpeaking = usePetStore((s) => s.setSpeaking);
  const setDragging = usePetStore((s) => s.setDragging);
  const setContextMenu = usePetStore((s) => s.setContextMenu);
  const triggerAction = usePetStore((s) => s.triggerAction);

  const { viewport } = useThree();

  const theme = useMemo(
    () => PET_THEME_PRESETS.find((t) => t.id === pet.themeId) || PET_THEME_PRESETS[0],
    [pet.themeId]
  );

  // Refs for smooth spring animation
  const wanderGroupRef = useRef<THREE.Group>(null);
  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const ahogeRef = useRef<THREE.Group>(null);
  const leftEarRef = useRef<THREE.Group>(null);
  const rightEarRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const tailRef = useRef<THREE.Group>(null);
  const leftEyeGroupRef = useRef<THREE.Group>(null);
  const rightEyeGroupRef = useRef<THREE.Group>(null);
  const leftBrowRef = useRef<THREE.Mesh>(null);
  const rightBrowRef = useRef<THREE.Mesh>(null);
  const mouthMeshRef = useRef<THREE.Mesh>(null);
  const haloRingRef = useRef<THREE.Mesh>(null);
  const soundWaveRingRef = useRef<THREE.Mesh>(null);
  const rubiksCubeRef = useRef<THREE.Group>(null);
  const fishSnackRef = useRef<THREE.Group>(null);
  const sleepBubbleRef = useRef<THREE.Mesh>(null);

  // Physics & Dragging states
  const squashVel = useRef(0);
  const squashOffset = useRef(0);
  const isBlinking = useRef(false);
  const spinAngle = useRef(0);

  // Dragging & Roaming position/velocity
  const posRef = useRef(new THREE.Vector3(0, 0, 0));
  const prevPosRef = useRef(new THREE.Vector3(0, 0, 0));
  const dragVelocityX = useRef(0);
  const pointerDownTime = useRef(0);
  const pointerDownPos = useRef({ x: 0, y: 0 });
  const isPointerHolding = useRef(false);
  const roamTargetX = useRef(0);
  const roamTimer = useRef(0);
  const bubbleSpawnTimer = useRef(0);

  // Particles & Floating Bubbles
  const [bursts, setBursts] = useState<BurstParticle[]>([]);

  // Periodic natural eye blink
  useEffect(() => {
    const interval = setInterval(() => {
      isBlinking.current = true;
      setTimeout(() => {
        isBlinking.current = false;
      }, 145);
    }, 3300);
    return () => clearInterval(interval);
  }, []);

  // Autonomous DaFeiYu Roaming / Idle Habits (Bubble / Cube / Wander)
  useEffect(() => {
    if (!pet.autoRoam) return;
    const habitTimer = setInterval(() => {
      const state = usePetStore.getState().pet;
      if (state.isDragging || state.isSpeaking || state.isThinking || state.action !== 'idle') {
        return;
      }
      const rand = Math.random();
      if (rand < 0.32) {
        // Pick a random horizontal target to waddle to
        roamTargetX.current = (Math.random() - 0.5) * 2.2;
        triggerAction('wander', 3400);
      } else if (rand < 0.52) {
        triggerAction('bubble', 3200);
      } else if (rand < 0.68) {
        triggerAction('cube', 3500);
      }
    }, 9500);
    return () => clearInterval(habitTimer);
  }, [pet.autoRoam, triggerAction]);

  // Global mouse-up listener to ensure dragging always releases cleanly
  useEffect(() => {
    const handleGlobalUp = () => {
      if (isPointerHolding.current) {
        isPointerHolding.current = false;
        if (usePetStore.getState().pet.isDragging) {
          setDragging(false);
          squashVel.current = -0.55; // Plop bounce on landing
          interactWithPet('drag_drop');
        }
      }
    };
    window.addEventListener('pointerup', handleGlobalUp);
    return () => window.removeEventListener('pointerup', handleGlobalUp);
  }, [setDragging, interactWithPet]);

  const spawnBurst = (point: THREE.Vector3, asBubbles = false) => {
    const colors = asBubbles
      ? ['#72efdd', '#56cfe1', '#a8dadc', '#ff9ebb', '#ffffff']
      : [theme.primaryColor, theme.accentColor, '#ffd166', '#ffffff', '#ff70a6'];

    const newParticles: BurstParticle[] = Array.from({ length: asBubbles ? 8 : 11 }).map(
      (_, idx) => ({
        id: Date.now() + idx + Math.random(),
        position: point.clone().add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.25,
            (Math.random() - 0.5) * 0.25,
            0.2
          )
        ),
        velocity: asBubbles
          ? new THREE.Vector3(
              (Math.random() - 0.5) * 1.1,
              Math.random() * 1.6 + 0.9,
              (Math.random() - 0.5) * 0.8
            )
          : new THREE.Vector3(
              (Math.random() - 0.5) * 3.4,
              Math.random() * 3.0 + 1.0,
              (Math.random() - 0.5) * 3.4
            ),
        color: colors[idx % colors.length],
        scale: asBubbles ? 0.09 + Math.random() * 0.08 : 0.07 + Math.random() * 0.06,
        life: 1.0,
        isBubble: asBubbles,
      })
    );
    setBursts((prev) => [...prev.slice(-28), ...newParticles]);
  };

  // Pointer Down: prepare for either a quick click or a "DaFeiYu Pick-Up Drag"
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button === 2) return; // Right-click is handled by onContextMenu
    e.stopPropagation();
    isPointerHolding.current = true;
    pointerDownTime.current = Date.now();
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isPointerHolding.current) return;
    const dx = e.clientX - pointerDownPos.current.x;
    const dy = e.clientY - pointerDownPos.current.y;
    const dist = Math.hypot(dx, dy);

    if (!pet.isDragging && dist > 9) {
      setDragging(true);
      interactWithPet('drag_start');
    }
  };

  const handlePointerUp = (
    e: ThreeEvent<PointerEvent>,
    part: 'head' | 'cheek' | 'belly' | 'tail'
  ) => {
    e.stopPropagation();
    const heldMs = Date.now() - pointerDownTime.current;
    const wasDragging = pet.isDragging;
    isPointerHolding.current = false;

    if (wasDragging) {
      setDragging(false);
      squashVel.current = -0.55;
      interactWithPet('drag_drop');
      return;
    }

    // Quick Click -> Part Interaction
    if (heldMs < 350) {
      squashVel.current = part === 'head' ? -0.45 : 0.42;
      spawnBurst(e.point, part === 'cheek');

      const gesture =
        part === 'head'
          ? 'pat'
          : part === 'cheek'
          ? 'bubble'
          : part === 'tail'
          ? 'play'
          : 'poke';

      const result = interactWithPet(gesture);
      if (ttsConfig.enabled && ttsConfig.autoPlay) {
        voiceEngine.speak(result.reply, ttsConfig, {
          onMouthChange: setMouthOpen,
          onSpeakingChange: setSpeaking,
        });
      }
    }
  };

  const handleContextMenu = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    e.nativeEvent.preventDefault();
    setContextMenu({
      open: true,
      x: e.nativeEvent.clientX,
      y: e.nativeEvent.clientY,
    });
  };

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const dt = Math.min(delta, 0.05);

    // 1. Update Dragging or Autonomous Waddling Position
    if (wanderGroupRef.current) {
      if (pet.isDragging) {
        const targetX = (state.pointer.x * viewport.width) / 2.2;
        const targetY = (state.pointer.y * viewport.height) / 2.4 + 0.35;
        posRef.current.x = THREE.MathUtils.lerp(posRef.current.x, targetX, dt * 16);
        posRef.current.y = THREE.MathUtils.lerp(posRef.current.y, targetY, dt * 16);
      } else {
        // Return Y smoothly to stage floor (0)
        posRef.current.y = THREE.MathUtils.lerp(posRef.current.y, 0, dt * 10);

        if (pet.action === 'wander' && pet.autoRoam) {
          posRef.current.x = THREE.MathUtils.lerp(
            posRef.current.x,
            roamTargetX.current,
            dt * 1.4
          );
          roamTimer.current += dt;
        } else {
          // Gently drift back toward center stage when chatting
          posRef.current.x = THREE.MathUtils.lerp(posRef.current.x, 0, dt * 2.2);
        }
      }

      // Compute horizontal velocity for inertial swing ("大肥鱼被拎起时的物理惯性摆动")
      const vx = (posRef.current.x - prevPosRef.current.x) / Math.max(dt, 0.008);
      dragVelocityX.current = THREE.MathUtils.lerp(dragVelocityX.current, vx, dt * 12);
      prevPosRef.current.copy(posRef.current);

      wanderGroupRef.current.position.copy(posRef.current);
      // Scale smoothly according to mouse wheel `pet.petScale`
      const currentScale = wanderGroupRef.current.scale.x;
      const nextScale = THREE.MathUtils.lerp(currentScale, pet.petScale || 1.0, dt * 10);
      wanderGroupRef.current.scale.setScalar(nextScale);
    }

    // 2. Continuously spawn floating bubbles when action === 'bubble'
    if (pet.action === 'bubble') {
      bubbleSpawnTimer.current += dt;
      if (bubbleSpawnTimer.current > 0.28) {
        bubbleSpawnTimer.current = 0;
        const mouthWorldPos = new THREE.Vector3(
          posRef.current.x,
          posRef.current.y - 0.25,
          0.95
        );
        spawnBurst(mouthWorldPos, true);
      }
    }

    // 3. Hooke's Law Jelly Squash & Stretch
    const stiffness = 185;
    const damping = 11.5;
    const force = -stiffness * squashOffset.current - damping * squashVel.current;
    squashVel.current += force * dt;
    squashOffset.current += squashVel.current * dt;

    // 4. Root Action & Inertial Tilt Animations
    if (rootRef.current) {
      let targetY = Math.sin(t * 2.3) * 0.075;
      let targetRotZ = 0;
      let targetRotX = 0;

      if (pet.isDragging) {
        // Dangling in the air with inertial pendulum tilt
        targetY = 0.15 + Math.sin(t * 14) * 0.04;
        targetRotZ = THREE.MathUtils.clamp(-dragVelocityX.current * 0.14, -0.55, 0.55);
      } else if (pet.action === 'jump') {
        targetY = Math.abs(Math.sin(t * 7.8)) * 0.68;
      } else if (pet.action === 'dance') {
        targetY = Math.abs(Math.sin(t * 8.2)) * 0.36;
        targetRotZ = Math.sin(t * 4.1) * 0.2;
      } else if (pet.action === 'wander') {
        // Cute waddling left-right step
        targetY = Math.abs(Math.sin(t * 6.5)) * 0.16;
        targetRotZ = Math.sin(t * 6.5) * 0.11;
      } else if (pet.action === 'nod' || pet.action === 'eat') {
        targetRotX = Math.sin(t * 9.5) * 0.18;
      } else if (pet.action === 'shake') {
        targetRotZ = Math.sin(t * 14.0) * 0.15;
      }

      if (pet.action === 'spin') {
        spinAngle.current += dt * 8.5;
      } else {
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

    // 5. Jelly Body Squash & Chubby Whale Proportions
    if (bodyRef.current) {
      const isWhale = pet.species === 'chubbywhale';
      const baseScaleX = isWhale ? 1.08 : 1.0;
      const baseScaleY = isWhale ? 0.95 : 1.0;
      const speakBounce = pet.isSpeaking ? pet.mouthOpen * 0.065 : 0;
      const dragStretch = pet.isDragging ? 0.12 : 0;

      const sY = baseScaleY + squashOffset.current + speakBounce + dragStretch;
      const sXZ = baseScaleX - squashOffset.current * 0.55 - speakBounce * 0.3 - dragStretch * 0.4;
      bodyRef.current.scale.set(sXZ, sY, sXZ);
    }

    // 6. Head Look-At Cursor Tracking
    if (headGroupRef.current) {
      const pointerX = state.pointer.x;
      const pointerY = state.pointer.y;
      const tilt =
        pet.emotion === 'curious'
          ? 0.18
          : pet.emotion === 'tsundere'
          ? -0.1
          : 0;

      headGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        headGroupRef.current.rotation.y,
        pointerX * 0.42,
        dt * 6
      );
      headGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        headGroupRef.current.rotation.x,
        -pointerY * 0.28,
        dt * 6
      );
      headGroupRef.current.rotation.z = THREE.MathUtils.lerp(
        headGroupRef.current.rotation.z,
        tilt - pointerX * 0.08,
        dt * 6
      );
    }

    // 7. Signature DaFeiYu Ahoge (头顶呆毛) Bounce
    if (ahogeRef.current) {
      const ahogeSpeed = pet.emotion === 'excited' || pet.emotion === 'tsundere' ? 8.5 : 3.8;
      ahogeRef.current.rotation.z = Math.sin(t * ahogeSpeed) * 0.26 - dragVelocityX.current * 0.08;
    }

    // 8. Ears / Side Fins Wiggle
    if (leftEarRef.current && rightEarRef.current) {
      const flapSpeed = pet.isDragging ? 18 : 3.8;
      const earWave =
        Math.sin(t * flapSpeed) * (pet.isDragging ? 0.32 : 0.09) +
        (pet.isSpeaking ? pet.mouthOpen * 0.18 : 0);
      leftEarRef.current.rotation.z = 0.28 + earWave;
      rightEarRef.current.rotation.z = -0.28 - earWave;
    }

    // 9. Arms / Flippers Animation (Wave / Dance / Cube / Eat / Dragged)
    if (leftArmRef.current && rightArmRef.current) {
      if (pet.isDragging) {
        // Flailing flippers when picked up
        leftArmRef.current.rotation.z = 0.85 + Math.sin(t * 20) * 0.35;
        rightArmRef.current.rotation.z = -0.85 - Math.sin(t * 20) * 0.35;
      } else if (pet.action === 'cube' || pet.action === 'eat') {
        // Holding Rubik's cube or dried fish in front of belly
        leftArmRef.current.rotation.z = -0.35 + Math.sin(t * 12) * 0.12;
        rightArmRef.current.rotation.z = 0.35 - Math.sin(t * 12) * 0.12;
      } else if (pet.action === 'wave' || pet.action === 'dance') {
        rightArmRef.current.rotation.z = -0.95 + Math.sin(t * 10) * 0.45;
        leftArmRef.current.rotation.z =
          pet.action === 'dance'
            ? 0.95 - Math.sin(t * 10) * 0.45
            : 0.45 + Math.sin(t * 3) * 0.1;
      } else {
        leftArmRef.current.rotation.z = THREE.MathUtils.lerp(
          leftArmRef.current.rotation.z,
          0.44 + Math.sin(t * 2.6) * 0.08,
          dt * 8
        );
        rightArmRef.current.rotation.z = THREE.MathUtils.lerp(
          rightArmRef.current.rotation.z,
          -0.44 - Math.sin(t * 2.6) * 0.08,
          dt * 8
        );
      }
    }

    // 10. Big Chubby Whale Tail Wagging
    if (tailRef.current) {
      const wagSpeed =
        pet.isDragging
          ? 16.0
          : pet.emotion === 'excited' || pet.emotion === 'love' || pet.emotion === 'tsundere'
          ? 8.5
          : 3.4;
      tailRef.current.rotation.y = Math.sin(t * wagSpeed) * 0.42;
      tailRef.current.rotation.x = Math.cos(t * (wagSpeed * 0.7)) * 0.16;
    }

    // 11. Eyes & Tsundere Eyebrows
    if (leftEyeGroupRef.current && rightEyeGroupRef.current) {
      const sleepyFactor = pet.emotion === 'sleepy' || pet.action === 'sleep' ? 0.12 : 1.0;
      const happySquint = pet.emotion === 'love' || pet.emotion === 'shy' ? 0.68 : 1.0;
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

    if (leftBrowRef.current && rightBrowRef.current) {
      // Tsundere angled eyebrows vs worried/happy brows
      const targetBrowAngle =
        pet.emotion === 'tsundere'
          ? -0.32
          : pet.emotion === 'sad'
          ? 0.28
          : pet.emotion === 'excited'
          ? -0.12
          : -0.05;
      leftBrowRef.current.rotation.z = THREE.MathUtils.lerp(
        leftBrowRef.current.rotation.z,
        targetBrowAngle,
        dt * 12
      );
      rightBrowRef.current.rotation.z = THREE.MathUtils.lerp(
        rightBrowRef.current.rotation.z,
        -targetBrowAngle,
        dt * 12
      );
    }

    // 12. Real-time Lip-Sync Mouth (`pet.mouthOpen`) + Eating / Bubble Purse
    if (mouthMeshRef.current) {
      const isChewing = pet.action === 'eat' ? Math.abs(Math.sin(t * 14)) * 0.75 : 0;
      const isBlowingBubble = pet.action === 'bubble' ? 0.52 : 0;

      const openAmount = pet.isSpeaking
        ? Math.max(0.18, pet.mouthOpen * 1.48)
        : isChewing > 0
        ? 0.2 + isChewing
        : isBlowingBubble > 0
        ? isBlowingBubble
        : pet.emotion === 'excited' || pet.emotion === 'happy'
        ? 0.28
        : 0.13;

      const widthAmount =
        pet.action === 'bubble'
          ? 0.55 // Round 'O' mouth when blowing bubbles
          : pet.isSpeaking
          ? 0.85 + pet.mouthOpen * 0.45
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

    // 13. Animated Props: 3D Rubik's Cube, Golden Dried Fish, Sleep Bubble
    if (rubiksCubeRef.current) {
      rubiksCubeRef.current.rotation.x = t * 5.5;
      rubiksCubeRef.current.rotation.y = t * 7.2;
      rubiksCubeRef.current.position.y = -0.05 + Math.sin(t * 8) * 0.08;
    }
    if (fishSnackRef.current) {
      fishSnackRef.current.rotation.z = Math.sin(t * 14) * 0.25;
      fishSnackRef.current.position.y = -0.08 + Math.abs(Math.sin(t * 12)) * 0.06;
    }
    if (sleepBubbleRef.current) {
      const s = 0.75 + Math.sin(t * 2.4) * 0.35;
      sleepBubbleRef.current.scale.setScalar(s);
    }

    // 14. Halo & Acoustic Sound Wave Ring
    if (haloRingRef.current) {
      haloRingRef.current.rotation.z = t * 0.85;
      haloRingRef.current.position.y = 1.62 + Math.sin(t * 3.0) * 0.05;
    }
    if (soundWaveRingRef.current) {
      const activeScale = pet.isSpeaking ? 1.18 + pet.mouthOpen * 0.75 : 1.0;
      soundWaveRingRef.current.scale.lerp(
        new THREE.Vector3(activeScale, activeScale, 1),
        dt * 15
      );
    }

    // 15. Update Burst & Floating Bubble Particles
    setBursts((prev) =>
      prev
        .map((p) => ({
          ...p,
          position: p.position.clone().addScaledVector(p.velocity, dt),
          velocity: p.isBubble
            ? new THREE.Vector3(
                p.velocity.x + Math.sin(t * 5 + p.id) * 0.4 * dt,
                p.velocity.y + 0.35 * dt, // Bubbles float upwards!
                p.velocity.z
              )
            : new THREE.Vector3(
                p.velocity.x,
                p.velocity.y - 5.5 * dt,
                p.velocity.z
              ),
          life: p.life - dt * (p.isBubble ? 0.55 : 1.35),
        }))
        .filter((p) => p.life > 0)
    );
  });

  const species = pet.species;

  return (
    <group position={[0, -0.35, 0]}>
      <group ref={wanderGroupRef}>
        {/* Main Animated Pet Group */}
        <group ref={rootRef}>
          <group
            ref={headGroupRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onContextMenu={handleContextMenu}
          >
            {/* Core Chubby Jelly Body */}
            <mesh
              ref={bodyRef}
              castShadow
              receiveShadow
              onPointerUp={(e) => handlePointerUp(e, 'belly')}
              onPointerOver={() => {
                document.body.style.cursor = pet.isDragging ? 'grabbing' : 'grab';
              }}
              onPointerOut={() => {
                document.body.style.cursor = 'auto';
              }}
            >
              <sphereGeometry args={[0.94, 64, 64]} />
              <meshPhysicalMaterial
                color={theme.primaryColor}
                roughness={0.2}
                metalness={species === 'cyberfox' ? 0.25 : 0.04}
                clearcoat={0.9}
                clearcoatRoughness={0.12}
                sheen={1}
                sheenColor={theme.secondaryColor}
              />
            </mesh>

            {/* DaFeiYu Soft White Belly with Cute Whale Striping */}
            <mesh
              position={[0, -0.15, 0.78]}
              scale={[0.64, 0.56, 0.28]}
              onPointerUp={(e) => handlePointerUp(e, 'belly')}
            >
              <sphereGeometry args={[0.88, 32, 32]} />
              <meshStandardMaterial color={theme.secondaryColor} roughness={0.35} />
            </mesh>

            {/* Signature DaFeiYu Maid Collar / Bowtie & Sailor Ribbon */}
            {species === 'chubbywhale' && (
              <group position={[0, -0.56, 0.78]}>
                {/* Frilly White Maid Headband on Crown */}
                <mesh position={[0, 1.38, -0.58]} rotation={[0.25, 0, 0]}>
                  <torusGeometry args={[0.52, 0.055, 16, 48, Math.PI]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.3} />
                </mesh>
                {/* Cute Red/Cyan Bowtie on Chest */}
                <mesh position={[-0.14, 0, 0.08]} rotation={[0, 0, 0.35]}>
                  <coneGeometry args={[0.11, 0.24, 16]} />
                  <meshStandardMaterial
                    color="#ff5c8a"
                    emissive="#ff477e"
                    emissiveIntensity={0.35}
                  />
                </mesh>
                <mesh position={[0.14, 0, 0.08]} rotation={[0, 0, -0.35]}>
                  <coneGeometry args={[0.11, 0.24, 16]} />
                  <meshStandardMaterial
                    color="#ff5c8a"
                    emissive="#ff477e"
                    emissiveIntensity={0.35}
                  />
                </mesh>
                <mesh position={[0, 0, 0.11]}>
                  <sphereGeometry args={[0.075, 16, 16]} />
                  <meshStandardMaterial color="#ffd166" metalness={0.3} roughness={0.2} />
                </mesh>
              </group>
            )}

            {/* Signature Bouncing Ahoge (头顶呆毛) + Pat Sensor */}
            <group
              ref={ahogeRef}
              position={[0, 0.9, 0.05]}
              onPointerUp={(e) => handlePointerUp(e, 'head')}
            >
              <mesh position={[0.06, 0.22, 0]} rotation={[0, 0, -0.38]}>
                <capsuleGeometry args={[0.055, 0.32, 12, 24]} />
                <meshPhysicalMaterial
                  color={theme.primaryColor}
                  emissive={theme.emissiveColor}
                  emissiveIntensity={0.25}
                  clearcoat={0.8}
                />
              </mesh>
              <mesh position={[0.18, 0.4, 0]}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshStandardMaterial
                  color={theme.accentColor}
                  emissive={theme.emissiveColor}
                  emissiveIntensity={0.6}
                />
              </mesh>
            </group>

            {/* Floating Energy Halo Above Head */}
            <mesh
              ref={haloRingRef}
              position={[0, 1.62, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <torusGeometry args={[0.36, 0.03, 16, 64]} />
              <meshStandardMaterial
                color={theme.accentColor}
                emissive={theme.emissiveColor}
                emissiveIntensity={pet.isThinking ? 2.5 : 1.1}
              />
            </mesh>

            {/* Left Ear / Whale Head Fin */}
            <group ref={leftEarRef} position={[-0.56, 0.68, 0]}>
              {species === 'chubbywhale' && (
                <mesh
                  position={[-0.12, 0.14, 0]}
                  rotation={[0, 0, 0.55]}
                  scale={[1.2, 0.65, 0.45]}
                  castShadow
                  onPointerUp={(e) => handlePointerUp(e, 'head')}
                >
                  <sphereGeometry args={[0.28, 24, 24]} />
                  <meshPhysicalMaterial
                    color={theme.primaryColor}
                    clearcoat={0.85}
                    roughness={0.2}
                  />
                </mesh>
              )}
              {species === 'mochi' && (
                <mesh
                  position={[0, 0.28, 0]}
                  castShadow
                  onPointerUp={(e) => handlePointerUp(e, 'head')}
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
                  onPointerUp={(e) => handlePointerUp(e, 'head')}
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
                  onPointerUp={(e) => handlePointerUp(e, 'head')}
                >
                  <coneGeometry args={[0.28, 0.45, 4]} />
                  <meshPhysicalMaterial
                    color={theme.primaryColor}
                    clearcoat={0.8}
                    roughness={0.2}
                  />
                </mesh>
              )}
            </group>

            {/* Right Ear / Whale Head Fin */}
            <group ref={rightEarRef} position={[0.56, 0.68, 0]}>
              {species === 'chubbywhale' && (
                <mesh
                  position={[0.12, 0.14, 0]}
                  rotation={[0, 0, -0.55]}
                  scale={[1.2, 0.65, 0.45]}
                  castShadow
                  onPointerUp={(e) => handlePointerUp(e, 'head')}
                >
                  <sphereGeometry args={[0.28, 24, 24]} />
                  <meshPhysicalMaterial
                    color={theme.primaryColor}
                    clearcoat={0.85}
                    roughness={0.2}
                  />
                </mesh>
              )}
              {species === 'mochi' && (
                <mesh
                  position={[0, 0.28, 0]}
                  castShadow
                  onPointerUp={(e) => handlePointerUp(e, 'head')}
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
                  onPointerUp={(e) => handlePointerUp(e, 'head')}
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
                  onPointerUp={(e) => handlePointerUp(e, 'head')}
                >
                  <coneGeometry args={[0.28, 0.45, 4]} />
                  <meshPhysicalMaterial
                    color={theme.primaryColor}
                    clearcoat={0.8}
                    roughness={0.2}
                  />
                </mesh>
              )}
            </group>

            {/* Expressive Tsundere / Dynamic Eyebrows */}
            <mesh
              ref={leftBrowRef}
              position={[-0.31, 0.37, 0.84]}
              rotation={[0, 0, -0.25]}
            >
              <capsuleGeometry args={[0.025, 0.16, 8, 16]} />
              <meshBasicMaterial color={theme.eyeColor} />
            </mesh>
            <mesh
              ref={rightBrowRef}
              position={[0.31, 0.37, 0.84]}
              rotation={[0, 0, 0.25]}
            >
              <capsuleGeometry args={[0.025, 0.16, 8, 16]} />
              <meshBasicMaterial color={theme.eyeColor} />
            </mesh>

            {/* Left Eye with Dual Anime Highlights */}
            <group ref={leftEyeGroupRef} position={[-0.31, 0.18, 0.85]}>
              <mesh>
                <sphereGeometry args={[0.138, 32, 32]} />
                <meshStandardMaterial
                  color={theme.eyeColor}
                  roughness={0.08}
                  metalness={0.2}
                />
              </mesh>
              <mesh position={[-0.042, 0.045, 0.118]}>
                <sphereGeometry args={[0.044, 16, 16]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              <mesh position={[0.045, -0.035, 0.12]}>
                <sphereGeometry args={[0.022, 16, 16]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>

            {/* Right Eye with Dual Anime Highlights */}
            <group ref={rightEyeGroupRef} position={[0.31, 0.18, 0.85]}>
              <mesh>
                <sphereGeometry args={[0.138, 32, 32]} />
                <meshStandardMaterial
                  color={theme.eyeColor}
                  roughness={0.08}
                  metalness={0.2}
                />
              </mesh>
              <mesh position={[-0.042, 0.045, 0.118]}>
                <sphereGeometry args={[0.044, 16, 16]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              <mesh position={[0.045, -0.035, 0.12]}>
                <sphereGeometry args={[0.022, 16, 16]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>

            {/* Glowing Blush Cheeks (Click to Blow Bubbles) */}
            <mesh
              position={[-0.49, 0.02, 0.79]}
              scale={[1.25, 0.75, 0.5]}
              onPointerUp={(e) => handlePointerUp(e, 'cheek')}
            >
              <sphereGeometry args={[0.115, 24, 24]} />
              <meshStandardMaterial
                color={theme.cheekColor}
                emissive={theme.cheekColor}
                emissiveIntensity={
                  pet.emotion === 'shy' || pet.emotion === 'tsundere' || pet.emotion === 'love'
                    ? 1.15
                    : 0.5
                }
                transparent
                opacity={0.85}
              />
            </mesh>
            <mesh
              position={[0.49, 0.02, 0.79]}
              scale={[1.25, 0.75, 0.5]}
              onPointerUp={(e) => handlePointerUp(e, 'cheek')}
            >
              <sphereGeometry args={[0.115, 24, 24]} />
              <meshStandardMaterial
                color={theme.cheekColor}
                emissive={theme.cheekColor}
                emissiveIntensity={
                  pet.emotion === 'shy' || pet.emotion === 'tsundere' || pet.emotion === 'love'
                    ? 1.15
                    : 0.5
                }
                transparent
                opacity={0.85}
              />
            </mesh>

            {/* Real-time Lip-Synced Mouth */}
            <mesh
              ref={mouthMeshRef}
              position={[0, -0.05, 0.91]}
              scale={[1, 0.2, 0.5]}
            >
              <sphereGeometry args={[0.115, 24, 24]} />
              <meshStandardMaterial
                color="#e63976"
                emissive="#ff477e"
                emissiveIntensity={pet.isSpeaking ? 0.75 : 0.25}
                roughness={0.3}
              />
            </mesh>

            {/* Sleep Snot Bubble when Sleepy (`action === 'sleep'`) */}
            {(pet.action === 'sleep' || pet.emotion === 'sleepy') && (
              <mesh ref={sleepBubbleRef} position={[0.16, 0.02, 0.98]}>
                <sphereGeometry args={[0.14, 24, 24]} />
                <meshPhysicalMaterial
                  color="#a8dadc"
                  transmission={0.85}
                  opacity={0.75}
                  transparent
                  roughness={0.05}
                  clearcoat={1}
                />
              </mesh>
            )}

            {/* 3D Holographic Rubik's Cube when `action === 'cube'` */}
            {pet.action === 'cube' && (
              <group ref={rubiksCubeRef} position={[0, -0.08, 1.18]}>
                <mesh castShadow>
                  <boxGeometry args={[0.34, 0.34, 0.34]} />
                  <meshStandardMaterial
                    color="#38bdf8"
                    emissive="#00d2ff"
                    emissiveIntensity={0.45}
                    metalness={0.4}
                    roughness={0.15}
                  />
                </mesh>
                <mesh>
                  <boxGeometry args={[0.355, 0.355, 0.355]} />
                  <meshBasicMaterial color="#ffffff" wireframe />
                </mesh>
              </group>
            )}

            {/* 3D Golden Dried Fish Snack when `action === 'eat'` */}
            {pet.action === 'eat' && (
              <group ref={fishSnackRef} position={[0, -0.1, 1.12]}>
                {/* Fish Body */}
                <mesh scale={[1.6, 0.85, 0.5]} castShadow>
                  <sphereGeometry args={[0.14, 24, 24]} />
                  <meshStandardMaterial
                    color="#ffb703"
                    emissive="#fb8500"
                    emissiveIntensity={0.35}
                    roughness={0.3}
                  />
                </mesh>
                {/* Fish Tail Fin */}
                <mesh position={[0.24, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <coneGeometry args={[0.11, 0.16, 3]} />
                  <meshStandardMaterial color="#fb8500" roughness={0.3} />
                </mesh>
              </group>
            )}

            {/* Cute Flippers / Arms */}
            <mesh
              ref={leftArmRef}
              position={[-0.88, -0.1, 0.25]}
              rotation={[0, 0, 0.44]}
              castShadow
            >
              <capsuleGeometry args={[0.135, 0.3, 16, 24]} />
              <meshPhysicalMaterial
                color={theme.primaryColor}
                clearcoat={0.75}
                roughness={0.22}
              />
            </mesh>
            <mesh
              ref={rightArmRef}
              position={[0.88, -0.1, 0.25]}
              rotation={[0, 0, -0.44]}
              castShadow
            >
              <capsuleGeometry args={[0.135, 0.3, 16, 24]} />
              <meshPhysicalMaterial
                color={theme.primaryColor}
                clearcoat={0.75}
                roughness={0.22}
              />
            </mesh>

            {/* Cute Chubby Feet */}
            <mesh
              position={[-0.38, -0.85, 0.22]}
              scale={[1.1, 0.65, 1.35]}
              castShadow
            >
              <sphereGeometry args={[0.18, 24, 24]} />
              <meshPhysicalMaterial color={theme.primaryColor} roughness={0.3} />
            </mesh>
            <mesh
              position={[0.38, -0.85, 0.22]}
              scale={[1.1, 0.65, 1.35]}
              castShadow
            >
              <sphereGeometry args={[0.18, 24, 24]} />
              <meshPhysicalMaterial color={theme.primaryColor} roughness={0.3} />
            </mesh>

            {/* Signature DaFeiYu Big Chubby Whale Tail + Tail Fin Flukes */}
            <group
              ref={tailRef}
              position={[0, -0.32, -0.82]}
              onPointerUp={(e) => handlePointerUp(e, 'tail')}
            >
              {species === 'chubbywhale' ? (
                <group>
                  {/* Plump Whale Tail Base */}
                  <mesh position={[0, 0.04, -0.26]} rotation={[-0.45, 0, 0]} castShadow>
                    <capsuleGeometry args={[0.24, 0.46, 16, 24]} />
                    <meshPhysicalMaterial
                      color={theme.primaryColor}
                      clearcoat={0.85}
                      roughness={0.2}
                    />
                  </mesh>
                  {/* Left Whale Tail Fluke */}
                  <mesh
                    position={[-0.22, 0.24, -0.58]}
                    rotation={[0.2, 0.35, 0.55]}
                    scale={[1.3, 0.5, 0.35]}
                    castShadow
                  >
                    <sphereGeometry args={[0.24, 24, 24]} />
                    <meshPhysicalMaterial
                      color={theme.accentColor}
                      emissive={theme.emissiveColor}
                      emissiveIntensity={0.3}
                    />
                  </mesh>
                  {/* Right Whale Tail Fluke */}
                  <mesh
                    position={[0.22, 0.24, -0.58]}
                    rotation={[0.2, -0.35, -0.55]}
                    scale={[1.3, 0.5, 0.35]}
                    castShadow
                  >
                    <sphereGeometry args={[0.24, 24, 24]} />
                    <meshPhysicalMaterial
                      color={theme.accentColor}
                      emissive={theme.emissiveColor}
                      emissiveIntensity={0.3}
                    />
                  </mesh>
                </group>
              ) : (
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
              )}
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
      </group>

      {/* Interactive Click Burst & Translucent Deep-Sea Bubbles */}
      {bursts.map((b) => (
        <mesh
          key={b.id}
          position={b.position}
          scale={b.scale * (b.isBubble ? 1.2 - b.life * 0.3 : Math.max(0.1, b.life))}
        >
          {b.isBubble ? (
            <>
              <sphereGeometry args={[1, 20, 20]} />
              <meshPhysicalMaterial
                color={b.color}
                transparent
                opacity={Math.min(0.78, b.life)}
                roughness={0.05}
                metalness={0.1}
                clearcoat={1}
              />
            </>
          ) : (
            <>
              <octahedronGeometry args={[1, 0]} />
              <meshBasicMaterial
                color={b.color}
                transparent
                opacity={Math.max(0, b.life)}
              />
            </>
          )}
        </mesh>
      ))}
    </group>
  );
}
