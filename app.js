/* ===== Utilidades básicas ===== */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

/* ===== Sistema de Colapso de Secciones ===== */
function initCollapsibleSections() {
  const collapseBtns = $$('.collapse-btn');
  
  collapseBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const section = btn.closest('.collapsible');
      const isCollapsed = section.classList.contains('collapsed');
      
      // Toggle colapso
      section.classList.toggle('collapsed');
      
      // Guardar estado en localStorage
      const sectionClass = section.className.split(' ').find(c => c.endsWith('-panel'));
      if (sectionClass) {
        localStorage.setItem(`section-${sectionClass}`, isCollapsed ? 'expanded' : 'collapsed');
      }
    });
  });
  
  // Hacer que el header también colapse/expanda
  $$('.collapsible-header').forEach(header => {
    header.addEventListener('click', (e) => {
      // Solo si no se hizo click en el botón
      if (!e.target.closest('.collapse-btn')) {
        const btn = header.querySelector('.collapse-btn');
        if (btn) btn.click();
      }
    });
  });
  
  // Restaurar estado desde localStorage
  $$('.collapsible').forEach(section => {
    const sectionClass = section.className.split(' ').find(c => c.endsWith('-panel'));
    if (sectionClass) {
      const savedState = localStorage.getItem(`section-${sectionClass}`);
      if (savedState === 'collapsed') {
        section.classList.add('collapsed');
      }
    }
  });
}

const MONTH_MAP = {1:'ENE',2:'FEB',3:'MAR',4:'ABR',5:'MAY',6:'JUN',7:'JUL',8:'AGO',9:'SEP',10:'OCT',11:'NOV',12:'DIC'};
const PAD2 = n => String(n).padStart(2,'0');

function deriveSuffixFromZipName(name) {
  // LOGS_SEPTIEMBRE2025.zip -> SEP2025 (heurística simple)
  const m = name.toUpperCase().match(/(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)[-_ ]?(\d{4})/);
  return m ? `${m[1]}${m[2]}` : null;
}

function normalizeClientName(s) {
  if (!s) return '';
  
  // Eliminar extensiones de archivo comunes al final
  s = s.replace(/\.(mp3|wav|mp4|avi|mkv|flac|aac|ogg|wma|m4a|mov|wmv|flv|webm)$/i, '');
  
  // Mayúsculas, sin acentos, limpiar puntuación repetida y espacios
  s = s.normalize('NFD').replace(/\p{Diacritic}/gu,'');
  s = s.toUpperCase();
  s = s.replace(/[^\p{L}\p{N} ]+/gu, ' '); // quitar guiones/underscores/puntos
  s = s.replace(/\s+/g, ' ').trim();
  
  // Eliminar palabras comunes de archivos de audio que pueden quedar
  s = s.replace(/\b(SPOT|CUNA|CUÑA|AUDIO|FILE|ARCHIVO)\s*\d*$/i, '').trim();
  
  return s;
}

function jaroWinkler(a, b) { // similitud para alias
  // Implementación compacta basada en algoritmo JW (suficiente para alias evidentes)
  if (a === b) return 1;
  const m = Math.floor(Math.max(a.length,b.length)/2)-1;
  const mtA = new Array(a.length).fill(false);
  const mtB = new Array(b.length).fill(false);
  let matches = 0;
  for (let i=0; i<a.length; i++){
    const start = Math.max(0,i-m), end = Math.min(b.length,i+m+1);
    for (let j=start; j<end; j++){
      if (!mtB[j] && a[i]===b[j]) { mtA[i]=mtB[j]=true; matches++; break; }
    }
  }
  if (!matches) return 0;
  const aMatch = [], bMatch = [];
  for (let i=0;i<a.length;i++) if (mtA[i]) aMatch.push(a[i]);
  for (let j=0;j<b.length;j++) if (mtB[j]) bMatch.push(b[j]);
  let transpositions = 0;
  for (let i=0;i<aMatch.length;i++) if (aMatch[i]!==bMatch[i]) transpositions++;
  let jaro = (matches/a.length + matches/b.length + (matches - transpositions/2)/matches)/3;
  // Winkler prefix
  let prefix = 0; for (let i=0;i<Math.min(4, a.length, b.length); i++) if (a[i]===b[i]) prefix++; else break;
  return jaro + prefix*0.1*(1-jaro);
}

/* ===== Estado de la app ===== */
const state = {
  monthSuffix: '_SEP2025',
  tz: 'Europe/Madrid',
  allowAdjust: true,
  templates: { es: null, ma: null, du: null },
  excelTargets: new Map(), // clientNorm -> {es: number, ma: number}
  currentClientNorm: null, // cliente actualmente abierto en el panel
  parsed: { // relleno tras procesar
    // events: [{radio:'ESRADIO'|'MARCADOR', date:'DD/MM/YYYY', time:'HH:MM:SS'|'N/D', player:'...', path:'...', client:'...', clientNorm:'...'}]
    events: [],
    alias: [],    // {detected, normalized, similarity, examplePath}
    issues: [],   // {file, lineNo, reason}
    perClient: new Map(), // clientNorm -> {display: 'KIA', radios: {ESRADIO:[events], MARCADOR:[events]}, coverage:'...', first:'', last:'', pieces:Set(paths)}
  },
  adjusted: new Map(), // clientNorm -> { esEventsAdj:[], maEventsAdj:[], targets: {es,ma}, wasAdjusted:bool }
};

/* ===== Utilidades para habilitar/deshabilitar exportación ===== */
function disableExportButtons() {
  const exportButtons = ['#btnZip', '#btnResumen', '#btnClientesXlsx', '#btnListado'];
  exportButtons.forEach(selector => {
    const btn = $(selector);
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
  });
}

function enableExportButtons() {
  const exportButtons = ['#btnZip', '#btnResumen', '#btnClientesXlsx', '#btnListado'];
  exportButtons.forEach(selector => {
    const btn = $(selector);
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  });
}

/* ===== Carga automática de plantillas predefinidas ===== */
async function loadPredefinedTemplates() {
  const templatePaths = {
    es: './PLANTILLA_ESRADIO.xlsx',
    ma: './PLANTILLA_MARCADOR.xlsx',
    du: './PLANTILLA_DUAL.xlsx'
  };
  
  try {
    showStatus('📋 Cargando plantillas predefinidas...', 'info');
    
    let loadedCount = 0;
    
    // Cargar plantillas individualmente para mejor manejo de errores
    try {
      const esResponse = await fetch(templatePaths.es);
      if (esResponse.ok) {
        state.templates.es = await esResponse.blob();
        loadedCount++;
        console.log('✓ PLANTILLA_ESRADIO.xlsx cargada');
      } else {
        console.warn('✗ PLANTILLA_ESRADIO.xlsx no encontrada');
      }
    } catch (e) {
      console.warn('✗ Error cargando PLANTILLA_ESRADIO.xlsx:', e.message);
    }
    
    try {
      const maResponse = await fetch(templatePaths.ma);
      if (maResponse.ok) {
        state.templates.ma = await maResponse.blob();
        loadedCount++;
        console.log('✓ PLANTILLA_MARCADOR.xlsx cargada');
      } else {
        console.warn('✗ PLANTILLA_MARCADOR.xlsx no encontrada');
      }
    } catch (e) {
      console.warn('✗ Error cargando PLANTILLA_MARCADOR.xlsx:', e.message);
    }
    
    try {
      const duResponse = await fetch(templatePaths.du);
      if (duResponse.ok) {
        state.templates.du = await duResponse.blob();
        loadedCount++;
        console.log('✓ PLANTILLA_DUAL.xlsx cargada');
      } else {
        console.warn('✗ PLANTILLA_DUAL.xlsx no encontrada');
      }
    } catch (e) {
      console.warn('✗ Error cargando PLANTILLA_DUAL.xlsx:', e.message);
    }
    
    if (loadedCount === 3) {
      showStatus('✅ Todas las plantillas cargadas correctamente', 'success');
    } else if (loadedCount > 0) {
      showStatus(`✅ ${loadedCount}/3 plantillas cargadas. Se usarán plantillas por defecto para las faltantes.`, 'info');
    } else {
      showStatus('ℹ️ No se encontraron plantillas predefinidas. Se usarán plantillas por defecto.', 'info');
    }
    
    console.log(`Plantillas cargadas: ${loadedCount}/3`);
  } catch (error) {
    console.warn('Error cargando plantillas predefinidas:', error);
    showStatus('ℹ️ Se usarán plantillas por defecto.', 'info');
  }
}

/* ===== Manejo de Excel de Objetivos ===== */
async function parseExcelTargets(file) {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    
    // Tomar la primera hoja
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convertir a JSON (array de arrays)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length < 2) {
      throw new Error('El archivo Excel está vacío o no tiene datos');
    }
    
    // Buscar índices de columnas (primera fila que contenga los headers)
    let headerRowIdx = -1;
    let colCliente = -1, colER = -1, colRM = -1;
    
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const row = jsonData[i];
      if (!row) continue;
      
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '').toUpperCase().trim();
        if (cell.includes('CLIENTE')) colCliente = j;
        if (cell.includes('CUÑAS ER') || cell.includes('CUNAS ER') || cell === 'ESRADIO') colER = j;
        if (cell.includes('CUÑAS RM') || cell.includes('CUNAS RM') || cell === 'MARCADOR') colRM = j;
      }
      
      if (colCliente >= 0 && (colER >= 0 || colRM >= 0)) {
        headerRowIdx = i;
        break;
      }
    }
    
    if (headerRowIdx < 0 || colCliente < 0) {
      throw new Error('No se encontró la columna CLIENTE en el Excel');
    }
    
    // Parsear datos
    const targets = new Map();
    let validRows = 0;
    
    for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || !row[colCliente]) continue;
      
      const clientRaw = String(row[colCliente]).trim();
      if (!clientRaw) continue;
      
      const clientNorm = normalizeClientName(clientRaw);
      const esTarget = colER >= 0 ? parseInt(row[colER] || 0) : 0;
      const maTarget = colRM >= 0 ? parseInt(row[colRM] || 0) : 0;
      
      if (!isNaN(esTarget) || !isNaN(maTarget)) {
        targets.set(clientNorm, {
          es: isNaN(esTarget) ? 0 : esTarget,
          ma: isNaN(maTarget) ? 0 : maTarget,
          originalName: clientRaw
        });
        validRows++;
      }
    }
    
    if (validRows === 0) {
      throw new Error('No se encontraron datos válidos en el Excel');
    }
    
    return targets;
  } catch (error) {
    console.error('Error parseando Excel:', error);
    throw error;
  }
}

function showTargetsStatus(message, isError = false) {
  const statusEl = $('#targetsStatus');
  statusEl.textContent = message;
  if (isError) {
    statusEl.classList.add('status-error');
  } else {
    statusEl.classList.remove('status-error');
  }
}

$('#excelTargets').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    showTargetsStatus('📊 Procesando Excel...', false);
    $('#excelFileName').textContent = file.name;
    $('#excelSelected').classList.remove('hidden');
    $('.excel-label').style.display = 'none';
    
    const targets = await parseExcelTargets(file);
    state.excelTargets = targets;
    
    showTargetsStatus(`✅ ${targets.size} objetivos cargados correctamente`, false);
    
    // Si ya hay datos procesados, aplicar objetivos automáticamente
    if (state.parsed.perClient.size > 0) {
      applyTargetsToAllClients();
    }
  } catch (error) {
    showTargetsStatus(`❌ Error: ${error.message}`, true);
    state.excelTargets = new Map();
    $('#excelSelected').classList.add('hidden');
    $('.excel-label').style.display = 'flex';
  }
});

$('#excelRemove').addEventListener('click', () => {
  $('#excelTargets').value = '';
  $('#excelSelected').classList.add('hidden');
  $('.excel-label').style.display = 'flex';
  state.excelTargets = new Map();
  showTargetsStatus('', false);
});

function applyTargetsToAllClients() {
  let applied = 0;
  
  for (const [clientNorm, data] of state.parsed.perClient.entries()) {
    const target = findBestMatchingTarget(clientNorm);
    
    if (target) {
      const currentEs = data.radios.ESRADIO.length;
      const currentMa = data.radios.MARCADOR.length;
      
      // Solo aplicar si hay diferencia
      if (target.es !== currentEs || target.ma !== currentMa) {
        applyAdjustment(clientNorm, target.es, target.ma);
        applied++;
      }
    }
  }
  
  if (applied > 0) {
    showTargetsStatus(`✅ ${applied} ajustes aplicados automáticamente`, false);
    renderResumen();
  }
}

function findBestMatchingTarget(clientNorm) {
  // Búsqueda exacta primero
  if (state.excelTargets.has(clientNorm)) {
    return state.excelTargets.get(clientNorm);
  }
  
  // Búsqueda por similitud
  let bestMatch = null;
  let bestSimilarity = 0;
  
  for (const [targetNorm, targetData] of state.excelTargets.entries()) {
    const similarity = jaroWinkler(clientNorm, targetNorm);
    if (similarity > bestSimilarity && similarity >= 0.85) {
      bestSimilarity = similarity;
      bestMatch = targetData;
    }
  }
  
  return bestMatch;
}

/* ===== Manejo de archivo ZIP mejorado ===== */
function handleFileSelection(file) {
  if (file) {
    // Mostrar archivo seleccionado
    $('#fileName').textContent = file.name;
    $('#fileSelected').classList.remove('hidden');
    $('.file-upload-content').style.display = 'none';
    
    // Intentar derivar sufijo del nombre del archivo
    const s = deriveSuffixFromZipName(file.name);
    if (s) {
      updateSuffixFromString(s);
    }
    
    // Deshabilitar exportación hasta procesar
    disableExportButtons();
  }
}

function clearFileSelection() {
  $('#zipInput').value = '';
  $('#fileSelected').classList.add('hidden');
  $('.file-upload-content').style.display = 'flex';
}

$('#zipInput').addEventListener('change', e => {
  handleFileSelection(e.target.files[0]);
});

$('#fileRemove').addEventListener('click', () => {
  clearFileSelection();
});

// Drag and drop functionality
const uploadArea = $('.file-upload-area');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  uploadArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
  uploadArea.addEventListener(eventName, () => uploadArea.classList.add('dragover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
  uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('dragover'), false);
});

uploadArea.addEventListener('drop', (e) => {
  const files = e.dataTransfer.files;
  if (files.length > 0 && files[0].name.toLowerCase().endsWith('.zip')) {
    $('#zipInput').files = files;
    handleFileSelection(files[0]);
  }
});

/* ===== Selector de mes y año ===== */
function updateSuffixFromSelectors() {
  const month = parseInt($('#monthSelect').value);
  const year = $('#yearSelect').value;
  const monthAbbr = MONTH_MAP[month];
  const suffix = `_${monthAbbr}${year}`;
  
  state.monthSuffix = suffix;
  $('#suffixPreview').textContent = suffix;
  $$('.suffixLabel').forEach(span => span.textContent = `${monthAbbr}${year}`);
}

function updateSuffixFromString(suffixStr) {
  // suffixStr como "SEP2025"
  const match = suffixStr.match(/([A-Z]{3})(\d{4})/);
  if (match) {
    const [, monthAbbr, year] = match;
    const monthNum = Object.keys(MONTH_MAP).find(key => MONTH_MAP[key] === monthAbbr);
    
    if (monthNum) {
      $('#monthSelect').value = monthNum;
      $('#yearSelect').value = year;
      updateSuffixFromSelectors();
    }
  }
}

$('#monthSelect').addEventListener('change', updateSuffixFromSelectors);
$('#yearSelect').addEventListener('change', updateSuffixFromSelectors);

// Inicializar sufijo
updateSuffixFromSelectors();
$('#tz').addEventListener('change', e => state.tz = e.target.value);
$('#ajuste').addEventListener('change', e => state.allowAdjust = e.target.checked);

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', async () => {
  disableExportButtons();
  await loadPredefinedTemplates();
  initCollapsibleSections();
  
  // Botones globales de expandir/contraer
  const btnExpandAll = $('#btnExpandAll');
  const btnCollapseAll = $('#btnCollapseAll');
  
  if (btnExpandAll) {
    btnExpandAll.addEventListener('click', () => {
      $$('.collapsible').forEach(section => {
        section.classList.remove('collapsed');
        const sectionClass = section.className.split(' ').find(c => c.endsWith('-panel'));
        if (sectionClass) {
          localStorage.setItem(`section-${sectionClass}`, 'expanded');
        }
      });
    });
  }
  
  if (btnCollapseAll) {
    btnCollapseAll.addEventListener('click', () => {
      $$('.collapsible').forEach(section => {
        section.classList.add('collapsed');
        const sectionClass = section.className.split(' ').find(c => c.endsWith('-panel'));
        if (sectionClass) {
          localStorage.setItem(`section-${sectionClass}`, 'collapsed');
        }
      });
    });
  }
});

