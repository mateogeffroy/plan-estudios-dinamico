// State
const state = {}; 

// ─── LOCAL STORAGE INIT ────────────────────────────────────────────────────────
const SAVED_STATE_KEY = 'planSistemasState_v1';
const HAS_VISITED_KEY = 'planSistemasVisited';

ALL.forEach(s => state[s.id] = 'disabled');
SUBJECTS.filter(s => s.level === 1).forEach(s => state[s.id] = 'available');

const savedData = localStorage.getItem(SAVED_STATE_KEY);
if (savedData) {
  try {
    const parsed = JSON.parse(savedData);
    Object.assign(state, parsed);
  } catch (e) {
    console.error("Error leyendo local storage", e);
  }
}

function saveProgress() {
  localStorage.setItem(SAVED_STATE_KEY, JSON.stringify(state));
}

// ─── RENDER ────────────────────────────────────────────────────────────────────
const LEVEL_COLORS = { 1:'--n1', 2:'--n2', 3:'--n3', 4:'--n4', 5:'--n5' };
const LEVEL_NAMES = { 1:'Primer Nivel', 2:'Segundo Nivel', 3:'Tercer Nivel', 4:'Cuarto Nivel', 5:'Quinto Nivel' };

function getSubjectById(id) { return ALL.find(s => s.id == id); }

function checkAvailability(subject) {
  const cursadaOk = subject.correlCursada.every(cid => {
    const st = state[cid];
    return st === 'cursada' || st === 'aprobada';
  });
  const aprobadaOk = subject.correlAprobada.every(cid => state[cid] === 'aprobada');
  return cursadaOk && aprobadaOk;
}

function updateAllAvailability() {
  ALL.forEach(s => {
    if (s.isElectivePlaceholder) return; // Las electivas se calculan aparte

    if (state[s.id] === 'disabled') {
      if (checkAvailability(s)) state[s.id] = 'available';
    }
    if (state[s.id] === 'available') {
      if (!checkAvailability(s)) state[s.id] = 'disabled';
    }
  });
}

function updateElectivePlaceholders() {
  [3, 4, 5].forEach(lvl => {
    const electivesOfLevel = ELECTIVAS[lvl];
    if (!electivesOfLevel) return;

    let cursadaHours = 0;
    let aprobadaHours = 0;

    electivesOfLevel.forEach(el => {
       if (state[el.id] === 'aprobada') aprobadaHours += el.annualHours;
       else if (state[el.id] === 'cursada') cursadaHours += el.annualHours;
    });

    const placeholder = ALL.find(s => s.isElectivePlaceholder && s.level === lvl);
    if (!placeholder) return;

    const totalActive = cursadaHours + aprobadaHours;

    if (aprobadaHours >= placeholder.targetHours) {
      state[placeholder.id] = 'aprobada';
    } else if (totalActive >= placeholder.targetHours) {
      state[placeholder.id] = 'cursada';
    } else {
      state[placeholder.id] = 'available';
    }
  });
}

function renderCard(subject) {
  const div = document.createElement('div');
  div.className = 'subject-card ' + state[subject.id];
  div.id = 'card-' + subject.id;
  div.dataset.id = subject.id;

  const icon = state[subject.id] === 'cursada' ? '📖'
             : state[subject.id] === 'aprobada' ? '✅'
             : state[subject.id] === 'available' ? '' : '🔒';

  div.innerHTML = `
    <div class="subject-num">${subject.num}</div>
    <div class="subject-name">${subject.name}</div>
    <div class="subject-hours">${subject.hours}</div>
    <div class="subject-status-icon">${icon}</div>
  `;

  if (!subject.isElectivePlaceholder) {
    // Evento Click Izquierdo / Toque Simple
    div.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Si el puntero es "grueso" (pantalla táctil), abrimos el menú
      if (window.matchMedia("(pointer: coarse)").matches) {
        openActionMenu(subject.id, div);
      } else {
        // Si es mouse, lo tomamos como click izquierdo normal
        handleClick(subject.id, 'aprobada');
      }
    });
    
    // Evento Click Derecho / Toque Mantenido
    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (window.matchMedia("(pointer: coarse)").matches) {
        // Si mantiene presionado el dedo en el celu, también abrimos el menú para atajar el evento nativo
        openActionMenu(subject.id, div);
      } else {
        // Si es mouse, lo tomamos como click derecho normal
        handleClick(subject.id, 'cursada');
      }
    });
  }

  div.addEventListener('mousemove', (e) => showTooltip(e, subject));
  div.addEventListener('mouseleave', () => hideTooltip());

  return div;
}

