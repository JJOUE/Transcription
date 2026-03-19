import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/upload/',
          '/transcriptions/',
          '/transcript/',
          '/billing/',
          '/profile/',
          '/admin/',
          '/debug-packages/',
          '/diagnostic/',
          '/test-upload/',
          '/test-rules/',
          '/test-transcription/',
        ],
      },
    ],
    sitemap: 'https://www.talktotext.ca/sitemap.xml',
  };
}
