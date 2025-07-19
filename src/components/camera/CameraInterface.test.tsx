import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { CameraInterface } from "./CameraInterface";
import { useCamera } from "./hooks/useCamera";
import React from "react";

// Mock the react-camera-pro
jest.mock("react-camera-pro", () => ({
  Camera: React.forwardRef(
    ({ numberOfCamerasCallback, errorMessages }: any, ref: any) => (
      <div ref={ref} data-testid="camera">
        <button onClick={() => numberOfCamerasCallback(2)}>Set Cameras</button>
        <div>{JSON.stringify(errorMessages)}</div>
      </div>
    ),
  ),
}));

// Mock the useCamera hook
jest.mock("./hooks/useCamera");

const mockUseCamera = useCamera as jest.MockedFunction<typeof useCamera>;

describe("CameraInterface", () => {
  const mockOnPhotoCapture = jest.fn();
  const mockOnError = jest.fn();

  const defaultCameraState = {
    isActive: true,
    hasPermission: true,
    flashMode: "off" as const,
    facingMode: "user" as const,
    showGrid: false,
    isCapturing: false,
    timer: null as number | null,
    error: null,
    numberOfCameras: 2,
  };

  const defaultCameraMock = {
    cameraRef: { current: null },
    cameraState: defaultCameraState,
    initializeCamera: jest.fn().mockResolvedValue(undefined),
    capturePhoto: jest.fn().mockResolvedValue("data:image/jpeg;base64,test"),
    switchCamera: jest.fn(),
    toggleFlash: jest.fn(),
    toggleGrid: jest.fn(),
    setTimer: jest.fn(),
    retryCamera: jest.fn(),
    setFacingMode: jest.fn(),
    stopCamera: jest.fn(),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCamera.mockReturnValue(defaultCameraMock);
  });

  it("shows loading state initially", () => {
    render(
      <CameraInterface
        onPhotoCapture={mockOnPhotoCapture}
        onError={mockOnError}
      />,
    );

    expect(screen.getByText("Initializing camera...")).toBeInTheDocument();
  });

  it("initializes camera on mount", async () => {
    render(
      <CameraInterface
        onPhotoCapture={mockOnPhotoCapture}
        onError={mockOnError}
      />,
    );

    await waitFor(() => {
      expect(defaultCameraMock.initializeCamera).toHaveBeenCalled();
    });
  });

  it("shows permission request when no permission", async () => {
    mockUseCamera.mockReturnValue({
      ...defaultCameraMock,
      cameraState: {
        ...defaultCameraState,
        hasPermission: false,
      },
    });

    render(
      <CameraInterface
        onPhotoCapture={mockOnPhotoCapture}
        onError={mockOnError}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Camera Permission Required"),
      ).toBeInTheDocument();
    });

    const enableButton = screen.getByText("Enable Camera");
    fireEvent.click(enableButton);

    expect(defaultCameraMock.initializeCamera).toHaveBeenCalled();
  });

  it("shows error state when camera has error", async () => {
    mockUseCamera.mockReturnValue({
      ...defaultCameraMock,
      cameraState: {
        ...defaultCameraState,
        error: "Camera not found",
      },
    });

    render(
      <CameraInterface
        onPhotoCapture={mockOnPhotoCapture}
        onError={mockOnError}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Camera Error")).toBeInTheDocument();
      expect(screen.getByText("Camera not found")).toBeInTheDocument();
    });

    const retryButton = screen.getByText("Try Again");
    fireEvent.click(retryButton);

    expect(defaultCameraMock.retryCamera).toHaveBeenCalled();
  });

  it("calls onError when camera has error", async () => {
    mockUseCamera.mockReturnValue({
      ...defaultCameraMock,
      cameraState: {
        ...defaultCameraState,
        error: "Camera error",
      },
    });

    render(
      <CameraInterface
        onPhotoCapture={mockOnPhotoCapture}
        onError={mockOnError}
      />,
    );

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith("Camera error");
    });
  });

  it("renders camera controls when initialized", async () => {
    render(
      <CameraInterface
        onPhotoCapture={mockOnPhotoCapture}
        onError={mockOnError}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("camera")).toBeInTheDocument();
      expect(screen.getByTitle("Take Photo")).toBeInTheDocument();
      expect(screen.getByTitle("Flash: off")).toBeInTheDocument();
      expect(screen.getByTitle("Switch Camera")).toBeInTheDocument();
      expect(screen.getByTitle("Timer: Off")).toBeInTheDocument();
      expect(screen.getByTitle("Toggle Grid")).toBeInTheDocument();
    });
  });

  it("captures photo when capture button clicked", async () => {
    mockOnPhotoCapture.mockResolvedValue(undefined);

    render(
      <CameraInterface
        onPhotoCapture={mockOnPhotoCapture}
        onError={mockOnError}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTitle("Take Photo")).toBeInTheDocument();
    });

    const captureButton = screen.getByTitle("Take Photo");

    await act(async () => {
      fireEvent.click(captureButton);
    });

    expect(defaultCameraMock.capturePhoto).toHaveBeenCalled();
    expect(mockOnPhotoCapture).toHaveBeenCalledWith(
      "data:image/jpeg;base64,test",
    );
  });

  it("handles capture photo error", async () => {
    defaultCameraMock.capturePhoto.mockRejectedValueOnce(
      new Error("Capture failed"),
    );

    render(
      <CameraInterface
        onPhotoCapture={mockOnPhotoCapture}
        onError={mockOnError}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTitle("Take Photo")).toBeInTheDocument();
    });

    const captureButton = screen.getByTitle("Take Photo");

    await act(async () => {
      fireEvent.click(captureButton);
    });

    expect(mockOnError).toHaveBeenCalledWith("Failed to capture photo");
  });

  it("toggles flash when flash button clicked", async () => {
    render(
      <CameraInterface
        onPhotoCapture={mockOnPhotoCapture}
        onError={mockOnError}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTitle("Flash: off")).toBeInTheDocument();
    });

    const flashButton = screen.getByTitle("Flash: off");
    fireEvent.click(flashButton);

    expect(defaultCameraMock.toggleFlash).toHaveBeenCalled();
  });

  it("switches camera when switch button clicked", async () => {
    render(
      <CameraInterface
        onPhotoCapture={mockOnPhotoCapture}
        onError={mockOnError}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTitle("Switch Camera")).toBeInTheDocument();
    });

    const switchButton = screen.getByTitle("Switch Camera");
    fireEvent.click(switchButton);

    expect(defaultCameraMock.switchCamera).toHaveBeenCalled();
  });

  it("disables switch camera when only one camera", async () => {
    mockUseCamera.mockReturnValue({
      ...defaultCameraMock,
      cameraState: {
        ...defaultCameraState,
        numberOfCameras: 1,
      },
    });

    render(
      <CameraInterface
        onPhotoCapture={mockOnPhotoCapture}
        onError={mockOnError}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTitle("Switch Camera")).toBeInTheDocument();
    });

    const switchButton = screen.getByTitle("Switch Camera");
    expect(switchButton).toBeDisabled();
  });

  it("toggles grid when grid button clicked", async () => {
    render(
      <CameraInterface
        onPhotoCapture={mockOnPhotoCapture}
        onError={mockOnError}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTitle("Toggle Grid")).toBeInTheDocument();
    });

    const gridButton = screen.getByTitle("Toggle Grid");
    fireEvent.click(gridButton);

    expect(defaultCameraMock.toggleGrid).toHaveBeenCalled();
  });

  it("shows grid overlay when grid is enabled", async () => {
    mockUseCamera.mockReturnValue({
      ...defaultCameraMock,
      cameraState: {
        ...defaultCameraState,
        showGrid: true,
      },
    });

    render(
      <CameraInterface
        onPhotoCapture={mockOnPhotoCapture}
        onError={mockOnError}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("camera")).toBeInTheDocument();
    });

    const gridLines = document.querySelectorAll(".grid-line");
    expect(gridLines).toHaveLength(4);
  });

  it("cycles through timer options", async () => {
    render(
      <CameraInterface
        onPhotoCapture={mockOnPhotoCapture}
        onError={mockOnError}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTitle("Timer: Off")).toBeInTheDocument();
    });

    const timerButton = screen.getByTitle("Timer: Off");

    // Click to set 3s
    fireEvent.click(timerButton);
    expect(defaultCameraMock.setTimer).toHaveBeenCalledWith(3);

    // Update mock to reflect timer state
    mockUseCamera.mockReturnValue({
      ...defaultCameraMock,
      cameraState: {
        ...defaultCameraState,
        timer: 3,
      },
    });
  });

  it("shows countdown when timer is set", async () => {
    jest.useFakeTimers();

    mockUseCamera.mockReturnValue({
      ...defaultCameraMock,
      cameraState: {
        ...defaultCameraState,
        timer: 3,
      },
    });

    render(
      <CameraInterface
        onPhotoCapture={mockOnPhotoCapture}
        onError={mockOnError}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTitle("Take Photo")).toBeInTheDocument();
    });

    const captureButton = screen.getByTitle("Take Photo");

    act(() => {
      fireEvent.click(captureButton);
    });

    // Should show countdown
    expect(screen.getByText("3")).toBeInTheDocument();

    // Advance timer
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText("2")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText("1")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should capture after countdown
    expect(defaultCameraMock.capturePhoto).toHaveBeenCalled();

    jest.useRealTimers();
  });

  it("disables controls when capturing", async () => {
    mockUseCamera.mockReturnValue({
      ...defaultCameraMock,
      cameraState: {
        ...defaultCameraState,
        isCapturing: true,
      },
    });

    render(
      <CameraInterface
        onPhotoCapture={mockOnPhotoCapture}
        onError={mockOnError}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTitle("Take Photo")).toBeInTheDocument();
    });

    const captureButton = screen.getByTitle("Take Photo");
    const flashButton = screen.getByTitle("Flash: off");
    const switchButton = screen.getByTitle("Switch Camera");

    expect(captureButton).toBeDisabled();
    expect(flashButton).toBeDisabled();
    expect(switchButton).toBeDisabled();
  });

  it("applies custom className", async () => {
    render(
      <CameraInterface
        onPhotoCapture={mockOnPhotoCapture}
        onError={mockOnError}
        className="custom-camera"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("camera")).toBeInTheDocument();
    });

    const cameraInterface = document.querySelector(".camera-interface");
    expect(cameraInterface).toHaveClass("custom-camera");
  });
});