function handleClick(id, action) {
  const cur = state[id];
  if (cur === 'disabled') return;

  const subject = getSubjectById(id);

  // Lógica especial para el Seminario
  if (subject && subject.isSeminario) {
    // Si ya estaba en verde (aprobada automáticamente), no dejamos que la desmarque con un simple clic.
    if (cur === 'aprobada') return; 
    
    // Solo alterna entre 'cursada' (amarillo) y 'available' (gris)
    if (cur === 'cursada') state[id] = 'available';
    else state[id] = 'cursada';
  } else {
    // Lógica normal para el resto
    if (cur === action) state[id] = 'available';
    else state[id] = action;
  }

  updateAllAvailability();
  updateElectivePlaceholders(); 
  checkMilestones(); // <-- NUEVO: Revisamos si se recibe de algo
  refreshAll();
  updateStats();
  saveProgress(); 

  const card = document.getElementById('card-' + id);
  if (card) {
    card.classList.remove('popping');
    void card.offsetWidth;
    card.classList.add('popping');
    setTimeout(() => card.classList.remove('popping'), 300);
  }
}

// ─── LÓGICA DEL MENÚ DESPLEGABLE ───
let currentSelectedId = null;
const actionMenu = document.getElementById('action-menu');

function openActionMenu(id, cardElement) {
  if (state[id] === 'disabled') return;
  
  currentSelectedId = id;
  const subject = getSubjectById(id);
  
  hideTooltip(); // Ocultamos el tooltip para que no moleste en el celu

  // Calculamos dónde está la tarjeta en la pantalla
  const rect = cardElement.getBoundingClientRect();
  actionMenu.style.display = 'flex';
  
  // Posicionamos el menú justo abajo de la tarjeta
  let topPos = rect.bottom + 5;
  let leftPos = rect.left;
  
  // Si el menú se va a salir por abajo de la pantalla, lo dibujamos arriba de la tarjeta
  if (topPos + actionMenu.offsetHeight > window.innerHeight) {
    topPos = rect.top - actionMenu.offsetHeight - 5;
  }
  
  actionMenu.style.top = topPos + 'px';
  actionMenu.style.left = leftPos + 'px';

  // Ocultamos el botón "Aprobada" si es el Seminario, ya que se aprueba solo
  const btnAprobada = document.getElementById('btn-action-aprobada');
  if (subject.isSeminario) {
    btnAprobada.style.display = 'none'; 
  } else {
    btnAprobada.style.display = 'flex';
  }
}

function setAction(action) {
  if (currentSelectedId) {
    const id = currentSelectedId;
    const subject = getSubjectById(id);
    
    // Forzamos el estado que el usuario eligió en el menú
    if (subject.isSeminario) {
      if (action === 'cursada') state[id] = 'cursada';
      else if (action === 'available') state[id] = 'available';
    } else {
      state[id] = action;
    }

    // Actualizamos toda la app
    updateAllAvailability();
    updateElectivePlaceholders(); 
    checkMilestones();
    refreshAll();
    updateStats();
    saveProgress(); 

    // Animación visual
    const card = document.getElementById('card-' + id);
    if (card) {
      card.classList.remove('popping');
      void card.offsetWidth;
      card.classList.add('popping');
      setTimeout(() => card.classList.remove('popping'), 300);
    }
  }
  closeActionMenu();
}

function closeActionMenu() {
  if (actionMenu) actionMenu.style.display = 'none';
  currentSelectedId = null;
}

// Cerrar el menú si el usuario toca en cualquier otra parte de la pantalla o scrollea
document.addEventListener('click', (e) => {
  if (actionMenu && !actionMenu.contains(e.target) && !e.target.closest('.subject-card')) {
    closeActionMenu();
  }
});

document.addEventListener('scroll', () => {
  closeActionMenu();
  hideTooltip();
}, { passive: true });

function checkMilestones() {
  // 1. Analista en Sistemas (Obligatorias 1 al 3 + Electivas de 3ro)
  const lvl123 = ALL.filter(s => typeof s.id === 'number' && s.level <= 3);
  const analistaReady = lvl123.every(s => state[s.id] === 'aprobada') && state['REQ3'] === 'aprobada';
  
  if (analistaReady && state['SEM'] === 'cursada') {
    state['SEM'] = 'aprobada'; 
    if (!localStorage.getItem('hasSeenAnalistaModal')) {
      document.getElementById('analista-modal').style.display = 'flex';
      localStorage.setItem('hasSeenAnalistaModal', 'true');
    }
  } else if (!analistaReady && state['SEM'] === 'aprobada') {
    state['SEM'] = 'cursada';
  }

  // 2. Ingeniero (36 Obligatorias + SEM + PPS + Completar horas de REQ3, REQ4 y REQ5)
  const requiredForIngeniero = ALL.filter(s => 
    typeof s.id === 'number' || 
    s.id === 'SEM' || 
    s.id === 'PPS' || 
    s.isElectivePlaceholder
  );

  const ingenieroReady = requiredForIngeniero.every(s => state[s.id] === 'aprobada');
  
  if (ingenieroReady && !localStorage.getItem('hasSeenIngenieroModal')) {
    document.getElementById('ingeniero-modal').style.display = 'flex';
    localStorage.setItem('hasSeenIngenieroModal', 'true');
  }
}

