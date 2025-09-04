document.addEventListener("DOMContentLoaded", function () {
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetTab = button.getAttribute("data-tab");

      // Remove active class from all buttons and contents
      tabButtons.forEach((btn) => {
        btn.classList.remove("active", "border-color-primary");
        btn.classList.add("text-gray-600");
      });
      tabContents.forEach((content) => {
        content.classList.remove("active");
      });

      // Add active class to clicked button and corresponding content
      button.classList.add("active", "border-color-primary");
      button.classList.remove("text-gray-600");
      button.classList.add("color-primary");
      document.getElementById(targetTab).classList.add("active");
      if (targetTab === "approve") {
        document.getElementById('semSelect').style.display = 'none';
      }else{
        document.getElementById('semSelect').style.display = 'block';
      }
    });
  });

  // Initialize with overview tab active
  document
    .querySelector('[data-tab="overview"]')
    .classList.add("border-color-primary");
});

// --- Loading state management ---
function setButtonLoading(buttonId, isLoading) {
  const button = document.getElementById(buttonId);
  const spinner = button.querySelector(".loading-spinner");
  const text = button.querySelector(".btn-text");

  if (isLoading) {
    button.classList.add("btn-loading");
    spinner.style.display = "inline-block";
    text.style.display = "none";
  } else {
    button.classList.remove("btn-loading");
    spinner.style.display = "none";
    text.style.display = "block";
  }
}

// --- JWT Token Management ---
let authToken = null;

// Fetch a new JWT token from the server
async function fetchAuthToken() {
  try {
    const response = await fetch('/get-token');
    if (!response.ok) {
      throw new Error(`Failed to get token: ${response.status}`);
    }
    const data = await response.json();
    authToken = data.token;
    console.log('New authentication token obtained');
    return authToken;
  } catch (error) {
    console.error('Error fetching auth token:', error);
    toast('Failed to get authentication token', 'error');
    throw error;
  }
}

// Make authenticated API request with automatic token handling
async function authenticatedFetch(url, options = {}) {
  // Ensure we have a token
  if (!authToken) {
    await fetchAuthToken();
  }

  // Add Authorization header
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${authToken}`
  };

  try {
    const response = await fetch(url, { ...options, headers });
    
    // If token expired, get a new one and retry
    if (response.status === 403 || response.status === 401) {
      console.log('Token expired or invalid, fetching new token...');
      await fetchAuthToken();
      
      // Retry with new token
      const retryHeaders = {
        ...options.headers,
        'Authorization': `Bearer ${authToken}`
      };
      return await fetch(url, { ...options, headers: retryHeaders });
    }
    
    return response;
  } catch (error) {
    console.error('Authenticated fetch error:', error);
    throw error;
  }
}

// --- API functions ---
async function fetchSemesters() {
  try {
    const response = await authenticatedFetch("/api/semesters");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching semesters:", error);
    toast("Failed to load semesters", "error");
    return [];
  }
}

async function fetchSubjects(semesterId = null) {
  try {
    const url = semesterId
      ? `/api/subjects?semester_id=${semesterId}`
      : "/api/subjects";
    const response = await authenticatedFetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching subjects:", error);
    toast("Failed to load subjects", "error");
    return [];
  }
}

async function fetchNotesForSubject(subjectId) {
  try {
    const response = await authenticatedFetch(`/api/subjects/${subjectId}/notes`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching notes:", error);
    toast("Failed to load notes", "error");
    return [];
  }
}

async function fetchNotesCount(semesterId) {
  try {
    const response = await authenticatedFetch(`/api/notes/count?semester_id=${semesterId}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.count || 0;
  } catch (error) {
    console.error("Error fetching notes count:", error);
    toast("Failed to load notes count", "error");
    return 0;
  }
}

async function addSubject(name, semesterId) {
  try {
    const response = await authenticatedFetch("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, semester_id: semesterId }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error adding subject:", error);
    throw error;
  }
}

