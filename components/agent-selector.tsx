'use client';

import Link from 'next/link';
import { ArrowRightIcon, LightBulbIcon, SparklesIcon } from '@heroicons/react/24/outline';

export function AgentSelector() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white sm:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl flex-col justify-center">
        <div className="mb-12 max-w-2xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.25em] text-blue-400">Appato</p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Choose your AI guide</h1>
          <p className="mt-5 text-lg leading-relaxed text-zinc-400">
            Start with the guide that matches what you need to make clear: a product discovery brief or a shared definition of a business idea and its project.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2" aria-label="AI guide options">
          <Link
            href="/discovery"
            className="group rounded-2xl border border-white/10 bg-white/[0.04] p-7 transition hover:border-blue-400/60 hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
          >
            <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
              <SparklesIcon className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-semibold">Product Discovery Agent</h2>
            <p className="mt-3 min-h-20 text-base leading-relaxed text-zinc-400">
              Turn a product vision into a structured discovery brief covering product context, functional requirements, and aesthetics.
            </p>
            <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-blue-300">
              Start product discovery
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </Link>

          <Link
            href="/business-idea"
            className="group rounded-2xl border border-white/10 bg-white/[0.04] p-7 transition hover:border-emerald-400/60 hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
          >
            <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
              <LightBulbIcon className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-semibold">Business Idea Agent</h2>
            <p className="mt-3 min-h-20 text-base leading-relaxed text-zinc-400">
              Clarify your business, test the shape of an idea, and leave with a project definition.
            </p>
            <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300">
              Start with a business idea
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
