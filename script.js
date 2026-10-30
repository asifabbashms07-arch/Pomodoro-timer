/**
 * Pomodoro Timer & Task Manager
 * Vanilla ES6+ Implementation adhering strictly to plan.md and content.md
 */

(() => {
  // ── Constants ─────────────────────────────────────────────────────────────
  const DURATIONS = {
    focus: 25 * 60,      // 1500 seconds
    shortBreak: 5 * 60,  // 300 seconds
    longBreak: 15 * 60   // 900 seconds
  };

  const MODE_LABELS = {
    focus: "Focus",
    shortBreak: "Short Break",
    longBreak: "Long Break"
  };

  const MESSAGES = {
    idle: "Ready to focus?",
    focusRunning: "🎯 Focus Time — stay on track!",
    shortBreakRunning: "☕ Time for a short break!",
    longBreakRunning: "🌴 Enjoy your long break!",
    focusPaused: "⏸️ Paused — take your time.",
    breakPaused: "⏸️ Break paused.",
    focusEndedShort: "✅ Session complete! Time for a break.",
    focusEndedLong: "🎉 Great work! You've earned a long break.",
    shortBreakEnded: "🔔 Break's over — let's get back to it!",
    longBreakEnded: "🔔 Recharged! Ready for another round?",
    taskAdded: "➕ Task added!",
    taskCompleted: "✔️ Nice — one down!",
    allTasksCompleted: "🏆 All tasks done — amazing work!",
    taskDeleted: "🗑️ Task removed.",
    emptyInputWarning: "⚠️ Please enter a task."
  };

  // ── State ─────────────────────────────────────────────────────────────────
  const state = {
    mode: "focus",                 // "focus" | "shortBreak" | "longBreak"
    timerDuration: DURATIONS.focus,
    timeRemaining: DURATIONS.focus,
    isRunning: false,
    intervalId: null,
    sessionsCompleted: 0,
    tasks: [],
    statusMessage: MESSAGES.idle
  };

  // ── DOM References ────────────────────────────────────────────────────────
  const dom = {
    modeLabel: document.getElementById("mode-label"),
    timerDisplay: document.getElementById("timer-display"),
    statusMessage: document.getElementById("status-message"),
    btnStart: document.getElementById("btn-start"),
    btnBreak: document.getElementById("btn-break"),
    btnSkip: document.getElementById("btn-skip"),
    sessionProgress: document.getElementById("session-progress"),
    taskInput: document.getElementById("task-input"),
    btnAddTask: document.getElementById("btn-add-task"),
    taskList: document.getElementById("task-list")
  };

  // ── Audio Feedback (Web Audio API Chime) ──────────────────────────────────
  function playBeep() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // Audio autoplay policy or unavailable
    }
  }

  // ── Display & Formatting Functions ────────────────────────────────────────
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function updateTimerDisplay() {
    dom.timerDisplay.textContent = formatTime(state.timeRemaining);
  }

  function updateStatusMessage(customMessage = null) {
    if (customMessage) {
      state.statusMessage = customMessage;
    }
    dom.statusMessage.textContent = state.statusMessage;
  }

  function updateModeLabel() {
    dom.modeLabel.textContent = MODE_LABELS[state.mode] || state.mode;
  }

  function updateSessionDots() {
    // 4 sessions cycle: show completed count % 4
    const cycleCount = state.sessionsCompleted % 4;
    const sessionNum = cycleCount === 0 && state.sessionsCompleted > 0 ? 4 : cycleCount;

    let dotsHtml = '<div class="session-dots-wrapper">';
    for (let i = 1; i <= 4; i++) {
      const isFilled = i <= cycleCount;
      dotsHtml += `<span class="session-dot ${isFilled ? "filled" : ""}"></span>`;
    }
    dotsHtml += `</div><span class="session-cycle-text">Session ${sessionNum} of 4</span>`;

    dom.sessionProgress.innerHTML = dotsHtml;
  }

  function updateControlsUI() {
    if (state.isRunning) {
      dom.btnStart.textContent = "Pause";
      dom.btnStart.setAttribute("aria-label", "Pause timer");
    } else {
      dom.btnStart.textContent = "Start";
      dom.btnStart.setAttribute("aria-label", "Start timer");
    }

    // Break button disabled during break modes
    if (state.mode === "shortBreak" || state.mode === "longBreak") {
      dom.btnBreak.disabled = true;
    } else {
      dom.btnBreak.disabled = false;
    }
  }

  // ── Timer State Functions ─────────────────────────────────────────────────
  function startTimer() {
    if (state.isRunning) return; // Guard against multiple intervals

    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }

    state.isRunning = true;
    state.intervalId = setInterval(tick, 1000);

    if (state.mode === "focus") {
      updateStatusMessage(MESSAGES.focusRunning);
    } else if (state.mode === "shortBreak") {
      updateStatusMessage(MESSAGES.shortBreakRunning);
    } else if (state.mode === "longBreak") {
      updateStatusMessage(MESSAGES.longBreakRunning);
    }

    updateControlsUI();
  }

  function pauseTimer() {
    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
    state.isRunning = false;

    if (state.mode === "focus") {
      updateStatusMessage(MESSAGES.focusPaused);
    } else {
      updateStatusMessage(MESSAGES.breakPaused);
    }

    updateControlsUI();
  }

  function toggleStartPause() {
    if (state.isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }

  function tick() {
    state.timeRemaining -= 1;
    updateTimerDisplay();

    if (state.timeRemaining <= 0) {
      onTimerEnd();
    }
  }

  function switchMode(newMode) {
    if (state.isRunning) {
      pauseTimer();
    }

    state.mode = newMode;
    state.timerDuration = DURATIONS[newMode];
    state.timeRemaining = DURATIONS[newMode];

    document.body.className = `mode-${newMode}`;
    updateTimerDisplay();
    updateModeLabel();
    updateControlsUI();
  }

  function onTimerEnd() {
    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
    state.isRunning = false;
    updateControlsUI();
    playBeep();

    if (state.mode === "focus") {
      state.sessionsCompleted += 1;
      updateSessionDots();

      if (state.sessionsCompleted % 4 === 0) {
        switchMode("longBreak");
        updateStatusMessage(MESSAGES.focusEndedLong);
      } else {
        switchMode("shortBreak");
        updateStatusMessage(MESSAGES.focusEndedShort);
      }
    } else {
      // Break ended
      const wasLongBreak = state.mode === "longBreak";
      switchMode("focus");
      if (wasLongBreak) {
        updateStatusMessage(MESSAGES.longBreakEnded);
      } else {
        updateStatusMessage(MESSAGES.shortBreakEnded);
      }
    }
  }

  function skipSession() {
    onTimerEnd();
  }

  function startBreak() {
    if (state.mode !== "focus") return;
    // Default to shortBreak if manually triggered during focus
    switchMode("shortBreak");
    updateStatusMessage(MESSAGES.shortBreakRunning);
  }

  function resetTimer(mode = state.mode) {
    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
    state.isRunning = false;
    state.mode = mode;
    state.timerDuration = DURATIONS[mode];
    state.timeRemaining = DURATIONS[mode];

    document.body.className = `mode-${mode}`;
    updateTimerDisplay();
    updateModeLabel();
    updateControlsUI();
    updateStatusMessage(MESSAGES.idle);
  }

  // ── Task Management Functions ─────────────────────────────────────────────
  function renderTasks() {
    dom.taskList.innerHTML = "";

    if (state.tasks.length === 0) {
      const emptyLi = document.createElement("li");
      emptyLi.className = "task-empty";
      emptyLi.textContent = "No tasks yet — add one above!";
      dom.taskList.appendChild(emptyLi);
      return;
    }

    // Determine first incomplete task for active highlight
    const firstIncompleteId = (state.tasks.find(t => !t.completed) || {}).id;

    state.tasks.forEach(task => {
      const li = document.createElement("li");
      if (task.completed) {
        li.classList.add("completed");
      }
      if (task.id === firstIncompleteId) {
        li.classList.add("active");
      }

      // Checkbox
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = task.completed;
      checkbox.setAttribute("aria-label", `Mark ${task.text} as complete`);
      checkbox.addEventListener("change", () => toggleComplete(task.id));

      // Label text
      const span = document.createElement("span");
      span.className = "task-text";
      span.textContent = task.text;

      // Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-delete-task";
      deleteBtn.textContent = "✕";
      deleteBtn.setAttribute("aria-label", `Delete ${task.text}`);
      deleteBtn.addEventListener("click", () => removeTask(task.id));

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(deleteBtn);
      dom.taskList.appendChild(li);
    });
  }

  function addTask(text) {
    const trimmed = text.trim();
    if (!trimmed) {
      updateStatusMessage(MESSAGES.emptyInputWarning);
      dom.statusMessage.classList.remove("shake");
      void dom.statusMessage.offsetWidth; // Trigger reflow for re-animation
      dom.statusMessage.classList.add("shake");
      return;
    }

    const newTask = {
      id: Date.now() + Math.random(),
      text: trimmed,
      completed: false
    };

    state.tasks.push(newTask);
    renderTasks();
    dom.taskInput.value = "";
    updateStatusMessage(MESSAGES.taskAdded);
  }

  function removeTask(id) {
    state.tasks = state.tasks.filter(task => task.id !== id);
    renderTasks();
    updateStatusMessage(MESSAGES.taskDeleted);
  }

  function toggleComplete(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    renderTasks();

    const allCompleted = state.tasks.length > 0 && state.tasks.every(t => t.completed);
    if (allCompleted) {
      updateStatusMessage(MESSAGES.allTasksCompleted);
    } else {
      updateStatusMessage(MESSAGES.taskCompleted);
    }
  }

  function handleAddTask() {
    addTask(dom.taskInput.value);
  }

  // ── Keyboard Shortcuts (Optional Enhancement §7.2) ────────────────────────
  function setupKeyboardShortcuts() {
    window.addEventListener("keydown", (e) => {
      // Don't trigger shortcuts when typing inside task input
      if (document.activeElement === dom.taskInput) {
        if (e.key === "Enter") {
          handleAddTask();
        }
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        toggleStartPause();
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        skipSession();
      } else if (e.key.toLowerCase() === "b") {
        if (state.mode === "focus") {
          e.preventDefault();
          startBreak();
        }
      }
    });
  }

  // ── Initialization ────────────────────────────────────────────────────────
  function init() {
    // Event listeners
    dom.btnStart.addEventListener("click", toggleStartPause);
    dom.btnBreak.addEventListener("click", startBreak);
    dom.btnSkip.addEventListener("click", skipSession);
    dom.btnAddTask.addEventListener("click", handleAddTask);

    setupKeyboardShortcuts();

    // Initial renders
    updateTimerDisplay();
    updateModeLabel();
    updateStatusMessage(MESSAGES.idle);
    updateSessionDots();
    updateControlsUI();
    renderTasks();
  }

  // Run on DOM load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();