/* ===== Procesado desde Excel solamente ===== */
async function processFromExcelOnly() {
  // Resetear estado
  state.parsed.events = [];
  state.parsed.perClient = new Map();
  state.parsed.alias = [];
  state.parsed.issues = [];
  state.adjusted = new Map();
  
  // Obtener mes y año actual de los selectores
  const month = parseInt($('#monthSelect').value);
  const year = $('#yearSelect').value;
  
  // Generar días del mes
  const daysInMonth = new Date(year, month, 0).getDate();
  const availableDaysES = [];
  const availableDaysMA = [];
  
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${PAD2(d)}/${PAD2(month)}/${year}`;
    availableDaysES.push(dateStr);
    availableDaysMA.push(dateStr);
  }
  
  // Generar clientes desde Excel
  for (const [clientNorm, targetData] of state.excelTargets.entries()) {
    const clientDisplay = targetData.originalName || clientNorm;
    
    // Crear estructura de cliente
    const clientData = {
      display: clientDisplay,
      radios: { ESRADIO: [], MARCADOR: [] },
      coverage: 'AMBAS',
      first: availableDaysES[0],
      last: availableDaysES[availableDaysES.length - 1],
      pieces: new Set()
    };
    
    // Generar eventos sintéticos para ESRADIO
    if (targetData.es > 0) {
      const esEvents = generateSyntheticEventsFromScratch(
        targetData.es,
        'ESRADIO',
        clientDisplay,
        clientNorm,
        availableDaysES,
        hashCode(clientNorm + 'ES' + state.monthSuffix)
      );
      clientData.radios.ESRADIO = esEvents;
      esEvents.forEach(e => clientData.pieces.add(e.path));
    }
    
    // Generar eventos sintéticos para MARCADOR
    if (targetData.ma > 0) {
      const maEvents = generateSyntheticEventsFromScratch(
        targetData.ma,
        'MARCADOR',
        clientDisplay,
        clientNorm,
        availableDaysMA,
        hashCode(clientNorm + 'MA' + state.monthSuffix)
      );
      clientData.radios.MARCADOR = maEvents;
      maEvents.forEach(e => clientData.pieces.add(e.path));
    }
    
    // Determinar cobertura
    if (targetData.es > 0 && targetData.ma > 0) {
      clientData.coverage = 'AMBAS';
    } else if (targetData.es > 0) {
      clientData.coverage = 'ESRADIO';
    } else if (targetData.ma > 0) {
      clientData.coverage = 'MARCADOR';
    }
    
    // Agregar al estado
    state.parsed.perClient.set(clientNorm, clientData);
    
    // Marcar como ajustado con los objetivos originales
    state.adjusted.set(clientNorm, {
      esEventsAdj: clientData.radios.ESRADIO,
      maEventsAdj: clientData.radios.MARCADOR,
      targets: { es: targetData.es, ma: targetData.ma },
      wasAdjusted: true
    });
  }
}

function generateSyntheticEventsFromScratch(count, radio, clientDisplay, clientNorm, availableDays, seed, advancedConfig = null) {
  const events = [];
  const rnd = mulberry32(seed);
  
  // Generar ruta genérica
  const basePath = `D:/PUBLICIDAD/${radio}/SPOTS/${clientDisplay}/${clientDisplay}_SPOT_01.mp3`;
  
  // Pool de segundos realistas
  const secondsPool = [0, 3, 7, 12, 15, 18, 23, 27, 30, 34, 38, 42, 45, 48, 52, 55, 58];
  
  // Configurar rango de horas
  let hourMin = 8, hourMax = 22, minuteMin = 0, minuteMax = 59;
  if (advancedConfig && advancedConfig.timeFrom && advancedConfig.timeTo) {
    hourMin = advancedConfig.timeFrom.hour;
    minuteMin = advancedConfig.timeFrom.minute;
    hourMax = advancedConfig.timeTo.hour;
    minuteMax = advancedConfig.timeTo.minute;
  }
  
  // Pesos para distribución de horas (más emisiones en horario comercial)
  const hourWeights = {};
  for (let h = hourMin; h <= hourMax; h++) {
    // Más peso en horas centrales
    if (h >= 12 && h <= 14) hourWeights[h] = 4;
    else if (h >= 18 && h <= 20) hourWeights[h] = 4;
    else if (h >= 10 && h <= 11) hourWeights[h] = 3;
    else if (h >= 17 && h <= 17) hourWeights[h] = 3;
    else if (h >= 9 && h <= 9) hourWeights[h] = 2;
    else if (h >= 15 && h <= 16) hourWeights[h] = 2;
    else hourWeights[h] = 1;
  }
  const hours = Object.keys(hourWeights).map(Number);
  const weights = hours.map(h => hourWeights[h]);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  
  const existingTimes = new Set();
  
  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let unique = false;
    let day, hour, minute, second, time;
    
    while (!unique && attempts < 100) {
      attempts++;
      
      // Seleccionar día aleatorio
      day = availableDays[Math.floor(rnd() * availableDays.length)];
      
      // Hora con distribución ponderada
      const r = rnd() * totalWeight;
      let acc = 0;
      hour = hourMin;
      for (let j = 0; j < hours.length; j++) {
        acc += weights[j];
        if (r <= acc) {
          hour = hours[j];
          break;
        }
      }
      
      // Minuto dentro del rango
      if (hour === hourMin) {
        minute = minuteMin + Math.floor(rnd() * (60 - minuteMin));
      } else if (hour === hourMax) {
        minute = Math.floor(rnd() * (minuteMax + 1));
      } else {
        minute = Math.floor(rnd() * 60);
      }
      
      // Segundo realista
      second = secondsPool[Math.floor(rnd() * secondsPool.length)];
      
      time = `${PAD2(hour)}:${PAD2(minute)}:${PAD2(second)}`;
      const key = `${day} ${time}`;
      
      if (!existingTimes.has(key)) {
        existingTimes.add(key);
        unique = true;
      }
    }
    
    events.push({
      radio,
      date: day,
      time,
      player: 'Principal',
      path: basePath,
      client: clientDisplay,
      clientNorm
    });
  }
  
  // Ordenar por fecha y hora
  return events.sort(byDT);
}

/* ===== Procesado principal ===== */
$('#btnProcesar').addEventListener('click', async () => {
  const zipFile = $('#zipInput').files[0];
  const hasExcel = state.excelTargets.size > 0;
  
  // Validar que haya al menos uno de los dos
  if (!zipFile && !hasExcel) {
    showStatus('⚠️ Por favor, sube el ZIP de logs O el archivo CLIENTES.xlsx', 'warning');
    return;
  }
  
  const btn = $('#btnProcesar');
  btn.classList.add('loading');
  btn.disabled = true;
  
  try {
    // Flujo 1: Solo Excel (sin ZIP)
    if (!zipFile && hasExcel) {
      showStatus('📊 Generando certificados desde CLIENTES.xlsx...', 'info');
      await processFromExcelOnly();
      renderResumen();
      enableExportButtons();
      showStatus(`✅ ${state.parsed.perClient.size} clientes cargados desde Excel`, 'success');
    } else {
      // Flujo 2: Con ZIP (con o sin Excel)
      showStatus('📂 Desempaquetando ZIP y leyendo logs...', 'info');
      const zip = await JSZip.loadAsync(zipFile);

      // Leer ficheros de ESRADIO y MARCADOR
      const entries = Object.values(zip.files).filter(f => !f.dir && /(?:^|\/)(ESRADIO|MARCADOR)\/.+\.log$/i.test(f.name));
      const events = [];
      const issues = [];
      for (const file of entries) {
        const content = await file.async('string');
        const radio = /\/(ESRADIO|MARCADOR)\//i.exec(file.name)[1].toUpperCase();
        const fileDate = inferDateFromFilename(file.name);
        const lines = content.split(/\r?\n/);
        for (let i=0;i<lines.length;i++) {
          const raw = lines[i].trim();
          if (!raw) continue;
          // Capturar ruta de PUBLICIDAD incluso en líneas tipo 'error (...)'
          let path = null;
          if (/PUBLICIDAD/i.test(raw)) {
            const paren = raw.match(/\((.*PUBLICIDAD.*)\)/i);
            if (paren) path = paren[1];
          }
          // Split robusto
          const parts = raw.split(/\t|[;,|]| {2,}/).map(s => s.trim()).filter(Boolean);
          let time = 'N/D', player = 'N/D', action = '';
          if (parts.length >= 4) { // TIME ACTION PLAYER USER [PATH]
            time = parts[0].match(/^\d{2}:\d{2}:\d{2}$/) ? parts[0] : 'N/D';
            action = parts[1]?.toLowerCase?.() || '';
            player = parts[2] || 'N/D';
          }
          if (!path && /PUBLICIDAD/i.test(raw)) {
            // ruta suele ser el último campo si no venía entre paréntesis
            const last = parts[parts.length-1] || '';
            if (/PUBLICIDAD/i.test(last)) path = last;
          }
          if (!/PUBLICIDAD/i.test(path || '')) {
            if (/PUBLICIDAD/i.test(raw)) issues.push({file:file.name, lineNo:i+1, reason:'Ruta inválida o no detectada'});
            continue;
          }
          // Excluir acciones error
          if (action === 'error') {
            issues.push({file:file.name, lineNo:i+1, reason:'Acción=error con PUBLICIDAD'});
            continue;
          }
          const date = fileDate || inferDateFromHeader(lines) || null;
          if (!date) { issues.push({file:file.name, lineNo:i+1, reason:'Fecha inválida'}); continue; }

          const { clientDetected, clientNorm } = detectClientFromPath(path);
          events.push({
            radio, date, time, player: player || 'N/D',
            path, client: clientDetected, clientNorm
          });
        }
      }

      showStatus('🔄 Agrupando por cliente y resolviendo alias...', 'info');
      // Alias y agrupación
      const { perClient, aliasRecords } = groupByClientAndAlias(events);

      state.parsed.events = events;
      state.parsed.perClient = perClient;
      state.parsed.alias = aliasRecords;
      state.parsed.issues = issues;
      state.adjusted = new Map(); // reset posibles ajustes previos

      // Aplicar objetivos del Excel si están disponibles
      if (state.excelTargets.size > 0) {
        applyTargetsToAllClients();
      }

      renderResumen();
      enableExportButtons(); // Habilitar exportación tras procesado exitoso
      showStatus(`✅ Procesado completado. Clientes encontrados: ${perClient.size}`, 'success');
    }
  } catch (error) {
    console.error('Error procesando:', error);
    showStatus('❌ Error procesando. Verifica los archivos cargados.', 'error');
    disableExportButtons(); // Mantener deshabilitado en caso de error
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
});

/* ===== Inferencia de fechas ===== */
function inferDateFromFilename(name) {
  // busca YYYY-MM-DD, YYYYMMDD, DD-MM-YYYY
  const n = name.split('/').pop();
  let m = n.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  m = n.match(/\b(\d{4})(\d{2})(\d{2})\b/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  m = n.match(/\b(\d{2})-(\d{2})-(\d{4})\b/);
  if (m) return `${m[1]}/${m[2]}/${m[3]}`;
  return null;
}
function inferDateFromHeader(lines) {
  // opcional: “lunes, 1 de septiembre de 2025” -> 01/09/2025 (requiere map de meses)
  const months = {enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12};
  for (const l of lines.slice(0,6)) {
    const m = l.toLowerCase().match(/(\d{1,2})\s+de\s+([a-zá]+)\s+de\s+(\d{4})/i);
    if (m) {
      const d = PAD2(parseInt(m[1],10));
      const mon = months[m[2].normalize('NFD').replace(/\p{Diacritic}/gu,'')] || 1;
      const y = m[3];
      return `${d}/${PAD2(mon)}/${y}`;
    }
  }
  return null;
}

/* ===== Detección de cliente desde la ruta ===== */
const GENERIC_DIRS = new Set(['SPOTS','CAMPANAS','CUÑAS','CU?AS','RADIOS','PROMOS PROGRAMACION','PROMOS PROGRAMACION MARCADOR']);
function detectClientFromPath(path) {
  // segmentar por / o \
  const segs = path.split(/[\\/]+/);
  let idx = segs.findIndex(s => s.toUpperCase() === 'PUBLICIDAD');
  let clientDetected = 'DESCONOCIDO';
  if (idx >= 0) {
    let j = idx+1;
    while (j < segs.length && GENERIC_DIRS.has(segs[j].toUpperCase())) j++;
    clientDetected = segs[j] || segs[idx+1] || 'DESCONOCIDO';
  }
  const clientNorm = normalizeClientName(clientDetected);
  return { clientDetected, clientNorm };
}

/* ===== Agrupación y alias ===== */
function groupByClientAndAlias(events) {
  const perClientRaw = new Map(); // clientNorm provisional
  for (const ev of events) {
    if (!perClientRaw.has(ev.clientNorm)) perClientRaw.set(ev.clientNorm, []);
    perClientRaw.get(ev.clientNorm).push(ev);
  }
  // Alias: fusionar nombres muy similares
  const norms = Array.from(perClientRaw.keys());
  const aliasRecords = [];
  const parent = new Map(norms.map(n=>[n,n])); // union-find simple

  for (let i=0; i<norms.length; i++) {
    for (let j=i+1; j<norms.length; j++) {
      const a = norms[i], b = norms[j];
      const sim = jaroWinkler(a, b);
      if (sim >= 0.90) { parent.set(b, a); aliasRecords.push({detected:b, normalized:a, similarity:sim.toFixed(3), examplePath: perClientRaw.get(b)[0].path}); }
    }
  }
  // Compactar por raíz
  const perClient = new Map();
  for (const [k, arr] of perClientRaw.entries()) {
    const root = findRoot(parent, k);
    if (!perClient.has(root)) perClient.set(root, []);
    perClient.get(root).push(...arr);
  }
  // Decorar con métricas
  const perClientDecorated = new Map();
  for (const [k, arr] of perClient.entries()) {
    const byRadio = {ESRADIO: [], MARCADOR: []};
    arr.forEach(e => byRadio[e.radio].push(e));
    const all = arr.slice().sort(byDT);
    const first = all[0]?.date || '';
    const last  = all[all.length-1]?.date || '';
    const pieces = new Set(arr.map(e=>e.path));
    const coverage = byRadio.ESRADIO.length && byRadio.MARCADOR.length ? 'AMBAS' : (byRadio.ESRADIO.length ? 'ESRADIO' : 'MARCADOR');
    perClientDecorated.set(k, {
      display: k, // podemos adoptar el primer detectado como “display”
      radios: byRadio,
      coverage,
      first, last,
      pieces
    });
  }
  return { perClient: perClientDecorated, aliasRecords };
}
function findRoot(parent, x) {
  while (parent.get(x) !== x) x = parent.get(x);
  return x;
}
function byDT(a,b) {
  // ordenar por fecha y hora; N/D al final
  const dA = a.date.split('/').reverse().join('-');
  const dB = b.date.split('/').reverse().join('-');
  if (dA !== dB) return dA < dB ? -1 : 1;
  if (a.time === 'N/D' && b.time !== 'N/D') return 1;
  if (a.time !== 'N/D' && b.time === 'N/D') return -1;
  return a.time.localeCompare(b.time);
}

/* ===== Render de resumen y lista de clientes ===== */
function renderResumen() {
  const cont = $('#resumen');
  const list = $('#clientesList');
  cont.innerHTML = ''; list.innerHTML = '';
  const rows = [];
  for (const [cn, data] of state.parsed.perClient.entries()) {
    const es = data.radios.ESRADIO.length;
    const ma = data.radios.MARCADOR.length;
    rows.push({cn, display: data.display, es, ma, total: es+ma, cov: data.coverage});
  }
  rows.sort((a,b)=> a.display.localeCompare(b.display));

  // Tabla
  const table = document.createElement('table');
  table.innerHTML = `<thead><tr>
    <th>Cliente</th><th>Emitidas_ESRADIO</th><th>Emitidas_MARCADOR</th><th>Emitidas_TOTAL</th><th>Cobertura</th>
  </tr></thead><tbody></tbody>`;
  rows.forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.display}</td><td>${r.es}</td><td>${r.ma}</td><td>${r.total}</td><td>${r.cov}</td>`;
    tr.addEventListener('click', ()=>openCliente(r.cn));
    table.querySelector('tbody').appendChild(tr);
  });
  cont.appendChild(table);

  // Lista rápida
  const ul = document.createElement('ul');
  rows.forEach(r=>{
    const li = document.createElement('li');
    li.setAttribute('data-client-name', r.display.toLowerCase());
    const btn = document.createElement('button');
    btn.textContent = r.display;
    btn.addEventListener('click', ()=>openCliente(r.cn));
    li.appendChild(btn);
    ul.appendChild(li);
  });
  list.appendChild(ul);
  
  // Actualizar contador
  updateClientCount(rows.length, rows.length);
  
  // Configurar búsqueda
  setupClientSearch();
}

