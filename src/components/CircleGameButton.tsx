import { lazy } from "react";
import { EmojiButton } from "./common/EmojiButton";
import { CircleErrorBoundary } from "./circle/CircleErrorBoundary";

const DrawPerfectCircle = lazy(() =>
  import("./circle/DrawPerfectCircle").then((module) => ({
    default: module.DrawPerfectCircle,
  })),
);

const CircleGameWrapper = ({ onClose }: { onClose: () => void }) => (
  <CircleErrorBoundary>
    <DrawPerfectCircle isOpen={true} onClose={onClose} />
  </CircleErrorBoundary>
);

export const CircleGameButton = () => (
  <EmojiButton
    emoji="⭕"
    ariaLabel="Open Perfect Circle Game - Test your drawing skills!"
    GalleryComponent={CircleGameWrapper}
    position={{ top: "14.5rem", right: "calc(2rem - 10px)" }}
    hoverScale={1.15}
    hoverColor={{
      background:
        "linear-gradient(135deg, rgba(255, 107, 157, 0.3) 0%, rgba(255, 143, 179, 0.3) 100%)",
      border: "rgba(255, 107, 157, 0.6)",
      glow: "rgba(255, 107, 157, 0.4)",
    }}
    title="Draw Perfect Circle - Can you draw a perfect circle?"
    className="opacity-80 hover:opacity-100"
  />
);
