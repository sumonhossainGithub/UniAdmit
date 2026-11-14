/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', destination: '/login.html' },
        { source: '/login', destination: '/login.html' },
        { source: '/register', destination: '/register.html' },
      ],
      afterFiles: [
        { source: '/student/:path((?!.*\\.html$).*)', destination: '/student/:path.html' },
        { source: '/manager/:path((?!.*\\.html$).*)', destination: '/manager/:path.html' },
        { source: '/admin/:path((?!.*\\.html$).*)', destination: '/admin/:path.html' },
      ]
    };
  }
};

export default nextConfig;