function updateClientCount(visible, total) {
  const counter = $('#clientCount');
  if (counter) {
    counter.textContent = `${visible} de ${total} clientes`;
  }
}

function setupClientSearch() {
  const searchInput = $('#clientSearch');
  const tableBody = $('#resumen tbody');
  const clientList = $('#clientesList ul');
  
  if (!searchInput) return;
  
  // Remover listeners previos
  const newSearch = searchInput.cloneNode(true);
  searchInput.parentNode.replaceChild(newSearch, searchInput);
  
  newSearch.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const allRows = tableBody ? Array.from(tableBody.querySelectorAll('tr')) : [];
    const allItems = clientList ? Array.from(clientList.querySelectorAll('li')) : [];
    
    let visibleCount = 0;
    const totalCount = allItems.length;
    
    // Filtrar tabla
    allRows.forEach(row => {
      const clientName = row.querySelector('td')?.textContent.toLowerCase() || '';
      const matches = clientName.includes(query);
      row.style.display = matches ? '' : 'none';
    });
    
    // Filtrar lista
    allItems.forEach(item => {
      const clientName = item.getAttribute('data-client-name') || '';
      const matches = clientName.includes(query);
      item.classList.toggle('hidden', !matches);
      if (matches) visibleCount++;
    });
    
    updateClientCount(visibleCount, totalCount);
  });
}

function openCliente(clientNorm) {
  state.currentClientNorm = clientNorm; // Guardar cliente actual
  
  const panel = $('#clientePanel');
  panel.classList.add('visible');
  panel.classList.remove('collapsed');
  
  const data = state.parsed.perClient.get(clientNorm);
  $('#clienteTitle').textContent = `📋 ${data.display}`;
  $('#clienteCobertura').textContent = `Cobertura: ${data.coverage}`;
  
  // Scroll suave al panel
  setTimeout(() => {
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);

  // Buscar objetivos del Excel si están disponibles
  const target = findBestMatchingTarget(clientNorm);
  if (target) {
    $('#targetEs').value = target.es;
    $('#targetMa').value = target.ma;
  } else {
    // Prefijar objetivos con reales (para partir de ahí)
    $('#targetEs').value = data.radios.ESRADIO.length;
    $('#targetMa').value = data.radios.MARCADOR.length;
  }

  // Configurar event listeners para modo de días
  setupAdvancedConfigListeners();
  
  // Configurar tabs de modo de configuración
  setupConfigModeTabs();

  renderCertPreview(clientNorm, /*useAdjusted*/true);

  $('#btnAplicarAjuste').onclick = () => {
    const tgtEs = Math.max(0, parseInt($('#targetEs').value||'0',10));
    const tgtMa = Math.max(0, parseInt($('#targetMa').value||'0',10));
    
    // Recoger configuración según el modo activo
    const advancedConfig = getAdvancedConfig();
    
    applyAdjustment(clientNorm, tgtEs, tgtMa, advancedConfig);
    renderCertPreview(clientNorm, true);
    renderResumen(); // actualizar totales mostrados
  };
  $('#btnRevertir').onclick = () => {
    state.adjusted.delete(clientNorm);
    renderCertPreview(clientNorm, true);
    renderResumen();
  };
  
  // Listener para cambios en la selección de radio
  $$('input[name="radioType"]').forEach(radio => {
    radio.addEventListener('change', () => {
      renderCertPreview(clientNorm, true);
    });
  });
  
  // Configurar botón de descarga individual
  $('#btnDownloadIndividual').onclick = async () => {
    const btn = $('#btnDownloadIndividual');
    btn.classList.add('loading');
    btn.disabled = true;
    
    try {
      const data = state.parsed.perClient.get(clientNorm);
      const current = getClientEventsCurrent(clientNorm);
      
      // Obtener la selección de radio
      const selectedRadio = $('input[name="radioType"]:checked')?.value || 'AUTO';
      
      showStatus(`📥 Generando certificado para ${data.display}...`, 'info');
      
      const wb = await buildCertWorkbookForClient(data, current, selectedRadio);
      const safe = data.display.replace(/[^\p{L}\p{N}]+/gu,'_');
      const radioSuffix = selectedRadio !== 'AUTO' ? `_${selectedRadio}` : '';
      const buf = await wb.xlsx.writeBuffer();
      
      saveAs(new Blob([buf]), `CERT_${safe}${radioSuffix}${state.monthSuffix}.xlsx`);
      showStatus(`✅ Certificado de ${data.display} descargado correctamente`, 'success');
    } catch (error) {
      console.error('Error generando certificado individual:', error);
      showStatus('❌ Error generando el certificado individual', 'error');
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  };
}

// Estado del calendario (global para cada cliente)
let calendarState = {};

function setupAdvancedConfigListeners() {
  generateCalendar();
  setupCalendarControls();
}

function generateCalendar() {
  const container = $('#calendarContainer');
  if (!container) return;
  
  // Obtener mes y año seleccionados
  const month = parseInt($('#monthSelect')?.value || 9);
  const year = parseInt($('#yearSelect')?.value || 2025);
  
  // Calcular días del mes
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayRaw = new Date(year, month - 1, 1).getDay();
  // Ajustar para que Lunes sea 0: (0=Dom -> 6, 1=Lun -> 0, 2=Mar -> 1, etc.)
  const firstDay = firstDayRaw === 0 ? 6 : firstDayRaw - 1;
  
  // Crear grid
  const grid = document.createElement('div');
  grid.className = 'calendar-grid';
  
  // Headers días de la semana (empezando en Lunes)
  const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  weekDays.forEach(day => {
    const header = document.createElement('div');
    header.className = 'calendar-header';
    header.textContent = day;
    grid.appendChild(header);
  });
  
  // Espacios vacíos antes del primer día
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-day empty';
    grid.appendChild(empty);
  }
  
  // Días del mes
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    dayEl.dataset.day = day;
    
    const number = document.createElement('div');
    number.className = 'day-number';
    number.textContent = day;
    dayEl.appendChild(number);
    
    // Input para emisiones (oculto por defecto)
    const emissionsDiv = document.createElement('div');
    emissionsDiv.className = 'day-emissions';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = '50';
    input.value = calendarState[day] || '0';
    input.addEventListener('input', (e) => {
      calendarState[day] = parseInt(e.target.value) || 0;
      updateCalendarSummary();
      updateBadge(dayEl, day);
    });
    emissionsDiv.appendChild(input);
    dayEl.appendChild(emissionsDiv);
    
    // Badge para mostrar número de emisiones cuando está seleccionado
    updateBadge(dayEl, day);
    
    // Toggle selección
    dayEl.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return;
      
      const isSelected = dayEl.classList.contains('selected');
      dayEl.classList.toggle('selected');
      
      if (!isSelected) {
        const defaultEmissions = parseInt($('#defaultEmissions')?.value || 2);
        calendarState[day] = defaultEmissions;
        input.value = defaultEmissions;
        updateBadge(dayEl, day);
      } else {
        calendarState[day] = 0;
        updateBadge(dayEl, day);
      }
      
      updateCalendarSummary();
    });
    
    // Si ya hay emisiones, marcar como seleccionado
    if (calendarState[day] && calendarState[day] > 0) {
      dayEl.classList.add('selected');
    }
    
    grid.appendChild(dayEl);
  }
  
  container.innerHTML = '';
  container.appendChild(grid);
  updateCalendarSummary();
}

function updateBadge(dayEl, day) {
  const existing = dayEl.querySelector('.day-emissions-badge');
  if (existing) existing.remove();
  
  const emissions = calendarState[day] || 0;
  if (emissions > 0 && dayEl.classList.contains('selected')) {
    const badge = document.createElement('div');
    badge.className = 'day-emissions-badge';
    badge.textContent = emissions;
    dayEl.appendChild(badge);
  }
}

function setupCalendarControls() {
  const btnSelectAll = $('#btnSelectAll');
  const btnClearAll = $('#btnClearAll');
  const defaultEmissions = $('#defaultEmissions');
  
  if (btnSelectAll) {
    btnSelectAll.onclick = () => {
      const days = $$('.calendar-day:not(.empty)');
      const emissions = parseInt(defaultEmissions?.value || 2);
      days.forEach(dayEl => {
        const day = parseInt(dayEl.dataset.day);
        dayEl.classList.add('selected');
        calendarState[day] = emissions;
        const input = dayEl.querySelector('.day-emissions input');
        if (input) input.value = emissions;
        updateBadge(dayEl, day);
      });
      updateCalendarSummary();
    };
  }
  
  if (btnClearAll) {
    btnClearAll.onclick = () => {
      const days = $$('.calendar-day:not(.empty)');
      days.forEach(dayEl => {
        const day = parseInt(dayEl.dataset.day);
        dayEl.classList.remove('selected');
        calendarState[day] = 0;
        const input = dayEl.querySelector('.day-emissions input');
        if (input) input.value = 0;
        updateBadge(dayEl, day);
      });
      updateCalendarSummary();
    };
  }
}

function updateCalendarSummary() {
  const summary = $('#calendarSummary');
  if (!summary) return;
  
  const selectedDays = Object.keys(calendarState).filter(day => calendarState[day] > 0).length;
  const totalEmissions = Object.values(calendarState).reduce((sum, val) => sum + val, 0);
  
  summary.textContent = `${selectedDays} días seleccionados • ${totalEmissions} emisiones totales`;
}

function setupConfigModeTabs() {
  const tabs = $$('.config-tab');
  const modes = $$('.config-mode');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetMode = tab.dataset.mode;
      
      // Actualizar tabs activos
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Actualizar modos visibles
      modes.forEach(mode => {
        if (mode.id === `${targetMode}ConfigMode`) {
          mode.classList.add('active');
        } else {
          mode.classList.remove('active');
        }
      });
    });
  });
}

function getAdvancedConfig() {
  // Detectar qué modo está activo
  const calendarModeActive = $('#calendarConfigMode')?.classList.contains('active');
  
  if (calendarModeActive) {
    // Modo calendario
    const config = {
      daysMode: 'calendar',
      calendar: { ...calendarState },
      timeFrom: {
        hour: parseInt($('#hourFrom')?.value || 8),
        minute: parseInt($('#minuteFrom')?.value || 0)
      },
      timeTo: {
        hour: parseInt($('#hourTo')?.value || 22),
        minute: parseInt($('#minuteTo')?.value || 59)
      }
    };
    return config;
  } else {
    // Modo simple: distribución automática en el mes
    const config = {
      daysMode: 'simple',
      timeFrom: {
        hour: parseInt($('#hourFromSimple')?.value || 8),
        minute: parseInt($('#minuteFromSimple')?.value || 0)
      },
      timeTo: {
        hour: parseInt($('#hourToSimple')?.value || 22),
        minute: parseInt($('#minuteToSimple')?.value || 59)
      }
    };
    return config;
  }
}

function getClientEventsCurrent(clientNorm) {
  const base = state.parsed.perClient.get(clientNorm);
  const adj = state.adjusted.get(clientNorm);
  const result = {
    ESRADIO: adj?.esEventsAdj || base.radios.ESRADIO,
    MARCADOR: adj?.maEventsAdj || base.radios.MARCADOR
  };
  console.log(`[DEBUG] getClientEventsCurrent for ${clientNorm} - ESRADIO: ${result.ESRADIO.length}, MARCADOR: ${result.MARCADOR.length}`);
  return result;
}

function renderCertPreview(clientNorm, useAdjusted) {
  const div = $('#certPreview'); div.innerHTML = '';
  const data = state.parsed.perClient.get(clientNorm);
  const current = useAdjusted ? getClientEventsCurrent(clientNorm) : data.radios;
  
  // Obtener la selección de radio actual
  const selectedRadio = $('input[name="radioType"]:checked')?.value || 'AUTO';

  const makeTable = (title, arr, targetRadio) => {
    const t = document.createElement('table');
    t.innerHTML = `<caption>${title}</caption>
      <thead><tr><th>Día</th><th>Hora</th><th>Puerto/Player</th><th>Nombre Cuña (Ruta completa)</th></tr></thead>
      <tbody></tbody>`;
    arr.slice().sort(byDT).forEach(e=>{
      const tr = document.createElement('tr');
      // Ajustar la ruta según la radio seleccionada
      const adjustedPath = targetRadio ? adjustPathForRadio(e.path, targetRadio) : e.path;
      tr.innerHTML = `<td>${e.date}</td><td>${e.time}</td><td>${e.player}</td><td>${adjustedPath}</td>`;
      t.querySelector('tbody').appendChild(tr);
    });
    return t;
  };

  // Debug: log event counts
  console.log(`[DEBUG] Preview - selectedRadio: ${selectedRadio}, ESRADIO events: ${current.ESRADIO.length}, MARCADOR events: ${current.MARCADOR.length}`);
  
  // Mostrar según la selección de radio
  if (selectedRadio === 'ESRADIO') {
    div.appendChild(makeTable('ESRADIO', current.ESRADIO, 'ESRADIO'));
  } else if (selectedRadio === 'MARCADOR') {
    div.appendChild(makeTable('MARCADOR', current.MARCADOR, 'MARCADOR'));
  } else if (selectedRadio === 'DUAL') {
    div.appendChild(makeTable(`ESRADIO (${current.ESRADIO.length} emisiones - Primero en DUAL)`, current.ESRADIO, 'ESRADIO'));
    div.appendChild(makeTable(`MARCADOR (${current.MARCADOR.length} emisiones - Después en DUAL)`, current.MARCADOR, 'MARCADOR'));
  } else {
    // AUTO: usar cobertura detectada
    if (data.coverage === 'ESRADIO') {
      div.appendChild(makeTable('ESRADIO', current.ESRADIO, 'ESRADIO'));
    } else if (data.coverage === 'MARCADOR') {
      div.appendChild(makeTable('MARCADOR', current.MARCADOR, 'MARCADOR'));
    } else {
      div.appendChild(makeTable(`ESRADIO (${current.ESRADIO.length} emisiones - Primero en DUAL)`, current.ESRADIO, 'ESRADIO'));
      div.appendChild(makeTable(`MARCADOR (${current.MARCADOR.length} emisiones - Después en DUAL)`, current.MARCADOR, 'MARCADOR'));
    }
  }
}

/* ===== Ajuste manual ===== */
function applyAdjustment(clientNorm, targetEs, targetMa, advancedConfig = null) {
  const base = state.parsed.perClient.get(clientNorm);
  const currentEs = base.radios.ESRADIO.slice();
  const currentMa = base.radios.MARCADOR.slice();

  const seed = hashCode(clientNorm + state.monthSuffix);
  const randEs = mulberry32(seed ^ 0xA5A5);
  const randMa = mulberry32(seed ^ 0x5A5A);

  // Distribuciones empíricas por emisora
  const distEs = buildMinuteDistribution(state.parsed.events.filter(e=>e.radio==='ESRADIO'));
  const distMa = buildMinuteDistribution(state.parsed.events.filter(e=>e.radio==='MARCADOR'));

  let esEventsAdj, maEventsAdj;

  // Modo calendario: distribuir según emisiones por día
  if (advancedConfig && advancedConfig.daysMode === 'calendar' && advancedConfig.calendar) {
    esEventsAdj = generateCalendarBasedEvents(currentEs, 'ESRADIO', base, distEs, randEs, advancedConfig);
    maEventsAdj = generateCalendarBasedEvents(currentMa, 'MARCADOR', base, distMa, randMa, advancedConfig);
  } else if (advancedConfig && advancedConfig.daysMode === 'simple') {
    // Modo simple: generar emisiones distribuidas en todo el mes
    const month = parseInt($('#monthSelect').value);
    const year = $('#yearSelect').value;
    const daysInMonth = new Date(year, month, 0).getDate();
    const availableDays = [];
    
    for (let d = 1; d <= daysInMonth; d++) {
      availableDays.push(`${PAD2(d)}/${PAD2(month)}/${year}`);
    }
    
    // Generar eventos desde cero con el número objetivo
    esEventsAdj = generateSyntheticEventsFromScratch(
      targetEs,
      'ESRADIO',
      base.display,
      clientNorm,
      availableDays,
      seed ^ 0xA5A5,
      advancedConfig
    );
    
    console.log(`[DEBUG] Generated ${esEventsAdj.length} ESRADIO events for ${base.display}`);
    
    maEventsAdj = generateSyntheticEventsFromScratch(
      targetMa,
      'MARCADOR',
      base.display,
      clientNorm,
      availableDays,
      seed ^ 0x5A5A,
      advancedConfig
    );
    
    console.log(`[DEBUG] Generated ${maEventsAdj.length} MARCADOR events for ${base.display}`);
  } else {
    // Modo tradicional (por si acaso)
    const needEs = Math.max(0, targetEs - currentEs.length);
    const needMa = Math.max(0, targetMa - currentMa.length);

    // Obtener días según configuración avanzada
    let allDaysEs, allDaysMa;
    if (advancedConfig) {
      allDaysEs = getFilteredDays(advancedConfig);
      allDaysMa = getFilteredDays(advancedConfig);
    } else {
      allDaysEs = uniqueDays(state.parsed.events.filter(e=>e.radio==='ESRADIO'));
      allDaysMa = uniqueDays(state.parsed.events.filter(e=>e.radio==='MARCADOR'));
    }

    // Generar adicionales
    const esNew = generateSyntheticEvents(currentEs, needEs, 'ESRADIO', base, distEs, allDaysEs, randEs, advancedConfig);
    const maNew = generateSyntheticEvents(currentMa, needMa, 'MARCADOR', base, distMa, allDaysMa, randMa, advancedConfig);

    esEventsAdj = currentEs.concat(esNew).sort(byDT);
    maEventsAdj = currentMa.concat(maNew).sort(byDT);
  }

  console.log(`[DEBUG] Storing adjusted events - ESRADIO: ${esEventsAdj.length}, MARCADOR: ${maEventsAdj.length}`);
  state.adjusted.set(clientNorm, { esEventsAdj, maEventsAdj, targets: {es:targetEs, ma:targetMa}, wasAdjusted:true });
}

function generateCalendarBasedEvents(existing, radio, clientData, cdfMinutes, rnd, advancedConfig) {
  const month = parseInt($('#monthSelect').value);
  const year = $('#yearSelect').value;
  const calendar = advancedConfig.calendar || {};
  
  const events = [];
  const paths = Array.from(clientData.pieces).filter(p=>/PUBLICIDAD/i.test(p) && normalizeClientNameFromPath(p) === normalizeClientName(clientData.display));
  const fallbackPaths = Array.from(clientData.pieces).filter(p=>/PUBLICIDAD/i.test(p));
  const modePlayer = mode(existing.map(e=>e.player).filter(Boolean)) || 'Principal';
  
  const hourMin = advancedConfig.timeFrom.hour;
  const minuteMin = advancedConfig.timeFrom.minute;
  const hourMax = advancedConfig.timeTo.hour;
  const minuteMax = advancedConfig.timeTo.minute;
  
  // Generar eventos para cada día con emisiones
  for (const [day, emissionsCount] of Object.entries(calendar)) {
    if (emissionsCount <= 0) continue;
    
    const dayNum = parseInt(day);
    const dateStr = `${PAD2(dayNum)}/${PAD2(month)}/${year}`;
    
    // Generar las emisiones para este día
    for (let i = 0; i < emissionsCount; i++) {
      const hour = hourMin + Math.floor(rnd() * (hourMax - hourMin + 1));
      
      let minute;
      if (hour === hourMin) {
        minute = minuteMin + Math.floor(rnd() * (60 - minuteMin));
      } else if (hour === hourMax) {
        minute = Math.floor(rnd() * (minuteMax + 1));
      } else {
        minute = Math.floor(rnd() * 60);
      }
      
      const secondsPool = [0, 3, 7, 12, 15, 18, 23, 27, 30, 34, 38, 42, 45, 48, 52, 55, 58];
      const second = secondsPool[Math.floor(rnd() * secondsPool.length)];
      
      const time = `${PAD2(hour)}:${PAD2(minute)}:${PAD2(second)}`;
      const path = (paths.length > 0 ? paths : fallbackPaths)[Math.floor(rnd() * ((paths.length > 0 ? paths : fallbackPaths).length || 1))] || 'PUBLICIDAD/'+clientData.display;
      
      events.push({
        radio,
        date: dateStr,
        time,
        player: modePlayer,
        path,
        client: clientData.display,
        clientNorm: normalizeClientName(clientData.display)
      });
    }
  }
  
  return events.sort(byDT);
}

function getFilteredDays(config) {
  const month = parseInt($('#monthSelect').value);
  const year = $('#yearSelect').value;
  const daysInMonth = new Date(year, month, 0).getDate();
  
  const allDays = [];
  for (let d = 1; d <= daysInMonth; d++) {
    allDays.push(`${PAD2(d)}/${PAD2(month)}/${year}`);
  }
  
  // Modo calendario: usar solo los días seleccionados con emisiones
  if (config.daysMode === 'calendar' && config.calendar) {
    const selectedDays = [];
    for (const [day, emissions] of Object.entries(config.calendar)) {
      if (emissions > 0) {
        const dayNum = parseInt(day);
        if (dayNum >= 1 && dayNum <= daysInMonth) {
          selectedDays.push(`${PAD2(dayNum)}/${PAD2(month)}/${year}`);
        }
      }
    }
    return selectedDays.length > 0 ? selectedDays : allDays;
  }
  
  if (config.daysMode === 'all') {
    return allDays;
  }
  
  if (config.daysMode === 'range') {
    const from = Math.max(1, Math.min(config.dayFrom, daysInMonth));
    const to = Math.max(from, Math.min(config.dayTo, daysInMonth));
    return allDays.filter((_, idx) => {
      const day = idx + 1;
      return day >= from && day <= to;
    });
  }
  
  if (config.daysMode === 'weekdays' && config.weekdays?.length > 0) {
    return allDays.filter(dateStr => {
      const [d, m, y] = dateStr.split('/').map(Number);
      const date = new Date(y, m - 1, d);
      const weekday = date.getDay(); // 0=domingo, 1=lunes, etc.
      return config.weekdays.includes(weekday);
    });
  }
  
  return allDays;
}

function uniqueDays(events) {
  return Array.from(new Set(events.map(e=>e.date))).sort((a,b)=>{
    const A=a.split('/').reverse().join('-'), B=b.split('/').reverse().join('-'); return A<B?-1:1;
  });
}

function buildMinuteDistribution(events) {
  const minutes = new Array(60).fill(1); // smoothing
  for (const e of events) {
    if (!e.time || e.time==='N/D') continue;
    const m = parseInt(e.time.split(':')[1],10);
    if (!isNaN(m)) minutes[m] += 5; // peso
  }
  // Normalizar a CDF
  const sum = minutes.reduce((a,b)=>a+b,0);
  const cdf = []; let acc=0;
  for (let i=0;i<60;i++) { acc += minutes[i]/sum; cdf.push(acc); }
  return cdf;
}

function pickMinute(cdf, rnd) {
  const r = rnd();
  for (let i=0;i<cdf.length;i++) if (r <= cdf[i]) return i;
  return 0;
}

function weightedDay(existing, availableDays, rnd) {
  // Si no hay eventos existentes, seleccionar un día aleatorio de los disponibles
  if (existing.length === 0) {
    return availableDays[Math.floor(rnd() * availableDays.length)];
  }
  
  // Construir distribución de días basada en eventos existentes
  const dayCount = new Map();
  for (const ev of existing) {
    dayCount.set(ev.date, (dayCount.get(ev.date) || 0) + 1);
  }
  
  // Si hay días en existing, usar esa distribución
  if (dayCount.size > 0) {
    const days = Array.from(dayCount.keys());
    const weights = days.map(d => dayCount.get(d));
    const total = weights.reduce((a, b) => a + b, 0);
    const r = rnd() * total;
    
    let acc = 0;
    for (let i = 0; i < days.length; i++) {
      acc += weights[i];
      if (r <= acc) return days[i];
    }
    return days[days.length - 1];
  }
  
  // Fallback: día aleatorio de los disponibles
  return availableDays[Math.floor(rnd() * availableDays.length)];
}

