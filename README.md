# 📻 Certificador Radio - Sistema Completo de Certificaciones

Sistema web avanzado para generar certificados de emisión de publicidad en radios ESRADIO y MARCADOR, con calendario personalizado, selector de radio individual, búsqueda inteligente y mucho más.

## 🚀 Características Principales

### **Funcionalidades Core**
- ✅ **Dual Mode**: Funciona con ZIP de logs O directamente con Excel de objetivos
- ✅ **Procesamiento local**: Todo se ejecuta en el navegador, sin enviar datos a servidores
- ✅ **Ajuste inteligente**: Sistema de cuñas sintéticas para alcanzar objetivos
- ✅ **Matching inteligente**: Reconoce nombres de clientes con similitud del 85%+
- ✅ **Descarga individual o masiva**: Certificados por cliente o ZIP completo
- ✅ **Plantillas predefinidas**: Soporte para formatos ESRADIO, MARCADOR y DUAL

### **Nuevas Características Avanzadas**
- 📅 **Calendario Personalizado**: Selecciona días específicos y configura emisiones por día
- 📻 **Selector de Radio**: Genera certificados ESRADIO, MARCADOR o DUAL individualmente
- 🔍 **Buscador de Clientes**: Búsqueda en tiempo real con contador dinámico
- 🎯 **Normalización Mejorada**: Limpieza automática de extensiones y nombres
- 📊 **Vista Completa**: Todos los clientes visibles sin límites

## 📖 Índice

