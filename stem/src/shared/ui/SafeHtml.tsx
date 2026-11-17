import { useMemo } from 'react';
import { cn } from '@/shared/lib/cn';
import { sanitizeHtml } from '@/shared/lib/sanitize';

/** Єдине місце в застосунку, де використовується dangerouslySetInnerHTML. */
export function SafeHtml({ html, className }: { html: string; className?: string }) {
  const clean = useMemo(() => sanitizeHtml(html), [html]);
  return (
    <div
      className={cn(
        'text-sm text-ink-2 [&_a]:text-accent-text [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
