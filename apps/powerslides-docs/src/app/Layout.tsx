import { Outlet, Link, useLocation } from 'react-router-dom';
import { Text } from '@jappyjan/even-realities-ui';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/get-started', label: 'Get Started' },
  { to: '/extension', label: 'Extension' },
  { to: '/connecting', label: 'Connecting' },
  { to: '/how-it-works', label: 'How It Works' },
] as const;

export function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--docs-bg)]">
      <header className="sticky top-0 z-10 border-b border-[var(--docs-border)] bg-white/90 backdrop-blur-md shadow-sm">
        <nav className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="text-xl font-semibold text-[var(--docs-primary)] hover:text-[var(--docs-primary-hover)] transition-colors"
          >
            PowerSlides
          </Link>
          <ul className="flex flex-wrap gap-6">
            {NAV_LINKS.map(({ to, label }) => (
              <li key={to}>
                <Link
                  to={to}
                  className={`text-sm font-medium transition-colors ${
                    location.pathname === to
                      ? 'text-[var(--docs-primary)]'
                      : 'text-[var(--docs-muted)] hover:text-slate-800'
                  }`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-6 py-12">
        <Outlet />
      </main>

      <footer className="border-t border-[var(--docs-border)] bg-white/50 py-6">
        <div className="mx-auto max-w-3xl px-6 flex items-center justify-between text-sm text-[var(--docs-muted)]">
          <span>PowerSlides · Docs</span>
          <a
            href="https://github.com/jappyjan/powerslides"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--docs-primary)] transition-colors font-medium"
          >
            GitHub →
          </a>
        </div>
      </footer>
    </div>
  );
}
