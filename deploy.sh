#!/bin/bash
set -e

SERVER=sol@154.62.226.245
KEY=~/.ssh/id_devman
APP=/home/lumo/app

echo "→ Синхронизация файлов..."
rsync -avz --delete \
  -e "ssh -i $KEY -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ServerAliveCountMax=20" \
  --rsync-path="sudo rsync" \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.env \
  --exclude=.env.local \
  --exclude=.git \
  --exclude='*.tsbuildinfo' \
  "$(dirname "$0")/" \
  $SERVER:$APP/
ssh -i $KEY -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ServerAliveCountMax=20 $SERVER "sudo chown -R lumo:lumo $APP"

echo "→ Установка зависимостей (от lumo)..."
ssh -i $KEY -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ServerAliveCountMax=20 $SERVER "sudo -u lumo bash -c 'cd $APP && npm install --no-audit --no-fund'"

echo "→ Миграции БД (от lumo)..."
ssh -i $KEY -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ServerAliveCountMax=20 $SERVER "sudo -u lumo bash -c 'cd $APP && node_modules/.bin/tsx scripts/db/migrate.ts'"

echo "→ Сборка (от lumo)..."
ssh -i $KEY -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ServerAliveCountMax=20 $SERVER "
  sudo rm -f /tmp/lumo-build.log
  sudo -u lumo touch /tmp/lumo-build.log
  sudo -u lumo rm -rf $APP/.next
  sudo -u lumo bash -c 'cd $APP && node_modules/.bin/next build > /tmp/lumo-build.log 2>&1; echo EXIT:\$?' | grep EXIT
  cat /tmp/lumo-build.log | tail -5
"

echo "→ Копирование статики и перезапуск..."
ssh -i $KEY -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ServerAliveCountMax=20 $SERVER "
  sudo -u lumo cp -r $APP/.next/static $APP/.next/standalone/.next/static
  sudo -u lumo cp -r $APP/public $APP/.next/standalone/public
  sudo -u lumo cp -r $APP/node_modules/playwright-core/. $APP/.next/standalone/node_modules/playwright-core/
  sudo -u lumo cp -r $APP/node_modules/playwright/. $APP/.next/standalone/node_modules/playwright/
  sudo systemctl restart lumo-store
  sleep 2
  sudo systemctl is-active lumo-store
"

echo "✓ Готово"
