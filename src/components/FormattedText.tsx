import React, { useMemo } from 'react';
import { formatText } from '../utils/textFormatter';

export interface FormattedTextProps {
  content: string;
}

/**
 * Main component for rendering formatted text
 * Optimized with memoization to prevent expensive regex operations on every render
 */
export const FormattedText = React.memo(function FormattedText({ content }: FormattedTextProps): React.ReactElement {
  // Memoize the expensive formatting operation based on content
  const formattedElements = useMemo(() => {
    return formatText(content);
  }, [content]);

  return (
    <div>
      {formattedElements.map((element, index) => (
        <React.Fragment key={index}>
          {element}
        </React.Fragment>
      ))}
    </div>
  );
});
