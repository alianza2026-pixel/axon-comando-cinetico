---
description: Rutina rápida para subir cambios a GitHub
---

# Rutina: Github Ready

Este flujo de trabajo se dispara cuando el usuario dice "github ready" o invoca `/github-ready`. Su objetivo es preparar, registrar y subir todo el código modificado directamente al repositorio remoto.

1.  **Verificar mensaje:** Si el usuario no te dio un mensaje específico para el commit en el mismo mensaje, asume que el mensaje es: *"chore: Actualizaciones menores y mantenimiento"*. Si el usuario te dio un mensaje al decir "github ready [mensaje]", utiliza el del usuario.

// turbo
2.  **Sincronizar:** Ejecuta la secuencia de comandos de git para guardar todo y subir a la nube. Asegúrate de usar el mensaje capturado en el paso 1 en lugar de `[MENSAJE]`.

```powershell
git add .
git commit -m "[MENSAJE]"
git push
```

3.  **Confirmar:** Revisa con la herramienta `command_status` que la secuencia se haya completado correctamente de acuerdo con la salida de git y coméntale al usuario que sus actualizaciones están listas en el repositorio web.