function resetProgress() {
  if (confirm("¿Estás seguro de que querés borrar todo tu progreso? Esta acción no se puede deshacer.")) {
    localStorage.removeItem(SAVED_STATE_KEY);
    localStorage.removeItem('hasSeenAnalistaModal');
    localStorage.removeItem('hasSeenIngenieroModal');
    location.reload();
  }
}

function refreshAll() {
  ALL.forEach(s => {
    const card = document.getElementById('card-' + s.id);
    if (!card) return;
    card.className = 'subject-card ' + state[s.id];
    
    const icon = state[s.id] === 'cursada' ? '📖'
               : state[s.id] === 'aprobada' ? '✅'
               : state[s.id] === 'available' ? '' : '🔒';
    card.querySelector('.subject-status-icon').textContent = icon;

    // Actualizamos el texto visual de progreso en las tarjetas Placeholder
    if (s.isElectivePlaceholder) {
      let cursadaHours = 0;
      let aprobadaHours = 0;
      ELECTIVAS[s.level].forEach(el => {
         if (state[el.id] === 'aprobada') aprobadaHours += el.annualHours;
         else if (state[el.id] === 'cursada') cursadaHours += el.annualHours;
      });
      const totalActive = cursadaHours + aprobadaHours;
      const cardHoursEl = card.querySelector('.subject-hours');
      
      if (aprobadaHours >= s.targetHours) {
         cardHoursEl.textContent = `Aprobado: ${aprobadaHours}/${s.targetHours} hs`;
      } else if (totalActive >= s.targetHours) {
         cardHoursEl.textContent = `Cursado: ${totalActive}/${s.targetHours} hs`;
      } else {
         cardHoursEl.textContent = `Progreso: ${totalActive}/${s.targetHours} hs`;
      }
    }
  });
}

// ─── TOOLTIP ──────────────────────────────────────────────────────────────────
const tooltip = document.getElementById('tooltip');

function showTooltip(e, subject) {
  const lines = [];
  
  if (subject.isElectivePlaceholder) {
    lines.push(`🎯 Requiere: ${subject.targetHours} hs anuales`);
    lines.push(`Aprobando electivas de ${subject.level}° nivel.`);
  } else {
    if (subject.correlCursada.length) {
      lines.push('📖 Necesita cursadas:');
      subject.correlCursada.forEach(cid => {
        const s = getSubjectById(cid);
        const ok = state[cid] === 'cursada' || state[cid] === 'aprobada';
        lines.push(`  ${ok?'✓':'✗'} ${s ? s.name : cid}`);
      });
    }
    if (subject.correlAprobada.length) {
      lines.push('✅ Necesita aprobadas:');
      subject.correlAprobada.forEach(cid => {
        const s = getSubjectById(cid);
        const ok = state[cid] === 'aprobada';
        lines.push(`  ${ok?'✓':'✗'} ${s ? s.name : cid}`);
      });
    }
    if (!lines.length && !subject.isElectivePlaceholder) lines.push('Sin correlatividades');
  }

  tooltip.innerHTML = lines.join('<br>');
  tooltip.classList.add('show');
  moveTooltip(e);
}

function moveTooltip(e) {
  tooltip.style.left = (e.clientX + 12) + 'px';
  tooltip.style.top = (e.clientY + 12) + 'px';
}

function hideTooltip() {
  tooltip.classList.remove('show');
}

document.addEventListener('mousemove', (e) => {
  if (tooltip.classList.contains('show')) moveTooltip(e);
});

// ─── STATS ────────────────────────────────────────────────────────────────────
function updateStats() {
  // Obligatorias (1-36), Seminario y PPS
  const coreSubjects = ALL.filter(s => typeof s.id === 'number' || s.id === 'SEM' || s.id === 'PPS');
  // Electivas reales (las que tienen horas anuales asignadas)
  const realElectives = ALL.filter(s => s.annualHours !== undefined);

  // Aprobadas y cursadas: suman core + electivas clickeadas
  const ap = coreSubjects.filter(s => state[s.id] === 'aprobada').length +
             realElectives.filter(s => state[s.id] === 'aprobada').length;

  const cu = coreSubjects.filter(s => state[s.id] === 'cursada').length +
             realElectives.filter(s => state[s.id] === 'cursada').length;

  // Total dinámico: 38 materias base + la cantidad de electivas que hayas tocado
  const electivasTomadas = realElectives.filter(s => state[s.id] === 'cursada' || state[s.id] === 'aprobada').length;
  const total = coreSubjects.length + electivasTomadas;

  const pct = Math.round((ap / total) * 100);

  document.getElementById('stat-aprobadas').textContent = ap;
  document.getElementById('stat-cursadas').textContent = cu;
  document.getElementById('stat-total').textContent = total;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('stat-pct').textContent = pct + '% aprobado';
}

