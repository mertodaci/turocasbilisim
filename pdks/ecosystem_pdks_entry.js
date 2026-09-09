// backend/ecosystem.config.js icindeki `apps: [ ... ]` dizisine bu objeyi
// mevcut turocas-backend girisinden SONRA, virgulle ayirarak ekleyin:

  {
    name: 'pdks-daemon',
    script: 'pdks_daemon.py',
    interpreter: 'python3',
    cwd: '/home/rootori/turocas/pdks',
    exec_mode: 'fork',
    instances: 1,
    max_memory_restart: '200M',
    autorestart: true,
    max_restarts: 15,
    min_uptime: '10s',
    restart_delay: 3000,
  }
