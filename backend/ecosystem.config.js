module.exports = {
  apps: [{
    name: 'flowmetric-backend',
    script: './src/index.js',
    cwd: '/home/rootori/flowmetric/backend',
    exec_mode: 'fork',
    instances: 1,
    max_memory_restart: '500M',
    autorestart: true,
    max_restarts: 15,
    min_uptime: '10s',
    restart_delay: 2000,
    env: {
      NODE_ENV: 'production'
    }
  },
  {
    name: 'pdks-daemon',
    script: 'pdks_daemon.py',
    interpreter: 'python3',
    cwd: '/home/rootori/flowmetric/pdks',
    exec_mode: 'fork',
    instances: 1,
    max_memory_restart: '200M',
    autorestart: true,
    max_restarts: 15,
    min_uptime: '10s',
    restart_delay: 3000,
  }]
};
