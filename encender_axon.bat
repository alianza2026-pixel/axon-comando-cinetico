@echo off
:: AXON SST | COMANDO CINETICO - STARTUP SCRIPT - ANSI VERSION
chcp 65001 > nul
setlocal

:: Configuracion del Directorio (Ruta Absoluta)
set "PROJECT_DIR=c:\Users\lulu1\Downloads\axon-sst-_-comando-cinético"
cd /d "%PROJECT_DIR%"

title AXON SISTEMA - MOTOR INICIADO
color 0a

echo.
echo ===========================================================
echo       AXON SST ^| COMANDO CINETICO - MOTOR INICIADO
echo ===========================================================
echo.
echo Directorio: %PROJECT_DIR%
echo Iniciando Servidor de Desarrollo...
echo.

:: Ejecutar el servidor
:: Abre el navegador en la dirección correcta. El "" es para que start no interprete la URL como un título de ventana.
start "" http://localhost:3000
:: Inicia el servidor de desarrollo. La salida se mostrará en esta ventana.
npm run dev

echo.
echo El servidor se ha detenido.
pause
