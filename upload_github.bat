@echo off
SET "REPO=https://github.com/Frederhx/Manager-SquareCloud.git"

git config --global user.name "Frederhx"
git config --global user.email "fredericoceliacn@gmail.com"

echo Fazendo pull para sincronizar com o GitHub...
git pull origin main --allow-unrelated-histories

echo Adicionando arquivos...
git add .

echo Commitando as alterações...
git commit -m "Atualizando arquivos locais"

echo Enviando para o GitHub...
git push origin main

echo.
echo ✅ Upload concluído com sincronização!
pause
