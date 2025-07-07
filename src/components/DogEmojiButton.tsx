import { useState, useEffect, memo, useCallback, MouseEvent } from 'react'

const DOG_API = 'https://dog.ceo/api'
const DOG_DOCS = 'https://dog.ceo/dog-api/'

// Virgil brand colors
const BG = '#39293e'
const TEXT = '#f5f5f5'
const ACCENT = '#6c3baa'
const SECONDARY = '#b2a5c1'
const CARD = '#2d2233'

export const DogEmojiButton = memo(function DogEmojiButton() {
  const [open, setOpen] = useState<boolean>(false)
  const [dogUrl, setDogUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [breeds, setBreeds] = useState<string[]>([])
  const [selectedBreed, setSelectedBreed] = useState<string>('')
  const [gallery, setGallery] = useState<string[]>([])
  const [galleryLoading, setGalleryLoading] = useState<boolean>(false)
  const [galleryError, setGalleryError] = useState<string | null>(null)
  const [subBreeds, setSubBreeds] = useState<string[]>([])

  // Fetch all breeds on open
  useEffect(() => {
    if (open && breeds.length === 0) {
      fetchBreeds()
    }
  }, [open])

  const fetchBreeds = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${DOG_API}/breeds/list/all`)
      if (!res.ok) throw new Error('Failed to fetch breeds')
      const data: any = await res.json()
      const breedList = Object.keys(data.message)
      setBreeds(breedList)
    } catch (e: any) {
      setError('Could not load breeds')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch a random dog (optionally by breed)
  const fetchDog = useCallback(async (breed: string = selectedBreed): Promise<void> => {
    setLoading(true)
    setError(null)
    let url = `${DOG_API}/breeds/image/random`
    if (breed) url = `${DOG_API}/breed/${breed}/images/random`
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch dog image')
      const data: any = await res.json()
      setDogUrl(data.message)
    } catch (e: any) {
      setError('Could not load dog image')
      setDogUrl(null)
    } finally {
      setLoading(false)
    }
  }, [selectedBreed])

  // Fetch gallery for breed
  const fetchGallery = async (breed: string = selectedBreed): Promise<void> => {
    if (!breed) return
    setGalleryLoading(true)
    setGalleryError(null)
    try {
      const res = await fetch(`${DOG_API}/breed/${breed}/images/random/8`)
      if (!res.ok) throw new Error('Failed to fetch gallery')
      const data: any = await res.json()
      setGallery(data.message)
    } catch (e: any) {
      setGalleryError('Could not load gallery')
      setGallery([])
    } finally {
      setGalleryLoading(false)
    }
  }

  // Fetch sub-breeds when breed changes
  useEffect(() => {
    if (!selectedBreed) {
      setSubBreeds([])
      return
    }
    const fetchSubBreeds = async (): Promise<void> => {
      try {
        const res = await fetch(`${DOG_API}/breed/${selectedBreed}/list`)
        if (!res.ok) throw new Error()
        const data: any = await res.json()
        setSubBreeds(data.message)
      } catch {
        setSubBreeds([])
      }
    }
    fetchSubBreeds()
    fetchDog(selectedBreed)
    fetchGallery(selectedBreed)
  }, [selectedBreed])

  const handleClick = useCallback((): void => {
    setOpen(true)
    setDogUrl(null)
    setSelectedBreed('')
    setGallery([])
    setSubBreeds([])
    setError(null)
    setGalleryError(null)
    fetchDog('')
  }, [fetchDog])

  const handleClose = useCallback((): void => {
    setOpen(false)
    setDogUrl(null)
    setSelectedBreed('')
    setGallery([])
    setSubBreeds([])
    setError(null)
    setGalleryError(null)
  }, [])

  return (
    <>
      <button
        aria-label="Show me a dog!"
        onClick={handleClick}
        style={{
          fontSize: '2.2rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          position: 'fixed',
          bottom: '2.2rem',
          left: '2.2rem',
          zIndex: 1000,
          filter: 'drop-shadow(0 2px 8px #0002)'
        }}
        title="Click for a random dog!"
      >
        🐶
      </button>
      {open && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(30,20,40,0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
          onClick={handleClose}
        >
          <div
            style={{
              background: CARD,
              borderRadius: '2.2rem',
              padding: '2.5rem 2.5rem 2rem 2.5rem',
              minWidth: '420px',
              minHeight: '600px',
              maxWidth: '98vw',
              maxHeight: '94vh',
              boxShadow: '0 4px 32px #0005',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              overflowY: 'auto',
              color: TEXT,
              fontFamily: 'Montserrat, sans-serif',
              letterSpacing: 0.01,
            }}
            onClick={(e: MouseEvent) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              style={{
                position: 'absolute',
                top: '1.2rem',
                right: '1.2rem',
                background: 'none',
                border: 'none',
                fontSize: '2rem',
                color: SECONDARY,
                cursor: 'pointer',
                transition: 'color 0.2s',
              }}
              aria-label="Close"
            >
              ×
            </button>
            <h2 style={{margin: '0 0 1.5rem 0', fontWeight: 700, fontSize: '2rem', color: ACCENT, letterSpacing: 0.02}}>🐶 Dog App</h2>
            {/* Breed Selector */}
            <div style={{marginBottom: '1.5rem', width: '100%', display: 'flex', alignItems: 'center'}}>
              <label htmlFor="breed-select" style={{fontWeight: 600, color: SECONDARY, fontSize: '1.1rem'}}>Breed:</label>
              <select
                id="breed-select"
                value={selectedBreed}
                onChange={(e) => setSelectedBreed(e.target.value)}
                style={{marginLeft: 12, padding: '6px 12px', borderRadius: 8, minWidth: 140, background: BG, color: TEXT, border: `1.5px solid ${ACCENT}`, fontSize: '1.05rem', fontWeight: 500, outline: 'none'}}>
                <option value="">Random</option>
                {breeds.map((b: string) => (
                  <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>
                ))}
              </select>
              {subBreeds.length > 0 && (
                <span style={{marginLeft: 14, fontSize: '1em', color: SECONDARY}}>
                  Sub-breeds: {subBreeds.join(', ')}
                </span>
              )}
            </div>
            {/* Main Dog Image */}
            <div style={{marginBottom: '1.5rem', minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%'}}>
              {loading && <p style={{color: SECONDARY}}>Loading...</p>}
              {error && <p style={{color: '#efb0c2'}}>{error}</p>}
              {dogUrl && (
                <img
                  src={dogUrl}
                  alt="A dog"
                  style={{
                    maxWidth: '260px',
                    maxHeight: '220px',
                    borderRadius: '1.2rem',
                    boxShadow: '0 2px 16px #0003',
                    border: `2px solid ${ACCENT}`,
                    background: BG
                  }}
                />
              )}
            </div>
            {/* Next Dog Button */}
            <button
              onClick={() => fetchDog(selectedBreed)}
              style={{marginBottom: '1.7rem', padding: '0.7rem 2.2rem', borderRadius: 10, border: `1.5px solid ${ACCENT}`, background: ACCENT, color: TEXT, cursor: 'pointer', fontWeight: 600, fontSize: '1.1rem', boxShadow: '0 1px 6px #0002', transition: 'background 0.2s, color 0.2s'}}
            >
              Next Dog
            </button>
            {/* Gallery */}
            <div style={{width: '100%', marginBottom: '1.7rem'}}>
              <div style={{fontWeight: 600, marginBottom: 8, color: SECONDARY, fontSize: '1.08rem'}}>Gallery:</div>
              {galleryLoading && <p style={{color: SECONDARY}}>Loading gallery...</p>}
              {galleryError && <p style={{color: '#efb0c2'}}>{galleryError}</p>}
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12}}>
                {gallery.map((img, i) => (
                  <img key={i} src={img} alt="Dog" style={{width: '100%', maxWidth: 110, maxHeight: 110, borderRadius: 10, objectFit: 'cover', border: `1.5px solid ${SECONDARY}`, background: BG}} />
                ))}
              </div>
            </div>
            {/* More Info */}
            <div style={{width: '100%', fontSize: '1.08em', color: SECONDARY, marginTop: 'auto', marginBottom: 0}}>
              <div style={{marginBottom: 6, color: TEXT}}>
                <b>Breed:</b> {selectedBreed ? selectedBreed.charAt(0).toUpperCase() + selectedBreed.slice(1) : 'Random'}
              </div>
              {subBreeds.length > 0 && (
                <div style={{marginBottom: 6, color: TEXT}}>
                  <b>Sub-breeds:</b> {subBreeds.join(', ')}
                </div>
              )}
              <a href={DOG_DOCS} target="_blank" rel="noopener noreferrer" style={{color: ACCENT, textDecoration: 'underline', fontWeight: 600}}>Dog CEO API Docs</a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}) 