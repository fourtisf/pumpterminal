const path = require('path');

module.exports = {
  apps: [
    {
      // Next.js frontend — nginx proxies pumpterminal.click -> 127.0.0.1:3000
      name: 'pumpterminal-web',
      cwd: path.join(__dirname, 'pumpradar-nextjs'),
      script: 'node_modules/next/dist/bin/next',
      args: 'start --port 3000 --hostname 127.0.0.1',
      env: { NODE_ENV: 'production' },
    },
    {
      // PumpPortal -> browser WS bridge — nginx proxies /ws -> 127.0.0.1:4000
      name: 'pumpterminal-worker',
      cwd: path.join(__dirname, 'worker'),
      script: 'src/index.js',
      env: { NODE_ENV: 'production', PORT: '4000' },
    },
  ],
};
