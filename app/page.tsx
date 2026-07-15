import { WelcomePanel } from '@/components/welcome-panel';
import { SeedForm } from '@/components/seed-form';
import { ParticleField } from '@/components/particle-field';

export default function Home() {
  return (
    <div className="flex min-h-screen font-sans">
      {/* Left — Welcome panel */}
      <div className="hidden lg:flex lg:w-[25%]">
        <WelcomePanel />
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-stretch justify-center bg-gray-50 dark:bg-zinc-950 relative overflow-hidden">
        {/* Subtle animated particles on the form side */}
        <ParticleField />

        <div className="relative z-10 w-full mx-auto px-6 py-20 flex flex-col">
          <SeedForm />
        </div>
      </div>
    </div>
  );
}
