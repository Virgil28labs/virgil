import type { SavedPhoto, PhotoStorageOptions } from '../../../types/camera.types'
import { CameraUtils } from './cameraUtils'

export class PhotoStorage {
  private static readonly PHOTOS_KEY = 'virgil_camera_photos'
  private static readonly SETTINGS_KEY = 'virgil_camera_settings'
  private static readonly VERSION_KEY = 'virgil_camera_version'
  private static readonly CURRENT_VERSION = '1.0.0'

  private static readonly DEFAULT_OPTIONS: PhotoStorageOptions = {
    maxStorage: 50, // 50MB
    compressionQuality: 0.8,
    autoCleanup: true,
    cleanupAfterDays: 30
  }

  static async initialize(): Promise<void> {
    try {
      await this.migrateData()
      await this.cleanupOldPhotos()
    } catch (error) {
      console.error('Error initializing photo storage:', error)
    }
  }

  static async savePhoto(photo: Omit<SavedPhoto, 'id'>): Promise<SavedPhoto> {
    try {
      const photoId = CameraUtils.generatePhotoId()
      const size = CameraUtils.calculateDataUrlSize(photo.dataUrl)
      const dimensions = await CameraUtils.getImageDimensions(photo.dataUrl)
      
      const savedPhoto: SavedPhoto = {
        ...photo,
        id: photoId,
        size,
        ...dimensions
      }

      await this.checkStorageQuota()
      
      const photos = await this.getAllPhotos()
      photos.push(savedPhoto)
      
      await this.savePhotos(photos)
      
      return savedPhoto
    } catch (error) {
      console.error('Error saving photo:', error)
      throw new Error('Failed to save photo')
    }
  }

  static async getAllPhotos(): Promise<SavedPhoto[]> {
    try {
      const data = localStorage.getItem(this.PHOTOS_KEY)
      if (!data) return []
      
      const photos = JSON.parse(data) as SavedPhoto[]
      return photos.sort((a, b) => b.timestamp - a.timestamp)
    } catch (error) {
      console.error('Error loading photos:', error)
      return []
    }
  }

  static async getFavoritePhotos(): Promise<SavedPhoto[]> {
    const photos = await this.getAllPhotos()
    return photos.filter(photo => photo.isFavorite)
  }

  static async getPhotoById(id: string): Promise<SavedPhoto | null> {
    const photos = await this.getAllPhotos()
    return photos.find(photo => photo.id === id) || null
  }

  static async updatePhoto(id: string, updates: Partial<SavedPhoto>): Promise<SavedPhoto | null> {
    try {
      const photos = await this.getAllPhotos()
      const index = photos.findIndex(photo => photo.id === id)
      
      if (index === -1) return null
      
      photos[index] = { ...photos[index], ...updates }
      await this.savePhotos(photos)
      
      return photos[index]
    } catch (error) {
      console.error('Error updating photo:', error)
      throw new Error('Failed to update photo')
    }
  }

  static async deletePhoto(id: string): Promise<boolean> {
    try {
      const photos = await this.getAllPhotos()
      const filteredPhotos = photos.filter(photo => photo.id !== id)
      
      if (filteredPhotos.length === photos.length) {
        return false // Photo not found
      }
      
      await this.savePhotos(filteredPhotos)
      return true
    } catch (error) {
      console.error('Error deleting photo:', error)
      throw new Error('Failed to delete photo')
    }
  }

  static async deletePhotos(ids: string[]): Promise<number> {
    try {
      const photos = await this.getAllPhotos()
      const filteredPhotos = photos.filter(photo => !ids.includes(photo.id))
      
      const deletedCount = photos.length - filteredPhotos.length
      
      if (deletedCount > 0) {
        await this.savePhotos(filteredPhotos)
      }
      
      return deletedCount
    } catch (error) {
      console.error('Error deleting photos:', error)
      throw new Error('Failed to delete photos')
    }
  }

  static async toggleFavorite(id: string): Promise<boolean> {
    try {
      const photos = await this.getAllPhotos()
      const photo = photos.find(p => p.id === id)
      
      if (!photo) return false
      
      photo.isFavorite = !photo.isFavorite
      await this.savePhotos(photos)
      
      return photo.isFavorite
    } catch (error) {
      console.error('Error toggling favorite:', error)
      throw new Error('Failed to toggle favorite')
    }
  }