async function deleteSubject(id) {
  try {
    const response = await authenticatedFetch(`/api/subjects/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error deleting subject:", error);
    throw error;
  }
}

async function addNote(title, subjectId, description, pdfId, videoId) {
  try {
    const response = await authenticatedFetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        subject_id: subjectId,
        description,
        pdf_id: pdfId,
        video_id: videoId,
        semester_id: state.selectedSemester,
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error adding note:", error);
    throw error;
  }
}

async function deleteNote(id) {
  try {
    const response = await authenticatedFetch(`/api/notes/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error deleting note:", error);
    throw error;
  }
}

// Show/hide controller (no custom CSS needed)
function toast(message, type = "success", timeout = 3000) {
  const wrapper = document.getElementById("toast");
  const panel = document.getElementById("toast-panel");
  const icon = document.getElementById("toast-icon");
  const msg = document.getElementById("toast-message");

  msg.textContent = message;
  // swap icon color by type
  icon.classList.remove("text-green-400", "text-red-400");
  icon.classList.add(type === "error" ? "text-red-400" : "text-green-400");

  // reveal + animate in
  wrapper.classList.remove("hidden");
  requestAnimationFrame(() => {
    panel.classList.remove("translate-y-6", "sm:-translate-y-6", "opacity-0");
  });

  // auto-hide
  clearTimeout(panel._hideTimer);
  panel._hideTimer = setTimeout(() => {
    panel.classList.add("opacity-0", "translate-y-6", "sm:-translate-y-6");
    setTimeout(() => wrapper.classList.add("hidden"), 300);
  }, timeout);
}

// ConfirmModal component is now loaded from external file
// See: /public/js/components/ConfirmModal.js



// --- State management ---
let state = {
  semesters: [],
  subjects: [],
  subjectNotes: {}, // Cache notes for each subject
  selectedSemester: null,
};

// --- DOM refs ---
const semesterSelect = document.getElementById("semesterSelect");
const subjectName = document.getElementById("subjectName");
const addSubjectBtn = document.getElementById("addSubjectBtn");
const subjectList = document.getElementById("subjectList");

const noteSubject = document.getElementById("noteSubject");
const noteTitle = document.getElementById("noteTitle");
const noteDescription = document.getElementById("noteDescription");
const notePdfId = document.getElementById("notePdfId");
const noteVideoId = document.getElementById("noteVideoId");
const addNoteBtn = document.getElementById("addNoteBtn");

const removeNoteSubject = document.getElementById("removeNoteSubject");
const removeNoteSelect = document.getElementById("removeNoteSelect");
const removeNoteBtn = document.getElementById("removeNoteBtn");

// --- Render helpers ---
function fillSemesterSelect() {
  semesterSelect.innerHTML = "";
  if (state.semesters.length === 0) {
    semesterSelect.innerHTML = '<option value="">No semesters found</option>';
    return;
  }

  semesterSelect.innerHTML = '<option value="">Select Semester</option>';
  state.semesters.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.name;
    semesterSelect.appendChild(opt);
  });

  // Auto-select first semester if none selected
  if (!state.selectedSemester && state.semesters.length > 0) {
    state.selectedSemester = state.semesters[0].id;
    semesterSelect.value = state.selectedSemester;
  }
}

async function renderSubjectsList() {
  subjectList.innerHTML = "";
  if (!state.selectedSemester) {
    subjectList.innerHTML =
      '<li class="text-center text-slate-500 py-4">Please select a semester first</li>';
    return;
  }

  state.subjects.forEach((sub) => {
    const notesCount = sub.notesCount || 0;
    const li = document.createElement("li");
    li.className =
      "flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200";
    li.innerHTML = `
          <div class="flex items-center gap-3">
            <div class="h-8 w-8 rounded-lg bg-sky-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="m12 14 9-5-9-5-9 5 9 5Z"/>
              </svg>
            </div>
            <div>
              <div class="font-medium text-slate-800">${sub.name}</div>
              <div class="text-xs text-slate-500">${notesCount} notes</div>
            </div>
          </div>
          <button data-id="${sub.id}" class="delete-sub px-3 py-1.5 rounded-lg bg-color-primary hover:bg-color-light-primary text-white text-sm">Remove</button>
        `;
    subjectList.appendChild(li);
  });

  // bind delete
  subjectList.querySelectorAll(".delete-sub").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      
      // Show confirmation dialog
      const confirmed = await confirmDialog("Are you sure you want to delete this subject? This action cannot be undone.");
      if (!confirmed) {
        return;
      }
      
      try {
        await deleteSubject(id);
        await loadSubjectsForSemester();
        toast("Subject has been removed!");
      } catch (error) {
        toast("Something went wrong trying to remove a subject", "error");
      }
    });
  });
}

function fillSubjectSelect(el) {
  el.innerHTML = "";
  if (!state.selectedSemester) {
    el.innerHTML = '<option value="">Select semester first</option>';
    return;
  }

  el.innerHTML = '<option value="">Select Subject</option>';
  state.subjects.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.name;
    el.appendChild(opt);
  });
}

