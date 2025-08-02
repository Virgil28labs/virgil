/**
 * Test Mock Type Definitions
 * 
 * Comprehensive TypeScript interfaces for test mocks to replace 'any' types
 * and provide proper type safety in test files.
 */

import type { MockedFunction } from 'jest-mock';
import { fn } from 'jest-mock';
import type React from 'react';

// ========== Authentication & Session Types ==========

export interface MockSession {
  access_token: string;
  refresh_token: string;
  user: { id: string; email?: string };
  expires_in: number;
  token_type: string;
  expires_at?: number;
}

export interface MockAuthResponse {
  data: { session: MockSession | null };
  error: null | { message: string };
}

export interface MockUser {
  id: string;
  email?: string;
  username?: string;
  created_at?: string;
}

// ========== API Response Types ==========

export interface MockApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  statusText?: string;
  json: MockedFunction<() => Promise<T>>;
  text?: MockedFunction<() => Promise<string>>;
}

export interface MockFetchResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
}

export interface MockErrorResponse {
  success: false;
  error: string;
  message: string;
  code?: string;
}

// ========== Service Mock Types ==========

export interface MockLogger {
  error: MockedFunction<(...args: unknown[]) => void>;
  warn: MockedFunction<(...args: unknown[]) => void>;
  info: MockedFunction<(...args: unknown[]) => void>;
  debug?: MockedFunction<(...args: unknown[]) => void>;
}

export interface MockTimeService {
  getTimestamp: MockedFunction<() => number>;
  getCurrentDateTime: MockedFunction<() => Date>;
  getLocalDate: MockedFunction<() => Date>;
  formatDateToLocal?: MockedFunction<(date: Date) => string>;
}

export interface MockSupabaseClient {
  auth: {
    getSession: MockedFunction<() => Promise<MockAuthResponse>>;
    signOut?: MockedFunction<() => Promise<{ error?: unknown }>>;
    signInWithPassword?: MockedFunction<(credentials: { email: string; password: string }) => Promise<{ data?: unknown; error?: unknown }>>;
  };
  from?: MockedFunction<(table: string) => {
    select: MockedFunction<(columns?: string) => Promise<{ data: unknown[]; error?: unknown }>>;
    insert: MockedFunction<(data: unknown) => Promise<{ data?: unknown; error?: unknown }>>;
    update: MockedFunction<(data: unknown) => Promise<{ data?: unknown; error?: unknown }>>;
    delete: MockedFunction<() => Promise<{ error?: unknown }>>;
  }>;
  storage?: {
    from: MockedFunction<(bucket: string) => {
      upload: MockedFunction<(path: string, file: File) => Promise<{ data?: unknown; error?: unknown }>>;
      download: MockedFunction<(path: string) => Promise<{ data?: Blob; error?: unknown }>>;
    }>;
  };
}

// ========== Browser/DOM Mock Types ==========

export interface MockWindow {
  innerWidth?: number;
  innerHeight?: number;
  localStorage?: Storage;
  sessionStorage?: Storage;
  location?: Partial<Location>;
  navigator?: Partial<Navigator>;
}

export interface MockDocument {
  createElement?: MockedFunction<(tagName: string) => HTMLElement>;
  getElementById?: MockedFunction<(id: string) => HTMLElement | null>;
  querySelector?: MockedFunction<(selector: string) => Element | null>;
}

export interface MockElement {
  click?: MockedFunction<() => void>;
  focus?: MockedFunction<() => void>;
  blur?: MockedFunction<() => void>;
  style?: Partial<CSSStyleDeclaration>;
  classList?: {
    add: MockedFunction<(className: string) => void>;
    remove: MockedFunction<(className: string) => void>;
    contains: MockedFunction<(className: string) => boolean>;
  };
}

// ========== Database/Storage Mock Types ==========

export interface MockIndexedDBRequest {
  result?: unknown;
  error?: Error | null;
  onsuccess?: ((event: Event) => void) | null;
  onerror?: ((event: Event) => void) | null;
  onupgradeneeded?: ((event: IDBVersionChangeEvent) => void) | null;
}

export interface MockIndexedDBTransaction {
  objectStore: MockedFunction<(name: string) => IDBObjectStore>;
  oncomplete?: ((event: Event) => void) | null;
  onerror?: ((event: Event) => void) | null;
}

