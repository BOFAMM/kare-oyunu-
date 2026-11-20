@echo off
cd /d "%~dp0"
powershell -NoProfile -Command "$ErrorActionPreference='Stop'; $env:HOST='127.0.0.1'; $env:PORT='41721'; $env:KARE_OWNER_LAB='1'; $bytes=New-Object byte[] 32; $rng=[Security.Cryptography.RandomNumberGenerator]::Create(); $rng.GetBytes($bytes); $env:GAME_ADMIN_KEY=([BitConverter]::ToString($bytes)).Replace('-','').ToLowerInvariant(); $rng.Dispose(); if (Get-NetTCPConnection -State Listen -LocalPort 41721 -ErrorAction SilentlyContinue) { throw 'Once eski yonetici sunucusunu kapatin.' }; Set-Clipboard $env:GAME_ADMIN_KEY; $null=Start-Job { Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:41721/#komutan-girisi' }; node server.mjs"
pause
