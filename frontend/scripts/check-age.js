#!/usr/bin/env node
/**
 * Script de verificación de antigüedad de dependencias npm
 * 
 * Características:
 * - Configuración via check-age.config.json (minimumReleaseAgeInMinutes, minimumReleaseAgeExclude, createDebugFile)
 * - Soporta package-lock.json: usa versiones exactas si existe
 * - Soporta proxy corporativo (HTTP o HTTPS) desde env o .npmrc
 * - Soporta CA corporativo mediante variable CORPORATE_CA
 * - TLS seguro con validación de certificados
 * - Sin dependencias externas: solo módulos nativos de Node.js
 * 
 * Uso: node scripts/check-age.js
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const net = require("net");
const tls = require("tls");
const readline = require("readline");

// ------------------------------------
const DEFAULT_MIN_MINUTES = 43200; // 30 días en minutos
const CONFIG_FILE = path.join(__dirname, 'check-age.config.json');
const REGISTRY = "https://registry.npmjs.org";
const LOG_FILE = path.join(__dirname, 'check-age.log');
// ------------------------------------

// Cache para evitar consultar el mismo paquete múltiples veces
const packageCache = new Map();
const verifiedPackages = new Set();
let debugLog = [];
let DEBUG_MODE = false;

// -----------------------------
// Funciones de logging
// -----------------------------
function logDebug(message, indent = 0) {
  if (!DEBUG_MODE) return;
  const indentStr = '  '.repeat(indent);
  const logMsg = `${indentStr}${message}`;
  debugLog.push(logMsg);
}

function writeDebugLog() {
  if (!DEBUG_MODE || debugLog.length === 0) return;
  
  const timestamp = new Date().toISOString();
  const header = `${'='.repeat(80)}\nCheck Age Debug Log - ${timestamp}\n${'='.repeat(80)}\n\n`;
  
  try {
    fs.writeFileSync(LOG_FILE, header + debugLog.join('\n') + '\n', 'utf8');
    console.log(`\n📝 Debug log guardado en: ${LOG_FILE}`);
  } catch (err) {
    console.error(`⚠️ No se pudo guardar el log: ${err.message}`);
  }
}

// Limpiar log al inicio si existe
function initDebugLog() {
  if (DEBUG_MODE && fs.existsSync(LOG_FILE)) {
    try {
      fs.unlinkSync(LOG_FILE);
    } catch (err) {
      // Ignorar error si no se puede eliminar
    }
  }
}

// -----------------------------
// Funciones auxiliares para semver
// -----------------------------
function parseVersionRange(versionRange) {
  const trimmed = versionRange.trim();
  
  // Exact version
  if (/^\d+\.\d+\.\d+/.test(trimmed)) {
    return { type: 'exact', version: trimmed.match(/\d+\.\d+\.\d+/)[0] };
  }
  
  // Caret (^) - compatible con versión minor
  if (trimmed.startsWith('^')) {
    const version = trimmed.slice(1);
    return { type: 'caret', version };
  }
  
  // Tilde (~) - compatible con versión patch
  if (trimmed.startsWith('~')) {
    const version = trimmed.slice(1);
    return { type: 'tilde', version };
  }
  
  // Greater than (>, >=)
  if (trimmed.startsWith('>=')) {
    const version = trimmed.slice(2).trim();
    return { type: 'gte', version };
  }
  
  if (trimmed.startsWith('>')) {
    const version = trimmed.slice(1).trim();
    return { type: 'gt', version };
  }
  
  // Default to exact
  return { type: 'exact', version: trimmed.replace(/^[^\d]*/, '') };
}

function getMatchingVersions(allVersions, range) {
  const { type, version } = range;
  const [major, minor, patch] = version.split('.').map(Number);
  
  return allVersions.filter(v => {
    const [vMajor, vMinor, vPatch] = v.split('.').map(Number);
    
    switch (type) {
      case 'exact':
        return v === version;
      
      case 'caret': // ^1.2.3 matches >=1.2.3 <2.0.0
        if (vMajor !== major) return false;
        if (vMajor === 0) {
          // ^0.x.y -> only same minor
          if (vMinor !== minor) return false;
          return vPatch >= patch;
        }
        if (vMinor < minor) return false;
        if (vMinor === minor) return vPatch >= patch;
        return true;
      
      case 'tilde': // ~1.2.3 matches >=1.2.3 <1.3.0
        if (vMajor !== major || vMinor !== minor) return false;
        return vPatch >= patch;
      
      case 'gte':
        if (vMajor > major) return true;
        if (vMajor < major) return false;
        if (vMinor > minor) return true;
        if (vMinor < minor) return false;
        return vPatch >= patch;
      
      case 'gt':
        if (vMajor > major) return true;
        if (vMajor < major) return false;
        if (vMinor > minor) return true;
        if (vMinor < minor) return false;
        return vPatch > patch;
      
      default:
        return false;
    }
  });
}

