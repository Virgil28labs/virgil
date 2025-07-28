/**
 * Optimized imports for better tree shaking and bundle splitting
 * Import only what you need from large libraries
 */

// Lodash - use specific imports instead of full library
// Uncomment when lodash-es is installed:
// export { debounce } from 'lodash-es/debounce';
// export { throttle } from 'lodash-es/throttle';
// export { cloneDeep } from 'lodash-es/cloneDeep';
// export { isEqual } from 'lodash-es/isEqual';

// Date utilities - prefer date-fns over moment for smaller bundle
// Uncomment when date-fns is installed:
// export { format, parseISO, addDays, subDays } from 'date-fns';

// React hook utilities
// Uncomment when use-debounce is installed:
// export { useDebounce } from 'use-debounce';

/**
 * Re-export commonly used types to avoid multiple imports
 */
export type { FC, ReactElement, ReactNode, MouseEvent, ChangeEvent } from 'react';