function generateSyntheticEvents(existing, need, radio, clientData, cdfMinutes, availableDays, rnd, advancedConfig = null) {
  if (need<=0) return [];
  const paths = Array.from(clientData.pieces).filter(p=>/PUBLICIDAD/i.test(p) && normalizeClientNameFromPath(p) === normalizeClientName(clientData.display));
  const fallbackPaths = Array.from(clientData.pieces).filter(p=>/PUBLICIDAD/i.test(p));
  const modePlayer = mode(existing.map(e=>e.player).filter(Boolean)) || 'Principal';

  // Configuración de horarios
  let hourMin = 8, hourMax = 22, minuteMin = 0, minuteMax = 59;
  if (advancedConfig) {
    hourMin = advancedConfig.timeFrom.hour;
    minuteMin = advancedConfig.timeFrom.minute;
    hourMax = advancedConfig.timeTo.hour;
    minuteMax = advancedConfig.timeTo.minute;
  }

  const existingSet = new Set(existing.map(e=>e.date+' '+e.time));
  const out = [];
  let guard = 0;
  while (out.length < need && guard < need*50) {
    guard++;
    const day = weightedDay(existing, availableDays, rnd);
    
    // Generar hora realista
    const hour = hourMin + Math.floor(rnd() * (hourMax - hourMin + 1));
    
    // Ajustar minutos según la hora
    let minute;
    if (hour === hourMin) {
      // Si es la hora mínima, empezar desde minuteMin
      minute = minuteMin + Math.floor(rnd() * (60 - minuteMin));
    } else if (hour === hourMax) {
      // Si es la hora máxima, no pasar de minuteMax
      minute = Math.floor(rnd() * (minuteMax + 1));
    } else {
      // Horas intermedias: usar distribución empírica o aleatoria
      if (advancedConfig) {
        // Completamente aleatorio para ser realista
        minute = Math.floor(rnd() * 60);
      } else {
        minute = pickMinute(cdfMinutes, rnd);
      }
    }
    
    // Segundos realistas: variados, no siempre 00
    const secondsPool = [0, 3, 7, 12, 15, 18, 23, 27, 30, 34, 38, 42, 45, 48, 52, 55, 58];
    const second = secondsPool[Math.floor(rnd() * secondsPool.length)];
    
    let hh = PAD2(hour), mm = PAD2(minute), ss = PAD2(second);
    let time = `${hh}:${mm}:${ss}`;
    let key = `${day} ${time}`;
    
    // Verificar duplicados
    if (existingSet.has(key) || out.some(e=>e.date+' '+e.time===key)) {
      // Ajustar segundos primero
      let newSecond = (second + 5 + Math.floor(rnd() * 10)) % 60;
      time = `${hh}:${mm}:${PAD2(newSecond)}`;
      key = `${day} ${time}`;
      
      if (existingSet.has(key) || out.some(e=>e.date+' '+e.time===key)) {
        // Si aún hay conflicto, ajustar minutos
        let adj = (rnd()<0.5?-1:1) * (1 + Math.floor(rnd()*3));
        let m2 = Math.min(59, Math.max(0, minute+adj));
        time = `${hh}:${PAD2(m2)}:${ss}`;
        key = `${day} ${time}`;
        if (existingSet.has(key) || out.some(e=>e.date+' '+e.time===key)) continue;
      }
    }
    
    const path = paths.length ? paths[Math.floor(rnd()*paths.length)] :
                 (fallbackPaths.length ? fallbackPaths[Math.floor(rnd()*fallbackPaths.length)] : null);
    if (!path) break;

    out.push({ radio, date: day, time, player: modePlayer, path, client: clientData.display, clientNorm: normalizeClientName(clientData.display) });
  }
  return out;
}

function normalizeClientNameFromPath(path) {
  const { clientDetected } = detectClientFromPath(path);
  return normalizeClientName(clientDetected);
}

function mode(arr) {
  const m = new Map(); arr.forEach(x=>m.set(x,(m.get(x)||0)+1));
  let best=null, max=-1; for (const [k,v] of m) if (v>max) {best=k; max=v;}
  return best;
}

function hashCode(s) { let h=0; for (let i=0; i<s.length; i++) { h=((h<<5)-h)+s.charCodeAt(i); h|=0; } return h>>>0; }
function mulberry32(a) { return function() { let t=a+=0x6D2B79F5; t=Math.imul(t^t>>>15, t|1); t^=t+Math.imul(t^t>>>7, t|61); return ((t^t>>>14)>>>0)/4294967296; }}

/* ===== Status Helper ===== */
function showStatus(message, type = 'info') {
  const statusEl = $('#status');
  statusEl.textContent = message;
  statusEl.className = `status-${type}`;
  
  // Auto-clear success messages after 5 seconds
  if (type === 'success') {
    setTimeout(() => {
      if (statusEl.textContent === message) {
        statusEl.textContent = '';
        statusEl.className = '';
      }
    }, 5000);
  }
}

/* ===== Exportación: Excel + ZIP ===== */
$('#btnResumen').addEventListener('click', async ()=> {
  const btn = $('#btnResumen');
  btn.classList.add('loading');
  btn.disabled = true;
  
  try {
    const wb = await buildResumenWorkbook();
    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), `RESUMEN${state.monthSuffix}.xlsx`);
    showStatus('📋 Resumen descargado correctamente', 'success');
  } catch (error) {
    console.error('Error generando resumen:', error);
    showStatus('❌ Error generando el resumen', 'error');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
});
$('#btnClientesXlsx').addEventListener('click', async ()=> {
  const btn = $('#btnClientesXlsx');
  btn.classList.add('loading');
  btn.disabled = true;
  
  try {
    const wb = await buildClientesWorkbook();
    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), `CLIENTES.xlsx`);
    showStatus('👥 Lista de clientes descargada correctamente', 'success');
  } catch (error) {
    console.error('Error generando clientes:', error);
    showStatus('❌ Error generando la lista de clientes', 'error');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
});
$('#btnListado').addEventListener('click', async ()=> {
  const btn = $('#btnListado');
  btn.classList.add('loading');
  btn.disabled = true;
  
  try {
    const wb = await buildListadoWorkbook();
    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), `LISTADO_CLIENTES_PUBLICIDAD${state.monthSuffix}.xlsx`);
    showStatus('📄 Listado de publicidad descargado correctamente', 'success');
  } catch (error) {
    console.error('Error generando listado:', error);
    showStatus('❌ Error generando el listado de publicidad', 'error');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
});

// Botón de descarga individual se configura dinámicamente en openCliente()

