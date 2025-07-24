import React, { useMemo } from 'react';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';

export interface FormattedTextProps {
  content: string;
}

// Pre-compiled regex patterns for better performance
const IMPORTANT_PATTERN = /^(⚠️|💡|📝|🔥|✅|❌|🚨|💭)\s*(.+)/;
const BULLET_LIST_PATTERN = /^[\s]*[-•*]\s+(.+)/gm;
const NUMBERED_LIST_PATTERN = /^[\s]*\d+\.\s+(.+)/gm;
const COMBINED_INLINE_PATTERN = /((?:\*\*)?(?:Command|Cmd|Ctrl|Alt|Shift|Option)\s*(?:\(([⌘⌥⇧⌃])\))?\s*\+\s*\w+(?:\*\*)?)|(`[^`]+`)|(\*\*[^*]+\*\*)/gi;

/**
 * Intelligent text formatter that converts plain text to beautifully formatted JSX
 * using shadcn/ui components for consistent, readable output
 */
export function formatText(text: string): React.ReactNode[] {
  if (!text || typeof text !== 'string') {
    return [text];
  }

  const elements: React.ReactNode[] = [];
  let elementKey = 0;

  // Split text by paragraphs for better structure
  const paragraphs = text.split(/\n\s*\n/);
  
  paragraphs.forEach((paragraph, paragraphIndex) => {
    if (paragraph.trim() === '') return;

    // Process each paragraph for formatting patterns
    const paragraphElements = formatParagraph(paragraph.trim(), elementKey);
    elements.push(...paragraphElements);
    elementKey += paragraphElements.length;

    // Add paragraph break (except for last paragraph)
    if (paragraphIndex < paragraphs.length - 1) {
      elements.push(<div key={`break-${elementKey++}`} className="h-3" />);
    }
  });

  return elements.length > 0 ? elements : [text];
}

function formatParagraph(paragraph: string, startKey: number): React.ReactNode[] {
  // Early return for empty paragraphs
  if (!paragraph || !paragraph.trim()) {
    return [];
  }

  const elements: React.ReactNode[] = [];
  let keyCounter = startKey;

  // Check if paragraph is important info
  const importantMatch = paragraph.match(IMPORTANT_PATTERN);
  if (importantMatch) {
    const [, emoji, content] = importantMatch;
    elements.push(
      <Alert key={keyCounter++} variant="info" className="my-2">
        <AlertDescription>
          <span className="mr-2">{emoji}</span>
          {formatInlineElements(content)}
        </AlertDescription>
      </Alert>,
    );
    return elements;
  }

  // Check if paragraph contains numbered list items
  const numberedMatches = Array.from(paragraph.matchAll(NUMBERED_LIST_PATTERN));
  if (numberedMatches.length > 0) {
    const listItems = numberedMatches.map((match, index) => (
      <li key={`numbered-${keyCounter + index}`} className="mb-2 leading-relaxed">
        {formatInlineElements(match[1])}
      </li>
    ));
    elements.push(
      <ol key={keyCounter++} className="list-decimal list-outside my-3 space-y-2 pl-6">
        {listItems}
      </ol>,
    );
    return elements;
  }

  // Check if paragraph contains bullet list items
  const bulletMatches = Array.from(paragraph.matchAll(BULLET_LIST_PATTERN));
  if (bulletMatches.length > 0) {
    const listItems = bulletMatches.map((match, index) => (
      <li key={`bullet-${keyCounter + index}`} className="mb-2 leading-relaxed">
        {formatInlineElements(match[1])}
      </li>
    ));
    elements.push(
      <ul key={keyCounter++} className="list-disc list-outside my-3 space-y-2 pl-6">
        {listItems}
      </ul>,
    );
    return elements;
  }

  // Process inline formatting for regular paragraphs
  const formattedContent = formatInlineElements(paragraph);
  elements.push(
    <div key={keyCounter++} className="leading-relaxed">
      {formattedContent}
    </div>,
  );

  return elements;
}

function formatInlineElements(text: string): React.ReactNode[] {
  // Early return for empty or simple text
  if (!text || typeof text !== 'string') {
    return [text];
  }

  // If text has no special formatting patterns, return as-is for performance
  if (!/[*`]|(?:Command|Cmd|Ctrl|Alt|Shift|Option)/.test(text)) {
    return [text];
  }

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let keyCounter = 0;

  // Reset the regex lastIndex to ensure it works correctly with global flag
  COMBINED_INLINE_PATTERN.lastIndex = 0;
  
  let match;
  while ((match = COMBINED_INLINE_PATTERN.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index);
      if (beforeText) {
        elements.push(beforeText);
      }
    }

    const fullMatch = match[0];
    
    // Keyboard shortcut
    if (match[1]) {
      const cleanShortcut = fullMatch.replace(/\*\*/g, '').trim();
      elements.push(
        <Badge key={keyCounter++} variant="keyboard" className="mx-1">
          {cleanShortcut}
        </Badge>,
      );
    }
    // Code snippet
    else if (match[3]) {
      const codeContent = fullMatch.slice(1, -1); // Remove backticks
      elements.push(
        <Badge key={keyCounter++} variant="outline" className="mx-1 font-mono text-xs">
          {codeContent}
        </Badge>,
      );
    }
    // Bold text
    else if (match[4]) {
      const boldContent = fullMatch.slice(2, -2); // Remove **
      elements.push(
        <strong key={keyCounter++} className="font-semibold">
          {boldContent}
        </strong>,
      );
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return elements.length > 0 ? elements : [text];
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
    <div className="space-y-2">
      {formattedElements.map((element, index) => (
        <React.Fragment key={index}>
          {element}
        </React.Fragment>
      ))}
    </div>
  );
});