// -----------------------------
// Detectar configuración de proxy
// -----------------------------
let proxy =
  process.env.HTTPS_PROXY ||
  process.env.HTTP_PROXY ||
  null;

// Leer .npmrc
if (!proxy) {
  const npmrcPath = path.join(process.cwd(), ".npmrc");
  if (fs.existsSync(npmrcPath)) {
    const npmrc = fs.readFileSync(npmrcPath, "utf8");
    const m1 = npmrc.match(/^https-proxy=(.*)$/m);
    const m2 = npmrc.match(/^proxy=(.*)$/m);
    proxy = m1?.[1] || m2?.[1] || null;
  }
}

// Certificado CA corporativo
let extraCA = null;
if (process.env.CORPORATE_CA && fs.existsSync(process.env.CORPORATE_CA)) {
  extraCA = fs.readFileSync(process.env.CORPORATE_CA);
}

// -----------------------------
// Función para peticiones HTTPS con soporte de proxy sin dependencias
// -----------------------------
function httpsRequestWithProxy(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);

    // Si NO hay proxy → petición normal
    if (!proxy) {
      return https.get(
        {
          hostname: urlObj.hostname,
          path: urlObj.pathname + urlObj.search,
          port: 443,
          rejectUnauthorized: true,
          ca: extraCA ? [extraCA] : undefined,
        },
        (res) => resolve(res)
      ).on("error", reject);
    }

    // Con proxy
    const proxyUrl = new URL(proxy);
    const proxyHost = proxyUrl.hostname;
    const proxyPort = proxyUrl.port || 8080;

    // 1) Crear túnel CONNECT
    const socket = net.connect(proxyPort, proxyHost, () => {
      socket.write(
        `CONNECT ${urlObj.hostname}:443 HTTP/1.1\r\n` +
        `Host: ${urlObj.hostname}\r\n` +
        `Connection: close\r\n\r\n`
      );
    });

    socket.once("error", reject);

    socket.once("data", (chunk) => {
      const response = chunk.toString();
      if (!response.includes("200")) {
        return reject(
          new Error("Proxy CONNECT failed: " + response.split("\n")[0])
        );
      }

      // 2) Establecer TLS sobre el túnel
      const tlsSocket = tls.connect(
        {
          socket,
          servername: urlObj.hostname,
          rejectUnauthorized: true,
          ca: extraCA ? [extraCA] : undefined,
        },
        () => {
          const req = https.request(
            {
              host: urlObj.hostname,
              path: urlObj.pathname + urlObj.search,
              method: "GET",
              createConnection: () => tlsSocket,
            },
            (res) => resolve(res)
          );
          req.on("error", reject);
          req.end();
        }
      );

      tlsSocket.on("error", reject);
    });
  });
}

// -----------------------------
// Función para obtener JSON del registry
// -----------------------------
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    httpsRequestWithProxy(url)
      .then((res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      })
      .catch(reject);
  });
}

// -----------------------------
// Función para cargar configuración
// -----------------------------
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      console.log(`📄 Configuración cargada desde ${CONFIG_FILE}\n`);
      return {
        disabled: config.disabled || false,
        minimumReleaseAgeInMinutes: config.minimumReleaseAgeInMinutes || DEFAULT_MIN_MINUTES,
        minimumReleaseAgeExclude: config.minimumReleaseAgeExclude || [],
        createDebugFile: config.createDebugFile || false
      };
    }
  } catch (err) {
    console.warn(`⚠️ Error leyendo configuración: ${err.message}`);
  }
  
  console.log(`📄 Usando configuración por defecto (no existe ${CONFIG_FILE})\n`);
  return {
    disabled: false,
    minimumReleaseAgeInMinutes: DEFAULT_MIN_MINUTES,
    minimumReleaseAgeExclude: [],
    createDebugFile: false
  };
}