async function fillNotesForSubject(subjectId, el) {
  el.innerHTML = "";
  if (!subjectId) {
    el.innerHTML = '<option value="">Select subject first</option>';
    return;
  }

  // Load notes for this subject if not cached
  if (!state.subjectNotes[subjectId]) {
    state.subjectNotes[subjectId] = await fetchNotesForSubject(subjectId);
  }

  const notes = state.subjectNotes[subjectId];
  el.innerHTML = '<option value="">Select Note</option>';
  notes.forEach((n) => {
    const opt = document.createElement("option");
    opt.value = n.id;
    opt.textContent = n.title;
    el.appendChild(opt);
  });
}

async function loadInitialData() {
  state.semesters = await fetchSemesters();
  fillSemesterSelect();
  if (state.selectedSemester) {
    await loadSubjectsForSemester();
  } else {
    // Initialize counters even when no semester is selected
    updateStatsCounters();
  }
}

async function loadSubjectsForSemester() {
  if (!state.selectedSemester) return;
  state.subjects = await fetchSubjects(state.selectedSemester);
  await render();
}

async function render() {
  await renderSubjectsList();
  fillSubjectSelect(noteSubject);
  fillSubjectSelect(removeNoteSubject);
  await updateStatsCounters();
}

// Update stats counters in the overview section
async function updateStatsCounters() {
  const totalSubjectsEl = document.getElementById('totalSubjects');
  const totalNotesEl = document.getElementById('totalNotes');
  const activeSemesterEl = document.getElementById('activeSemester');
  
  if (totalSubjectsEl) {
    totalSubjectsEl.textContent = state.subjects.length;
  }
  
  if (totalNotesEl && state.selectedSemester) {
    const notesCount = await fetchNotesCount(state.selectedSemester);
    totalNotesEl.textContent = notesCount;
  } else if (totalNotesEl) {
    totalNotesEl.textContent = '0';
  }
  
  if (activeSemesterEl && state.selectedSemester) {
    const selectedSemester = state.semesters.find(s => s.id == state.selectedSemester);
    activeSemesterEl.textContent = selectedSemester ? selectedSemester.name : '-';
  } else if (activeSemesterEl) {
    activeSemesterEl.textContent = '-';
  }
}

// --- Event handlers ---
semesterSelect.addEventListener("change", async () => {
  state.selectedSemester = semesterSelect.value;
  if (state.selectedSemester) {
    await loadSubjectsForSemester();
  } else {
    state.subjects = [];
    await render();
  }
});

addSubjectBtn.addEventListener("click", async () => {
  const name = subjectName.value.trim();
  if (!name) return toast("Enter a subject name", "error");
  if (!state.selectedSemester) return toast("Select a semester first", "error");

  setButtonLoading("addSubjectBtn", true);
  try {
    await addSubject(name, state.selectedSemester);
    subjectName.value = "";
    await loadSubjectsForSemester();
    toast("Subject has been added!");
  } catch (error) {
    toast("Somewthing went wrong trying to add a subject", "error");
  } finally {
    setButtonLoading("addSubjectBtn", false);
  }
});

addNoteBtn.addEventListener("click", async () => {
  const sid = noteSubject.value;
  const title = noteTitle.value.trim();
  const description = noteDescription.value.trim();
  const pdfId = notePdfId.value.trim();
  const videoId = noteVideoId.value.trim();

  if (!sid) return toast("Please select a subject!", "error");
  if (!title) return toast("Please enter a note title", "error");

  setButtonLoading("addNoteBtn", true);
  try {
    await addNote(title, sid, description, pdfId, videoId);
    noteTitle.value = "";
    noteDescription.value = "";
    notePdfId.value = "";
    noteVideoId.value = "";
    // Clear cached notes for this subject
    delete state.subjectNotes[sid];
    await loadSubjectsForSemester();
    toast("Notes have been added!");
  } catch (error) {
    toast("Something went wrong trying to add notes!", "error");
  } finally {
    setButtonLoading("addNoteBtn", false);
  }
});

removeNoteSubject.addEventListener("change", async () => {
  await fillNotesForSubject(removeNoteSubject.value, removeNoteSelect);
});

