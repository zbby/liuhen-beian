import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('8.147.61.234', username='root', password='1892355!As', timeout=15)

commands = [
    'echo "=== OS ===" && cat /etc/os-release | head -3',
    'echo "=== Node.js ===" && (which node && node -v || echo NOT_FOUND)',
    'echo "=== npm ===" && (which npm && npm -v || echo NOT_FOUND)',
    'echo "=== MongoDB ===" && (which mongod && mongod --version | head -1 || echo NOT_FOUND)',
    'echo "=== Memory ===" && free -h | head -2',
    'echo "=== Disk ===" && df -h / | tail -1',
    'echo "=== Port 3000 ===" && (ss -tlnp | grep 3000 || echo PORT_FREE)',
    'echo "=== PM2 ===" && (which pm2 && pm2 list || echo NOT_FOUND)',
    'echo "=== Git ===" && (which git && git --version || echo NOT_FOUND)',
]

cmd = ' ; '.join(commands)
stdin, stdout, stderr = ssh.exec_command(cmd)
out = stdout.read().decode()
err = stderr.read().decode()
print(out)
if err:
    print("STDERR:", err)
ssh.close()
