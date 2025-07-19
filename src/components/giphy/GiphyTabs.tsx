import { memo } from "react";

export interface GiphyTabsProps {
  currentTab: "search" | "trending" | "favorites";
  searchCount: number;
  trendingCount: number;
  favoritesCount: number;
  onTabChange: (tab: "search" | "trending" | "favorites") => void;
}

export const GiphyTabs = memo(function GiphyTabs({
  currentTab,
  searchCount,
  trendingCount,
  favoritesCount,
  onTabChange,
}: GiphyTabsProps) {
  return (
    <div className="giphy-gallery-tabs">
      <button
        className={`giphy-gallery-tab ${currentTab === "search" ? "active" : ""}`}
        onClick={() => onTabChange("search")}
        aria-label="Search GIFs"
      >
        <span>🔍 Search</span>
        {searchCount > 0 && (
          <span className="giphy-tab-count">{searchCount}</span>
        )}
      </button>

      <button
        className={`giphy-gallery-tab ${currentTab === "trending" ? "active" : ""}`}
        onClick={() => onTabChange("trending")}
        aria-label="Trending GIFs"
      >
        <span>🔥 Trending</span>
        {trendingCount > 0 && (
          <span className="giphy-tab-count">{trendingCount}</span>
        )}
      </button>

      <button
        className={`giphy-gallery-tab ${currentTab === "favorites" ? "active" : ""}`}
        onClick={() => onTabChange("favorites")}
        aria-label="Favorite GIFs"
      >
        <span>❤️ Favorites</span>
        {favoritesCount > 0 && (
          <span className="giphy-tab-count">{favoritesCount}</span>
        )}
      </button>
    </div>
  );
});
