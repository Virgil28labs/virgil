// API Response Types
export interface DogApiResponse {
  message: string | string[]
  status: string
}

export interface BreedsApiResponse {
  message: Record<string, string[]>
  status: string
}

// State Types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface ApiState<T> {
  data: T
  state: LoadingState
  error: string | null
}