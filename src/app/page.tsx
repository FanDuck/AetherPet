'use client';

import dynamic from 'next/dynamic';
import PetHUD from '@/components/ui/PetHUD';
import SettingsModal from '@/components/ui/SettingsModal';

const PetStage = dynamic(() => import('@/components/canvas/PetStage'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-[#0d0818] text-white">
      <div className="w-12 h-12 rounded-full border-4 border-pink-500/30 border-t-pink-500 animate-spin mb-4" />
      <p className="text-sm text-white/70 tracking-wider">
        正在唤醒 3D AI 灵宠舞台...
      </p>
    </div>
  ),
});

export default function HomePage() {
  return (
    <main className="relative w-screen h-screen overflow-hidden">
      <PetStage />
      <PetHUD />
      <SettingsModal />
    </main>
  );
}
