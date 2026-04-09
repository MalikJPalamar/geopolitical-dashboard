module.exports = {
  apps: [{
    name: 'geopolitical-lens',
    script: 'server/index.js',
    cwd: '/var/www/geopolitical-lens',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      BASE_PATH: '/geopolitical-lens'
    },
    env_file: '.env',
    error_file: './logs/error.log',
    out_file: './logs/access.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    listen_timeout: 3000,
    kill_timeout: 5000
  }]
}
