// Common event handler for stopping propagation
export const stopEvent = (e: React.MouseEvent | React.SyntheticEvent) => {
  e.preventDefault()
  e.stopPropagation()
}

// Download image utility
export const downloadImage = async (url: string, breed: string) => {
  const response = await fetch(url)
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = `doggo-${breed}-${Date.now()}.jpg`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objectUrl)
}

// Copy image to clipboard utility
export const copyImageToClipboard = async (url: string): Promise<boolean> => {
  try {
    // Create canvas to convert image
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = url
    })
    
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    
    ctx.drawImage(img, 0, 0)
    
    // Convert to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to create blob'))
      }, 'image/png')
    })
    
    // Try to copy image
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ])
      return true
    } else {
      // Fallback to URL copy
      await navigator.clipboard.writeText(url)
      return false
    }
  } catch (error) {
    // Final fallback
    await navigator.clipboard.writeText(url)
    return false
  }
}