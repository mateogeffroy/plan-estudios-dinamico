const supabaseUrl = 'https://dicrulugptkxedhhfysq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpY3J1bHVncHRreGVkaGhmeXNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NjkzMDAsImV4cCI6MjA4ODI0NTMwMH0.ZHp7Ab_9vOBAUuMyPpPTf7CxDtpudbUGFwYD_iaG0qQ';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
const CLAVE_MODAL_ACTUALIZACION = 'planSistemasUpdate_080326';

const state = {}; 
const ICONS = {
  aprobada: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
  cursada: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`,
  bloqueada: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
  available: ``
};
const SAVED_STATE_KEY = 'planSistemasState_v1';
const HAS_VISITED_KEY = 'planSistemasVisited';
let currentUser = null;

ALL.forEach(s => state[s.id] = 'disabled');
SUBJECTS.filter(s => s.level === 1).forEach(s => state[s.id] = 'available');

function verificarActualizacionPlan() {
  if (!localStorage.getItem(CLAVE_MODAL_ACTUALIZACION)) {
    document.getElementById('modal-actualizacion').style.display = 'flex';
  }
}

function cambiarPasoActualizacion(pasoDestino) {
  // Ocultamos todos los pasos primero
  document.getElementById('paso-1').style.display = 'none';
  document.getElementById('paso-2').style.display = 'none';
  document.getElementById('paso-3').style.display = 'none';
  
  // Mostramos solo el que nos interesa
  document.getElementById('paso-' + pasoDestino).style.display = 'block';
}

function cerrarModalActualizacion() {
  document.getElementById('modal-actualizacion').style.display = 'none';
  localStorage.setItem(CLAVE_MODAL_ACTUALIZACION, 'true');
}

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

    currentUser = session.user;
    
    const { data, error } = await supabaseClient
      .from('progreso_usuarios')
      .select('estado_materias')
      .eq('id_usuario', currentUser.id)
      .single();

    if (data && data.estado_materias) {
      Object.assign(state, data.estado_materias);
    } else if (error && error.code === 'PGRST116') {
      await supabaseClient.from('progreso_usuarios').insert({
        id_usuario: currentUser.id,
        estado_materias: state
      });
      
      openWelcomeModal();
    }

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
  let globalCursadaHoursAnalista = 0;
  let globalAprobadaHoursAnalista = 0;
  let globalCursadaHoursIngenieria = 0;
  let globalAprobadaHoursIngenieria = 0;

  [3, 4, 5].forEach(lvl => {
    const electivesOfLevel = ELECTIVAS[lvl];
    if (!electivesOfLevel) return;

    electivesOfLevel.forEach(el => {
       if (state[el.id] === 'aprobada') {
           globalAprobadaHoursIngenieria += el.annualHours;
           if (!el.onlyIngenieria) globalAprobadaHoursAnalista += el.annualHours;
       }
       else if (state[el.id] === 'cursada') {
           globalCursadaHoursIngenieria += el.annualHours;
           if (!el.onlyIngenieria) globalCursadaHoursAnalista += el.annualHours;
       }
    });
  });

  const thresholds = { 3: 4, 4: 10, 5: 20 };

  [3, 4, 5].forEach(lvl => {
    const placeholder = ALL.find(s => s.isElectivePlaceholder && s.level === lvl);
    if (!placeholder) return;

    const target = thresholds[lvl];

    // Seleccionamos las horas correctas según el nivel del placeholder
    const aprobadaHours = lvl === 3 ? globalAprobadaHoursAnalista : globalAprobadaHoursIngenieria;
    const cursadaHours = lvl === 3 ? globalCursadaHoursAnalista : globalCursadaHoursIngenieria;
    const totalActive = aprobadaHours + cursadaHours;

    if (aprobadaHours >= target) {
      state[placeholder.id] = 'aprobada';
    } else if (totalActive >= target) {
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
    e.stopPropagation(); 

    const wasAlreadyHighlighted = div.classList.contains('highlight-blocked');

    document.querySelectorAll('.subject-card.highlight-blocked').forEach(c => {
      c.classList.remove('highlight-blocked');
    });

    if (window.matchMedia("(pointer: coarse)").matches) {
      const isBlocked = state[subject.id] !== 'available' && state[subject.id] !== 'cursada' && state[subject.id] !== 'aprobada';

      if (isBlocked) {
        if (wasAlreadyHighlighted) {
          hideTooltip();
        } else {
          div.classList.add('highlight-blocked');
          showTooltip(e, subject);
          document.getElementById('action-menu').style.display = 'none'; 
        }
      } else {
        hideTooltip();
        openActionMenu(subject.id, div);
      }
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

  div.addEventListener('mousemove', (e) => {
    if (!window.matchMedia("(pointer: coarse)").matches) {
      showTooltip(e, subject);
    }
  });

  div.addEventListener('mouseleave', () => {
    if (!window.matchMedia("(pointer: coarse)").matches) {
      hideTooltip();
    }
  });

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

let currentSelectedId = null;
const actionMenu = document.getElementById('action-menu');

function openActionMenu(id, cardElement) {
  if (state[id] === 'disabled') return;
  
  currentSelectedId = id;
  const subject = getSubjectById(id);
  
  hideTooltip(); 

  actionMenu.style.position = 'fixed';
  actionMenu.style.display = 'flex';
  
  const rect = cardElement.getBoundingClientRect();
  
  let topPos = rect.bottom + 4;
  let leftPos = rect.left;
  
  if (topPos + actionMenu.offsetHeight > window.innerHeight) {
    topPos = rect.top - actionMenu.offsetHeight - 4;
  }
  
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
    hideTooltip();
    
    document.querySelectorAll('.subject-card.highlight-blocked').forEach(c => {
      c.classList.remove('highlight-blocked');
    });
  }
});

document.addEventListener('scroll', () => {
  closeActionMenu();
  hideTooltip();
}, { passive: true });

function checkMilestones() {
  const lvl123 = ALL.filter(s => typeof s.id === 'number' && s.level <= 3);
  const coreSubjectsAnalistaReady = lvl123.every(s => state[s.id] === 'aprobada');
  
  // --- NUEVO: CÁLCULO INDEPENDIENTE DE HORAS ELECTIVAS PARA ANALISTA ---
  // Calculamos las horas aprobadas en electivas, pero IGNORANDO Química
  let horasElectivasAnalista = 0;
  ALL.forEach(s => {
      // Si la materia tiene horas anuales definidas, está aprobada y NO es exclusiva de ingeniería (Química)
      if (s.annualHours && state[s.id] === 'aprobada' && !s.onlyIngenieria) {
          horasElectivasAnalista += s.annualHours;
      }
  });
  
  // Analista requiere TODAS las obligatorias de 1-3 y al menos 4 horas de electivas válidas
  const analistaReady = coreSubjectsAnalistaReady && horasElectivasAnalista >= 4;
  
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
      let globalCursadaHours = 0;
      let globalAprobadaHours = 0;
      
      [3, 4, 5].forEach(l => {
        if(!ELECTIVAS[l]) return;
        ELECTIVAS[l].forEach(el => {
           // MAGIA ACÁ: Si es el placeholder de 3er año y la materia es exclusiva de ingeniería, la ignoramos visualmente
           if (s.level === 3 && el.onlyIngenieria) return;

           if (state[el.id] === 'aprobada') globalAprobadaHours += el.annualHours;
           else if (state[el.id] === 'cursada') globalCursadaHours += el.annualHours;
        });
      });

      const globalTotalActive = globalCursadaHours + globalAprobadaHours;
      const thresholds = { 3: 4, 4: 10, 5: 20 };
      const target = thresholds[s.level];
      const cardHoursEl = card.querySelector('.subject-hours');
      
      if (globalAprobadaHours >= target) {
         cardHoursEl.textContent = `Aprobado: ${globalAprobadaHours}/${target} hs`;
      } else if (globalTotalActive >= target) {
         cardHoursEl.textContent = `Cursado: ${globalTotalActive}/${target} hs`;
      } else {
         cardHoursEl.textContent = `Progreso: ${globalTotalActive}/${target} hs`;
      }
    }
  });
}

const tooltip = document.getElementById('tooltip');

function showTooltip(e, subject) {
  const lines = [];
  
  if (subject.isElectivePlaceholder) {
    lines.push(`🎯 Requiere: ${subject.targetHours} hs anuales`);
    lines.push(`Aprobando electivas de ${subject.level}° nivel.`);
  } else if (subject.isOutdated) {
    // --- MATERIAS FANTASMA: Solo mostramos el aviso y cortamos acá ---
    lines.push('<span style="font-size: 0.75rem; font-weight: 700; color: #ef4444; background: rgba(239, 68, 68, 0.1); padding: 4px 6px; border-radius: 4px; display: inline-block;">⚠️ Materia fuera del plan. Solo marcar si fue cursada/aprobada históricamente.</span>');
  } else {
    // --- MATERIAS NORMALES: Lógica de correlativas ---
    let hasTitle = false;

    if (subject.correlCursada?.length) {
      if (!hasTitle) {
        lines.push('<span style="font-size: 0.8rem; font-weight: 800; color: var(--accent); text-transform: uppercase; letter-spacing: 0.05em;">Correlativas</span>');
        hasTitle = true;
      }
      lines.push('<b>Cursada(s):</b>');
      
      subject.correlCursada.forEach(cid => {
        const s = getSubjectById(cid);
        const cleanName = s ? s.name.replace(/\s*\(.*?\)/g, '') : cid;
        const ok = state[cid] === 'cursada' || state[cid] === 'aprobada';
        
        lines.push(`${ok ? '✅' : '❌'} ${cleanName}`);
      });
    }
    
    if (subject.correlAprobada?.length) {
      if (!hasTitle) {
        lines.push('<span style="font-size: 0.8rem; font-weight: 800; color: var(--accent); text-transform: uppercase; letter-spacing: 0.05em;">Correlativas</span>');
        hasTitle = true;
      }
      lines.push('<b>Aprobada(s):</b>');
      
      subject.correlAprobada.forEach(cid => {
        const s = getSubjectById(cid);
        const cleanName = s ? s.name.replace(/\s*\(.*?\)/g, '') : cid;
        const ok = state[cid] === 'aprobada';
        
        lines.push(`${ok ? '✅' : '❌'} ${cleanName}`);
      });
    }
    
    if (!lines.length && !subject.isElectivePlaceholder) {
      lines.push('Sin correlatividades');
    }
  }

  tooltip.innerHTML = lines.join('<br>');
  tooltip.classList.add('show');
  
  tooltip.style.textAlign = 'left';
  
  moveTooltip(e);
}

function moveTooltip(e) {
  let leftPos = e.clientX + 12;
  let topPos = e.clientY + 12;

  if (leftPos + tooltip.offsetWidth > window.innerWidth) {
    leftPos = e.clientX - tooltip.offsetWidth - 12;
  }

  if (leftPos < 12) {
    leftPos = 12;
  }

  if (topPos + tooltip.offsetHeight > window.innerHeight) {
    topPos = e.clientY - tooltip.offsetHeight - 12;
  }

  if (topPos < 12) {
    topPos = 12;
  }

  tooltip.style.left = leftPos + 'px';
  tooltip.style.top = topPos + 'px';
}

function hideTooltip() {
  tooltip.classList.remove('show');
}

document.addEventListener('mousemove', (e) => {
  if (typeof tooltip !== 'undefined' && tooltip && tooltip.classList.contains('show')) {
    moveTooltip(e);
  }
});

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

function buildLayout() {
  const main = document.getElementById('main-content');
  main.innerHTML = '';

  [1,2,3,4,5].forEach(lvl => {
    const section = document.createElement('div');
    section.className = 'level-section';

    const color = `var(${LEVEL_COLORS[lvl]})`;
    
    // Contenedor principal del header
    const headerDiv = document.createElement('div');
    headerDiv.className = 'level-header';
    headerDiv.style.color = color;

    // Badge
    const badgeDiv = document.createElement('div');
    badgeDiv.className = 'level-badge';
    badgeDiv.style.borderColor = color;
    badgeDiv.textContent = LEVEL_NAMES[lvl];

    // Botón Marcar todas
    const markAllBtn = document.createElement('button');
    markAllBtn.className = 'mark-all-btn';
    markAllBtn.textContent = 'Marcar todas';
    
    markAllBtn.onclick = () => {
      const materiasObligatorias = SUBJECTS.filter(s => 
        s.level === lvl && 
        !s.isElective && 
        !s.isElectivePlaceholder && 
        !s.isSeminario && 
        s.id !== 'PPS'
      );

      materiasObligatorias.forEach(materia => {
        state[materia.id] = 'aprobada';
      });

      updateAllAvailability();
      updateElectivePlaceholders(); 
      checkMilestones(); 
      refreshAll();
      updateStats(); 
      saveProgress(); 
    };

    // Línea separadora
    const lineDiv = document.createElement('div');
    lineDiv.className = 'level-line';
    lineDiv.style.backgroundColor = color;

    // Ensamblar
    headerDiv.appendChild(badgeDiv);
    headerDiv.appendChild(markAllBtn);
    headerDiv.appendChild(lineDiv);
    
    section.appendChild(headerDiv);

    // Renderizar materias
    const grid = document.createElement('div');
    grid.className = 'subject-grid';

    SUBJECTS.filter(s => s.level === lvl && !s.isElective).forEach(s => {
      grid.appendChild(renderCard(s));
    });
    section.appendChild(grid);

    // Renderizar electivas
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
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

function toggleSidebar() {
  sidebar.classList.toggle('active');
  sidebarOverlay.classList.toggle('active');
  if (sidebar.classList.contains('active')) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

const scrollTopBtn = document.getElementById('btn-scroll-top');
window.addEventListener('scroll', () => {
  if (window.scrollY > 200) { 
    scrollTopBtn.classList.add('visible');
  } else {
    scrollTopBtn.classList.remove('visible');
  }
}, { passive: true });

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function donarMercadoPago() {
  // 1. REEMPLAZÁ CON TU LINK REAL
  const linkPago = "https://link.mercadopago.com.ar/planestudios" ; 
  const linkSinHttps = "link.mercadopago.com.ar/planestudios"; 

  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const isAndroid = /android/i.test(userAgent);

  // 2. Creamos un enlace (<a>) "fantasma" en el código
  const a = document.createElement('a');
  a.style.display = 'none';

  if (isAndroid) {
    // Código agresivo para forzar la billetera de Mercado Pago en Android
    a.href = `intent://${linkSinHttps}#Intent;scheme=https;package=com.mercadopago.wallet;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(linkPago)};end;`;
  } else {
    // En iOS (iPhone) y PC usamos el link directo, iOS lo intercepta nativamente con el click
    a.href = linkPago;
  }

  // 3. Lo inyectamos en la página, lo "clickeamos" por código y lo destruimos
  document.body.appendChild(a);
  a.click();
  
  // Le damos 100 milisegundos de respiro antes de borrarlo para que el celular procese el salto
  setTimeout(() => {
    document.body.removeChild(a);
  }, 100);
}

buildLayout();
checkFirstVisit();
initSession();
verificarActualizacionPlan();