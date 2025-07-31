import React from 'react';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';

// Pre-compiled regex patterns for better performance
const IMPORTANT_PATTERN = /^(⚠️|💡|📝|🔥|✅|❌|🚨|💭)\s*(.+)/;
const BULLET_LIST_PATTERN = /^[\s]*[-•*]\s+(.+)/gm;
const NUMBERED_LIST_PATTERN = /^[\s]*\d+\.\s+(.+)/gm;
const COMBINED_INLINE_PATTERN = /((?:\*\*)?(?:Command|Cmd|Ctrl|Alt|Shift|Option)\s*(?:\(([⌘⌥⇧⌃])\))?\s*\+\s*\w+(?:\*\*)?)|(`[^`]+`)|(\*\*[^*]+\*\*)/gi;

// Cache for formatted results to improve performance
const formattedCache = new WeakMap<object, React.ReactNode[]>();
const cacheKey = Symbol('textFormatterCache');

/**
 * Intelligent text formatter that converts plain text to beautifully formatted JSX
 * using shadcn/ui components for consistent, readable output
 */
export function formatText(text: string): React.ReactNode[] {
  if (!text || typeof text !== 'string') {
    return [text];
  }

  // Fast path for plain text without formatting
  if (!text.includes('\n') && !text.match(/[*`]|(?:Command|Cmd|Ctrl|Alt|Shift|Option)|^[⚠💡📝🔥✅❌🚨💭]/u)) {
    return [text];
  }

  // Check cache for previously formatted content
  const textObj = { [cacheKey]: text };
  const cached = formattedCache.get(textObj);
  if (cached) {
    return cached;
  }

  const elements: React.ReactNode[] = [];
  let elementKey = 0;

  // Pre-process to group numbered lists that span multiple "paragraphs"
  const processedText = groupNumberedLists(text);
  
  // Split text by paragraphs for better structure
  const paragraphs = processedText.split(/\n\s*\n/);

  paragraphs.forEach((paragraph, paragraphIndex) => {
    if (paragraph.trim() === '') return;

    // Process each paragraph for formatting patterns
    const paragraphElements = formatParagraph(paragraph.trim(), elementKey);
    elements.push(...paragraphElements);
    elementKey += paragraphElements.length;

    // Add paragraph break (except for last paragraph)
    if (paragraphIndex < paragraphs.length - 1) {
      elements.push(<div key={`break-${elementKey++}`} className="h-2" />);
    }
  });

  const result = elements.length > 0 ? elements : [text];
  
  // Cache the result for future use
  formattedCache.set(textObj, result);
  
  return result;
}

/**
 * Groups numbered list items that are separated by blank lines
 * to prevent them from being split into separate <ol> elements
 */
function groupNumberedLists(text: string): string {
  // Replace single blank lines between numbered items with single newlines
  // This regex looks for patterns like "1. item\n\n2. item" and converts to "1. item\n2. item"
  return text.replace(/(\d+\.\s+.+)(\n\s*\n)(?=\d+\.\s+)/g, '$1\n');
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
      <Alert key={keyCounter++} variant="info" className="mb-2">
        <AlertDescription>
          <span className="mr-2">{emoji}</span>
          {formatInlineElements(content)}
        </AlertDescription>
      </Alert>,
    );
    return elements;
  }

  // Check if paragraph contains numbered list items
  const numberedMatches = paragraph.matchAll(NUMBERED_LIST_PATTERN);
  const numberedItems = [];
  for (const match of numberedMatches) {
    numberedItems.push(match);
  }
  
  if (numberedItems.length > 0) {
    const listItems = numberedItems.map((match, index) => (
      <li key={`numbered-${keyCounter + index}`} className="leading-relaxed">
        {formatInlineElements(match[1])}
      </li>
    ));
    elements.push(
      <ol key={keyCounter++} className="list-decimal list-outside mb-2 space-y-1 pl-6">
        {listItems}
      </ol>,
    );
    return elements;
  }

  // Check if paragraph contains bullet list items
  const bulletMatches = paragraph.matchAll(BULLET_LIST_PATTERN);
  const bulletItems = [];
  for (const match of bulletMatches) {
    bulletItems.push(match);
  }
  
  if (bulletItems.length > 0) {
    const listItems = bulletItems.map((match, index) => (
      <li key={`bullet-${keyCounter + index}`} className="leading-relaxed">
        {formatInlineElements(match[1])}
      </li>
    ));
    elements.push(
      <ul key={keyCounter++} className="list-disc list-outside mb-2 space-y-1 pl-6">
        {listItems}
      </ul>,
    );
    return elements;
  }

  // Process inline formatting for regular paragraphs
  const formattedContent = formatInlineElements(paragraph);
  
  // If content is just plain text, return it without wrapper
  if (formattedContent.length === 1 && typeof formattedContent[0] === 'string') {
    elements.push(
      <p key={keyCounter++} className="mb-2 leading-relaxed">
        {formattedContent[0]}
      </p>,
    );
  } else {
    elements.push(
      <div key={keyCounter++} className="mb-2 leading-relaxed">
        {formattedContent}
      </div>,
    );
  }

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