1. [Inicio Rápido](#-inicio-rápido)
2. [Modos de Operación](#-modos-de-operación)
3. [Características Avanzadas](#-características-avanzadas)
4. [Formato Excel](#-formato-del-excel-clientesxlsx)
5. [Opciones de Descarga](#-opciones-de-descarga)
6. [Configuración Avanzada](#-configuración-avanzada-por-cliente)
7. [Ejemplos de Uso](#-ejemplos-de-uso)
8. [Solución de Problemas](#-solución-de-problemas)

---

## 🚀 Inicio Rápido

### **Método 1: Generación desde Excel (más rápido)**
1. Abre `index.html` en tu navegador
2. Sube `CLIENTES.xlsx` con objetivos
3. Click en "📊 PROCESAR"
4. Descarga certificados ⏱️ ~30 segundos

### **Método 2: Procesamiento con logs reales**
1. Sube ZIP de logs mensuales
2. (Opcional) Sube `CLIENTES.xlsx`
3. Click en "📊 PROCESAR"
4. Descarga certificados ⏱️ ~2-5 minutos

---

## 📋 Modos de Operación

### **Opción A: Solo Excel (Generación Completa desde Objetivos)**

**Ideal para:** Generar certificados basados únicamente en objetivos contractuales, sin logs reales.

**Pasos:**
1. Sube el archivo **CLIENTES.xlsx** con el formato:
   ```
   CLIENTE          | CUÑAS ER | CUÑAS RM
   -----------------|----------|----------
   AGRO SAN ISIDRO |    50    |    50
   ALMONOR         |    45    |    45
   AQUABONA        |    60    |     0
   ```

2. Selecciona el **mes y año** correspondiente

3. Haz clic en **"📊 PROCESAR"**

4. El sistema generará automáticamente:
   - Cuñas sintéticas distribuidas por todo el mes
   - Horarios realistas (8:00 - 22:00)
   - Rutas de archivo apropiadas
   - Certificados listos para descargar

**Resultado:** Certificados completos sin necesidad de logs reales.

---

### **Opción B: ZIP + Excel (Procesamiento Real con Ajustes)**

**Ideal para:** Procesar logs reales y ajustar a objetivos contractuales.

**Pasos:**
1. Sube el **ZIP mensual de logs** (carpetas ESRADIO y MARCADOR con archivos .log)

2. **(Opcional)** Sube el archivo **CLIENTES.xlsx** con objetivos

3. Selecciona el **mes y año**

4. Haz clic en **"📊 PROCESAR"**

5. El sistema:
   - Procesa todos los logs
   - Detecta clientes automáticamente
   - Agrupa por similitud de nombres
   - Si hay Excel, aplica ajustes automáticamente
   - Genera cuñas sintéticas para alcanzar objetivos

**Resultado:** Certificados basados en emisiones reales + ajustes si es necesario.

---

### **Opción C: Solo ZIP (Procesamiento Real sin Ajustes)**

**Ideal para:** Reportes de emisiones reales exactas.

**Pasos:**
1. Sube solo el **ZIP mensual de logs**

2. Haz clic en **"📊 PROCESAR"**

3. Descarga los certificados con las emisiones reales

**Resultado:** Certificados con las emisiones exactas detectadas en los logs.

---

## ✨ Características Avanzadas

### 📅 **Calendario de Emisiones Personalizado**

Selecciona días específicos del mes y configura cuántas emisiones generar en cada día.

**Funcionalidades:**
- ✅ Grid visual de 7x6 (Lunes a Domingo)
- ✅ Click en cualquier día para seleccionar/deseleccionar
- ✅ Input numérico por día (0-50 emisiones)
- ✅ Badge mostrando número de emisiones
- ✅ Botones: "Seleccionar Todos" y "Limpiar Todo"
- ✅ Resumen en tiempo real: "15 días seleccionados • 45 emisiones totales"
- ✅ Franja horaria personalizada

**Casos de uso:**
```
Campaña Fin de Semana:
- Selecciona todos los sábados y domingos
- 5 emisiones por día
- Horario: 10:00 - 20:00
✅ Resultado: 40 emisiones solo en fines de semana

Campaña Primera Quincena:
- Días 1-15
- 3 emisiones por día
✅ Resultado: 45 emisiones del 1 al 15

Distribución Personalizada:
- Día 1: 10 emisiones (lanzamiento)
- Días 5,10,15: 3 emisiones
- Día 20: 8 emisiones (evento)
✅ Resultado: Control total día a día
```

---

### 📻 **Selector de Radio para Certificados Individuales**

Elige qué radio certificar al descargar certificados individuales.

**Opciones:**
- 🔄 **Automático**: Usa cobertura detectada (ESRADIO/MARCADOR/DUAL)
- 📻 **ESRADIO**: Solo emisiones de ESRADIO con `PLANTILLA_ESRADIO.xlsx`
- 📡 **MARCADOR**: Solo emisiones de MARCADOR con `PLANTILLA_MARCADOR.xlsx`
- 🔀 **DUAL**: Ambas radios con `PLANTILLA_DUAL.xlsx`

**Ejemplo:**
```
Cliente: KIA MOTORS
Emisiones reales: 45 ESRADIO + 40 MARCADOR

Selección ESRADIO:
✅ Archivo: CERT_KIA_MOTORS_ESRADIO_SEP2025.xlsx
✅ Plantilla ESRADIO
✅ Solo 45 emisiones de ESRADIO

Selección DUAL:
✅ Archivo: CERT_KIA_MOTORS_DUAL_SEP2025.xlsx
✅ Plantilla DUAL
✅ 85 emisiones (45+40)
```

---

### 🔍 **Buscador de Clientes**

Búsqueda en tiempo real en la sección de resultados.

**Funcionalidades:**
- ✅ Input de búsqueda "🔍 Buscar cliente..."
- ✅ Filtra tabla y lista simultáneamente
- ✅ Case-insensitive
- ✅ Contador dinámico: "15 de 45 clientes"
- ✅ Búsqueda por cualquier parte del nombre

**Ejemplos:**
```
"kia" → Encuentra "KIA", "KIA MOTORS"
"ayto" → Encuentra "AYTO ALMERIA", "AYUNTAMIENTO ALMERIA"
"san" → Encuentra "AGRO SAN ISIDRO", "SAN JUAN"
```

---

### 🎯 **Normalización Mejorada de Nombres**

Limpieza automática de nombres de clientes.

**Extensiones eliminadas:**
- Audio: `.mp3`, `.wav`, `.flac`, `.aac`, `.ogg`, `.wma`, `.m4a`
- Video: `.mp4`, `.avi`, `.mkv`, `.mov`, `.wmv`, `.flv`, `.webm`

**Palabras finales eliminadas:**
- `SPOT`, `CUÑA`, `CUNA`, `AUDIO`, `FILE`, `ARCHIVO`

**Ejemplo:**
```
Ruta: D:/PUBLICIDAD/KIA/KIA_SPOT_01.MP3
Cliente detectado: "KIA SPOT 01" (sin .MP3)
Ruta en certificado: Mantiene .MP3 completo
```

---

## 📊 Formato del Excel CLIENTES.xlsx

El archivo Excel debe tener **tres columnas**:

| Columna | Nombres Aceptados | Descripción |
|---------|-------------------|-------------|
| 1 | CLIENTE | Nombre del cliente |
| 2 | CUÑAS ER / CUNAS ER / ESRADIO | Objetivo para ESRADIO |
| 3 | CUÑAS RM / CUNAS RM / MARCADOR | Objetivo para MARCADOR |

### Ejemplo Real:

```
CLIENTE                    | CUÑAS ER | CUÑAS RM
---------------------------|----------|----------
AGRO SAN ISIDRO           |    50    |    50
AGRUPOLIN S.L             |    90    |     
ALMONOR LA UNION          |    45    |    45
ALMERICOLOR               |    90    |    80
AQUABONA                  |    60    |     
AYTO ALMERIA "A TU VERA"  |    30    |     
AYTO ALMERIA "CUITIBAN"   |   200    |     
ASQUIOR SAEZ              |          |    60
BALCON DE NIJAR           |    60    |     
BETISAN ASESORES          |    60    |    60*
```

**Notas:**
- Los asteriscos (*) u otros caracteres se ignoran
- Celdas vacías = 0 cuñas
- El sistema normaliza nombres automáticamente
- Busca coincidencias exactas primero, luego por similitud (85%+)

## 📥 Opciones de Descarga

### 1. **Certificado Individual**
- Abre cualquier cliente desde el panel de resultados
- Haz clic en **"📥 Descargar certificado de este cliente"**
- Se descarga: `CERT_[CLIENTE]_[MES][AÑO].xlsx`

### 2. **ZIP Completo**
- Haz clic en **"📦 Descargar CERTIFICACIONES_[MES][AÑO].zip"**
- Incluye:
  - ✅ Certificados de TODOS los clientes
  - ✅ RESUMEN.xlsx (totales por cliente)
  - ✅ CLIENTES.xlsx (información detallada)
  - ✅ LISTADO_CLIENTES_PUBLICIDAD.xlsx

### 3. **Resúmenes Individuales**
- **📋 RESUMEN**: Tabla con totales por cliente, alias e incidencias
- **👥 CLIENTES**: Información completa de cada cliente
- **📄 LISTADO**: Lista simple de clientes y cobertura

## ⚙️ Configuración Avanzada por Cliente

### **Abrir Panel de Cliente**
1. En "Resultados", haz click en cualquier cliente de la tabla o lista
2. Se abre el panel de detalles con todas las opciones

### **Configurar Objetivos**
```
Objetivo ESRADIO: [número]
Objetivo MARCADOR: [número]
```

### **📅 Calendario de Emisiones Personalizado**

Expande "📅 Calendario de Emisiones Personalizado" para acceder a:

#### **Controles:**
- **Seleccionar Todos**: Marca todos los días del mes
- **Limpiar Todo**: Desmarca todos los días
- **Emisiones por día**: Define valor predeterminado (ej: 2)

#### **Uso:**
1. Click en días específicos para seleccionar
2. Ajusta número de emisiones en cada día
3. Configura franja horaria
4. Click "✅ Aplicar Configuración"

#### **Franja Horaria:**
```
Desde: [HH]:[MM]
Hasta: [HH]:[MM]
```

**Ejemplos:**
- Horario comercial: 08:00 - 22:00
- Prime time: 18:00 - 21:00
- 24 horas: 00:00 - 23:59

### **📻 Selector de Radio**

Antes de descargar, elige:
- 🔄 Automático (según cobertura)
- 📻 Solo ESRADIO
- 📡 Solo MARCADOR
- 🔀 DUAL (ambas)

### **Aplicar y Descargar**
1. Configura calendario y/o objetivos
2. Selecciona radio deseada
3. Click "✅ Aplicar Configuración"
4. Click "📥 Descargar Certificado de este Cliente"

### **Revertir Cambios**
- Click "↩️ Revertir a Real" para volver a datos originales

## 📁 Estructura del ZIP de Logs

```
LOGS_[MES][AÑO].zip
├── ESRADIO/
│   ├── 2025-09-01.log
│   ├── 2025-09-02.log
│   └── ...
└── MARCADOR/
    ├── 2025-09-01.log
    ├── 2025-09-02.log
    └── ...
```

### Formato de Líneas en .log:

```
HH:MM:SS  load  PlayerName  User  D:/PUBLICIDAD/ESRADIO/SPOTS/[CLIENTE]/archivo.mp3
```

Ejemplo:
```
10:30:45  load  Principal  Admin  D:/PUBLICIDAD/ESRADIO/SPOTS/AQUABONA/AQUABONA_SPOT_01.mp3
```

## 🎯 Ejemplos de Uso

### **Ejemplo 1: Campaña Solo Fines de Semana**
```
Cliente: ALMERICOLOR
Objetivo: 40 cuñas ESRADIO

Configuración:
1. Objetivo ESRADIO: 40
2. Calendario: Seleccionar solo sábados y domingos
3. Emisiones por día: 5
4. Franja horaria: 10:00 - 20:00

Resultado:
✅ 40 cuñas distribuidas en 8 días (4 sábados + 4 domingos)
✅ Horarios: 10:00 - 20:00
✅ 5 emisiones por fin de semana
```

### **Ejemplo 2: Campaña Primera Quincena Intensiva**
```
Cliente: KIA MOTORS
Objetivo: 45 ESRADIO + 45 MARCADOR

Configuración:
1. Objetivos: 45 ER / 45 RM
2. Calendario: Días 1-15
3. Emisiones por día: 6
4. Radio: DUAL
5. Franja: 08:00 - 22:00

Resultado:
✅ 90 cuñas en 15 días
✅ Certificado DUAL con ambas radios
✅ Archivo: CERT_KIA_MOTORS_DUAL_SEP2025.xlsx
```

### **Ejemplo 3: Evento Especial con Distribución Personalizada**
```
Cliente: AYTO ALMERIA
Objetivo: 50 cuñas

Configuración Calendario:
- Día 1: 10 emisiones (lanzamiento)
- Días 5, 10, 15: 5 emisiones cada uno (recordatorio)
- Día 20: 15 emisiones (evento principal)
- Días 21-25: 2 emisiones (cierre)

Resultado:
✅ 50 cuñas con distribución estratégica
✅ Control total día a día
✅ Picos de intensidad en momentos clave
```

### **Ejemplo 4: Solo ESRADIO de Cliente DUAL**
```
Cliente: AQUABONA (tiene ambas radios)
Emisiones reales: 30 ER + 25 RM

Configuración:
1. Selector de Radio: ESRADIO
2. Descargar certificado individual

Resultado:
✅ Solo emisiones de ESRADIO (30)
✅ Plantilla ESRADIO
✅ Archivo: CERT_AQUABONA_ESRADIO_SEP2025.xlsx
```

## 🛠️ Configuración

### Mes y Año
- Selecciona el mes y año correspondiente
- El sufijo se actualiza automáticamente: `_SEP2025`
- Si el ZIP tiene el mes en el nombre, se detecta automáticamente

### Zona Horaria
- Por defecto: `Europe/Madrid`
- Se usa para el procesamiento de fechas/horas

### Ajuste Manual
- ✅ **Activado**: Muestra panel de ajuste en cada cliente
- ❌ **Desactivado**: Solo muestra datos procesados

## 📝 Plantillas

El sistema carga automáticamente tres plantillas:
- **PLANTILLA_ESRADIO.xlsx**: Para clientes solo en ESRADIO
- **PLANTILLA_MARCADOR.xlsx**: Para clientes solo en MARCADOR
- **PANTILLA_DUAL.xlsx**: Para clientes en ambas radios

Si las plantillas no están disponibles, genera certificados básicos automáticamente.

## ⚙️ Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Procesamiento**: 100% cliente (sin backend)
- **Librerías**:
  - JSZip (lectura/escritura ZIP)
  - ExcelJS (generación Excel)
  - SheetJS (parseo Excel)
  - FileSaver.js (descarga archivos)

## 🔒 Privacidad y Seguridad

- ✅ **100% local**: Todos los datos se procesan en tu navegador
- ✅ **Sin servidor**: No se envían datos a ningún servidor externo
- ✅ **Sin base de datos**: No se almacena información
- ✅ **Privado**: Tus datos nunca salen de tu computadora

## 📖 Glosario

- **ESRADIO / ER**: Radio ESRADIO Almería
- **MARCADOR / RM / MA**: Radio Marcador Almería
- **Cuña**: Spot publicitario de audio
- **Cobertura**: En qué radios se emitió (ESRADIO, MARCADOR, o AMBAS)
- **Ajuste**: Proceso de generar cuñas sintéticas para alcanzar objetivos
- **Sintético**: Eventos generados automáticamente (no reales de logs)
- **Normalización**: Convertir nombres a formato estándar (sin acentos, mayúsculas)
- **Matching**: Proceso de encontrar coincidencias entre nombres similares

## 🐛 Solución de Problemas

### "⚠️ No se encontraron datos válidos en el Excel"
- Verifica que el archivo tenga las columnas CLIENTE y al menos CUÑAS ER o CUÑAS RM
- Asegúrate de que haya datos en las filas (no solo encabezados)

### "❌ Error procesando los logs"
- Verifica que el ZIP contenga carpetas ESRADIO y/o MARCADOR
- Asegúrate de que los archivos .log tengan el formato correcto

### No se aplican los objetivos del Excel
- Haz clic en el botón "📊 PROCESAR" después de cargar el Excel
- Verifica que los nombres de clientes coincidan (el sistema busca 85% similitud)

### Los certificados no se generan
- Abre la consola del navegador (F12) para ver errores
- Verifica que las plantillas estén cargadas correctamente

## 📧 Soporte

Para reportar problemas o sugerencias, revisa la consola del navegador (F12) y captura los mensajes de error.

---

## 📦 Características Completas

### **Procesamiento**
- ✅ 100% local en navegador
- ✅ Sin backend, sin servidor
- ✅ Privacidad total
- ✅ Soporte ZIP + Excel o solo Excel

### **Interfaz**
- ✅ Buscador en tiempo real
- ✅ Calendario visual interactivo
- ✅ Selector de radio individual
- ✅ Panels colapsables
- ✅ Preview de certificados

### **Generación**
- ✅ Certificados individuales
- ✅ ZIP completo
- ✅ Resúmenes Excel
- ✅ Cuñas sintéticas realistas
- ✅ Matching inteligente de nombres

### **Tecnologías**
- Frontend: HTML5, CSS3, Vanilla JavaScript
- Librerías: JSZip, ExcelJS, SheetJS, FileSaver.js
- Procesamiento: 100% cliente
- Compatible: Chrome, Firefox, Edge

---

**Versión:** 3.0  
**Última actualización:** Octubre 2025  
**Nuevas características:** Calendario personalizado, Selector de radio, Buscador, Normalización mejorada  
**Compatible con:** Chrome (recomendado), Firefox, Edge (últimas versiones)
