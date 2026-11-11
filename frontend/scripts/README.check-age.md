# Check Age Script

## Descripción

Este script está diseñado para verificar la antigüedad de las dependencias npm en `package.json` (y `package-lock.json` si existe) con el objetivo de mitigar problemas como los causados por paquetes comprometidos o actualizaciones muy recientes que puedan introducir vulnerabilidades.

El script utiliza un archivo de configuración `check-age.config.json` inspirado en [pnpm](https://pnpm.io/settings#minimumreleaseage) que define el número mínimo de minutos de antigüedad (por defecto **43200 minutos = 30 días**) y permite excluir paquetes específicos. Valida que todas las dependencias (tanto `dependencies` como `devDependencies`) cumplan con ese requisito desde su publicación en el registro de npm. Si detecta un archivo `package-lock.json`, utilizará las versiones exactas instaladas en lugar de los rangos de versión, asegurando la verificación de las versiones reales que se desplegarán.

## Características

- ⚙️ **Configuración JSON**: Define `minimumReleaseAgeInMinutes` y `minimumReleaseAgeExclude` en `check-age.config.json` (inspirado en [pnpm](https://pnpm.io/settings#minimumreleaseage))
- ✅ **Sin dependencias externas**: Usa únicamente módulos nativos de Node.js
- 💬 **Modo interactivo**: Solicita el número de minutos mínimos al ejecutar (por defecto 43200 = 30 días)
- 🚫 **Exclusión de paquetes**: Lista de paquetes que no se verificarán (útil para dependencias internas o de confianza)
- 📦 **Soporte para package-lock.json**: Si existe, usa las versiones exactas instaladas en lugar de los rangos de versión
- 🎯 **Resolución inteligente de versiones**: Sin lock file, resuelve rangos semver (`^`, `~`, `>`) y verifica la versión más reciente compatible
- 🌳 **Análisis recursivo de subdependencias**: Verifica **todas** las dependencias transitivas, no solo las directas (crucial para detectar amenazas como el virus Shai)
- 🔄 **Caché inteligente**: Evita verificar el mismo paquete múltiples veces, optimizando el rendimiento
- ⚠️ **Detección de actualizaciones recientes**: Alerta sobre paquetes con versiones publicadas en los últimos 7 días
- 🐛 **Modo debug**: Genera logs detallados del árbol completo de dependencias verificadas
- 🔒 **Soporte para proxy corporativo**: Lee automáticamente la configuración de proxy de variables de entorno y `.npmrc`
- 🛡️ **Soporte para certificados corporativos**: Permite usar CA personalizados mediante variable de entorno
- 🔍 **TLS seguro**: Verifica certificados SSL/TLS correctamente

## Requisitos

- Node.js instalado
- Debe añadirse en la raíz del proyecto con la siguiente estructura:
  ```
  scripts/
    check-age.js
    check-age.config.json
  package.json
  ```

## Configuración

Crea un archivo `scripts/check-age.config.json` con el siguiente formato:

```json
{
  "minimumReleaseAgeInMinutes": 43200,
  "minimumReleaseAgeExclude": ["@internal/package", "trusted-lib"],
  "createDebugFile": true
}
```

### Opciones de configuración

- **`minimumReleaseAgeInMinutes`** *(número)*: Edad mínima en minutos que debe tener un paquete desde su publicación. Por defecto: `43200` (30 días).
  - Ejemplo: `10080` = 7 días, `43200` = 30 días, `86400` = 60 días
  
- **`minimumReleaseAgeExclude`** *(array de strings)*: Lista de nombres de paquetes que se excluirán de la verificación. Por defecto: `[]`.
  - Útil para paquetes internos, organizacionales o de confianza absoluta
  - Los paquetes excluidos no se verificarán ni en dependencias directas ni en subdependencias

- **`createDebugFile`** *(boolean)*: Genera un archivo de log detallado `scripts/check-age.log` con el árbol completo de dependencias analizadas. Por defecto: `false`.
  - Incluye versiones resueltas, fechas de publicación, profundidad, cache hits y resumen final de paquetes KO
  - Útil para debugging y auditorías detalladas

**Nota:** Inspirado en las configuraciones [`minimumReleaseAge`](https://pnpm.io/settings#minimumreleaseage) y [`minimumReleaseAgeExclude`](https://pnpm.io/settings#minimumreleaseageexclude) de pnpm.

## Uso

### Ejecución

```bash
# Usa la configuración del archivo check-age.config.json
node scripts/check-age.js

# O mediante npm script
npm run check:deps-age
```

El script lee toda la configuración desde `check-age.config.json`:
- `minimumReleaseAgeInMinutes`: Minutos mínimos de antigüedad
- `minimumReleaseAgeExclude`: Paquetes a excluir de la verificación
- `createDebugFile`: Si debe generar archivo de log detallado

### Archivo de debug

Para obtener un análisis detallado con logs del árbol completo de dependencias, configura `createDebugFile: true` en `check-age.config.json`:

```json
{
  "minimumReleaseAgeInMinutes": 10080,
  "minimumReleaseAgeExclude": [],
  "createDebugFile": true
}
```

Cuando `createDebugFile: true`, se genera un archivo `scripts/check-age.log` que contiene:
- Árbol completo de dependencias analizadas
- Profundidad de cada dependencia
- Versiones resueltas para cada paquete
- Fechas de publicación en minutos y días
- Caché hits/misses
- Resumen final con lista numerada de paquetes KO
- Estadísticas detalladas del análisis

**Ejemplo de contenido del log (`scripts/check-age.log`):**
```
============================================================
Iniciando análisis de 45 dependencias principales
============================================================

>>> Analizando dependencia principal: @angular/core@19.2.0
🔍 Verificando @angular/core@19.2.0 (depth: 0)
📌 V. resuelta: 19.2.0 => 📅 2025-02-26 (405303 min / 281.5 días) => ✅ OK
📦 Encontradas 1 subdependencias
  🔍 Verificando tslib@^2.3.0 (depth: 1)
  📌 V. resuelta: 2.8.1 => 📅 2024-10-31 (575131 min / 399.4 días) => ✅ OK
<<< Completado: @angular/core (2 paquetes verificados)

...

🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴
RESUMEN FINAL - PAQUETES KO (menos de 10080 min / 7.0 días)
🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴

1. ❌ browserslist@4.28.1 (1024 min / 0.7 días) [subdependencia]
2. ❌ default-browser@5.2.1 (27552 min / 19.1 días) [subdependencia]

🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴
Total de paquetes KO: 2
🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴
```

> **Nota:** Con `createDebugFile: true`, toda la información se guarda en el archivo de log. La salida en consola permanece limpia mostrando solo los resultados principales.

**Ejemplo de ejecución:**
```
📄 Configuración cargada desde C:\path\to\scripts\check-age.config.json

🔍 Verificando dependencias con antigüedad mínima de 10080 minutos (7.0 días)...

📎 Usando versiones de package-lock.json

✔️ Todas las dependencias cumplen la antigüedad mínima de 10080 minutos (7.0 días).
   Verificados: 1502 paquetes únicos (10048 verificaciones totales incluyendo subdependencias)

📝 Debug log guardado en: C:\path\to\scripts\check-age.log
```

> **Nota importante sobre `package-lock.json`:** 
> 
> Si existe `package-lock.json` en el proyecto, el script usará las versiones exactas instaladas en lugar de los rangos de versión definidos en `package.json`. Esto asegura que se verifiquen las versiones reales que se instalarán.
> 
> **Sin `package-lock.json`**, el script ahora **resuelve automáticamente los rangos de versión** para verificar la versión más reciente compatible que npm instalaría:
> - `^1.2.0` → verifica la última versión compatible 1.x.x
> - `~1.2.0` → verifica la última versión compatible 1.2.x
> - `>1.0.0` → verifica versiones superiores a 1.0.0
> 
> Además, el script **detecta si el paquete tiene actualizaciones muy recientes** (últimos 7 días) y muestra advertencias, incluso si la versión que se instalará es antigua. Esto ayuda a identificar paquetes que están siendo actualizados frecuentemente y podrían tener cambios importantes.
> 
> **Recomendación:** Aunque el script ahora resuelve rangos de versión, mantener actualizado el `package-lock.json` sigue siendo la mejor práctica para garantizar builds reproducibles.

## Análisis de subdependencias

El script analiza **recursivamente todas las subdependencias** de tus paquetes, no solo las dependencias directas. Esto es crucial porque amenazas como el virus Shai afectan a múltiples librerías a través de dependencias transitivas.

**Ejemplo real:**
- Tu proyecto depende de `library-a@1.0.0`
- `library-a` depende de `vulnerable-package@2.0.0` (publicado hace 2 días)
- El script detectará que `vulnerable-package` es demasiado reciente, incluso si `library-a` es antigua

**Características del análisis:**
- ✅ Profundidad máxima de 5 niveles (configurable)
- ✅ Caché inteligente para evitar verificaciones duplicadas
- ✅ Detección de ciclos y prevención de bucles infinitos
- ✅ Contador de paquetes únicos vs verificaciones totales

**Salida de ejemplo:**
```
✔️ Todas las dependencias cumplen la antigüedad mínima de 30 días.
   Verificados: 1,245 paquetes únicos (3,892 verificaciones totales incluyendo subdependencias)
```

> **Nota:** El análisis recursivo puede tardar más tiempo, especialmente en proyectos grandes. Usa el modo debug para ver el progreso en detalle.

### Integración con Husky y npm scripts

El script está integrado en el proyecto para ejecutarse automáticamente en dos momentos:

```json
{
  "scripts": {
    "check:deps-age": "node scripts/check-age.js 43200",
    "preinstall": "node scripts/check-age.js"
  },
  "husky": {
    "hooks": {
      "pre-push": "npm run check:deps-age && npm run lint && npm run test:ci"
    }
  }
}
```

- **`preinstall`** (npm lifecycle hook): Verifica las dependencias automáticamente (usando configuración de `check-age.config.json`) antes de `npm install`
- **`pre-push`** (Husky Git hook): Verifica automáticamente (con 43200 minutos = 30 días) antes de hacer push al repositorio, junto con lint y tests

> **Nota:** `preinstall` es un script lifecycle de npm, no un hook de Git. Se ejecuta automáticamente antes de `npm install` o `npm ci`.
> 
> El script detecta automáticamente si se ejecuta desde un lifecycle script de npm y usa la configuración del archivo sin pedir confirmación. También puedes ejecutarlo manualmente de forma interactiva con `node scripts/check-age.js` o con minutos específicos como `node scripts/check-age.js 86400` (60 días).

## Configuración

### Proxy corporativo

El script detecta automáticamente la configuración de proxy de:
- Variables de entorno: `HTTPS_PROXY` o `HTTP_PROXY`
- Archivo `.npmrc` en la raíz del proyecto (propiedades `https-proxy` o `proxy`)

### Certificado corporativo

Si tu organización usa un certificado corporativo, configura la variable de entorno `CORPORATE_CA` apuntando al archivo del certificado en formato `.crt`:

```powershell
$env:CORPORATE_CA="C:\certs\corporate-proxy.crt"
```

## Solución de problemas

### Error de certificado SSL

Si obtienes un error como:
```
Error: unable to get local issuer certificate
    at TLSSocket.onConnectSecure (node:_tls_wrap:1677:34)
    at TLSSocket.emit (node:events:524:28)
    at TLSSocket._finishInit (node:_tls_wrap:1076:8)
    at ssl.onhandshakedone (node:_tls_wrap:862:12) {
  code: 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY'
}
```

Necesitas descargar y configurar el certificado corporativo:

**1. Exportar el certificado desde Chrome:**

- Ve a cualquier web con HTTPS
- Haz clic en el **candado** en la barra de direcciones
- Selecciona **"Connection is secure"** → **"Certificate is valid"**
- Ve a la pestaña **"Details"**
- Busca el certificado **Root / Authority**
- Click en **"Export"** → selecciona formato **`.crt`** o **`.pem`**
- Guarda el archivo en un directorio seguro (ej: `C:\certs\corporate-proxy.crt`)

**2. Configurar la variable de entorno:**

**Opción recomendada - Agregar al perfil de PowerShell (permanente para todas las sesiones):**

```powershell
# Agregar la variable al perfil de PowerShell
if (!(Test-Path $PROFILE)) { New-Item -Path $PROFILE -ItemType File -Force }
Add-Content -Path $PROFILE -Value "`n# Corporate CA Certificate`n`$env:CORPORATE_CA = 'C:\certs\corporate-proxy.crt'"

# Recargar el perfil en la sesión actual
. $PROFILE
```

Esta es la forma más confiable, ya que VS Code y las nuevas terminales no siempre cargan las variables de entorno del sistema hasta reiniciar completamente.

**Alternativa - Variables de entorno del sistema:**

Opción A - PowerShell (nivel usuario):
```powershell
[System.Environment]::SetEnvironmentVariable('CORPORATE_CA', 'C:\certs\corporate-proxy.crt', 'User')
```

Opción B - Interfaz gráfica:
- Presiona `Win + R` y escribe `sysdm.cpl`
- Ve a **"Opciones avanzadas"** → **"Variables de entorno"**
- En **"Variables de usuario"** click en **"Nueva"**
- Nombre: `CORPORATE_CA`, Valor: `C:\certs\corporate-proxy.crt`
- **Importante**: Debes **reiniciar VS Code completamente** para que tome efecto

**Si NO tienes permisos de administrador (temporal):**

Debes establecer la variable antes de cada ejecución:
```powershell
$env:CORPORATE_CA="C:\certs\corporate-proxy.crt"; node scripts/check-age.js
```

O para npm scripts:
```powershell
$env:CORPORATE_CA="C:\certs\corporate-proxy.crt"; npm run check:deps-age
```

## Configuración avanzada

### Cambiar el valor por defecto

Puedes modificar la constante `DEFAULT_MIN_DAYS` en el script (línea 19) para ajustar el valor por defecto de días mínimos:

```javascript
const DEFAULT_MIN_DAYS = 30; // Cambia este valor según tus necesidades
```

### Uso no interactivo (para CI/CD)

Para usar el script en pipelines de CI/CD sin interacción, puedes usar `echo` para proporcionar el valor:

```powershell
echo 30 | node scripts/check-age.js
```

O simplemente presionar Enter para usar el valor por defecto:

```powershell
echo "" | node scripts/check-age.js
```

## Resultado

- ✔️ **Éxito**: Todas las dependencias cumplen con la antigüedad mínima
- ❌ **Error**: Una o más dependencias son demasiado recientes, el script termina con código de salida 1 y muestra la lista de dependencias problemáticas

