import { memo } from "react";

interface ProgressIndicatorProps {
  progress?: number; // 0-100
  size?: "small" | "medium" | "large";
  variant?: "circular" | "linear" | "dots";
  label?: string;
  showPercentage?: boolean;
  indeterminate?: boolean;
  color?: string;
}

export const ProgressIndicator = memo(function ProgressIndicator({
  progress = 0,
  size = "medium",
  variant = "circular",
  label,
  showPercentage = false,
  indeterminate = false,
  color = "var(--brand-accent-purple)",
}: ProgressIndicatorProps) {
  const sizeMap = {
    small: { width: "24px", height: "24px", strokeWidth: 2 },
    medium: { width: "40px", height: "40px", strokeWidth: 3 },
    large: { width: "60px", height: "60px", strokeWidth: 4 },
  };

  const dimensions = sizeMap[size];
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = indeterminate
    ? 0
    : circumference - (progress / 100) * circumference;

  if (variant === "linear") {
    return (
      <div style={{ width: "100%", maxWidth: "300px" }}>
        {label && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "8px",
              fontSize: "0.875rem",
              color: "var(--brand-light-gray)",
            }}
          >
            <span>{label}</span>
            {showPercentage && <span>{Math.round(progress)}%</span>}
          </div>
        )}
        <div
          style={{
            width: "100%",
            height: "8px",
            backgroundColor: "var(--brand-dark-purple)",
            borderRadius: "4px",
            overflow: "hidden",
          }}
          role="progressbar"
          aria-valuenow={indeterminate ? undefined : progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label || "Loading progress"}
        >
          <div
            style={{
              width: indeterminate ? "30%" : `${progress}%`,
              height: "100%",
              backgroundColor: color,
              borderRadius: "4px",
              transition: indeterminate ? "none" : "width 0.3s ease",
              animation: indeterminate ? "progress-slide 2s infinite" : "none",
            }}
          />
        </div>
      </div>
    );
  }

  if (variant === "dots") {
    return (
      <div style={{ textAlign: "center" }}>
        {label && (
          <div
            style={{
              marginBottom: "16px",
              fontSize: "0.875rem",
              color: "var(--brand-light-gray)",
            }}
          >
            {label}
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "8px",
          }}
          role="progressbar"
          aria-label={label || "Loading"}
        >
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: color,
                animation: `progress-dot 1.4s ease-in-out ${index * 0.16}s infinite both`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Circular variant (default)
  return (
    <div style={{ textAlign: "center" }}>
      {label && (
        <div
          style={{
            marginBottom: "16px",
            fontSize: "0.875rem",
            color: "var(--brand-light-gray)",
          }}
        >
          {label}
        </div>
      )}
      <div style={{ position: "relative", display: "inline-block" }}>
        <svg
          width={dimensions.width}
          height={dimensions.height}
          style={{ transform: "rotate(-90deg)" }}
          role="progressbar"
          aria-valuenow={indeterminate ? undefined : progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label || "Loading progress"}
        >
          {/* Background circle */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke="var(--brand-dark-purple)"
            strokeWidth={dimensions.strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke={color}
            strokeWidth={dimensions.strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: indeterminate
                ? "none"
                : "stroke-dashoffset 0.3s ease",
              animation: indeterminate
                ? "progress-spin 2s linear infinite"
                : "none",
            }}
          />
        </svg>
        {showPercentage && !indeterminate && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontSize:
                size === "small" ? "10px" : size === "medium" ? "12px" : "14px",
              color: "var(--brand-light-gray)",
              fontWeight: 600,
            }}
          >
            {Math.round(progress)}%
          </div>
        )}
      </div>
    </div>
  );
});

// Add CSS animations via a style tag (or include in main CSS)
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes progress-spin {
      0% {
        stroke-dasharray: 1, 150;
        stroke-dashoffset: 0;
      }
      50% {
        stroke-dasharray: 90, 150;
        stroke-dashoffset: -35;
      }
      100% {
        stroke-dasharray: 90, 150;
        stroke-dashoffset: -124;
      }
    }

    @keyframes progress-slide {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(400%);
      }
    }

    @keyframes progress-dot {
      0%, 80%, 100% {
        transform: scale(0);
        opacity: 0.5;
      }
      40% {
        transform: scale(1);
        opacity: 1;
      }
    }
  `;

  if (!document.querySelector("[data-progress-styles]")) {
    style.setAttribute("data-progress-styles", "true");
    document.head.appendChild(style);
  }
}
