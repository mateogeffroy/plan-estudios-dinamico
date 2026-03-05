// ─── INIT SUPABASE Y ESTADO ───
const supabaseUrl = 'https://dicrulugptkxedhhfysq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpY3J1bHVncHRreGVkaGhmeXNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NjkzMDAsImV4cCI6MjA4ODI0NTMwMH0.ZHp7Ab_9vOBAUuMyPpPTf7CxDtpudbUGFwYD_iaG0qQ';
// ¡CORRECCIÓN! Usamos "supabaseClient" para no chocar con el global de Supabase
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

const state = {}; 
// ─── DICCIONARIO DE ICONOS (SVGs) ───
const ICONS = {
  aprobada: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
  cursada: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`,
  bloqueada: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
  available: ``
};
const SAVED_STATE_KEY = 'planSistemasState_v1';
const HAS_VISITED_KEY = 'planSistemasVisited';
let currentUser = null;

// Inicializamos todo bloqueado por defecto
ALL.forEach(s => state[s.id] = 'disabled');
SUBJECTS.filter(s => s.level === 1).forEach(s => state[s.id] = 'available');

async function initSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  const isLoginPage = window.location.pathname.includes('login');

  if (!session) {
    if (!isLoginPage) {
      window.location.replace('/login.html');
      return; 
    }
  } else {
    if (isLoginPage) {
      window.location.replace('/');
      return;
    }

    // --- SI LLEGA ACÁ, ES PORQUE ESTÁ LOGUEADO Y EN EL INDEX ---
    currentUser = session.user;
    
    // Traemos el progreso de la nube
    const { data, error } = await supabaseClient
      .from('progreso_usuarios')
      .select('estado_materias')
      .eq('id_usuario', currentUser.id)
      .single();

    if (data && data.estado_materias) {
      Object.assign(state, data.estado_materias);
    } else if (error && error.code === 'PGRST116') {
      // 1. Le creamos su primera fila en la base de datos
      await supabaseClient.from('progreso_usuarios').insert({
        id_usuario: currentUser.id,
        estado_materias: state
      });
      
      // 2. ¡Lanzamos el modal de bienvenida porque es 100% nuevo!
      openWelcomeModal();
    }

    // Solo actualizamos la UI si estamos en el index
    updateAllAvailability();
    updateElectivePlaceholders();
    refreshAll();
    updateStats();
  }
}

async function loginGoogle() {
  await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin 
    }
  });
}

async function logoutSupabase() {
  await supabaseClient.auth.signOut();
  location.reload();
}

async function saveProgress() {
  localStorage.setItem(SAVED_STATE_KEY, JSON.stringify(state));

  if (currentUser) {
    await supabaseClient.from('progreso_usuarios').update({
      estado_materias: state
    }).eq('id_usuario', currentUser.id);
  }
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
    if (s.isElectivePlaceholder) return; 

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

const icon = state[subject.id] === 'cursada' ? ICONS.cursada
           : state[subject.id] === 'aprobada' ? ICONS.aprobada
           : state[subject.id] === 'available' ? ICONS.available : ICONS.bloqueada;

  div.innerHTML = `
    <div class="subject-num">${subject.num}</div>
    <div class="subject-name">${subject.name}</div>
    <div class="subject-hours">${subject.hours}</div>
    <div class="subject-status-icon">${icon}</div>
  `;

  if (!subject.isElectivePlaceholder) {
    div.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (window.matchMedia("(pointer: coarse)").matches) {
        openActionMenu(subject.id, div);
      } else {
        handleClick(subject.id, 'aprobada');
      }
    });
    
    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (window.matchMedia("(pointer: coarse)").matches) {
        openActionMenu(subject.id, div);
      } else {
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

  if (subject && subject.isSeminario) {
    if (cur === 'aprobada') return; 
    
    if (cur === 'cursada') state[id] = 'available';
    else state[id] = 'cursada';
  } else {
    if (cur === action) state[id] = 'available';
    else state[id] = action;
  }

  updateAllAvailability();
  updateElectivePlaceholders(); 
  checkMilestones(); 
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
  
  hideTooltip(); 

  // Forzamos la posición 'fixed' para anclarlo a las coordenadas de la pantalla
  actionMenu.style.position = 'fixed';
  actionMenu.style.display = 'flex';
  
  const rect = cardElement.getBoundingClientRect();
  
  // Anclamos exactamente al límite inferior izquierdo de la tarjeta + 4px de aire
  let topPos = rect.bottom + 4;
  let leftPos = rect.left;
  
  // Si se cae por el borde inferior de la pantalla, lo damos vuelta (arriba de la tarjeta)
  if (topPos + actionMenu.offsetHeight > window.innerHeight) {
    topPos = rect.top - actionMenu.offsetHeight - 4;
  }
  
  // Si se sale por el lado derecho (raro en este layout, pero por las dudas)
  if (leftPos + actionMenu.offsetWidth > window.innerWidth) {
    leftPos = window.innerWidth - actionMenu.offsetWidth - 10;
  }
  
  actionMenu.style.top = topPos + 'px';
  actionMenu.style.left = leftPos + 'px';

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
    
    if (subject.isSeminario) {
      if (action === 'cursada') state[id] = 'cursada';
      else if (action === 'available') state[id] = 'available';
    } else {
      state[id] = action;
    }

    updateAllAvailability();
    updateElectivePlaceholders(); 
    checkMilestones();
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
  closeActionMenu();
}

function closeActionMenu() {
  if (actionMenu) actionMenu.style.display = 'none';
  currentSelectedId = null;
}

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

async function resetProgress() {
  if (confirm("¿Estás seguro de que querés borrar todo tu progreso? Esta acción no se puede deshacer.")) {
    localStorage.removeItem(SAVED_STATE_KEY);
    localStorage.removeItem('hasSeenAnalistaModal');
    localStorage.removeItem('hasSeenIngenieroModal');
    
    // Usamos supabaseClient
    if (currentUser) {
       const blankState = {};
       ALL.forEach(s => blankState[s.id] = 'disabled');
       SUBJECTS.filter(s => s.level === 1).forEach(s => blankState[s.id] = 'available');
       await supabaseClient.from('progreso_usuarios').update({ estado_materias: blankState }).eq('id_usuario', currentUser.id);
    }
    
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
  const coreSubjects = ALL.filter(s => typeof s.id === 'number' || s.id === 'SEM' || s.id === 'PPS');
  const realElectives = ALL.filter(s => s.annualHours !== undefined);

  const ap = coreSubjects.filter(s => state[s.id] === 'aprobada').length +
             realElectives.filter(s => state[s.id] === 'aprobada').length;

  const cu = coreSubjects.filter(s => state[s.id] === 'cursada').length +
             realElectives.filter(s => state[s.id] === 'cursada').length;

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
const totalSlides = 3; 

function updateModalUI() {
  for(let i=1; i<=totalSlides; i++) {
    const slide = document.getElementById(`slide-${i}`);
    if(slide) slide.style.display = 'none';
    const dot = document.getElementById(`dot-${i}`);
    if(dot) dot.classList.remove('active');
  }
  
  const currentSlideEl = document.getElementById(`slide-${currentSlide}`);
  if(currentSlideEl) currentSlideEl.style.display = 'block';
  
  const currentDotEl = document.getElementById(`dot-${currentSlide}`);
  if(currentDotEl) currentDotEl.classList.add('active');

  const btnPrev = document.getElementById('btn-prev');
  if(btnPrev) btnPrev.style.visibility = currentSlide === 1 ? 'hidden' : 'visible';
  
  const btnNext = document.getElementById('btn-next');
  const btnClose = document.getElementById('btn-close');
  
  if (currentSlide === totalSlides) {
    if(btnNext) btnNext.style.display = 'none';
    if(btnClose) btnClose.style.display = 'block';
  } else {
    if(btnNext) btnNext.style.display = 'block';
    if(btnClose) btnClose.style.display = 'none';
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
    const modal = document.getElementById('welcome-modal');
    if(modal) {
      modal.style.display = 'flex';
      updateModalUI();
    }
  }
}

function openWelcomeModal() {
  currentSlide = 1; 
  const modal = document.getElementById('welcome-modal');
  if(modal) {
    modal.style.display = 'flex';
    updateModalUI();
  }
}

// ─── OCULTAR HEADER Y MOSTRAR BOTÓN ARRIBA AL SCROLLEAR ───
const header = document.querySelector('header');
const scrollTopBtn = document.getElementById('btn-scroll-top');

window.addEventListener('scroll', () => {
  if (window.scrollY > 20) {
    if(header) header.classList.add('scrolled');
    if (scrollTopBtn) scrollTopBtn.classList.add('visible');
  } else {
    if(header) header.classList.remove('scrolled');
    if (scrollTopBtn) scrollTopBtn.classList.remove('visible');
  }
}, { passive: true });

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth' 
  });
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
buildLayout();
checkFirstVisit();
// InitSession se encarga ahora de actualizar la disponibilidad y pintar todo luego de consultar la BD.
initSession();