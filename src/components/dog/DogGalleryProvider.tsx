import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { useDogApi } from "./hooks/useDogApi";
import { useDogFavorites } from "./hooks/useDogFavorites";
import type {
  DogGalleryContextType,
  DogGalleryState,
  TabType,
} from "../../types";

// Action types for the reducer
type DogGalleryAction =
  | { type: "SET_ACTIVE_TAB"; payload: TabType }
  | { type: "SET_SELECTED_BREED"; payload: string }
  | { type: "SET_FETCH_COUNT"; payload: number }
  | { type: "SET_SELECTED_IMAGE_INDEX"; payload: number | null }
  | { type: "RESET_STATE" };

// Initial state
const initialState: DogGalleryState = {
  activeTab: "fetch",
  selectedBreed: "",
  fetchCount: 3,
  selectedImageIndex: null,
};

// Reducer function
function dogGalleryReducer(
  state: DogGalleryState,
  action: DogGalleryAction,
): DogGalleryState {
  switch (action.type) {
    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.payload };
    case "SET_SELECTED_BREED":
      return { ...state, selectedBreed: action.payload };
    case "SET_FETCH_COUNT":
      return { ...state, fetchCount: action.payload };
    case "SET_SELECTED_IMAGE_INDEX":
      return { ...state, selectedImageIndex: action.payload };
    case "RESET_STATE":
      return initialState;
    default:
      return state;
  }
}

// Create the context
const DogGalleryContext = createContext<DogGalleryContextType | undefined>(
  undefined,
);

// Provider props
interface DogGalleryProviderProps {
  children: ReactNode;
  isOpen?: boolean;
}

// Provider component
export function DogGalleryProvider({
  children,
  isOpen = false,
}: DogGalleryProviderProps) {
  const [state, dispatch] = useReducer(dogGalleryReducer, initialState);
  const { dogs, breeds, loading, error, fetchDogs, fetchBreeds } = useDogApi();
  const { favorites, isFavorited, toggleFavorite } = useDogFavorites();

  // Load breeds when gallery opens
  useEffect(() => {
    if (isOpen && breeds.length === 0) {
      fetchBreeds();
    }
  }, [isOpen, breeds.length, fetchBreeds]);

  // Action creators
  const setActiveTab = useCallback((tab: TabType) => {
    dispatch({ type: "SET_ACTIVE_TAB", payload: tab });
  }, []);

  const setSelectedBreed = useCallback((breed: string) => {
    dispatch({ type: "SET_SELECTED_BREED", payload: breed });
  }, []);

  const setFetchCount = useCallback((count: number) => {
    dispatch({ type: "SET_FETCH_COUNT", payload: count });
  }, []);

  const setSelectedImageIndex = useCallback((index: number | null) => {
    dispatch({ type: "SET_SELECTED_IMAGE_INDEX", payload: index });
  }, []);

  // Enhanced fetch function that uses current state
  const handleFetchDogs = useCallback(
    (breed?: string, count?: number) => {
      const breedToUse = breed !== undefined ? breed : state.selectedBreed;
      const countToUse = count !== undefined ? count : state.fetchCount;
      fetchDogs(breedToUse, countToUse);
    },
    [fetchDogs, state.selectedBreed, state.fetchCount],
  );

  // Context value
  const contextValue: DogGalleryContextType = {
    // State
    state,
    dogs,
    breeds,
    loading,
    error,
    favorites,

    // Actions
    setActiveTab,
    setSelectedBreed,
    setFetchCount,
    setSelectedImageIndex,
    fetchDogs: handleFetchDogs,
    fetchBreeds,
    isFavorited,
    toggleFavorite,
  };

  return (
    <DogGalleryContext.Provider value={contextValue}>
      {children}
    </DogGalleryContext.Provider>
  );
}

// Custom hook to use the context
export function useDogGallery(): DogGalleryContextType {
  const context = useContext(DogGalleryContext);
  if (context === undefined) {
    throw new Error("useDogGallery must be used within a DogGalleryProvider");
  }
  return context;
}

// Export context for testing
export { DogGalleryContext };