export interface MockIndexedDBDatabase {
  transaction: MockedFunction<(storeNames: string[], mode?: string) => MockIndexedDBTransaction>;
  createObjectStore?: MockedFunction<(name: string, options?: IDBObjectStoreParameters) => IDBObjectStore>;
  deleteObjectStore?: MockedFunction<(name: string) => void>;
}

// ========== Vector/AI Service Mock Types ==========

export interface MockVectorSearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}

export interface MockVectorServicePrivate {
  consecutiveFailures: number;
  circuitBreakerOpenUntil: number;
  activeRequests: number;
  requestQueue: Array<{
    request: () => Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }>;
  lastRequestTime: number;
}

export interface MockAuthServicePrivate {
  sessionCache: {
    data: MockSession;
    timestamp: number;
  } | null;
  mapSupabaseError: (error: { message?: string }) => string;
  isCacheValid: () => boolean;
}

export interface MockDashboardAppServicePrivate {
  crossAppConcepts: Array<{
    name: string;
    keywords: string[];
    aggregationType: string;
  }>;
  isCrossAppQuery: (query: string) => boolean;
  getAggregatedData: () => Map<string, unknown[]>;
  listeners: Array<(data: unknown) => void>;
  cache: Map<string, {
    data: unknown;
    timestamp: number;
  }>;
}

export interface MockDashboardContextServicePrivate {
  mainTimer?: NodeJS.Timeout | number;
  activityLog: Array<{
    action: string;
    timestamp: number;
  }>;
  cleanupActivityLog: () => void;
}

export interface MockIntentInitializerPrivate {
  instance?: MockIntentInitializerPrivate;
  initialized: boolean;
  initializationPromise: Promise<void> | null;
  initializedIntents: Set<string>;
}

export interface MockAdapter {
  updateCallback?: () => void;
  [key: string]: unknown;
}

export interface MockGlobal {
  advanceTime?: (ms: number) => void;
  __mockIDBStores?: Record<string, unknown>;
  [key: string]: unknown;
}



export interface MockToastServicePrivate {
  listeners: Array<(toast: unknown) => void>;
}

export interface MockDogData {
  url: string;
  breed?: string;
  id: string;
}

export interface MockImageData {
  url: string;
  type?: string;
  [key: string]: unknown;
}

export interface MockAdapterPrivate {
  loadData: () => void;
  lastFetchTime?: number;
  [key: string]: unknown;
}

export interface MockIndexedDBServicePrivate {
  instance?: MockIndexedDBServicePrivate;
  databases: Map<string, IDBDatabase>;
  pendingConnections: Map<string, Promise<IDBDatabase>>;
}

export interface MockMemoryServicePrivate {
  instance?: MockMemoryServicePrivate;
  db?: IDBDatabase | null;
  database?: IDBDatabase;
  isInitialized?: boolean;
  storeVersion?: number;
}

export interface MockErrorHandlerServicePrivate {
  errorQueue: unknown[];
  errorCounts: Map<string, number>;
  lastErrorCleanup: number;
  stormThreshold: number;
}

export interface MockDBResult {
  data?: unknown;
  [key: string]: unknown;
}

export interface MockLLMResponse {
  content: string;
  usage?: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
  };
  model?: string;
  id?: string;
}

export interface MockLLMApiResponse {
  data: MockLLMResponse;
}

// ========== Utility Mock Types ==========

export interface MockEventEmitter {
  on: MockedFunction<(event: string, listener: (...args: unknown[]) => void) => void>;
  off: MockedFunction<(event: string, listener: (...args: unknown[]) => void) => void>;
  emit: MockedFunction<(event: string, ...args: unknown[]) => boolean>;
  removeAllListeners: MockedFunction<(event?: string) => void>;
}

export interface MockCache<T = unknown> {
  get: MockedFunction<(key: string) => T | undefined>;
  set: MockedFunction<(key: string, value: T, ttl?: number) => void>;
  has: MockedFunction<(key: string) => boolean>;
  delete: MockedFunction<(key: string) => boolean>;
  clear: MockedFunction<() => void>;
}

// ========== React/Component Mock Types ==========

export interface MockReactComponent<P = {}> {
  (props: P): React.JSX.Element;
  displayName?: string;
}

export interface MockHookReturn<T = unknown> {
  current: T;
  [key: string]: unknown;
}

export interface MockInputChangeEvent {
  target: {
    name: string;
    value: string;
  };
  preventDefault?: () => void;
}

