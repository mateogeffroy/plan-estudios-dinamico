// Each subject: { id, num, name, hours, level, correlCursada: [ids], correlAprobada: [ids] }

const SUBJECTS = [
  // ── PRIMER NIVEL ──
  { id:1,  num:'01', name:'Análisis Matemático I',          hours:'5 hs/sem', level:1, correlCursada:[], correlAprobada:[] },
  { id:2,  num:'02', name:'Álgebra y Geometría Analítica',  hours:'5 hs/sem', level:1, correlCursada:[], correlAprobada:[] },
  { id:3,  num:'03', name:'Física I',                        hours:'5 hs/sem', level:1, correlCursada:[], correlAprobada:[] },
  { id:4,  num:'04', name:'Inglés I',                        hours:'2 hs/sem', level:1, correlCursada:[], correlAprobada:[] },
  { id:5,  num:'05', name:'Lógica y Estructuras Discretas',  hours:'3 hs/sem', level:1, correlCursada:[], correlAprobada:[] },
  { id:6,  num:'06', name:'Algoritmos y Estructuras de Datos', hours:'5 hs/sem', level:1, correlCursada:[], correlAprobada:[] },
  { id:7,  num:'07', name:'Arquitecturas de Computadoras',   hours:'4 hs/sem', level:1, correlCursada:[], correlAprobada:[] },
  { id:8,  num:'08', name:'Sistemas y Procesos de Negocio',  hours:'3 hs/sem', level:1, correlCursada:[], correlAprobada:[] },

  // ── SEGUNDO NIVEL ──
  { id:9,  num:'09', name:'Análisis Matemático II',          hours:'5 hs/sem', level:2, correlCursada:[1,2], correlAprobada:[] },
  { id:10, num:'10', name:'Física II',                       hours:'5 hs/sem', level:2, correlCursada:[1,3], correlAprobada:[] },
  { id:11, num:'11', name:'Ingeniería y Sociedad',           hours:'2 hs/sem', level:2, correlCursada:[], correlAprobada:[] },
  { id:12, num:'12', name:'Inglés II',                       hours:'2 hs/sem', level:2, correlCursada:[4], correlAprobada:[] },
  { id:13, num:'13', name:'Sintaxis y Semántica del Lenguaje (1°Cuat.)', hours:'4 hs/sem · 8 hs cuat.', level:2, correlCursada:[5,6], correlAprobada:[] },
  { id:14, num:'14', name:'Paradigmas de Programación (2°Cuat.)', hours:'4 hs/sem · 8 hs cuat.', level:2, correlCursada:[5,6], correlAprobada:[] },
  { id:15, num:'15', name:'Sistemas Operativos',             hours:'4 hs/sem', level:2, correlCursada:[7], correlAprobada:[] },
  { id:16, num:'16', name:'Análisis de Sistemas de Información (Integradora)', hours:'6 hs/sem', level:2, correlCursada:[6,8], correlAprobada:[] },

  // ── TERCER NIVEL ──
  { id:17, num:'17', name:'Probabilidades y Estadística',    hours:'3 hs/sem', level:3, correlCursada:[1,2], correlAprobada:[] },
  { id:18, num:'18', name:'Economía (2°Cuat.)',              hours:'3 hs/sem · 6 hs cuat.', level:3, correlCursada:[], correlAprobada:[1,2] },
  { id:19, num:'19', name:'Bases de Datos (1°Cuat.)',        hours:'4 hs/sem · 8 hs cuat.', level:3, correlCursada:[13,16], correlAprobada:[5,6] },
  { id:20, num:'20', name:'Desarrollo de Software (2°Cuat.)', hours:'4 hs/sem · 8 hs cuat.', level:3, correlCursada:[14,16], correlAprobada:[5,6] },
  { id:21, num:'21', name:'Comunicación de Datos (1°Cuat.)', hours:'4 hs/sem · 8 hs cuat.', level:3, correlCursada:[], correlAprobada:[3,7] },
  { id:22, num:'22', name:'Análisis Numérico',               hours:'3 hs/sem', level:3, correlCursada:[9], correlAprobada:[1,2] },
  { id:23, num:'23', name:'Diseño de Sistemas de Información (Integradora)', hours:'6 hs/sem', level:3, correlCursada:[14,16], correlAprobada:[4,6,8] },
  { id:'SEM', num:'SEM', name:'Seminario (Título Intermedio)', hours:'Extra', level:3, correlCursada:[], correlAprobada:[], isSeminario: true },
  { id:'REQ3', num:'E3', name:'Electivas 3° Nivel',          hours:'Req: 4 hs anuales', level:3, correlCursada:[], correlAprobada:[], isElectivePlaceholder:true, targetHours: 4 },

  // ── CUARTO NIVEL ──
  { id:24, num:'24', name:'Legislación (2°Cuat.)',           hours:'2 hs/sem · 4 hs cuat.', level:4, correlCursada:[11], correlAprobada:[] },
  { id:25, num:'25', name:'Ingeniería y Calidad de Software (1°Cuat.)', hours:'3 hs/sem · 6 hs cuat.', level:4, correlCursada:[19,20,23], correlAprobada:[13,14] },
  { id:26, num:'26', name:'Redes de Datos (2°Cuat.)',        hours:'4 hs/sem · 8 hs cuat.', level:4, correlCursada:[15,21], correlAprobada:[] },
  { id:27, num:'27', name:'Investigación Operativa (1°Cuat.)', hours:'4 hs/sem · 8 hs cuat.', level:4, correlCursada:[17,22], correlAprobada:[] },
  { id:28, num:'28', name:'Simulación (1°Cuat.)',            hours:'3 hs/sem · 6 hs cuat.', level:4, correlCursada:[17], correlAprobada:[9] },
  { id:29, num:'29', name:'Tecnologías para la Automatización (2°Cuat.)', hours:'3 hs/sem · 6 hs cuat.', level:4, correlCursada:[10,22], correlAprobada:[9] },
  { id:30, num:'30', name:'Administración de Sistemas de Información (Integradora)', hours:'6 hs/sem', level:4, correlCursada:[18,23], correlAprobada:[16] },
  { id:'REQ4', num:'E4', name:'Electivas 4° Nivel',          hours:'Req: 6 hs anuales', level:4, correlCursada:[], correlAprobada:[], isElectivePlaceholder:true, targetHours: 6 },

  // ── QUINTO NIVEL ──
  { id:31, num:'31', name:'Inteligencia Artificial (1°Cuat.)', hours:'3 hs/sem · 6 hs cuat.', level:5, correlCursada:[28], correlAprobada:[17,22] },
  { id:32, num:'32', name:'Ciencia de Datos (2°Cuat.)',      hours:'3 hs/sem · 6 hs cuat.', level:5, correlCursada:[28], correlAprobada:[17,19] },
  { id:33, num:'33', name:'Sistemas de Gestión',             hours:'4 hs/sem', level:5, correlCursada:[18,27], correlAprobada:[23] },
  { id:34, num:'34', name:'Gestión Gerencial',               hours:'3 hs/sem', level:5, correlCursada:[24,30], correlAprobada:[18] },
  { id:35, num:'35', name:'Seguridad en los Sistemas de Información (1°Cuat.)', hours:'3 hs/sem · 6 hs cuat.', level:5, correlCursada:[26,30], correlAprobada:[20,21] },
  { id:36, num:'36', name:'Proyecto Final (Integradora)',    hours:'6 hs/sem', level:5, correlCursada:[25,26,30], correlAprobada:[12,20,23] },
  { id:'REQ5', num:'E5', name:'Electivas 5° Nivel',          hours:'Req: 10 hs anuales', level:5, correlCursada:[], correlAprobada:[], isElectivePlaceholder:true, targetHours: 10 },
  { id:'PPS', num:'PPS', name:'Práctica Profesional Supervisada', hours:'200 Hrs', level:5, correlCursada:[], correlAprobada:[] },
];

const ELECTIVAS = {
  3: [
    { id:'E1', num:'E1', name:'Programación Concurrente (1°Cuat.)', hours:'4 hs/sem (2 hs anuales)', annualHours: 2, correlCursada:[14,15], correlAprobada:[] },
    { id:'E2', num:'E2', name:'Sistemas de Tiempo Real (1°Cuat.)',  hours:'6 hs/sem (3 hs anuales)', annualHours: 3, correlCursada:[15], correlAprobada:[7] },
    { id:'E3', num:'E3', name:'Tecnología y Gestión Web (1°Cuat.)', hours:'4 hs/sem (2 hs anuales)', annualHours: 2, correlCursada:[13,15], correlAprobada:[6] },
    { id:'E4e', num:'E4', name:'Sistemas de Transmisión y Redes Inalámbricas (2°Cuat.)', hours:'4 hs/sem (2 hs anuales)', annualHours: 2, correlCursada:[9], correlAprobada:[7] },
    { id:'E5e', num:'E5', name:'Responsabilidad Social e Institucional (1° y 2°Cuat.)', hours:'4 hs/sem (2 hs anuales)', annualHours: 2, correlCursada:[8,16], correlAprobada:[] },
    { id:'E6', num:'E6', name:'Comunicación Profesional',           hours:'6 hs/sem (3 hs anuales)', annualHours: 3, correlCursada:[11], correlAprobada:[8] },
  ],
  4: [
    { id:'E7', num:'E7', name:'Administración de Base de Datos (2°Cuat.)', hours:'4 hs/sem (2 hs anuales)', annualHours: 2, correlCursada:[19], correlAprobada:[15] },
    { id:'E8', num:'E8', name:'Desarrollo de Software Cloud (1°Cuat.)', hours:'4 hs/sem (2 hs anuales)', annualHours: 2, correlCursada:[15,20,23], correlAprobada:[13,14] },
    { id:'E9', num:'E9', name:'Diseño Inclusivo para Usuarios con Discapacidad (1°Cuat.)', hours:'4 hs/sem (2 hs anuales)', annualHours: 2, correlCursada:[23], correlAprobada:[16] },
    { id:'E10', num:'E10', name:'Metodología de la Investigación (2°Cuat.)', hours:'4 hs/sem (2 hs anuales)', annualHours: 2, correlCursada:[], correlAprobada:[23] },
    { id:'E11', num:'E11', name:'Metodologías Ágiles (2°Cuat.)',    hours:'6 hs/sem (2 hs anuales)', annualHours: 2, correlCursada:[19,20,23], correlAprobada:[16] },
    { id:'E12', num:'E12', name:'Tecnología de Interfaces Interactivas (2°Cuat.)', hours:'4 hs/sem (2 hs anuales)', annualHours: 2, correlCursada:[23], correlAprobada:[16] },
    { id:'E13', num:'E13', name:'Tecnologías para la Explotación de la Información (1°Cuat.)', hours:'4 hs/sem (2 hs anuales)', annualHours: 2, correlCursada:[17,23], correlAprobada:[14] },
    { id:'E14', num:'E14', name:'Aplicaciones Móviles (2°Cuat.)',   hours:'6 hs/sem (3 hs anuales)', annualHours: 3, correlCursada:[14,23], correlAprobada:[6] },
  ],
  5: [
    { id:'E15', num:'E15', name:'Ingeniería en Calidad',             hours:'6 hs/sem (3 hs anuales)', annualHours: 3, correlCursada:[30], correlAprobada:[23] },
    { id:'E16', num:'E16', name:'Internetworking',                   hours:'8 hs/sem (4 hs anuales)', annualHours: 4, correlCursada:[30], correlAprobada:[26] },
    { id:'E17', num:'E17', name:'Protocolos y Seguridad en Redes Inalámbricas (2°Cuat.)', hours:'4 hs/sem (2 hs anuales)', annualHours: 2, correlCursada:[21,26], correlAprobada:[9,10] },
    { id:'E18', num:'E18', name:'Sistemas en la Industria 4.0 (2°Cuat.)', hours:'6 hs/sem (3 hs anuales)', annualHours: 3, correlCursada:[19,21,25,26], correlAprobada:[7] },
    { id:'E19', num:'E19', name:'Tecnologías de Información para la Gestión Empresarial (1°Cuat.)', hours:'4 hs/sem (2 hs anuales)', annualHours: 2, correlCursada:[25], correlAprobada:[23] },
    { id:'E20', num:'E20', name:'Emprendedorismo',                   hours:'4 hs/sem (2 hs anuales)', annualHours: 2, correlCursada:[18,24], correlAprobada:[] },
  ]
};

// Flat list of all subjects
const ALL = [
  ...SUBJECTS,
  ...ELECTIVAS[3], ...ELECTIVAS[4], ...ELECTIVAS[5]
];