import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OPEN MIND 2026',
    short_name: 'OPEN MIND',
    description: 'Event seminar dan networking eksklusif oleh HIPMI PT Telkom University.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F5F3EE',
    theme_color: '#0F172A',
    icons: [
      {
        src: '/icon.jpg',
        sizes: 'any',
        type: 'image/jpeg',
        purpose: 'any',
      },
    ],
  }
}