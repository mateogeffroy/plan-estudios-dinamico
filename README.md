# 🎓 Plan de Estudios Dinámico - UTN FRLP

Una herramienta web interactiva diseñada para los estudiantes de **Ingeniería en Sistemas de Información** de la **Universidad Tecnológica Nacional (Facultad Regional La Plata)**. Permite llevar un control visual y preciso del progreso académico, validando correlatividades y calculando las horas de materias electivas automáticamente.

🌍 **[Visitar la aplicación en vivo]https://plan-estudios-dinamico.vercel.app**

---

## ✨ Características Principales
- **Gestión Visual del Plan:** Interfaz interactiva para marcar materias como "Cursadas" o "Aprobadas".
- **Motor de Correlatividades:** Bloqueo y desbloqueo automático de materias basado en el **Plan de Estudios 2023** (actualizado a los horarios vigentes de 2026).
- **Cálculo de Electivas:** Seguimiento en tiempo real de la carga horaria requerida para las materias electivas de 3°, 4° y 5° nivel.
- **Autenticación Segura:** Inicio de sesión rápido y seguro utilizando cuentas de Google.
- **Guardado en la Nube:** Sincronización automática del progreso para acceder desde cualquier dispositivo (PC o móvil).
- **Hitos Académicos:** Alertas automáticas al alcanzar los requisitos para el título de Analista en Sistemas y el título de grado.

---

## 🛠️ Arquitectura y Tecnologías

El proyecto está construido con un enfoque ligero, sin frameworks pesados en el frontend, y respaldado por una infraestructura en la nube moderna y segura:
- **Frontend:** HTML5, CSS3 (Variables CSS, Flexbox/Grid) y Vanilla JavaScript.
- **Backend & Base de Datos:** [Supabase](https://supabase.com/) (PostgreSQL).
- **Autenticación:** Supabase Auth (Google OAuth).
- **CI/CD & Mantenimiento:** Automatización mediante **GitHub Actions** para el mantenimiento activo de la base de datos (Keep-alive cron job).

### 🔒 Seguridad de Datos (RLS)
La base de datos implementa **Row Level Security (RLS)** estricto. Las políticas de Supabase garantizan que las operaciones `SELECT`, `INSERT` y `UPDATE` estén filtradas por `auth.uid()`. Esto significa que el backend bloquea criptográficamente cualquier intento de acceso a datos ajenos, garantizando la privacidad absoluta del progreso de cada estudiante.

---

## 🚀 Instalación y Uso Local

Si querés clonar el repositorio para aportar mejoras o probar el código localmente, seguí estos pasos:

1. **Clonar el repositorio:**
   Ejecutá en tu terminal
   ```bash
   git clone https://github.com/TU_USUARIO/plan-estudios-utn.git
   cd plan-estudios-utn
   ```

2. **Configurar Supabase:**
   - Creá un proyecto en Supabase.
   - Configurá la autenticación con Google.
   - Ejecutá en tu base de datos para crear la tabla necesaria.
   ```sql
   create table progreso_usuarios (
  id_usuario uuid references auth.users not null primary key,
  estado_materias jsonb not null default '{}'::jsonb
  );
  -- No olvides habilitar RLS y crear las políticas correspondientes.
  ```


3. **Variables de Entorno:**
   Reemplazá `supabaseUrl` y `supabaseKey` en el archivo `script.js` con las credenciales públicas (anon key) de tu proyecto de Supabase.

4. **Ejecutar:**
   Podés usar cualquier servidor local estático, como la extensión Live Server de VSCode.

---

## 🤝 Cómo Contribuir
¡Las contribuciones son bienvenidas! Si la facultad actualiza el plan de estudios o querés proponer una mejora en la interfaz:

1. Hacé un Fork del proyecto.
2. Creá una rama para tu nueva característica (`git checkout -b feature/NuevaCaracteristica`).
3. Para actualizaciones académicas, la única fuente de verdad es el archivo `data.js`. Modificá los arrays `SUBJECTS` o `ELECTIVAS` sin alterar la lógica central.
4. Hacé commit de tus cambios (`git commit -m 'Agrega nueva electiva de 5to año'`).
5. Hacé push a la rama (`git push origin feature/NuevaCaracteristica`).
6. Abrí un Pull Request.

---

## ☕ Apoyar el Proyecto
Este proyecto es de código abierto y gratuito, mantenido para ayudar a la comunidad estudiantil de la UTN. Si la herramienta te resulta útil para organizar tu carrera, podés ayudar a cubrir los costos de mantenimiento de los servidores invitándome un café:

Desarrollado con 💻 y 🧉 por Mateo Arturo Geffroy.