/** @type {import('next').NextConfig} */
const nextConfig = {
  // Essential settings for Vercel deployment
  output: 'standalone',
  
  // Enable compression
  compress: true,
  
  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  
  // Skip build checks for faster deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Optimize for Vercel free tier
  images: {
    unoptimized: true,
  },
  
  // Disable source maps in production
  productionBrowserSourceMaps: false,
  
  // Remove console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Basic webpack config
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
  
  // Redirect root to login
  async redirects() {
    return [
      {
        source: '/',
        destination: '/login',
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig