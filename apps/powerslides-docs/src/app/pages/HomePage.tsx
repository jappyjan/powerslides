import { Link } from 'react-router-dom';
import { Text } from '@jappyjan/even-realities-ui';

export function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500/10 via-white to-cyan-500/5 p-12 sm:p-16 mb-16 border border-teal-100/50">
        <div className="relative z-10 text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
            PowerSlides
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-xl mx-auto leading-relaxed">
            Control Google Slides from your Even Realities G2. Present hands-free
            with speaker notes on your wrist.
          </p>
          <div className="pt-2">
            <Link to="/get-started">
              <span className="inline-block px-8 py-3 text-base font-semibold text-white bg-[var(--docs-primary)] hover:bg-[var(--docs-primary-hover)] rounded-lg shadow-lg shadow-teal-500/25 hover:shadow-teal-500/30 transition-all">
                Get Started
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Hero image - add hero-presentation.jpg to public/ (see IMAGE_PROMPTS.md) */}
      <section className="mb-16 rounded-2xl overflow-hidden border border-[var(--docs-border)] bg-white shadow-lg">
        <div className="aspect-video bg-gradient-to-br from-teal-50 via-slate-50 to-cyan-50 flex items-center justify-center relative">
          <img
            src="/hero-presentation.jpg"
            alt="Presenter using PowerSlides with smartwatch"
            className="w-full h-full object-cover absolute inset-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const fallback = (e.target as HTMLImageElement).nextElementSibling;
              if (fallback) fallback.classList.remove('hidden');
            }}
          />
          <div className="hidden flex flex-col items-center justify-center gap-4 text-slate-500 p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-teal-100/80 flex items-center justify-center">
              <span className="text-4xl">⌚</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Add hero-presentation.jpg for best experience</p>
              <p className="text-xs mt-1 text-slate-400">See IMAGE_PROMPTS.md for nano banana prompt</p>
            </div>
          </div>
        </div>
      </section>

      {/* Flow diagram */}
      <section className="mb-16">
        <Text variant="title-2" as="h2" className="mb-6 text-slate-800">
          How it connects
        </Text>
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-[var(--docs-border)] shadow-sm">
            <span className="text-2xl" aria-hidden>🔌</span>
            <span className="font-semibold text-slate-700">Chrome extension</span>
          </div>
          <span className="text-slate-300 text-xl font-light">↔</span>
          <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-[var(--docs-border)] shadow-sm">
            <span className="text-2xl" aria-hidden>⌚</span>
            <span className="font-semibold text-slate-700">Even Hub app</span>
          </div>
        </div>
      </section>

      {/* Quick links */}
      <section className="pt-8 border-t border-[var(--docs-border)]">
        <Text variant="detail" className="text-[var(--docs-muted)] mb-4">
          Quick links
        </Text>
        <div className="flex flex-wrap gap-6">
          <Link
            to="/extension"
            className="font-medium text-[var(--docs-primary)] hover:text-[var(--docs-primary-hover)] hover:underline transition-colors"
          >
            Install extension
          </Link>
          <Link
            to="/connecting"
            className="font-medium text-[var(--docs-primary)] hover:text-[var(--docs-primary-hover)] hover:underline transition-colors"
          >
            Connecting
          </Link>
          <Link
            to="/how-it-works"
            className="font-medium text-[var(--docs-primary)] hover:text-[var(--docs-primary-hover)] hover:underline transition-colors"
          >
            How it works
          </Link>
        </div>
      </section>
    </div>
  );
}