export interface MockFormEvent {
  preventDefault: () => void;
}

// ========== Network/HTTP Mock Types ==========

export interface MockRequestInit extends Partial<RequestInit> {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface MockGeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number | null;
    altitudeAccuracy?: number | null;
    heading?: number | null;
    speed?: number | null;
  };
  timestamp: number;
}

export interface MockGeolocationError {
  code: number;
  message: string;
}

// ========== Media/File Mock Types ==========

export interface MockFile extends Partial<File> {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface MockFileReader extends Partial<FileReader> {
  result: string | ArrayBuffer | null;
  readAsText: MockedFunction<(file: Blob) => void>;
  readAsDataURL: MockedFunction<(file: Blob) => void>;
  onload?: ((event: ProgressEvent) => void) | null;
  onerror?: ((event: ProgressEvent) => void) | null;
}

// ========== Configuration Types ==========

export interface MockConfig {
  apiUrl?: string;
  enableCache?: boolean;
  timeout?: number;
  retryAttempts?: number;
  [key: string]: unknown;
}

// ========== Error Mock Types ==========

export interface MockError extends Error {
  name: string;
  message: string;
  code?: string | number;
  status?: number;
  stack?: string;
}

// ========== Generic Mock Utilities ==========

export type MockedClass<T> = {
  [K in keyof T]: T[K] extends (...args: infer Args) => infer R
    ? MockedFunction<(...args: Args) => R>
    : T[K];
};

export type MockedObject<T> = {
  [K in keyof T]: T[K] extends (...args: infer Args) => infer R
    ? MockedFunction<(...args: Args) => R>
    : T[K] extends object
    ? MockedObject<T[K]>
    : T[K];
};

// ========== Common Mock Factory Functions ==========

export const createMockApiResponse = <T>(data: T, ok = true): MockApiResponse<T> => ({
  ok,
  status: ok ? 200 : 400,
  statusText: ok ? 'OK' : 'Bad Request',
  json: fn<() => Promise<T>>().mockResolvedValue(data),
  text: fn<() => Promise<string>>().mockResolvedValue(JSON.stringify(data)),
});

export const createMockSession = (overrides: Partial<MockSession> = {}): MockSession => ({
  access_token: 'test-token',
  refresh_token: 'refresh-token',
  user: { id: 'user-id' },
  expires_in: 3600,
  token_type: 'bearer',
  ...overrides,
});

export const createMockError = (message: string, code?: string | number): MockError => ({
  name: 'MockError',
  message,
  code,
  stack: new Error().stack,
});

// ========== Location Mock Types ==========

export interface MockLocationContextValue {
  coordinates: { latitude: number; longitude: number; accuracy: number; timestamp: number } | null;
  address: { street: string; house_number: string; city: string; postcode: string; country: string; formatted: string } | null;
  ipLocation: { ip: string; city?: string; region?: string; country?: string } | null;
  loading: boolean;
  error: string | null;
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unknown' | 'unavailable';
  lastUpdated: number | null;
  initialized: boolean;
  locationSource: 'gps' | 'ip' | null;
  canRetryGPS: boolean;
  gpsRetrying: boolean;
  fetchLocationData: MockedFunction<(forceRefresh?: boolean) => Promise<void>>;
  requestLocationPermission: MockedFunction<() => Promise<void>>;
  retryGPSLocation: MockedFunction<() => Promise<void>>;
  clearError: MockedFunction<() => void>;
  hasLocation: boolean;
  hasGPSLocation: boolean;
  hasIpLocation: boolean;
  isPreciseLocation: boolean;
}

export const createMockLocationContextValue = (overrides: Partial<MockLocationContextValue> = {}): MockLocationContextValue => ({
  coordinates: null,
  address: null,
  ipLocation: null,
  loading: false,
  error: null,
  permissionStatus: 'unknown' as const,
  lastUpdated: null,
  initialized: true,
  locationSource: null,
  canRetryGPS: false,
  gpsRetrying: false,
  fetchLocationData: fn<(forceRefresh?: boolean) => Promise<void>>(),
  requestLocationPermission: fn<() => Promise<void>>(),
  retryGPSLocation: fn<() => Promise<void>>(),
  clearError: fn<() => void>(),
  hasLocation: false,
  hasGPSLocation: false,
  hasIpLocation: false,
  isPreciseLocation: false,
  ...overrides,
});

