'use client';

import Image from 'next/image';
import { AnimatedBackground } from './animated-background';
import {
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  SparklesIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import { discoveryLandingConfig, type LandingConfig, type LandingStepIcon } from '@/lib/landing';

const stepIcons: Record<LandingStepIcon, typeof DocumentTextIcon> = {
  document: DocumentTextIcon,
  sparkles: SparklesIcon,
  chat: ChatBubbleLeftRightIcon,
  check: CheckBadgeIcon,
};

export function WelcomePanel({ config = discoveryLandingConfig }: { config?: LandingConfig }) {
  return (
    <div className="relative flex flex-col justify-center min-h-screen overflow-hidden bg-zinc-950">
      <AnimatedBackground />

      <div className="relative z-10 flex flex-col justify-center h-full px-10 py-16 backdrop-blur-3xl bg-zinc-950/50">
        <div className="flex flex-col mx-auto gap-10">
          <div className="flex flex-col gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Image
                src="/appato-logo.png"
                alt="Appato Logo"
                className="w-7 h-7 invert"
                width={28}
                height={28}
              />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-blue-400 uppercase tracking-widest">
                Appato
              </p>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                {config.agentTitle}
              </h1>
            </div>

            <p className="text-base leading-relaxed text-zinc-400">
              {config.intro}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
              How it works
            </p>

            <div className="flex flex-col gap-4">
              {config.steps.map((step, index) => (
                <Step
                  key={step.title}
                  icon={stepIcons[step.icon]}
                  index={index + 1}
                  title={step.title}
                  description={step.description}
                  totalSteps={config.steps.length}
                />
              ))}
            </div>
          </div>

          <p className="text-xs text-zinc-600">
            No sign-up required. Sessions are private and expire automatically.
          </p>
        </div>
      </div>
    </div>
  );
}

function Step({
  icon: Icon,
  index,
  title,
  description,
  totalSteps,
}: {
  icon: typeof DocumentTextIcon;
  index: number;
  title: string;
  description: string;
  totalSteps: number;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          <span className="text-blue-400 w-4 h-4">
            <Icon aria-hidden="true" />
          </span>
        </div>
        {index < totalSteps && (
          <div className="w-px flex-1 bg-gradient-to-b from-white/10 to-transparent" />
        )}
      </div>
      <div className="flex flex-col gap-1 pb-6">
        <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
        <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
