document.addEventListener('DOMContentLoaded', () => {
    // Elementos do DOM
    const todoInput = document.getElementById('todo-input');
    const addButton = document.getElementById('add-todo');
    const todoList = document.getElementById('todo-list');
    const modal = document.getElementById('notes-modal');
    const closeButton = document.querySelector('.close');
    const saveNotesButton = document.getElementById('save-notes');
    const notesTextarea = document.getElementById('notes-text');
    const particlesCanvas = document.getElementById('particles-canvas');
    const particlesCtx = particlesCanvas ? particlesCanvas.getContext('2d') : null;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Estado da aplicação
    let todos = JSON.parse(localStorage.getItem('todos')) || [];
    let currentTodoId = null;
    const LANG_KEY = 'lang';
    let currentLang = localStorage.getItem(LANG_KEY) || 'pt';
    const THEME_KEY = 'theme';
    let currentTheme = localStorage.getItem(THEME_KEY) || 'dark';

    // Traduções
    const i18n = {
        pt: {
            pageTitle: 'Annotate - Lista de Afazeres',
            subtitle: 'Sua lista de afazeres',
            inputPlaceholder: 'Adicione uma nova tarefa...',
            emptyMessage: 'Nenhuma tarefa adicionada ainda.',
            notesTitle: 'Notas',
            notesPlaceholder: 'Adicione suas notas aqui...',
            saveNotes: 'Salvar',
            markCompleted: 'Marcar como concluída',
            markNotCompleted: 'Marcar como não concluída',
            notesTooltip: 'Ver/Editar notas',
            deleteTooltip: 'Excluir tarefa',
            confirmDelete: 'Tem certeza que deseja excluir esta tarefa?'
        },
        en: {
            pageTitle: 'Annotate - To-Do List',
            subtitle: 'Your to-do list',
            inputPlaceholder: 'Add a new task...',
            emptyMessage: 'No tasks added yet.',
            notesTitle: 'Notes',
            notesPlaceholder: 'Add your notes here...',
            saveNotes: 'Save',
            markCompleted: 'Mark as completed',
            markNotCompleted: 'Mark as not completed',
            notesTooltip: 'View/Edit notes',
            deleteTooltip: 'Delete task',
            confirmDelete: 'Are you sure you want to delete this task?'
        }
    };

    function t(key) {
        return (i18n[currentLang] && i18n[currentLang][key]) || key;
    }
    
    // Configurações de partículas (preset refinado)
    const PARTICLE_COUNT = prefersReduced ? 40 : 110;
    const PARTICLE_SPEED = prefersReduced ? 0.08 : 0.18;
    const CONNECT_DISTANCE = 140;
    const PARALLAX_FACTOR = prefersReduced ? 0 : 0.008; // movimento sutil
    let particles = [];
    let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let particleRGB = '190,205,255';
    let lineRGB = '80,200,255';

    function refreshParticleColors() {
        const styles = getComputedStyle(document.body);
        const pr = styles.getPropertyValue('--particle-rgb').trim();
        const lr = styles.getPropertyValue('--line-rgb').trim();
        if (pr) particleRGB = pr;
        if (lr) lineRGB = lr;
    }

    // Inicializar a aplicação
    function init() {
        applyTranslations();
        applyTheme(currentTheme);
        renderTodos();
        setupEventListeners();
        updateActiveButtons();
    }

    // Configurar event listeners
    function setupEventListeners() {
        // Adicionar nova tarefa
        addButton.addEventListener('click', addTodo);
        todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTodo();
        });

        // Fechar modal
        closeButton.addEventListener('click', closeModal);
        window.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Salvar notas
        saveNotesButton.addEventListener('click', saveNotes);

        // Alternar idioma
        const btnPT = document.getElementById('lang-pt');
        const btnEN = document.getElementById('lang-en');
        if (btnPT) btnPT.addEventListener('click', () => switchLanguage('pt'));
        if (btnEN) btnEN.addEventListener('click', () => switchLanguage('en'));

        // Alternar tema
        const themeButtons = {
            dark: document.getElementById('theme-dark'),
            light: document.getElementById('theme-light'),
            vintage: document.getElementById('theme-vintage'),
            neon: document.getElementById('theme-neon')
        };
        Object.entries(themeButtons).forEach(([key, btn]) => {
            if (btn) btn.addEventListener('click', () => switchTheme(key));
        });
    }

    function switchLanguage(lang) {
        currentLang = lang;
        localStorage.setItem(LANG_KEY, currentLang);
        applyTranslations();
        renderTodos();
        updateActiveButtons();
    }

    function applyTranslations() {
        // Título da página
        document.title = t('pageTitle');
        // Subtítulo
        const subtitleEl = document.querySelector('.subtitle');
        if (subtitleEl) subtitleEl.textContent = t('subtitle');
        // Placeholder do input
        todoInput.setAttribute('placeholder', t('inputPlaceholder'));
        // Modal título e placeholder
        const modalTitle = document.querySelector('#notes-modal .modal-content h3');
        if (modalTitle) modalTitle.textContent = t('notesTitle');
        if (notesTextarea) notesTextarea.setAttribute('placeholder', t('notesPlaceholder'));
        if (saveNotesButton) saveNotesButton.textContent = t('saveNotes');
    }

    function switchTheme(theme) {
        currentTheme = theme;
        localStorage.setItem(THEME_KEY, currentTheme);
        applyTheme(currentTheme);
        updateActiveButtons();
    }

    function applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        refreshParticleColors();
    }

    function updateActiveButtons() {
        // Lang buttons
        const btnPT = document.getElementById('lang-pt');
        const btnEN = document.getElementById('lang-en');
        [btnPT, btnEN].forEach(b => b && b.classList.remove('active'));
        if (currentLang === 'pt' && btnPT) btnPT.classList.add('active');
        if (currentLang === 'en' && btnEN) btnEN.classList.add('active');

        // Theme buttons
        const themeMap = {
            dark: document.getElementById('theme-dark'),
            light: document.getElementById('theme-light'),
            vintage: document.getElementById('theme-vintage'),
            neon: document.getElementById('theme-neon')
        };
        Object.values(themeMap).forEach(btn => btn && btn.classList.remove('active'));
        const activeBtn = themeMap[currentTheme];
        if (activeBtn) activeBtn.classList.add('active');
    }

    // Adicionar nova tarefa
    function addTodo() {
        const text = todoInput.value.trim();
        if (text === '') return;

        const newTodo = {
            id: Date.now().toString(),
            text: text,
            completed: false,
            notes: ''
        };

        todos.push(newTodo);
        saveTodos();
        renderTodos();
        todoInput.value = '';
        todoInput.focus();
    }

    // Renderizar a lista de tarefas
    function renderTodos() {
        todoList.innerHTML = '';

        if (todos.length === 0) {
            todoList.innerHTML = `<p class="empty-message">${t('emptyMessage')}</p>`;
            return;
        }

        todos.forEach(todo => {
            const todoElement = createTodoElement(todo);
            todoList.appendChild(todoElement);
        });
    }

    // Criar elemento de tarefa
    function createTodoElement(todo) {
        const todoElement = document.createElement('div');
        todoElement.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        todoElement.dataset.id = todo.id;

        const markLabel = todo.completed ? t('markNotCompleted') : t('markCompleted');
        todoElement.innerHTML = `
            <button class="action-button check-button ${todo.completed ? 'completed' : ''}" aria-label="${markLabel}" title="${markLabel}">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6" opacity="0.6" />
                    <path d="M6.5 12.5l3.5 3.5L17.5 8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
            </button>
            <span class="todo-text">${todo.text}</span>
            <div class="todo-actions">
                <button class="action-button notes-button" title="${t('notesTooltip')}" aria-label="${t('notesTooltip')}">📝</button>
                <button class="action-button delete-button" title="${t('deleteTooltip')}" aria-label="${t('deleteTooltip')}">×</button>
            </div>
        `;

        // Adicionar event listeners aos botões
        const checkButton = todoElement.querySelector('.check-button');
        const notesButton = todoElement.querySelector('.notes-button');
        const deleteButton = todoElement.querySelector('.delete-button');

        checkButton.addEventListener('click', () => toggleComplete(todo.id));
        notesButton.addEventListener('click', () => openNotes(todo));
        deleteButton.addEventListener('click', () => deleteTodo(todo.id));

        // Exibir notas salvas abaixo do item (se houver)
        if (todo.notes && todo.notes.trim() !== '') {
            const notesEl = document.createElement('div');
            notesEl.className = 'todo-notes';
            notesEl.textContent = todo.notes;
            todoElement.appendChild(notesEl);
        }

        return todoElement;
    }

    // Alternar status de conclusão
    function toggleComplete(id) {
        todos = todos.map(todo => {
            if (todo.id === id) {
                return { ...todo, completed: !todo.completed };
            }
            return todo;
        });
        saveTodos();
        renderTodos();
    }

    // Abrir modal de notas
    function openNotes(todo) {
        currentTodoId = todo.id;
        notesTextarea.value = todo.notes || '';
        modal.style.display = 'flex';
        notesTextarea.focus();
    }

    // Fechar modal
    function closeModal() {
        modal.style.display = 'none';
        currentTodoId = null;
    }

    // Salvar notas
    function saveNotes() {
        if (!currentTodoId) return;

        todos = todos.map(todo => {
            if (todo.id === currentTodoId) {
                return { ...todo, notes: notesTextarea.value };
            }
            return todo;
        });

        saveTodos();
        renderTodos();
        closeModal();
    }

    // Excluir tarefa
    function deleteTodo(id) {
        if (confirm(t('confirmDelete'))) {
            todos = todos.filter(todo => todo.id !== id);
            saveTodos();
            renderTodos();
        }
    }

    // Salvar tarefas no localStorage
    function saveTodos() {
        localStorage.setItem('todos', JSON.stringify(todos));
    }

    // ===== Fundo de Partículas =====
    function resizeCanvas() {
        if (!particlesCanvas || !particlesCtx) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = window.innerWidth;
        const h = window.innerHeight;
        particlesCanvas.width = Math.floor(w * dpr);
        particlesCanvas.height = Math.floor(h * dpr);
        particlesCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function random(min, max) {
        return Math.random() * (max - min) + min;
    }

    function createParticles() {
        if (!particlesCtx || !particlesCanvas) return;
        particles = Array.from({ length: PARTICLE_COUNT }, () => ({
            x: random(0, particlesCanvas.width),
            y: random(0, particlesCanvas.height),
            vx: random(-PARTICLE_SPEED, PARTICLE_SPEED),
            vy: random(-PARTICLE_SPEED, PARTICLE_SPEED),
            r: random(1.0, 2.2),
            a: random(0.25, 0.5)
        }));
    }

    function stepParticles() {
        if (!particlesCtx || !particlesCanvas) return;
        const ctx = particlesCtx;
        const w = window.innerWidth;
        const h = window.innerHeight;
        ctx.clearRect(0, 0, w, h);

        // Mover e desenhar partículas
        for (const p of particles) {
            // Movimento base
            p.x += p.vx;
            p.y += p.vy;

            // Parallax sutil em direção ao mouse
            const ox = (mouse.x - w / 2) * PARALLAX_FACTOR;
            const oy = (mouse.y - h / 2) * PARALLAX_FACTOR;
            const drawX = p.x + ox;
            const drawY = p.y + oy;

            // Rebatimento nas bordas
            if (p.x <= 0 || p.x >= w) p.vx *= -1;
            if (p.y <= 0 || p.y >= h) p.vy *= -1;

            ctx.beginPath();
            ctx.arc(drawX, drawY, p.r, 0, Math.PI * 2);
            // Cor das partículas baseada no tema
            ctx.fillStyle = `rgba(${particleRGB}, ${p.a})`;
            ctx.fill();
        }

        // Conectar partículas próximas
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const a = particles[i];
                const b = particles[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const dist = Math.hypot(dx, dy);
                if (dist < CONNECT_DISTANCE) {
                    const alpha = (1 - dist / CONNECT_DISTANCE) * 0.4;
                    // Linhas baseadas no tema
                    ctx.strokeStyle = `rgba(${lineRGB}, ${alpha})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }
        }
    }

    function animateParticles() {
        if (!particlesCtx || !particlesCanvas) return;
        stepParticles();
        requestAnimationFrame(animateParticles);
    }

    function initParticles() {
        if (!particlesCanvas || !particlesCtx) return;
        refreshParticleColors();
        resizeCanvas();
        createParticles();
        animateParticles();
    }

    // Eventos de janela
    window.addEventListener('resize', () => {
        resizeCanvas();
        // Recria suavemente para preencher novas áreas
        createParticles();
    });

    // Parallax com mouse (desativado com reduced motion)
    if (!prefersReduced) {
        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });
    }

    // Inicializar a aplicação e partículas
    init();
    initParticles();
});