// -----------------------------
// Función para verificar un paquete y sus dependencias recursivamente
// -----------------------------
async function checkPackageRecursive(name, versionRange, config, depth = 0, maxDepth = 5) {
  const cacheKey = `${name}@${versionRange}`;
  const { minimumReleaseAgeInMinutes, minimumReleaseAgeExclude } = config;
  
  // Si ya verificamos este paquete exacto, retornar resultado cacheado
  if (verifiedPackages.has(cacheKey)) {
    logDebug(`↩️ Ya verificado: ${cacheKey} (cache hit)`, depth);
    return packageCache.get(cacheKey);
  }
  
  // Si el paquete está en la lista de exclusión, omitirlo
  if (minimumReleaseAgeExclude.includes(name)) {
    logDebug(`⏭️ Paquete excluido: ${name}`, depth);
    verifiedPackages.add(cacheKey);
    return { errors: [], warnings: [], checked: 0 };
  }

  // Limitar profundidad para evitar ciclos infinitos
  if (depth > maxDepth) {
    logDebug(`⏹️ Profundidad máxima alcanzada para ${name}`, depth);
    return { errors: [], warnings: [], checked: 0 };
  }

  logDebug(`🔍 Verificando ${name}@${versionRange} (depth: ${depth})`, depth);

  const url = `${REGISTRY}/${name}`;
  const errors = [];
  const warnings = [];
  let checked = 1;

  try {
    const meta = await fetchJson(url);

    if (!meta.time || !meta.versions) {
      logDebug(`⚠️ No hay información de tiempo para ${name}`, depth);
      verifiedPackages.add(cacheKey);
      return { errors, warnings, checked: 0 };
    }

    // Determinar versión exacta a verificar
    let exactVersion;
    let matchingVersions = [];
    
    if (!/^[~^>]/.test(versionRange)) {
      exactVersion = versionRange.replace(/^[^\d]*/, "");
    } else {
      const range = parseVersionRange(versionRange);
      const allVersions = Object.keys(meta.versions).filter(v => /^\d+\.\d+\.\d+$/.test(v));
      matchingVersions = getMatchingVersions(allVersions, range);
      exactVersion = matchingVersions[matchingVersions.length - 1];
    }

    if (!exactVersion || !meta.time[exactVersion]) {
      logDebug(`⚠️ No se pudo determinar versión para ${name}@${versionRange}`, depth);
      verifiedPackages.add(cacheKey);
      return { errors, warnings, checked: 0 };
    }

    // Verificar antigüedad del paquete
    const published = new Date(meta.time[exactVersion]);
    const ageMinutes = (Date.now() - published) / (1000 * 60);
    const ageDays = ageMinutes / (60 * 24);

    // Log compacto en una línea
    const statusIcon = ageMinutes < minimumReleaseAgeInMinutes ? '❌ KO' : '✅ OK';
    logDebug(`📌 V. resuelta: ${exactVersion} => 📅 ${published.toISOString().split('T')[0]} (${ageMinutes.toFixed(0)} min / ${ageDays.toFixed(1)} días) => ${statusIcon}`, depth);

    if (ageMinutes < minimumReleaseAgeInMinutes) {
      const errorMsg = depth === 0 
        ? `${name}@${versionRange} → ${exactVersion} (${ageMinutes.toFixed(0)} min / ${ageDays.toFixed(1)} días)`
        : `${name}@${exactVersion} (${ageMinutes.toFixed(0)} min / ${ageDays.toFixed(1)} días) [subdependencia]`;
      errors.push(errorMsg);
    }

    // Verificar si hay versiones muy recientes (últimos 7 días = 10080 minutos)
    const allVersions = Object.keys(meta.versions).filter(v => /^\d+\.\d+\.\d+$/.test(v));
    const recentVersions = allVersions.filter(v => {
      if (!meta.time[v]) return false;
      const vAgeMinutes = (Date.now() - new Date(meta.time[v])) / (1000 * 60);
      return vAgeMinutes < 10080; // 7 días
    });

    if (recentVersions.length > 0 && ageMinutes >= minimumReleaseAgeInMinutes) {
      const warnMsg = `${name}@${versionRange} - ⚠️ ${recentVersions.length} versión(es) en últimos 7 días: ${recentVersions.slice(-3).join(', ')}`;
      warnings.push(warnMsg);
      logDebug(`⚠️ Actividad reciente detectada`, depth);
    }

    // Analizar subdependencias recursivamente
    const versionData = meta.versions[exactVersion];
    if (versionData && versionData.dependencies && depth < maxDepth) {
      const subDeps = versionData.dependencies;
      logDebug(`📦 Encontradas ${Object.keys(subDeps).length} subdependencias`, depth);
      
      for (const [subName, subVersion] of Object.entries(subDeps)) {
        try {
          const subResult = await checkPackageRecursive(subName, subVersion, config, depth + 1, maxDepth);
          if (subResult) {
            errors.push(...(subResult.errors || []));
            warnings.push(...(subResult.warnings || []));
            checked += (subResult.checked || 0);
          }
        } catch (subErr) {
          logDebug(`⚠️ Error en subdependencia ${subName}: ${subErr.message}`, depth + 1);
          // Continuar con otras subdependencias
        }
      }
    }

    // Guardar en cache
    const result = { errors, warnings, checked };
    packageCache.set(cacheKey, result);
    verifiedPackages.add(cacheKey);
    
    return result;

  } catch (err) {
    logDebug(`❌ Error: ${err.message}`, depth);
    // Retornar objeto vacío en lugar de lanzar error
    const result = { errors: [], warnings: [], checked: 0 };
    verifiedPackages.add(cacheKey);
    return result;
  }
}

// -----------------------------
// Función para solicitar input del usuario
// -----------------------------
function promptUser(question) {
  // Si stdin no es un terminal (ej: ejecutado desde npm script), retornar vacío
  if (!process.stdin.isTTY) {
    return Promise.resolve("");
  }
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// -----------------------------
// Lógica principal
// -----------------------------
async function main() {
  // Cargar configuración desde archivo
  const config = loadConfig();
  
  // Configurar modo debug desde archivo de configuración
  DEBUG_MODE = config.createDebugFile;

  if(config.disabled) {
    console.log("⚠️ El script de verificación de antigüedad está deshabilitado en la configuración. Saliendo sin verificar.");
    return;
  }
  
  // Inicializar log de debug
  initDebugLog();
  
  const days = (config.minimumReleaseAgeInMinutes / 60 / 24).toFixed(1);
  
  logDebug(`Configuración:`);
  logDebug(`  - Minutos mínimos: ${config.minimumReleaseAgeInMinutes} (${days} días)`);
  logDebug(`  - Paquetes excluidos: ${config.minimumReleaseAgeExclude.join(', ') || 'ninguno'}`);
  logDebug(`  - Debug file: ${config.createDebugFile}`);

  console.log(`🔍 Verificando dependencias con antigüedad mínima de ${config.minimumReleaseAgeInMinutes} minutos (${days} días)...\n`);

  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  let deps = { ...pkg.dependencies, ...pkg.devDependencies };

  // Si existe package-lock.json, usar las versiones exactas de ahí
  const lockPath = "package-lock.json";
  let usingLockFile = false;
  if (fs.existsSync(lockPath)) {
    try {
      const lockData = JSON.parse(fs.readFileSync(lockPath, "utf8"));
      usingLockFile = true;
      console.log("📦 Usando versiones de package-lock.json\n");
      
      // Para package-lock v2 y v3 (lockfileVersion 2 o 3)
      if (lockData.packages) {
        const lockDeps = {};
        for (const [pkgPath, pkgInfo] of Object.entries(lockData.packages)) {
          // Skip root package (empty string key)
          if (pkgPath === "") continue;
          
          // Extract package name from path (remove node_modules/ prefix)
          const name = pkgPath.replace(/^node_modules\//, "");
          
          // Only include if it's in our dependencies
          if (deps[name] && pkgInfo.version) {
            lockDeps[name] = pkgInfo.version;
          }
        }
        
        // Update deps with exact versions from lock file
        for (const [name, version] of Object.entries(lockDeps)) {
          deps[name] = version;
        }
      }
      // Para package-lock v1 (lockfileVersion 1)
      else if (lockData.dependencies) {
        for (const [name, info] of Object.entries(lockData.dependencies)) {
          if (deps[name] && info.version) {
            deps[name] = info.version;
          }
        }
      }
    } catch (err) {
      console.warn(`⚠️ No se pudo leer package-lock.json: ${err.message}\n`);
    }
  }

  const errors = [];
  const warnings = [];
  let totalChecked = 0;

  logDebug(`\n${'='.repeat(60)}`);
  logDebug(`Iniciando análisis de ${Object.keys(deps).length} dependencias principales`);
  logDebug(`Con lock file: ${usingLockFile}`);
  logDebug(`${'='.repeat(60)}\n`);

  // Análisis recursivo de todas las dependencias
  for (const [name, versionRange] of Object.entries(deps)) {
    try {
      logDebug(`\n>>> Analizando dependencia principal: ${name}@${versionRange}`);
      const result = await checkPackageRecursive(name, versionRange, config, 0);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
      totalChecked += result.checked;
      logDebug(`<<< Completado: ${name} (${result.checked} paquetes verificados)\n`);
    } catch (err) {
      console.error(`❌ Error consultando ${name}: ${err.message}`);
      logDebug(`❌ Error fatal en ${name}: ${err.stack}`);
      writeDebugLog();
      process.exit(1);
    }
  }

  logDebug(`\n${'='.repeat(60)}`);
  logDebug(`Análisis completado`);
  logDebug(`Total de paquetes únicos verificados: ${verifiedPackages.size}`);
  logDebug(`Total de verificaciones realizadas: ${totalChecked}`);
  logDebug(`Errores encontrados: ${errors.length}`);
  logDebug(`Advertencias encontradas: ${warnings.length}`);
  logDebug(`${'='.repeat(60)}\n`);

  // Resumen final de paquetes KO
  if (errors.length > 0) {
    const days = (config.minimumReleaseAgeInMinutes / 60 / 24).toFixed(1);
    logDebug(`\n${'🔴'.repeat(30)}`);
    logDebug(`RESUMEN FINAL - PAQUETES KO (menos de ${config.minimumReleaseAgeInMinutes} min / ${days} días)`);
    logDebug(`${'🔴'.repeat(30)}\n`);
    
    const uniqueErrors = [...new Set(errors)];
    uniqueErrors.forEach((error, index) => {
      logDebug(`${index + 1}. ❌ ${error}`, 0);
    });
    
    logDebug(`\n${'🔴'.repeat(30)}`);
    logDebug(`Total de paquetes KO: ${uniqueErrors.length}`);
    logDebug(`${'🔴'.repeat(30)}\n`);
  } else {
    const days = (config.minimumReleaseAgeInMinutes / 60 / 24).toFixed(1);
    logDebug(`\n✅ No se encontraron paquetes con antigüedad menor a ${config.minimumReleaseAgeInMinutes} min (${days} días)\n`);
  }

  // Mostrar resumen
  if (DEBUG_MODE) {
    console.log(`\n📊 Estadísticas:`);
    console.log(`   - Paquetes únicos verificados: ${verifiedPackages.size}`);
    console.log(`   - Total de verificaciones: ${totalChecked}`);
  }

  // Mostrar advertencias si las hay
  if (warnings.length > 0) {
    console.warn("\n⚠️ Advertencias - Paquetes con actualizaciones muy recientes:\n");
    // Eliminar duplicados
    const uniqueWarnings = [...new Set(warnings)];
    for (const w of uniqueWarnings.slice(0, 10)) console.warn(" - " + w);
    if (uniqueWarnings.length > 10) {
      console.warn(`\n   ... y ${uniqueWarnings.length - 10} advertencias más (ver log para detalles)`);
    }
    if (!usingLockFile) {
      console.warn("\n💡 Considera actualizar package-lock.json para fijar versiones específicas.\n");
    }
  }

  const displayDays = (config.minimumReleaseAgeInMinutes / 60 / 24).toFixed(1);
  
  if (errors.length) {
    console.error("\n❌ Dependencias demasiado recientes:\n");
    // Eliminar duplicados
    const uniqueErrors = [...new Set(errors)];
    for (const e of uniqueErrors.slice(0, 20)) console.error(" - " + e);
    if (uniqueErrors.length > 20) {
      console.error(`\n   ... y ${uniqueErrors.length - 20} errores más (ver log para detalles)`);
    }
    console.error(`\n💡 Estas dependencias tienen menos de ${config.minimumReleaseAgeInMinutes} minutos (${displayDays} días) desde su publicación.`);
    writeDebugLog();
    process.exit(1);
  }

  console.log(`✔️ Todas las dependencias cumplen la antigüedad mínima de ${config.minimumReleaseAgeInMinutes} minutos (${displayDays} días).`);
  console.log(`   Verificados: ${verifiedPackages.size} paquetes únicos (${totalChecked} verificaciones totales incluyendo subdependencias)`);
  
  writeDebugLog();
}

main();