$('#btnZip').addEventListener('click', async ()=> {
  const btn = $('#btnZip');
  btn.classList.add('loading');
  btn.disabled = true;
  
  showStatus('📦 Generando archivo ZIP completo...', 'info');
  
  try {
    const zip = new JSZip();

  // Resúmenes
  {
    const wb = await buildResumenWorkbook();
    zip.file(`RESUMEN${state.monthSuffix}.xlsx`, await wb.xlsx.writeBuffer());
  }
  {
    const wb = await buildClientesWorkbook();
    zip.file(`CLIENTES.xlsx`, await wb.xlsx.writeBuffer());
  }
  {
    const wb = await buildListadoWorkbook();
    zip.file(`LISTADO_CLIENTES_PUBLICIDAD${state.monthSuffix}.xlsx`, await wb.xlsx.writeBuffer());
  }

  // Certificados por cliente
  for (const [cn, data] of state.parsed.perClient.entries()) {
    const current = getClientEventsCurrent(cn);
    const wb = await buildCertWorkbookForClient(data, current);
    const safe = cn.replace(/[^\p{L}\p{N}]+/gu,'_');
    zip.file(`CERT_${safe}${state.monthSuffix}.xlsx`, await wb.xlsx.writeBuffer());
  }

  const content = await zip.generateAsync({type:'blob'});
  saveAs(content, `CERTIFICACIONES${state.monthSuffix}.zip`);
  showStatus('📦 Archivo ZIP completo descargado correctamente', 'success');
  } catch (error) {
    console.error('Error generando ZIP:', error);
    showStatus('❌ Error generando el archivo ZIP completo', 'error');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
});

/* ===== Fabricación de Workbooks ===== */
async function loadTemplate(type) {
  // type: 'ES','MA','DU'
  const file = (type==='ES'?state.templates.es:(type==='MA'?state.templates.ma:state.templates.du));
  
  if (!file) {
    // Si no hay plantilla, construimos una al vuelo muy simple
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('CERTIFICADO DE EMISIÓN');
    ws.addRow([null,null, (type==='ES'?'CERTIFICADO DE EMISIÓN ESRADIO ALMERÍA': (type==='MA'?'CERTIFICADO DE EMISIÓN  MARCADOR ALMERÍA RADIO':'CERTIFICADO DE EMISIÓN ESRADIO ALMERÍA Y MARCADOR ALMERÍA')) ]);
    ws.addRow([]);
    ws.addRow([null,null,'Cliente:', '']);
    ws.addRow([null,null,'Producto:', '']);
    ws.addRow([null,null,'Tipo de emision:', 'Publicidad']);
    ws.addRow([null,null,'Total inserciones:', 0]);
    ws.addRow([]);
    ws.addRow(['FECHA ','HORA','EMISOR', null, null, 'CUÑA']);
    return wb;
  }
  
  // Cargar plantilla predefinida
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  return wb;
}

// Buscador de fila de cabecera y columnas según “FECHA/HORA/EMISOR/CUÑA”
function findHeader(ws) {
  let rowIdx = -1, map = {};
  for (let r=1; r<=ws.rowCount; r++) {
    const row = ws.getRow(r);
    const values = row.values.map(v => (typeof v === 'string' ? v.trim().toUpperCase() : v));
    if (values.some(v=>typeof v==='string' && v.includes('FECHA')) &&
        values.some(v=>typeof v==='string' && v.includes('HORA')) &&
        values.some(v=>typeof v==='string' && v.includes('EMISOR')) &&
        values.some(v=>typeof v==='string' && v.includes('CUÑA'))) {
      rowIdx = r;
      // mapear columnas
      for (let c=1; c<=row.cellCount; c++) {
        const txt = String(row.getCell(c).value||'').toUpperCase();
        if (txt.includes('FECHA')) map.fecha = c;
        if (txt.includes('HORA')) map.hora = c;
        if (txt.includes('EMISOR')) map.player = c;
        if (txt.includes('CUÑA')) map.ruta = c;
      }
      break;
    }
  }
  return { rowIdx, map };
}

// Helper para ajustar la ruta según la radio seleccionada
function adjustPathForRadio(originalPath, targetRadio) {
  if (!originalPath || !targetRadio) return originalPath;
  
  // Normalizar targetRadio a mayúsculas
  targetRadio = targetRadio.toUpperCase();
  
  // Patrón para buscar radio antes o después de PUBLICIDAD (con / o \)
  // Casos: \MARCADOR\PUBLICIDAD\ o /ESRADIO/PUBLICIDAD/ o \PUBLICIDAD\ESRADIO\ etc.
  
  // Caso 1: Radio ANTES de PUBLICIDAD (ej: C:\Users\pc\MARCADOR\PUBLICIDAD\...)
  const radioBeforePub = /([\\/])(ESRADIO|MARCADOR)([\\/]PUBLICIDAD[\\/])/i;
  if (radioBeforePub.test(originalPath)) {
    return originalPath.replace(radioBeforePub, `$1${targetRadio}$3`);
  }
  
  // Caso 2: Radio DESPUÉS de PUBLICIDAD (ej: D:/PUBLICIDAD/MARCADOR/...)
  const radioAfterPub = /([\\/]PUBLICIDAD[\\/])(ESRADIO|MARCADOR)([\\/])/i;
  if (radioAfterPub.test(originalPath)) {
    return originalPath.replace(radioAfterPub, `$1${targetRadio}$3`);
  }
  
  // Caso 3: Solo PUBLICIDAD sin radio - agregar radio después de PUBLICIDAD
  const onlyPub = /([\\/]PUBLICIDAD)([\\/])/i;
  if (onlyPub.test(originalPath) && !/(ESRADIO|MARCADOR)/i.test(originalPath)) {
    return originalPath.replace(onlyPub, `$1$2${targetRadio}$2`);
  }
  
  return originalPath;
}

async function buildCertWorkbookForClient(clientData, currentByRadio, selectedRadio = 'AUTO') {
  // Determinar el tipo de plantilla según la selección
  let type;
  if (selectedRadio === 'AUTO') {
    // Usar cobertura detectada
    type = clientData.coverage==='AMBAS' ? 'DU' : (clientData.coverage==='ESRADIO'?'ES':'MA');
  } else if (selectedRadio === 'ESRADIO') {
    type = 'ES';
  } else if (selectedRadio === 'MARCADOR') {
    type = 'MA';
  } else if (selectedRadio === 'DUAL') {
    type = 'DU';
  }
  
  console.log(`[DEBUG] Building certificate - selectedRadio: ${selectedRadio}, type: ${type}, template: ${type === 'ES' ? 'PLANTILLA_ESRADIO' : type === 'MA' ? 'PLANTILLA_MARCADOR' : 'PLANTILLA_DUAL'}`);
  const wb = await loadTemplate(type);
  const ws = wb.worksheets[0];

  // Encabezados superiores
  putCellRightOfLabel(ws, 'Cliente:', clientData.display);
  putCellRightOfLabel(ws, 'Producto', clientData.display);
  putCellRightOfLabel(ws, 'Tipo de emision', 'Publicidad');

  // Orden y volcado según selección
  const { rowIdx, map } = findHeader(ws);
  let startRow = rowIdx + 1;
  const rowsToWrite = [];
  
  // Filtrar eventos según la radio seleccionada y ajustar rutas
  if (selectedRadio === 'ESRADIO') {
    // Solo ESRADIO - ajustar todas las rutas a ESRADIO
    const events = currentByRadio.ESRADIO.slice().sort(byDT);
    rowsToWrite.push(... events.map(ev => ({
      ...ev,
      path: adjustPathForRadio(ev.path, 'ESRADIO')
    })));
  } else if (selectedRadio === 'MARCADOR') {
    // Solo MARCADOR - ajustar todas las rutas a MARCADOR
    const events = currentByRadio.MARCADOR.slice().sort(byDT);
    rowsToWrite.push(... events.map(ev => ({
      ...ev,
      path: adjustPathForRadio(ev.path, 'MARCADOR')
    })));
  } else if (selectedRadio === 'DUAL') {
    // Ambas radios - IMPORTANTE: Primero TODAS las de ESRADIO, luego TODAS las de MARCADOR
    console.log(`[DEBUG] DUAL mode - ESRADIO events: ${currentByRadio.ESRADIO.length}, MARCADOR events: ${currentByRadio.MARCADOR.length}`);
    
    // Primero TODAS las emisiones de ESRADIO ordenadas
    const esEvents = currentByRadio.ESRADIO.slice().sort(byDT).map(ev => ({
      ...ev,
      path: adjustPathForRadio(ev.path, 'ESRADIO')
    }));
    rowsToWrite.push(...esEvents);
    console.log(`[DEBUG] Added ${esEvents.length} ESRADIO events to certificate`);
    
    // Después TODAS las emisiones de MARCADOR ordenadas
    const maEvents = currentByRadio.MARCADOR.slice().sort(byDT).map(ev => ({
      ...ev,
      path: adjustPathForRadio(ev.path, 'MARCADOR')
    }));
    rowsToWrite.push(...maEvents);
    console.log(`[DEBUG] Added ${maEvents.length} MARCADOR events to certificate`);
    console.log(`[DEBUG] Total events in DUAL certificate: ${rowsToWrite.length}`);
  } else {
    // AUTO: según cobertura detectada
    if (type === 'DU') {
      rowsToWrite.push(... currentByRadio.ESRADIO.slice().sort(byDT).map(ev => ({
        ...ev,
        path: adjustPathForRadio(ev.path, 'ESRADIO')
      })));
      rowsToWrite.push(... currentByRadio.MARCADOR.slice().sort(byDT).map(ev => ({
        ...ev,
        path: adjustPathForRadio(ev.path, 'MARCADOR')
      })));
    } else if (type === 'ES') {
      rowsToWrite.push(... currentByRadio.ESRADIO.slice().sort(byDT).map(ev => ({
        ...ev,
        path: adjustPathForRadio(ev.path, 'ESRADIO')
      })));
    } else {
      rowsToWrite.push(... currentByRadio.MARCADOR.slice().sort(byDT).map(ev => ({
        ...ev,
        path: adjustPathForRadio(ev.path, 'MARCADOR')
      })));
    }
  }
  
  // borrar posibles datos previos bajo cabecera (si reemitimos)
  for (let r=startRow; r<=ws.rowCount; r++) ws.spliceRows(startRow, 1);

  for (const ev of rowsToWrite) {
    const row = ws.insertRow(startRow++, []);
    row.getCell(map.fecha).value = ev.date;
    row.getCell(map.hora).value = ev.time;
    row.getCell(map.player).value = ev.player || 'N/D';
    row.getCell(map.ruta).value = ev.path;
  }
  putCellRightOfLabel(ws, 'Total inserciones', rowsToWrite.length);
  return wb;
}

// Helpers para escribir en celdas a la derecha de “Cliente:”, “Producto:”, etc.
function putCellRightOfLabel(ws, label, value) {
  const lab = label.toUpperCase();
  for (let r=1; r<=ws.rowCount; r++) {
    const row = ws.getRow(r);
    for (let c=1; c<=row.cellCount; c++) {
      const v = row.getCell(c).value;
      if (typeof v === 'string' && v.toUpperCase().includes(lab)) {
        row.getCell(c+1).value = value; return;
      }
    }
  }
}

/* ===== Workbooks de resumen ===== */
async function buildResumenWorkbook() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Resumen');
  ws.addRow(['Cliente','Emitidas_ESRADIO','Emitidas_MARCADOR','Emitidas_TOTAL','Cobertura']);
  for (const [cn, d] of state.parsed.perClient.entries()) {
    const cur = getClientEventsCurrent(cn);
    const es = cur.ESRADIO.length, ma = cur.MARCADOR.length;
    ws.addRow([d.display, es, ma, es+ma, d.coverage]);
  }
  // Alias
  const aliasWs = wb.addWorksheet('Diccionario_Alias');
  aliasWs.addRow(['Detectado','Cliente_Normalizado','Similitud','Ejemplo_Ruta']);
  state.parsed.alias.forEach(a=> aliasWs.addRow([a.detected, a.normalized, a.similarity, a.examplePath]));
  // Incidencias
  const incWs = wb.addWorksheet('Incidencias');
  incWs.addRow(['Archivo','Línea','Motivo']);
  state.parsed.issues.forEach(i=> incWs.addRow([i.file, i.lineNo, i.reason]));
  return wb;
}
async function buildClientesWorkbook() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('CLIENTES');
  ws.addRow(['Cliente','Emitidas_ESRADIO','Emitidas_MARCADOR','Emitidas_TOTAL','Cobertura','Primera_Emisión','Última_Emisión','N_Piezas_Distintas','Ejemplo_Ruta1','Ejemplo_Ruta2']);
  for (const [cn, d] of state.parsed.perClient.entries()) {
    const cur = getClientEventsCurrent(cn);
    const es = cur.ESRADIO.length, ma = cur.MARCADOR.length;
    const total = es+ma;
    const pieces = Array.from(d.pieces);
    ws.addRow([d.display, es, ma, total, d.coverage, d.first, d.last, d.pieces.size, pieces[0]||'', pieces[1]||'']);
  }
  return wb;
}
async function buildListadoWorkbook() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('LISTADO');
  ws.addRow(['Cliente','Cobertura']);
  for (const [cn, d] of state.parsed.perClient.entries()) {
    ws.addRow([d.display, d.coverage]);
  }
  return wb;
}
