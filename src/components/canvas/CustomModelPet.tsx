'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRM } from '@pixiv/three-vrm';
import { usePetStore } from '@/store/usePetStore';
import { voiceEngine } from '@/lib/voiceEngine';

interface CustomModelPetProps {
  url: string;
}

export default function CustomModelPet({ url }: CustomModelPetProps) {
  const pet = usePetStore((s) => s.pet);
  const ttsConfig = usePetStore((s) => s.ttsConfig);
  const interactWithPet = usePetStore((s) => s.interactWithPet);
  const setMouthOpen = usePetStore((s) => s.setMouthOpen);
  const setSpeaking = usePetStore((s) => s.setSpeaking);

  const containerRef = useRef<THREE.Group>(null);
  const vrmRef = useRef<VRM | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const [sceneObj, setSceneObj] = useState<THREE.Object3D | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      url,
      (gltf) => {
        if (!isMounted) return;
        const vrm = gltf.userData.vrm as VRM | undefined;
        if (vrm) {
          vrmRef.current = vrm;
          vrm.scene.rotation.y = Math.PI;
          setSceneObj(vrm.scene);
        } else {
          vrmRef.current = null;
          // Auto-scale regular GLTF/GLB model to fit stage
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const scale = 2.0 / maxDim;
          gltf.scene.scale.setScalar(scale);
          const center = box.getCenter(new THREE.Vector3());
          gltf.scene.position.sub(center.multiplyScalar(scale));
          gltf.scene.position.y -= 0.4;

          if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(gltf.scene);
            const action = mixer.clipAction(gltf.animations[0]);
            action.play();
            mixerRef.current = mixer;
          }
          setSceneObj(gltf.scene);
        }
      },
      undefined,
      (err) => {
        console.error('Failed to load custom 3D model:', err);
      }
    );

    return () => {
      isMounted = false;
    };
  }, [url]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.getElapsedTime();

    if (mixerRef.current) {
      mixerRef.current.update(dt);
    }

    if (vrmRef.current) {
      const vrm = vrmRef.current;
      vrm.update(dt);

      // Drive VRM Lip-Sync Expression ('aa' / 'ih' / 'ou')
      if (vrm.expressionManager) {
        const mouthVal = pet.isSpeaking ? Math.min(1, pet.mouthOpen * 1.35) : 0;
        vrm.expressionManager.setValue('aa', mouthVal);
        vrm.expressionManager.setValue(
          'happy',
          pet.emotion === 'happy' || pet.emotion === 'love' ? 0.8 : 0
        );
        vrm.expressionManager.setValue(
          'relaxed',
          pet.emotion === 'sleepy' || pet.emotion === 'shy' ? 0.7 : 0
        );
        vrm.expressionManager.setValue(
          'sad',
          pet.emotion === 'sad' ? 0.8 : 0
        );
      }

      // Subtle breathing & head look-at on VRM humanoid head bone
      const headNode = vrm.humanoid?.getNormalizedBoneNode('head');
      if (headNode) {
        headNode.rotation.y = THREE.MathUtils.lerp(
          headNode.rotation.y,
          -state.pointer.x * 0.35,
          dt * 6
        );
        headNode.rotation.x = THREE.MathUtils.lerp(
          headNode.rotation.x,
          state.pointer.y * 0.2,
          dt * 6
        );
      }
    }

    if (containerRef.current) {
      const jumpY =
        pet.action === 'jump' || pet.action === 'dance'
          ? Math.abs(Math.sin(t * 7.5)) * 0.45
          : Math.sin(t * 2) * 0.04;
      containerRef.current.position.y = THREE.MathUtils.lerp(
        containerRef.current.position.y,
        -0.95 + jumpY,
        dt * 10
      );
      if (pet.action === 'spin') {
        containerRef.current.rotation.y += dt * 6.5;
      }
    }
  });

  const handleModelClick = () => {
    const res = interactWithPet('pat');
    if (ttsConfig.enabled && ttsConfig.autoPlay) {
      voiceEngine.speak(res.reply, ttsConfig, {
        onMouthChange: setMouthOpen,
        onSpeakingChange: setSpeaking,
      });
    }
  };

  return (
    <group ref={containerRef} position={[0, -0.95, 0]} onClick={handleModelClick}>
      {sceneObj && <primitive object={sceneObj} />}
    </group>
  );
}
