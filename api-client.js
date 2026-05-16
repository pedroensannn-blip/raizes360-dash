/**
 * RAÍZES 360 — Cliente de API para o Front-end
 * Adicione este arquivo como <script src="api.js"></script>
 * em ambos: raizes360-app-completo.html e raizes360-dashboard-v2.html
 *
 * Configure a constante BASE_URL com a URL do seu back-end no Render.
 */

const BASE_URL = 'https://raizes360-api.onrender.com'; // ← altere após o deploy

// ─── ARMAZENAMENTO LOCAL DO TOKEN ──────────────────────────────────
const TokenStore = {
  get: () => localStorage.getItem('r360_token'),
  set: (t) => localStorage.setItem('r360_token', t),
  clear: () => localStorage.removeItem('r360_token'),
};

// ─── REQUISIÇÃO BASE ───────────────────────────────────────────────
async function apiRequest(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = TokenStore.get();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    TokenStore.clear();
    window.location.href = '/login.html';
    return;
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido');
  return data;
}

// ─── API — AUTENTICAÇÃO ────────────────────────────────────────────
const Auth = {
  async login(email, password) {
    const data = await apiRequest('POST', '/auth/login', { email, password });
    TokenStore.set(data.token);
    return data.user;
  },
  async me() {
    return apiRequest('GET', '/auth/me');
  },
  logout() {
    TokenStore.clear();
    window.location.href = '/login.html';
  },
};

// ─── API — CHECKLIST ───────────────────────────────────────────────
const Checklist = {
  async load(date = today()) {
    return apiRequest('GET', `/checklist/${date}`);
  },
  async save({ date, pilar, habit_id, habit_name, completed, points }) {
    return apiRequest('POST', '/checklist', {
      date, pilar, habit_id, habit_name, completed, points,
    });
  },
  async summary(patientId) {
    return apiRequest('GET', `/checklist/summary/${patientId}`);
  },
};

// ─── API — PONTOS E RANKING ────────────────────────────────────────
const Points = {
  async me() {
    return apiRequest('GET', '/points/me');
  },
  async ranking() {
    return apiRequest('GET', '/ranking');
  },
};

// ─── API — CARDÁPIO ────────────────────────────────────────────────
const Menu = {
  async get(patientId, date = today()) {
    return apiRequest('GET', `/menu/${patientId}/${date}`);
  },
  async save(patientId, date, meals) {
    return apiRequest('PUT', `/menu/${patientId}/${date}`, { meals });
  },
};

// ─── API — EXAMES ──────────────────────────────────────────────────
const Exams = {
  async list(patientId) {
    return apiRequest('GET', `/exams/${patientId}`);
  },
  async save(patientId, examDate, results) {
    return apiRequest('POST', '/exams', {
      patient_id: patientId, exam_date: examDate, results,
    });
  },
};

// ─── API — FOTOS ───────────────────────────────────────────────────
const Photos = {
  async list(patientId) {
    return apiRequest('GET', `/photos/${patientId}`);
  },
  async sendFeedback(photoId, feedbackText, tags) {
    return apiRequest('POST', `/photos/${photoId}/feedback`, {
      feedback_text: feedbackText, tags,
    });
  },
};

// ─── API — PACIENTES (dashboard) ───────────────────────────────────
const Patients = {
  async list() {
    return apiRequest('GET', '/patients');
  },
  async get(id) {
    return apiRequest('GET', `/patients/${id}`);
  },
};

// ─── UTILITÁRIOS ───────────────────────────────────────────────────
function today() {
  return new Date().toISOString().split('T')[0];
}

// ════════════════════════════════════════════════════════════════════
//  INTEGRAÇÃO COM O APP (raizes360-app-completo.html)
//
//  Localize a função checkTask() no app e adicione a chamada de API:
//
//  ANTES:
//    function checkTask(taskEl, turno) {
//      ...lógica visual...
//      updatePlannerRing();
//    }
//
//  DEPOIS:
//    async function checkTask(taskEl, turno) {
//      ...lógica visual...
//      updatePlannerRing();
//
//      // Salva no back-end
//      const habit_id  = taskEl.dataset.habitId;   // adicione data-habit-id em cada .task
//      const habit_name = taskEl.querySelector('.task-name').textContent;
//      const pilar      = taskEl.dataset.pilar;     // adicione data-pilar em cada .task
//      const completed  = taskEl.querySelector('.task-ck').classList.contains('done');
//      const points     = parseInt(taskEl.querySelector('.task-pts')?.textContent ?? 0);
//
//      await Checklist.save({
//        date: today(), pilar, habit_id, habit_name, completed, points
//      }).catch(console.error);
//    }
//
//  Adicione também na função toggle() dos pilares MEV:
//
//    async function toggle(item, pilar) {
//      ...lógica visual...
//      updatePilar(pilar);
//      // Salva no back-end
//      await Checklist.save({
//        date: today(),
//        pilar,
//        habit_id: item.dataset.habitId,
//        habit_name: item.querySelector('.pi-task-name').textContent,
//        completed: item.classList.contains('checked'),
//        points: 10, // valor padrão dos pilares
//      }).catch(console.error);
//    }
//
//  Na inicialização do app, carregue os dados reais:
//
//    document.addEventListener('DOMContentLoaded', async () => {
//      const entries = await Checklist.load();
//      const pts     = await Points.me();
//      // restaure o estado visual com base em entries e pts
//    });
//
// ════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════
//  INTEGRAÇÃO COM O DASHBOARD (raizes360-dashboard-v2.html)
//
//  Ao trocar de paciente na lista, carregue os dados reais:
//
//    async function loadPatient(patientId) {
//      const [patient, summary, exams, menu] = await Promise.all([
//        Patients.get(patientId),
//        Checklist.summary(patientId),
//        Exams.list(patientId),
//        Menu.get(patientId, today()),
//      ]);
//      renderPatientData(patient, summary, exams, menu);
//    }
//
//  Para salvar cardápio editado:
//
//    document.querySelector('.save-btn').addEventListener('click', async () => {
//      const meals = collectMealsFromDOM(); // lê os inputs editáveis
//      await Menu.save(currentPatientId, today(), meals);
//      showToast('Cardápio salvo!');
//    });
//
//  Para enviar feedback de foto:
//
//    document.querySelector('.send-btn').addEventListener('click', async () => {
//      const text = document.querySelector('textarea').value;
//      const tags = [...document.querySelectorAll('.qt.sg')].map(t => t.textContent);
//      await Photos.sendFeedback(currentPhotoId, text, tags);
//      showToast('Feedback enviado via WhatsApp!');
//    });
//
// ════════════════════════════════════════════════════════════════════

// Exporta para uso nos HTMLs
window.Auth = Auth;
window.Checklist = Checklist;
window.Points = Points;
window.Menu = Menu;
window.Exams = Exams;
window.Photos = Photos;
window.Patients = Patients;
