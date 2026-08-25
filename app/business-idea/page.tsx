import { WelcomePanel } from '@/components/welcome-panel';
import { SeedForm } from '@/components/seed-form';
import { ParticleField } from '@/components/particle-field';
import { businessIdeaLandingConfig } from '@/lib/landing';

export default function BusinessIdeaLandingPage() {
  return (
    <div className="flex min-h-screen font-sans">
      <div className="hidden lg:flex lg:w-[25%]">
        <WelcomePanel config={businessIdeaLandingConfig} />
      </div>

      <div className="flex-1 flex items-stretch justify-center bg-gray-50 dark:bg-zinc-950 relative overflow-hidden">
        <ParticleField />

        <div className="relative z-10 w-full mx-auto px-6 py-20 flex flex-col">
          <SeedForm config={businessIdeaLandingConfig} />
        </div>
      </div>
    </div>
  );
}