// ─── BUILD DOM ────────────────────────────────────────────────────────────────
function buildLayout() {
  const main = document.getElementById('main-content');
  main.innerHTML = '';

  [1,2,3,4,5].forEach(lvl => {
    const section = document.createElement('div');
    section.className = 'level-section';

    const color = `var(${LEVEL_COLORS[lvl]})`;
    section.innerHTML = `
      <div class="level-header">
        <div class="level-badge" style="color:${color};border-color:${color};">${LEVEL_NAMES[lvl]}</div>
        <div class="level-line" style="background:${color}"></div>
      </div>
    `;

    const grid = document.createElement('div');
    grid.className = 'subject-grid';

    SUBJECTS.filter(s => s.level === lvl && !s.isElective).forEach(s => {
      grid.appendChild(renderCard(s));
    });
    section.appendChild(grid);

    if (ELECTIVAS[lvl] && ELECTIVAS[lvl].length > 0) {
      const electivasLabel = document.createElement('div');
      electivasLabel.className = 'electivas-level-label';
      electivasLabel.textContent = 'Electivas';
      electivasLabel.style.marginTop = '24px';
      section.appendChild(electivasLabel);

      const electivasGrid = document.createElement('div');
      electivasGrid.className = 'subject-grid';

      ELECTIVAS[lvl].forEach(s => {
        electivasGrid.appendChild(renderCard(s));
      });
      
      // Añadimos PPS si es 5to año (la única que mantuve como isElective: true regular)
      SUBJECTS.filter(s => s.level === lvl && s.isElective).forEach(s => {
          electivasGrid.appendChild(renderCard(s));
      });

      section.appendChild(electivasGrid);
    }
    main.appendChild(section);
  });
}

// ─── MODAL LOGIC ──────────────────────────────────────────────────────────────
let currentSlide = 1;
const totalSlides = 4; // ¡Actualizado a 4 slides!

function updateModalUI() {
  for(let i=1; i<=totalSlides; i++) {
    document.getElementById(`slide-${i}`).style.display = 'none';
    document.getElementById(`dot-${i}`).classList.remove('active');
  }
  
  document.getElementById(`slide-${currentSlide}`).style.display = 'block';
  document.getElementById(`dot-${currentSlide}`).classList.add('active');

  document.getElementById('btn-prev').style.visibility = currentSlide === 1 ? 'hidden' : 'visible';
  
  if (currentSlide === totalSlides) {
    document.getElementById('btn-next').style.display = 'none';
    document.getElementById('btn-close').style.display = 'block';
  } else {
    document.getElementById('btn-next').style.display = 'block';
    document.getElementById('btn-close').style.display = 'none';
  }
}

function changeSlide(direction) {
  currentSlide += direction;
  updateModalUI();
}

function closeModal() {
  document.getElementById('welcome-modal').style.display = 'none';
  localStorage.setItem(HAS_VISITED_KEY, 'true'); 
}

function checkFirstVisit() {
  if (!localStorage.getItem(HAS_VISITED_KEY)) {
    document.getElementById('welcome-modal').style.display = 'flex';
    updateModalUI();
  }
}

// NUEVA FUNCIÓN: Abrir el modal manualmente desde el botón "?"
function openWelcomeModal() {
  currentSlide = 1; // Resetea el modal al primer slide
  document.getElementById('welcome-modal').style.display = 'flex';
  updateModalUI();
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
buildLayout();
updateAllAvailability(); 
updateElectivePlaceholders(); // Calculamos progreso inicial
refreshAll();
updateStats();
checkFirstVisit();

// ─── OCULTAR HEADER Y MOSTRAR BOTÓN ARRIBA AL SCROLLEAR ───
const header = document.querySelector('header');
const scrollTopBtn = document.getElementById('btn-scroll-top');

window.addEventListener('scroll', () => {
  if (window.scrollY > 20) {
    header.classList.add('scrolled');
    if (scrollTopBtn) scrollTopBtn.classList.add('visible');
  } else {
    header.classList.remove('scrolled');
    if (scrollTopBtn) scrollTopBtn.classList.remove('visible');
  }
}, { passive: true });

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth' /* Hace que la subida sea patinada y no de golpe */
  });
}