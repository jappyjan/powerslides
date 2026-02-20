import { Link } from 'react-router-dom';
import { Text } from '@jappyjan/even-realities-ui';

type BreadcrumbItem = {
  label: string;
  to?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-8">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-[var(--docs-muted)]">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden className="text-slate-300">›</span>}
            {item.to ? (
              <Link
                to={item.to}
                className="hover:text-[var(--docs-primary)] transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <Text variant="detail" as="span" className="text-slate-700 font-medium">
                {item.label}
              </Text>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
