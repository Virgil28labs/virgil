import React, { useMemo } from 'react';
import Markdown from 'markdown-to-jsx';
import { Badge } from './ui/badge';

export interface FormattedTextProps {
  content: string;
}

// Extract component functions to prevent recreation on each render
const CodeBadge = ({ children }: { children: React.ReactNode }) => (
  <Badge variant="outline" className="mx-1 font-mono text-xs">
    {children}
  </Badge>
);

const StrongText = ({ children }: { children: React.ReactNode }) => (
  <strong className="font-semibold">{children}</strong>
);

const KeyboardBadge = ({ children }: { children: React.ReactNode }) => (
  <Badge variant="keyboard" className="mx-1">
    {children}
  </Badge>
);

/**
 * Main component for rendering formatted text using markdown-to-jsx
 * Lightweight (6KB gzipped) with excellent performance and CommonMark compliance
 */
export const FormattedText = React.memo(function FormattedText({ content }: FormattedTextProps): React.ReactElement {
  // Memoize options to prevent recreation on each render
  const markdownOptions = useMemo(() => ({
    wrapper: React.Fragment,
    forceWrapper: true,
    overrides: {
      // Custom rendering for code elements to match existing style
      code: {
        component: CodeBadge,
      },
      // Custom rendering for strong/bold text
      strong: {
        component: StrongText,
      },
      // Custom rendering for lists to match existing styles
      ul: {
        props: {
          className: 'list-disc list-outside mb-2 space-y-1 pl-6',
        },
      },
      ol: {
        props: {
          className: 'list-decimal list-outside mb-2 space-y-1 pl-6',
        },
      },
      li: {
        props: {
          className: 'leading-relaxed',
        },
      },
      p: {
        props: {
          className: 'mb-2 leading-relaxed',
        },
      },
      // Handle keyboard shortcuts (e.g., Cmd+K)
      kbd: {
        component: KeyboardBadge,
      },
    },
  }), []);

  return (
    <Markdown options={markdownOptions}>
      {content}
    </Markdown>
  );
});