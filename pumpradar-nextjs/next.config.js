/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cf-ipfs.com' },
      { protocol: 'https', hostname: 'pump.mypinata.cloud' },
      { protocol: 'https', hostname: 'ipfs.io' },
    ],
  },
};

module.exports = nextConfig;
