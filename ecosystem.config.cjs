// pm2 process file: `pm2 startOrReload ecosystem.config.cjs --update-env`
module.exports = {
  apps: [{
    name: 'iman-logistics',
    script: 'server.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '400M',
    time: true,
    env: { NODE_ENV: 'production' },
  }],
}
