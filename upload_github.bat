@echo off
REM === CONFIGURAÇÕES ===
SET "REPO=https://github.com/Frederhx/Manager-SquareCloud.git"

REM === INÍCIO DO SCRIPT ===
echo Iniciando upload para o GitHub...

git init
git remote add origin %REPO%
git add .
git commit --allow-empty-message -m ""
git branch -M main
git push -u origin main

echo.
echo ✅ Upload concluído com sucesso para: %REPO%
pause
