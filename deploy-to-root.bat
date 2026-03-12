@echo off
REM Script para Windows - Copiar archivos compilados a la raíz
echo Compilando proyecto...
call npm run build

echo Copiando archivos de dist a la raiz...
xcopy /E /I /Y dist\* .
copy /Y .htaccess . 2>nul

echo Archivos copiados!
echo.
echo Ahora haz commit y push:
echo   git add .
echo   git commit -m "Deploy compiled files"
echo   git push origin main
pause
