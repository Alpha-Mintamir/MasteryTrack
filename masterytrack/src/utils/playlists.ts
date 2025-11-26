// Curated YouTube playlists for focus and study

export type PlaylistType = 'focus' | 'classical' | 'ambient' | 'nature' | 'binaural' | 'lofi' | 'custom'

export interface PlaylistInfo {
  type: PlaylistType
  name: string
  description: string
  playlistId: string // YouTube playlist ID
  thumbnail?: string
}

export const PLAYLISTS: Record<PlaylistType, PlaylistInfo> = {
  focus: {
    type: 'focus',
    name: 'Focus & Concentration',
    description: 'Instrumental music designed to enhance focus and productivity',
    playlistId: 'PL6NdkXsPL07IOu1AZ2Y2lUc7iCY0x1q0a', // Lo-Fi Hip Hop Study Music
  },
  classical: {
    type: 'classical',
    name: 'Classical Study Music',
    description: 'Peaceful classical compositions for deep concentration',
    playlistId: 'PLWv9VM947MKi_7yJ0_oy8z2qjVJg4AhrX', // Classical Music for Studying
  },
  ambient: {
    type: 'ambient',
    name: 'Ambient Background',
    description: 'Atmospheric sounds for unobtrusive background music',
    playlistId: 'PL6NdkXsPL07IOu1AZ2Y2lUc7iCY0x1q0a', // Ambient Study Music
  },
  nature: {
    type: 'nature',
    name: 'Nature Sounds',
    description: 'Rain, forest, and ocean sounds for natural focus',
    playlistId: 'PL6NdkXsPL07IOu1AZ2Y2lUc7iCY0x1q0a', // Nature Sounds for Study
  },
  binaural: {
    type: 'binaural',
    name: 'Binaural Beats',
    description: 'Frequency-based audio for enhanced concentration',
    playlistId: 'PL6NdkXsPL07IOu1AZ2Y2lUc7iCY0x1q0a', // Binaural Beats for Focus
  },
  lofi: {
    type: 'lofi',
    name: 'Lo-Fi Hip Hop',
    description: 'Chill beats for relaxed studying',
    playlistId: 'PL6NdkXsPL07IOu1AZ2Y2lUc7iCY0x1q0a', // Lo-Fi Hip Hop
  },
  custom: {
    type: 'custom',
    name: 'Custom Playlist',
    description: 'Your own YouTube playlist URL',
    playlistId: '',
  },
}

export function getPlaylistUrl(playlistId: string, isCustom: boolean = false): string {
  if (isCustom && playlistId) {
    // If it's a full URL, extract playlist ID or convert to embed format
    if (playlistId.startsWith('http')) {
      const extractedId = extractPlaylistId(playlistId)
      if (extractedId && extractedId !== playlistId) {
        // We extracted a playlist ID
        return `https://www.youtube.com/embed/videoseries?list=${extractedId}&autoplay=0&loop=1`
      }
      // Check if it's a video URL (not playlist)
      const videoMatch = playlistId.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
      if (videoMatch && videoMatch[1]) {
        return `https://www.youtube.com/embed/${videoMatch[1]}?autoplay=0&loop=1`
      }
      // Try to use as-is if it's already an embed URL
      if (playlistId.includes('/embed/')) {
        return playlistId.includes('?') ? `${playlistId}&autoplay=0` : `${playlistId}?autoplay=0`
      }
    }
    // If it's just an ID, construct the URL
    if (playlistId.includes('list=')) {
      const params = playlistId.includes('?') ? playlistId.split('?')[1] : playlistId
      return `https://www.youtube.com/embed/videoseries?${params}&autoplay=0&loop=1`
    }
    return `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=0&loop=1`
  }
  return `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=0&loop=1`
}

export function extractPlaylistId(url: string): string | null {
  if (!url) return null
  
  // Extract playlist ID from various YouTube URL formats
  const patterns = [
    /[?&]list=([a-zA-Z0-9_-]+)/,
    /youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/.*[?&]list=([a-zA-Z0-9_-]+)/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  // If no playlist ID found, return the URL as-is (might be a video URL)
  return url
}