removeNoteBtn.addEventListener("click", async () => {
  const sid = removeNoteSubject.value;
  const nid = removeNoteSelect.value;
  if (!sid || !nid) return;

  // Show confirmation dialog
  const confirmed = await confirmDialog("Are you sure you want to delete this note? This action cannot be undone.");
  if (!confirmed) {
    return;
  }

  setButtonLoading("removeNoteBtn", true);
  try {
    await deleteNote(nid);
    // Clear cached notes for this subject
    delete state.subjectNotes[sid];
    await loadSubjectsForSemester();
    await fillNotesForSubject(sid, removeNoteSelect);
    toast("Notes have been removed");
  } catch (error) {
    toast("Something went wrong trying to remove notes", "error");
  } finally {
    setButtonLoading("removeNoteBtn", false);
  }
});

// --- Pending Notes Approval ---
async function fetchPendingNotes() {
  try {
    const response = await authenticatedFetch('/api/pending-notes');
    if (!response.ok) throw new Error('Failed to fetch pending notes');
    return await response.json();
  } catch (error) {
    console.error(error);
    toast('Failed to load pending notes', 'error');
    return [];
  }
}

async function approveNote(id) {
  try {
    const response = await fetch(`/admin/approve-note/${id}`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to approve note');
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

async function denyNote(id) {
  try {
    const response = await fetch(`/admin/deny-note/${id}`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to deny note');
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

function renderPendingNotes(notes) {
  const container = document.getElementById('pendingNotesList');
  container.innerHTML = '';

  if (!notes.length) {
    container.innerHTML = `<p class="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">No pending notes for approval.</p>`;
    return;
  }

  notes.forEach(note => {
    const card = document.createElement('div');
    card.className = 'bg-white border rounded-lg p-4 shadow flex flex-col gap-2';

    card.innerHTML = `
    <div class="bg-transparent border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
      <div class="space-y-3">

        <div class="space-y-2">
          <h4 class="font-semibold text-lg text-gray-900 leading-tight">${note.title}</h4>
          <p class="text-sm text-gray-600 leading-relaxed">${note.description || 'No description provided'}</p>
        </div>
        
        <div class="flex items-center justify-between text-base text-gray-500 pt-2 border-t border-gray-100">
          <span class="flex items-center gap-1">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
            </svg>
            ${note.uploader || 'Anonymous'}
          </span>
          ${note.pdf_id ? `
            <a href="https://drive.google.com/file/d/${note.pdf_id}/view" target="_blank" 
              class="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
              </svg>
              View PDF
            </a>
          ` : ''}
        </div>
        
        <!-- Action Buttons -->
        <div class="flex gap-2 pt-3">
          <button class="approve-btn flex-1 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-md text-sm font-medium hover:bg-green-100 hover:border-green-300 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1" 
                  data-id="${note.id}">
            Approve
          </button>
          <button class="deny-btn flex-1 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm font-medium hover:bg-red-100 hover:border-red-300 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1" 
                  data-id="${note.id}">
            Deny
          </button>
        </div>
      </div>
    </div>
    `;

    container.appendChild(card);
  });

  // Add event listeners for approve/deny buttons
  container.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const id = btn.getAttribute('data-id');
      const success = await approveNote(id);
      if (success) {
        toast('Notes have been approved!');
        btn.closest('.bg-white').remove();
      } else {
        btn.disabled = false;
        toast('Something went wrong trying to approve these notes.', "error");
      }
    });
  });

  container.querySelectorAll('.deny-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      // Show confirmation dialog
      const confirmed = await confirmDialog("Are you sure you want to deny this note? This will permanently delete it from the database.");
      if (!confirmed) {
        return;
      }
      
      btn.disabled = true;
      const id = btn.getAttribute('data-id');
      const success = await denyNote(id);
      if (success) {
        toast('Notes have been disapproved!', "error");
        btn.closest('.bg-white').remove();
      } else {
        btn.disabled = false;
        toast('Something went wrong trying to disapprove these notes.', "error");
      }
    });
  });
}





// Initialize authentication and load data
async function initializeApp() {
  try {
    // Fetch authentication token first
    await fetchAuthToken();
    console.log('Authentication token obtained, loading initial data...');
    
    // Load initial data after authentication
    await loadInitialData();
    
    // Load pending notes for approval tab
    const pendingNotes = await fetchPendingNotes();
    renderPendingNotes(pendingNotes);
  } catch (error) {
    console.error('Failed to initialize app:', error);
    toast('Failed to initialize application', 'error');
  }
}

// Initialize the application
initializeApp();
