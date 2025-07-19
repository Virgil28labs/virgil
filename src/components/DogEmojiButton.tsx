import { lazy } from "react";
import { EmojiButton } from "./common/EmojiButton";

const DogGallery = lazy(() =>
  import("./dog/DogGallery").then((module) => ({
    default: module.DogGallery,
  })),
);

const DogGalleryWrapper = ({ onClose }: { onClose: () => void }) => (
  <DogGallery isOpen={true} onClose={onClose} />
);

export const DogEmojiButton = () => (
  <EmojiButton
    emoji="🐕"
    ariaLabel="Open Doggo Sanctuary"
    GalleryComponent={DogGalleryWrapper}
    position={{ top: "4.5rem", right: "calc(2rem - 10px)" }}
    hoverScale={1.15}
    hoverColor={{
      background:
        "linear-gradient(135deg, rgba(108, 59, 170, 0.3) 0%, rgba(178, 165, 193, 0.3) 100%)",
      border: "rgba(178, 165, 193, 0.6)",
      glow: "rgba(108, 59, 170, 0.4)",
    }}
    title="Visit the Doggo Sanctuary!"
    className="opacity-80 hover:opacity-100"
  />
);
