const taskInput = document.getElementById('new-task');
  const timeInput = document.getElementById('new-task-time');
  const addTaskBtn = document.getElementById('add-task-btn');
  const taskList = document.getElementById('task-list');
  const recordBtn = document.getElementById('record-btn');
  const recordStatusText = document.getElementById('record-status-text');

  let tasks = [];
  let notifiedTaskIds = new Set();

  // Voice recording variables
  let mediaRecorder = null;
  let audioChunks = [];

  // Toggle recording on button click
  recordBtn.addEventListener('click', async () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      stopRecording();
    } else {
      if (!taskInput.value.trim()) {
        alert('Please enter a task first before recording a voice note.');
        return;
      }
      await startRecording();
    }
  });

  // Start recording audio
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.start();

      recordBtn.classList.add('recording');
      recordStatusText.textContent = 'Recording... Click to Stop';

      mediaRecorder.ondataavailable = e => {
        audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        // Save audio with task, update existing or create new
        const text = taskInput.value.trim();
        const time = timeInput.value;

        let taskIndex = tasks.findIndex(t => t.text === text && t.time === time);
        if (taskIndex === -1) {
          taskIndex = tasks.length;
          tasks.push({
            id: Date.now(),
            text,
            time,
            audioUrl,
            completed: false,
            isEditing: false
          });
        } else {
          tasks[taskIndex].audioUrl = audioUrl;
        }
        saveTasks();
        renderTasks();
        recordBtn.classList.remove('recording');
        recordStatusText.textContent = 'Start Recording Voice Note';
      };
    } catch (error) {
      alert('Microphone access denied or not available.');
      recordBtn.classList.remove('recording');
      recordStatusText.textContent = 'Start Recording Voice Note';
    }
  }

  // Stop recording audio
  function stopRecording() {
    if (mediaRecorder) {
      mediaRecorder.stop();
    }
  }

  // Load tasks on page load
  window.onload = () => {
    const storedTasks = localStorage.getItem('tasks');
    if (storedTasks) {
      tasks = JSON.parse(storedTasks);
      renderTasks();
    }
    startVoiceNoteChecker();
  };

  // Save tasks to localStorage
  function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }

  // Render task list
  function renderTasks() {
    taskList.innerHTML = '';
    tasks.forEach(task => {
      const li = document.createElement('li');

      const leftDiv = document.createElement('div');
      leftDiv.className = 'task-left';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.title = 'Mark as Completed';
      checkbox.addEventListener('change', () => {
        task.completed = checkbox.checked;
        saveTasks();
        renderTasks();
      });

      let taskTextElem;
      if (task.isEditing) {
        taskTextElem = document.createElement('input');
        taskTextElem.type = 'text';
        taskTextElem.className = 'edit-input';
        taskTextElem.value = task.text;
        taskTextElem.addEventListener('keydown', e => {
          if (e.key === 'Enter') finishEditing(task, taskTextElem.value, timeEditElem.value);
          if (e.key === 'Escape') cancelEditing(task);
        });
        taskTextElem.addEventListener('blur', () => finishEditing(task, taskTextElem.value, timeEditElem.value));
        leftDiv.appendChild(checkbox);
        leftDiv.appendChild(taskTextElem);
      } else {
        taskTextElem = document.createElement('span');
        taskTextElem.className = 'task-text' + (task.completed ? ' completed' : '');
        taskTextElem.textContent = task.text;
        taskTextElem.title = 'Double click to edit';
        taskTextElem.addEventListener('dblclick', () => {
          startEditing(task);
        });
        leftDiv.appendChild(checkbox);
        leftDiv.appendChild(taskTextElem);
      }

      if (task.isEditing) {
        timeEditElem = document.createElement('input');
        timeEditElem.type = 'time';
        timeEditElem.className = 'edit-time';
        timeEditElem.value = task.time || '';
        timeEditElem.addEventListener('keydown', e => {
          if (e.key === 'Enter') finishEditing(task, taskTextElem.value, timeEditElem.value);
          if (e.key === 'Escape') cancelEditing(task);
        });
        timeEditElem.addEventListener('blur', () => finishEditing(task, taskTextElem.value, timeEditElem.value));
        leftDiv.appendChild(timeEditElem);
      } else {
        const timeElem = document.createElement('span');
        timeElem.className = 'task-time';
        timeElem.textContent = task.time || '';
        timeElem.title = 'Task due time';
        leftDiv.appendChild(timeElem);
      }

      if (task.audioUrl && !task.isEditing) {
        const playBtn = document.createElement('button');
        playBtn.className = 'play-btn';
        playBtn.title = 'Play Voice Note';
        playBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" class="feather feather-play" width="18" height="18"
            viewBox="0 0 24 24">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>`;
        playBtn.addEventListener('click', () => {
          playAudio(task.audioUrl);
        });
        leftDiv.appendChild(playBtn);
      }

      const actions = document.createElement('div');
      actions.className = 'task-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'edit-btn';
      editBtn.title = 'Edit task';
      editBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit" width="18" height="18"
          viewBox="0 0 24 24">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
        </svg>`;
      editBtn.addEventListener('click', () => {
        if (!task.isEditing) {
          startEditing(task);
          renderTasks();
        }
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.title = 'Delete task';
      deleteBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2" width="18" height="18"
          viewBox="0 0 24 24">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"></path>
          <path d="M10 11v6"></path>
          <path d="M14 11v6"></path>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
        </svg>`;
      deleteBtn.addEventListener('click', () => {
        tasks = tasks.filter(t => t.id !== task.id);
        notifiedTaskIds.delete(task.id);
        saveTasks();
        renderTasks();
      });

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      li.appendChild(leftDiv);
      li.appendChild(actions);

      taskList.appendChild(li);
    });
  }

  function playAudio(url) {
    const audio = new Audio(url);
    audio.play();
  }

  function startEditing(task) {
    task.isEditing = true;
    renderTasks();
  }

  function finishEditing(task, newText, newTime) {
    if (!newText.trim()) {
      tasks = tasks.filter(t => t.id !== task.id);
      notifiedTaskIds.delete(task.id);
    } else {
      task.text = newText.trim();
      task.time = newTime || '';
      task.isEditing = false;
    }
    saveTasks();
    renderTasks();
  }

  function cancelEditing(task) {
    task.isEditing = false;
    renderTasks();
  }

  addTaskBtn.addEventListener('click', () => {
    const text = taskInput.value.trim();
    const time = timeInput.value;
    if (!text) {
      alert('Please enter a task');
      return;
    }
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      alert('Please stop recording before adding a new task.');
      return;
    }
    const newTask = {
      id: Date.now(),
      text,
      time,
      audioUrl: null,
      completed: false,
      isEditing: false
    };
    tasks.push(newTask);
    saveTasks();
    renderTasks();
    taskInput.value = '';
    timeInput.value = '';
  });

  taskInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      addTaskBtn.click();
    }
  });

  // Voice note timing checker
  function startVoiceNoteChecker() {
    checkVoiceNotes();
    setInterval(checkVoiceNotes, 30000);
  }

  function checkVoiceNotes() {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);

    tasks.forEach(task => {
      if (
        !task.completed &&
        task.time === currentTime &&
        !notifiedTaskIds.has(task.id) &&
        task.audioUrl
      ) {
        playAudio(task.audioUrl);
        notifiedTaskIds.add(task.id);
      }
    });
  }

  window.onload = () => {
    const stored = localStorage.getItem('tasks');
    if (stored) {
      tasks = JSON.parse(stored);
      renderTasks();
    }
    startVoiceNoteChecker();
  };

  function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }
