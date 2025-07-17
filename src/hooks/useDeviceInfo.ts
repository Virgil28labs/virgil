import { useState, useEffect } from 'react'

interface DeviceInfo {
  // Location & Network
  location: string
  ip: string
  
  // Device & Browser
  device: string
  os: string
  browser: string
  
  // Display
  screen: string
  pixelRatio: number
  colorScheme: 'dark' | 'light'
  windowSize: string
  
  // Hardware
  cpu: number | string
  memory: string
  
  // Network
  online: boolean
  networkType: string
  downlink: string
  rtt: string
  
  // Battery
  batteryLevel: number | null
  batteryCharging: boolean | null
  
  // Session
  localTime: string
  timezone: string
  language: string
  tabVisible: boolean
  sessionDuration: number
  
  // Browser Features
  cookiesEnabled: boolean
  doNotTrack: string | null
  
  // Storage
  storageQuota: string
}

interface PermissionStatus {
  geolocation: PermissionState | 'unknown'
  camera: PermissionState | 'unknown'
  microphone: PermissionState | 'unknown'
  notifications: PermissionState | 'unknown'
  clipboard: PermissionState | 'unknown'
}

// Parse user agent for device info
const parseUserAgent = () => {
  const ua = navigator.userAgent
  let device = 'Unknown Device'
  let os = 'Unknown OS'
  let browser = 'Unknown Browser'
  
  // Detect OS
  if (ua.includes('Mac')) os = `macOS ${ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, '.') || ''}`
  else if (ua.includes('Windows')) os = `Windows ${ua.match(/Windows NT ([\d.]+)/)?.[1] || ''}`
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('Android')) os = `Android ${ua.match(/Android ([\d.]+)/)?.[1] || ''}`
  else if (ua.includes('iOS')) os = `iOS ${ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, '.') || ''}`
  
  // Detect Browser
  if (ua.includes('Chrome/') && !ua.includes('Edg/')) {
    browser = `Chrome ${ua.match(/Chrome\/([\d.]+)/)?.[1] || ''}`
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    browser = `Safari ${ua.match(/Version\/([\d.]+)/)?.[1] || ''}`
  } else if (ua.includes('Firefox/')) {
    browser = `Firefox ${ua.match(/Firefox\/([\d.]+)/)?.[1] || ''}`
  } else if (ua.includes('Edg/')) {
    browser = `Edge ${ua.match(/Edg\/([\d.]+)/)?.[1] || ''}`
  }
  
  // Detect Device Type
  if (ua.includes('iPhone')) device = 'iPhone'
  else if (ua.includes('iPad')) device = 'iPad'
  else if (ua.includes('Android')) device = 'Android Device'
  else if (ua.includes('Mac')) device = 'Mac'
  else if (ua.includes('Windows')) device = 'Windows PC'
  
  return { device, os, browser }
}

// Format bytes to human readable
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export const useDeviceInfo = (ipLocation?: { city?: string; ip?: string }) => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [permissions, setPermissions] = useState<PermissionStatus>({
    geolocation: 'unknown',
    camera: 'unknown',
    microphone: 'unknown',
    notifications: 'unknown',
    clipboard: 'unknown',
  })
  const [sessionStart] = useState(Date.now())

  // Check permission status
  const checkPermission = async (name: string): Promise<PermissionState | 'unknown'> => {
    try {
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: name as PermissionName })
        return result.state
      }
    } catch {
      // Permission not supported or error
    }
    return 'unknown'
  }

  // Collect device information
  const collectInfo = async () => {
    const { device, os, browser } = parseUserAgent()
    
    // Get network information
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    
    // Get battery info
    let batteryLevel = null
    let batteryCharging = null
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery()
        batteryLevel = Math.round(battery.level * 100)
        batteryCharging = battery.charging
      }
    } catch {
      // Battery API not supported
    }
    
    // Get storage quota
    let storageQuota = 'N/A'
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        if (estimate.quota) {
          storageQuota = formatBytes(estimate.quota)
        }
      }
    } catch {
      // Storage API not supported
    }
    
    const info: DeviceInfo = {
      // Location & Network
      location: ipLocation?.city || 'Unknown',
      ip: ipLocation?.ip || 'N/A',
      
      // Device & Browser
      device,
      os,
      browser,
      
      // Display
      screen: `${screen.width}×${screen.height}`,
      pixelRatio: window.devicePixelRatio || 1,
      colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      windowSize: `${window.innerWidth}×${window.innerHeight}`,
      
      // Hardware
      cpu: navigator.hardwareConcurrency || 'N/A',
      memory: (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : 'N/A',
      
      // Network
      online: navigator.onLine,
      networkType: connection?.effectiveType || 'Unknown',
      downlink: connection?.downlink ? `${connection.downlink} Mbps` : 'N/A',
      rtt: connection?.rtt ? `${connection.rtt} ms` : 'N/A',
      
      // Battery
      batteryLevel,
      batteryCharging,
      
      // Session
      localTime: new Date().toLocaleTimeString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      tabVisible: !document.hidden,
      sessionDuration: Math.floor((Date.now() - sessionStart) / 1000),
      
      // Browser Features
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      
      // Storage
      storageQuota,
    }
    
    setDeviceInfo(info)
  }

  // Check all permissions
  const checkAllPermissions = async () => {
    const newPermissions: PermissionStatus = {
      geolocation: await checkPermission('geolocation'),
      camera: await checkPermission('camera'),
      microphone: await checkPermission('microphone'),
      notifications: await checkPermission('notifications'),
      clipboard: await checkPermission('clipboard-read'),
    }
    setPermissions(newPermissions)
  }

  // Request specific permission
  const requestPermission = async (type: keyof PermissionStatus) => {
    switch (type) {
      case 'geolocation':
        navigator.geolocation.getCurrentPosition(() => {
          checkAllPermissions()
        }, () => {
          checkAllPermissions()
        })
        break
      case 'camera':
        try {
          await navigator.mediaDevices.getUserMedia({ video: true })
          checkAllPermissions()
        } catch {
          checkAllPermissions()
        }
        break
      case 'microphone':
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true })
          checkAllPermissions()
        } catch {
          checkAllPermissions()
        }
        break
      case 'notifications':
        try {
          await Notification.requestPermission()
          checkAllPermissions()
        } catch {
          checkAllPermissions()
        }
        break
      case 'clipboard':
        try {
          await navigator.clipboard.readText()
          checkAllPermissions()
        } catch {
          checkAllPermissions()
        }
        break
    }
  }

  useEffect(() => {
    collectInfo()
    checkAllPermissions()
    
    // Update live data every second
    const interval = setInterval(() => {
      collectInfo()
    }, 1000)
    
    // Listen for online/offline events
    const handleOnline = () => collectInfo()
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOnline)
    
    // Listen for visibility change
    const handleVisibility = () => collectInfo()
    document.addEventListener('visibilitychange', handleVisibility)
    
    // Listen for window resize
    const handleResize = () => collectInfo()
    window.addEventListener('resize', handleResize)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('resize', handleResize)
    }
  }, [ipLocation, sessionStart])

  return { deviceInfo, permissions, requestPermission }
}