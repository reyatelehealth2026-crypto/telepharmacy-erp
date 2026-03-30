#!/bin/bash
pkill dockerd 2>/dev/null
sleep 1
rm -f /var/run/docker.sock
nohup /usr/bin/dockerd -H unix:///var/run/docker.sock >/tmp/dockerd.log 2>&1 &
DPID=$!
echo "dockerd PID: $DPID"
for i in $(seq 1 15); do
  sleep 1
  if [ -S /var/run/docker.sock ]; then
    echo "Docker socket ready after ${i}s"
    break
  fi
  echo "Waiting ${i}s..."
done
ls -la /var/run/docker.sock 2>&1
