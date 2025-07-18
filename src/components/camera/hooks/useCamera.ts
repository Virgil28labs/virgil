import { useRef, useState, useCallback, useEffect } from 'react'
import type { CameraState } from '../../../types/camera.types'
import { CameraUtils } from '../utils/cameraUtils'

export const useCamera = () => {
  const cameraRef = useRef<any>(null)
  const [cameraState, setCameraState] = useState<CameraState>({
    isActive: false,
    isCapturing: false,
    hasPermission: false,
    error: null,
    facingMode: 'user',
    numberOfCameras: 0,
    showGrid: true,
    timer: null,
    flashMode: 'off'
  })

  const updateCameraState = useCallback((updates: Partial<CameraState>) => {
    setCameraState(prev => ({ ...prev, ...updates }))
  }, [])

  const initializeCamera = useCallback(async () => {
    try {
      updateCameraState({ isActive: false, error: null })

      if (!CameraUtils.isSecureContext()) {
        throw new Error('Camera requires HTTPS or localhost')
      }

      if (!CameraUtils.isCameraSupported()) {
        throw new Error('Camera is not supported in this browser')
      }

      const permissionResult = await CameraUtils.requestCameraPermission()
      
      if (!permissionResult.granted) {
        updateCameraState({ 
          hasPermission: false, 
          error: permissionResult.error?.message || 'Permission denied' 
        })
        return
      }

      const cameras = await CameraUtils.getAvailableCameras()
      
      updateCameraState({
        isActive: true,
        hasPermission: true,
        numberOfCameras: cameras.length,
        error: null
      })
    } catch (error) {
      const cameraError = CameraUtils.createCameraError(error)
      updateCameraState({ 
        isActive: false, 
        hasPermission: false, 
        error: cameraError.message 
      })
    }
  }, [updateCameraState])

  const capturePhoto = useCallback(async (): Promise<string | null> => {
    if (!cameraRef.current || !cameraState.isActive) {
      return null
    }

    try {
      updateCameraState({ isCapturing: true })
      
      // If timer is set, start countdown
      if (cameraState.timer && cameraState.timer > 0) {
        const timerSeconds = cameraState.timer
        await new Promise(resolve => setTimeout(resolve, timerSeconds * 1000))
      }

      const photoDataUrl = cameraRef.current.takePhoto()
      
      if (!photoDataUrl) {
        throw new Error('Failed to capture photo')
      }

      return photoDataUrl
    } catch (error) {
      const cameraError = CameraUtils.createCameraError(error)
      updateCameraState({ error: cameraError.message })
      return null
    } finally {
      updateCameraState({ isCapturing: false })
    }
  }, [cameraState.isActive, cameraState.timer, updateCameraState])

  const switchCamera = useCallback(async () => {
    if (!cameraRef.current || cameraState.numberOfCameras <= 1) {
      return
    }

    try {
      const newFacingMode = cameraRef.current.switchCamera()
      updateCameraState({ facingMode: newFacingMode })
    } catch (error) {
      const cameraError = CameraUtils.createCameraError(error)
      updateCameraState({ error: cameraError.message })
    }
  }, [cameraState.numberOfCameras, updateCameraState])

  const toggleFlash = useCallback(() => {
    const flashModes: Array<'off' | 'on' | 'auto'> = ['off', 'on', 'auto']
    const currentIndex = flashModes.indexOf(cameraState.flashMode)
    const nextIndex = (currentIndex + 1) % flashModes.length
    
    updateCameraState({ flashMode: flashModes[nextIndex] })
  }, [cameraState.flashMode, updateCameraState])

  const toggleGrid = useCallback(() => {
    updateCameraState({ showGrid: !cameraState.showGrid })
  }, [cameraState.showGrid, updateCameraState])

  const setTimer = useCallback((timer: number | null) => {
    updateCameraState({ timer })
  }, [updateCameraState])

  const setFacingMode = useCallback((facingMode: 'user' | 'environment') => {
    updateCameraState({ facingMode })
  }, [updateCameraState])

  const stopCamera = useCallback(() => {
    updateCameraState({ 
      isActive: false, 
      isCapturing: false, 
      error: null 
    })
  }, [updateCameraState])

  const clearError = useCallback(() => {
    updateCameraState({ error: null })
  }, [updateCameraState])

  const retryCamera = useCallback(() => {
    clearError()
    initializeCamera()
  }, [clearError, initializeCamera])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return {
    cameraRef,
    cameraState,
    initializeCamera,
    capturePhoto,
    switchCamera,
    toggleFlash,
    toggleGrid,
    setTimer,
    setFacingMode,
    stopCamera,
    clearError,
    retryCamera
  }
}