  static async getStorageInfo(): Promise<{
    totalPhotos: number
    totalSize: number
    maxSize: number
    usedPercentage: number
    favoriteCount: number
  }> {
    try {
      const photos = await this.getAllPhotos()
      const options = this.getStorageOptions()
      
      const totalSize = photos.reduce((sum, photo) => sum + (photo.size || 0), 0)
      const maxSize = options.maxStorage * 1024 * 1024 // Convert MB to bytes
      const usedPercentage = (totalSize / maxSize) * 100
      const favoriteCount = photos.filter(photo => photo.isFavorite).length
      
      return {
        totalPhotos: photos.length,
        totalSize,
        maxSize,
        usedPercentage,
        favoriteCount
      }
    } catch (error) {
      console.error('Error getting storage info:', error)
      return {
        totalPhotos: 0,
        totalSize: 0,
        maxSize: this.DEFAULT_OPTIONS.maxStorage * 1024 * 1024,
        usedPercentage: 0,
        favoriteCount: 0
      }
    }
  }

  static async clearAllPhotos(): Promise<void> {
    try {
      localStorage.removeItem(this.PHOTOS_KEY)
    } catch (error) {
      console.error('Error clearing photos:', error)
      throw new Error('Failed to clear photos')
    }
  }

  static async exportPhotos(photos: SavedPhoto[]): Promise<string> {
    try {
      const exportData = {
        version: this.CURRENT_VERSION,
        timestamp: Date.now(),
        photos,
        totalPhotos: photos.length,
        totalSize: photos.reduce((sum, photo) => sum + (photo.size || 0), 0)
      }
      
      return JSON.stringify(exportData, null, 2)
    } catch (error) {
      console.error('Error exporting photos:', error)
      throw new Error('Failed to export photos')
    }
  }

  static async importPhotos(jsonData: string): Promise<number> {
    try {
      const importData = JSON.parse(jsonData)
      
      if (!importData.photos || !Array.isArray(importData.photos)) {
        throw new Error('Invalid import data format')
      }
      
      const existingPhotos = await this.getAllPhotos()
      const existingIds = new Set(existingPhotos.map(p => p.id))
      
      const newPhotos = importData.photos.filter((photo: SavedPhoto) => 
        !existingIds.has(photo.id)
      )
      
      if (newPhotos.length === 0) {
        return 0
      }
      
      const allPhotos = [...existingPhotos, ...newPhotos]
      await this.savePhotos(allPhotos)
      
      return newPhotos.length
    } catch (error) {
      console.error('Error importing photos:', error)
      throw new Error('Failed to import photos')
    }
  }

  static getStorageOptions(): PhotoStorageOptions {
    try {
      const data = localStorage.getItem(this.SETTINGS_KEY)
      if (!data) return this.DEFAULT_OPTIONS
      
      const saved = JSON.parse(data) as Partial<PhotoStorageOptions>
      return { ...this.DEFAULT_OPTIONS, ...saved }
    } catch (error) {
      console.error('Error loading storage options:', error)
      return this.DEFAULT_OPTIONS
    }
  }

  static saveStorageOptions(options: Partial<PhotoStorageOptions>): void {
    try {
      const current = this.getStorageOptions()
      const updated = { ...current, ...options }
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error('Error saving storage options:', error)
    }
  }

  private static async savePhotos(photos: SavedPhoto[]): Promise<void> {
    try {
      const data = JSON.stringify(photos)
      localStorage.setItem(this.PHOTOS_KEY, data)
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Please delete some photos.')
      }
      throw error
    }
  }

  private static async checkStorageQuota(): Promise<void> {
    const storageInfo = await this.getStorageInfo()
    
    if (storageInfo.usedPercentage > 90) {
      throw new Error('Storage is almost full. Please delete some photos.')
    }
  }

  private static async cleanupOldPhotos(): Promise<void> {
    const options = this.getStorageOptions()
    
    if (!options.autoCleanup) return
    
    try {
      const photos = await this.getAllPhotos()
      const cutoffTime = Date.now() - (options.cleanupAfterDays * 24 * 60 * 60 * 1000)
      
      const photosToKeep = photos.filter(photo => 
        photo.timestamp > cutoffTime || photo.isFavorite
      )
      
      if (photosToKeep.length < photos.length) {
        await this.savePhotos(photosToKeep)
      }
    } catch (error) {
    }
  }

  private static async migrateData(): Promise<void> {
    try {
      const currentVersion = localStorage.getItem(this.VERSION_KEY)
      
      if (currentVersion === this.CURRENT_VERSION) {
        return
      }
      
      // Perform migrations here if needed
      localStorage.setItem(this.VERSION_KEY, this.CURRENT_VERSION)
    } catch (error) {
    }
  }
}