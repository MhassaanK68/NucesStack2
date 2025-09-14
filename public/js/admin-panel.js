/* ===================
   Token management & network helpers
   =================== */

// global State for jwt token
let accessToken = null;          
// holds other requests while a jwt token refresh is ongoing
let isRefreshing = false;
// holds the refresh promise to ensure single refresh at a time        
let refreshPromise = null;       
// timeout for fetch requests
const REQUEST_TIMEOUT = 30000;   

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function fetchAccessToken() {
  try {
    const res = await fetchWithTimeout("/api/token", {
      method: "GET",
      credentials: "include", // ensures cookie (session) is sent
      headers: { "Accept": "application/json" }
    });

    if (!res.ok) {
      // Session probably expired or not logged in
      toast("Session expired. Redirecting to login...", "error", 5000);
      setTimeout(() => (window.location.href = "/login"), 1200);
    }

    const data = await res.json();
    if (!data || !data.accessToken) throw new Error("No access token in response");
    accessToken = data.accessToken;
    return accessToken;
  } catch (err) {
    console.error("fetchAccessToken error:", err);
    accessToken = null;
    toast("Session expired. Redirecting to login...", "error", 5000);
    // Small delay so user sees message
    setTimeout(() => (window.location.href = "/login"), 1200);
    throw err;
  }
}

async function refreshAccessToken() {
  if (isRefreshing) {
    // Another call is already doing a refresh: return the promise
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetchWithTimeout("/api/refresh", {
        method: "POST",
        credentials: "include",
        headers: { "Accept": "application/json" }
      });

      if (!res.ok) {
        toast("Session expired. Redirecting to login...", "error", 5000);
        setTimeout(() => (window.location.href = "/login"), 1200);
      }

      const data = await res.json();
      if (!data || !data.accessToken) throw new Error("Invalid refresh response");
      accessToken = data.accessToken;
      return accessToken;
    } catch (err) {
      console.error("refreshAccessToken error:", err);
      accessToken = null;
      toast("Session expired. Redirecting to login...", "error", 5000);
      setTimeout(() => (window.location.href = "/login"), 1200);
      throw err;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Main API fetch wrapper with automatic token handling
async function apiFetch(url, options = {}) {
  // Ensure we always send cookies (refresh token & session)
  const baseOptions = {
    credentials: "include",
    ...options
  };

  // Lazy-get access token if not present
  if (!accessToken) {
    await fetchAccessToken(); // will redirect to login if fails
  }

  const attachAuth = (opts) => {
    const h = { ...(opts.headers || {}) };
    if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
    // default Accept header
    if (!h["Accept"]) h["Accept"] = "application/json";
    return { ...opts, headers: h };
  };

  // Do the request
  let response;
  try {
    response = await fetchWithTimeout(url, attachAuth(baseOptions));
  } catch (err) {
    // network/timeout
    console.error("Network or timeout error in apiFetch:", err);
    throw err;
  }

  // If unauthorized, try refresh once and retry
  if (response.status == 403) {
    try {
      await refreshAccessToken();
    } catch (err) {
      throw err;
    }

    // Retry the request once with new token
    try {
      response = await fetchWithTimeout(url, attachAuth(baseOptions));
    } catch (err) {
      console.error("Network error on retry in apiFetch:", err);
      throw err;
    }
  }

  return response;
}

// JSON-specific fetch with error handling
async function apiJson(url, options = {}) {
  const res = await apiFetch(url, options);
  // If no content (204), return null
  if (res.status == 204) return null;

  // Try parse JSON safely
  let data;
  try {
    data = await res.json();
  } catch (err) {
    console.error("Invalid JSON response for", url, err);
    throw new Error("Invalid JSON response from server");
  }

  if (!res.ok) {
    // Standard error surface: use message from server if present
    const message = data && (data.error || data.message) ? (data.error || data.message) : `Request failed with status ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}



/* ===================
   UI: toasts, loading buttons 
   =================== */

// Show/hide controller (same as before)
function toast(message, type = "success", timeout = 3000) {
  const wrapper = document.getElementById("toast");
  const panel = document.getElementById("toast-panel");
  const icon = document.getElementById("toast-icon");
  const msg = document.getElementById("toast-message");

  if (!wrapper || !panel || !msg || !icon) {
    // fallback to alert if UI missing
    alert(message);
    return;
  }

  msg.textContent = message;
  icon.classList.remove("text-green-400", "text-red-400");
  icon.classList.add(type === "error" ? "text-red-400" : "text-green-400");

  wrapper.classList.remove("hidden");
  
  // Animate in
  requestAnimationFrame(() => {
    panel.classList.remove("opacity-0", "translate-y-6", "sm:-translate-y-6");
  });

  clearTimeout(panel._hideTimer);
  panel._hideTimer = setTimeout(() => {
    panel.classList.add("opacity-0", "translate-y-6", "sm:-translate-y-6");
    setTimeout(() => wrapper.classList.add("hidden"), 300);
  }, timeout);
}

// Loading state helper
function setButtonLoading(buttonId, isLoading) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  const spinner = button.querySelector(".loading-spinner");
  const text = button.querySelector(".btn-text");

  if (isLoading) {
    button.classList.add("btn-loading");
    if (spinner) spinner.style.display = "inline-block";
    if (text) text.style.display = "none";
    button.disabled = true;
  } else {
    button.classList.remove("btn-loading");
    if (spinner) spinner.style.display = "none";
    if (text) text.style.display = "block";
    button.disabled = false;
  }
}

/* ====================
   App state & DOM refs 
   =================== */

let state = {
  semesters: [],
  subjects: [],
  subjectNotes: {}, // cache notes per subject
  selectedSemester: null,
};

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

const notesListContainer = document.getElementById("notesListContainer");
const removeNoteSubject = document.getElementById("removeNoteSubject");


/* ===================
   API wrappers (use apiJson)
   =================== */

async function fetchSemesters() {
  try {
    const data = await apiJson("/api/semesters", { method: "GET" });
    return Array.isArray(data) ? data : (data?.semesters || []);
  } catch (err) {
    console.error("Error fetching semesters:", err);
    toast("Could not load semesters.", "error");
    return [];
  }
}

async function fetchSubjects(semesterId = null) {
  try {
    const url = semesterId ? `/api/subjects?semester_id=${encodeURIComponent(semesterId)}` : "/api/subjects";
    const data = await apiJson(url, { method: "GET" });
    return Array.isArray(data) ? data : (data?.subjects || []);
  } catch (err) {
    console.error("Error fetching subjects:", err);
    toast("Could not load subjects.", "error");
    return [];
  }
}

async function fetchNotesForSubject(subjectId) {
  if (!subjectId) return [];
  try {
    const data = await apiJson(`/api/subjects/${encodeURIComponent(subjectId)}/notes`, { method: "GET" });
    return Array.isArray(data) ? data : (data?.notes || []);
  } catch (err) {
    console.error("Error fetching notes for subject:", err);
    toast("Could not load notes for subject.", "error");
    return [];
  }
}

async function fetchNotesCount(semesterId) {
  if (!semesterId) return 0;
  try {
    const data = await apiJson(`/api/get-notes-count?semester_id=${encodeURIComponent(semesterId)}`, { method: "GET" });
    return Number(data?.count || 0);
  } catch (err) {
    console.error("Error fetching notes count:", err);
    return 0;
  }
}

async function addSubject(name, semesterId) {
  if (!name || !semesterId) throw new Error("Missing fields for addSubject");
  try {
    const data = await apiJson("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, semester_id: semesterId })
    });
    return data;
  } catch (err) {
    console.error("Error adding subject:", err);
    throw err;
  }
}

async function deleteSubject(id) {
  if (!id) throw new Error("Missing id for deleteSubject");
  try {
    const data = await apiJson(`/api/subjects/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    return data;
  } catch (err) {
    console.error("Error deleting subject:", err);
    throw err;
  }
}

async function addNote(title, subjectId, description, pdfId, videoId) {
  if (!title || !subjectId) throw new Error("Missing required fields for addNote");
  try {
    const payload = {
      title,
      subject_id: subjectId,
      description: description || null,
      pdf_id: pdfId || null,
      video_id: videoId || null,
      semester_id: state.selectedSemester
    };
    const data = await apiJson("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return data;
  } catch (err) {
    console.error("Error adding note:", err);
    throw err;
  }
}

async function deleteNote(id) {
  if (!id) throw new Error("Missing note id for deleteNote");
  try {
    const data = await apiJson(`/api/notes/${encodeURIComponent(id)}`, { method: "DELETE" });
    return data;
  } catch (err) {
    console.error("Error deleting note:", err);
    throw err;
  }
}

/* Pending notes moderation */
async function fetchPendingNotes() {
  try {
    let data = await apiJson("/api/pending-notes", { method: "GET" });
    data = data.notes || [];
    return data;
  } catch (err) {
    console.error("Error fetching pending notes:", err);
    toast("Could not load pending notes.", "error");
    return [];
  }
}

async function approveNote(id) {
  if (!id) return false;
  try {
    const res = await apiFetch(`/admin/approve-note/${encodeURIComponent(id)}`, { method: "POST" });
    if (!res.ok) throw new Error("Approval failed");
    return true;
  } catch (err) {
    console.error("approveNote error:", err);
    toast("Approval failed.", "error");
    return false;
  }
}

async function denyNote(id) {
  if (!id) return false;
  try {
    const res = await apiFetch(`/admin/deny-note/${encodeURIComponent(id)}`, { method: "POST" });
    if (!res.ok) throw new Error("Denial failed");
    return true;
  } catch (err) {
    console.error("denyNote error:", err);
    toast("Denial failed.", "error");
    return false;
  }
}

/* ===================
   Rendering & Helpers (keeps original logic, using secured APIs)
   =================== */

function fillSemesterSelect() {
  if (!semesterSelect) return;
  semesterSelect.innerHTML = "";
  if (!Array.isArray(state.semesters) || state.semesters.length == 0) {
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
  if (!subjectList) return;
  subjectList.innerHTML = "";
  if (!state.selectedSemester) {
    subjectList.innerHTML = '<li class="text-center text-slate-500 py-4">Please select a semester first</li>';
    return;
  }

  state.subjects.forEach((sub) => {
    const notesCount = sub.notesCount || 0;
    const li = document.createElement("li");
    li.className = "flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200";
    li.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="h-8 w-8 rounded-lg bg-sky-100 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="m12 14 9-5-9-5-9 5 9 5Z"/>
          </svg>
        </div>
        <div>
          <div class="font-medium text-slate-800">${escapeHtml(sub.name)}</div>
          <div class="text-xs text-slate-500">${notesCount} notes</div>
        </div>
      </div>
      <button data-id="${encodeURIComponent(sub.id)}" class="delete-sub px-3 py-1.5 rounded-lg bg-color-primary hover:bg-color-light-primary text-white text-sm">Remove</button>
    `;
    subjectList.appendChild(li);
  });

  // bind delete
  subjectList.querySelectorAll(".delete-sub").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = decodeURIComponent(e.currentTarget.getAttribute("data-id"));
      const confirmed = await confirmDialog("Are you sure you want to delete this subject? This action cannot be undone.");
      if (!confirmed) return;
      try {
        await deleteSubject(id);
        await loadSubjectsForSemester();
        toast("Subject has been removed!");
      } catch (error) {
        console.error("Delete subject failed:", error);
        toast("Something went wrong trying to remove a subject", "error");
      }
    });
  });
}

function fillSubjectSelect(el) {
  if (!el) return;
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
  const notesTableBody = document.getElementById('notesTableBody');
  const notesListContainer = document.getElementById('notesListContainer');
  const noNotesMessage = document.getElementById('noNotesMessage');
  
  // Clear existing notes
  notesTableBody.innerHTML = "";
  
  if (!subjectId) {
    notesListContainer.classList.add('hidden');
    noNotesMessage.classList.add('hidden');
    return;
  }

  try {
    // Show loading state
    notesListContainer.classList.remove('hidden');
    noNotesMessage.classList.add('hidden');
    notesTableBody.innerHTML = `
      <tr>
        <td colspan="3" class="px-6 py-4 text-center text-sm text-gray-500">
          Loading notes...
        </td>
      </tr>`;
    
    // Load notes for this subject if not cached
    if (!state.subjectNotes[subjectId]) {
      state.subjectNotes[subjectId] = await fetchNotesForSubject(subjectId);
    }

    const notes = state.subjectNotes[subjectId];
    
    if (notes.length == 0) {
      notesListContainer.classList.add('hidden');
      noNotesMessage.classList.remove('hidden');
      noNotesMessage.textContent = 'No notes found for this subject.';
      return;
    }
    
    // Clear the loading state
    notesTableBody.innerHTML = "";
    
    // Show the notes list and hide the no notes message
    notesListContainer.classList.remove('hidden');
    noNotesMessage.classList.add('hidden');
    
    // Render notes in the table
    notes.forEach((note) => {
      const row = document.createElement('tr');
      row.className = 'hover:bg-gray-50 border-b border-gray-200';
      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <div class="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-indigo-100 rounded-md">
              <i data-lucide="file-text" class="w-5 h-5 text-indigo-600"></i>
            </div>
            <div class="ml-4">
              <div class="text-sm font-medium text-gray-900">${note.title || 'Untitled Note'}</div>
              <div class="text-xs text-gray-500">
                ${note.description ? note.description.substring(0, 50) + (note.description.length > 50 ? '...' : '') : 'No description'}
              </div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
          <button class="edit-note inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" data-note-id="${note.id}">
            <i data-lucide="pencil" class="w-5 h-5"></i>
          </button>
          <button class="delete-note inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500" data-note-id="${note.id}" data-note-title="${note.title || 'this note'}">
            <i data-lucide="trash-2" class="w-5 h-5"></i>
          </button>
        </td>
      `;
      notesTableBody.appendChild(row);
    });
    
    // Initialize Lucide icons for the new elements
    if (window.lucide) {
      lucide.createIcons();
    }
    
    // Set up event listeners for edit and delete 
    setupNoteActionHandlers();
    
  } catch (error) {
    console.error('Error loading notes:', error);
    notesListContainer.classList.add('hidden');
    noNotesMessage.classList.remove('hidden');
    noNotesMessage.textContent = 'Failed to load notes. Please try again.';
    toast('Failed to load notes', 'error');
  }
}

function setupNoteActionHandlers() {
  // Remove any existing event listeners first to prevent duplicates
  document.querySelectorAll('.edit-note').forEach(button => {
    button.replaceWith(button.cloneNode(true));
  });
  
  document.querySelectorAll('.delete-note').forEach(button => {
    button.replaceWith(button.cloneNode(true));
  });
  
  // Edit note button click handler
  document.querySelectorAll('.edit-note').forEach(button => {
    button.addEventListener('click', handleEditNote);
  });
  
  // Delete note button click handler
  document.querySelectorAll('.delete-note').forEach(button => {
    button.addEventListener('click', handleDeleteNoteClick);
  });
}

async function handleEditNote(event) {
  try {
    const button = event.currentTarget;
    const noteId = button.dataset.noteId;
    const subjectId = document.getElementById('removeNoteSubject').value;
    
    // Show loading state on the button
    const originalContent = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i data-lucide="loader" class="w-3 h-3 mr-1 animate-spin"></i> Loading...';
    if (window.lucide) lucide.createIcons();
    
    // Find the note in the current subject's notes
    const notes = state.subjectNotes[subjectId] || [];
    let note = notes.find(n => n.id == noteId);
    
    // If note not found in cache, try to fetch it
    if (!note) {
      try {
        await apiJson(`/api/notes/${noteId}`);
      } catch (error) {
        console.error('Error fetching note:', error);
        toast('Failed to load note details', 'error');
        return;
      } finally {
        // Reset button state
        button.disabled = false;
        button.innerHTML = originalContent;
        if (window.lucide) lucide.createIcons();
      }
    } else {
      // Reset button state immediately if we have the note
      button.disabled = false;
      button.innerHTML = originalContent;
    }
    
    if (!note) {
      toast('Note not found', 'error');
      return;
    }
    
    // Fill the edit form with note data
    document.getElementById('editNoteId').value = note.id;
    document.getElementById('editNoteTitle').value = note.title || '';
    document.getElementById('editNoteDescription').value = note.description || '';
    
    // Show PDF and Video IDs as full URLs if present instead of raw IDs

    if (note.pdf_id){
      document.getElementById('editNotePdfId').value = `https://drive.google.com/file/d/${note.pdf_id}/view`;
    }
    else{
      document.getElementById('editNotePdfId').value = '';
    }
    

    if(note.video_id){
      document.getElementById('editNoteVideoId').value = `https://youtube.com/watch?v=${note.video_id}`;
    }
    else{
      document.getElementById('editNoteVideoId').value = '';
    }
    
    // Show the edit modal
    document.getElementById('editNoteModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    
    // Focus on the title field for better UX
    setTimeout(() => {
      const titleField = document.getElementById('editNoteTitle');
      if (titleField) titleField.focus();
    }, 100);
    
  } catch (error) {
    console.error('Error in handleEditNote:', error);
    toast('An error occurred while loading the note', 'error');
  }
}

async function handleDeleteNoteClick(event) {
  try {
    const button = event.currentTarget;
    const noteId = button.dataset.noteId;
    const noteTitle = button.dataset.noteTitle || 'this note';
    
    // Show loading state on the button
    const originalContent = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i data-lucide="loader" class="w-3 h-3 mr-1 animate-spin"></i>';
    if (window.lucide) lucide.createIcons();
   
    const confirm = await confirmDialog(`Are you sure you want to delete "${noteTitle}"? This action cannot be undone.`); 
   
    if (confirm) {
      await deleteNote(noteId);

      // Show success and refresh notes list
      toast('Note deleted successfully', 'success');
      
      const deletedNoteSubjectId = document.getElementById('removeNoteSubject').value;
      state.subjectNotes[deletedNoteSubjectId] = state.subjectNotes[deletedNoteSubjectId].filter(n => n.id != noteId);
      await fillNotesForSubject(deletedNoteSubjectId);


      // Update subjects list to reflect note count change
      if (state.selectedSemester) {
        loadSubjectsForSemester();
      }
    } else {
      // User cancelled, reset button state
      setTimeout(() => {
      button.disabled = false;
      button.innerHTML = originalContent;
      }, 100);
    }
    
    
  } catch (error) {
    console.error('Error in handleDeleteNoteClick:', error);
    toast('An error occurred while preparing to delete the note', 'error');
    
    // Make sure to reset the button state in case of error
    const button = event.currentTarget;
    button.disabled = false;
    button.innerHTML = originalContent || '<i data-lucide="trash-2" class="w-3 h-3 mr-1"></i> Delete';
    if (window.lucide) lucide.createIcons();
  }
}

async function saveNoteChanges() {
  const saveButton = document.getElementById('saveNoteChanges');
  if (!saveButton) {
    console.error('Save button not found');
    return;
  }

  // Save original button state
  const originalButtonContent = saveButton.innerHTML;
  
  try {
    const noteId = document.getElementById('editNoteId')?.value;
    const title = document.getElementById('editNoteTitle')?.value.trim();
    const description = document.getElementById('editNoteDescription')?.value.trim() || '';
    const pdfId = document.getElementById('editNotePdfId')?.value.trim() || '';
    const videoId = document.getElementById('editNoteVideoId')?.value.trim() || '';
    const subjectId = document.getElementById('removeNoteSubject')?.value;
    
    if (!noteId || !title || !subjectId) {
      toast('Please fill in all required fields', 'error');
      return;
    }
    
    // Set loading state
    saveButton.disabled = true;
    saveButton.innerHTML = '<i data-lucide="loader" class="w-4 h-4 mr-2 animate-spin"></i>';
    if (window.lucide) lucide.createIcons();
    
    // Prepare update data
    const updateData = { 
      title, 
      description,
      pdf_id: pdfId || null,
      video_id: videoId || null
    };
    
    // Send update request
    const response = await apiJson(`/api/notes/${noteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    
    const updatedNote = response;
    
    // Update local state
    if (state.subjectNotes[subjectId]) {
      const noteIndex = state.subjectNotes[subjectId].findIndex(n => n.id == noteId);
      if (noteIndex !== -1) {
        state.subjectNotes[subjectId][noteIndex] = {
          ...state.subjectNotes[subjectId][noteIndex],
          ...updatedNote
        };
      }
    }
    
    // Show success and update UI
    toast('Note updated successfully', 'success');
    
    // Reset button state before closing modal
    saveButton.disabled = false;
    saveButton.innerHTML = 'Save Changes';
    if (window.lucide) lucide.createIcons();
    
    // Close modal and refresh notes
    closeEditModal();
    await fillNotesForSubject(subjectId);
    
  } catch (error) {
    console.error('Error updating note:', error);
    toast(error.message || 'Failed to update note', 'error');
    
    // Reset button state on error
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.innerHTML = '<i data-lucide="alert-circle" class="w-4 h-4 mr-2"></i> Try Again';
      if (window.lucide) lucide.createIcons();
    }
  }
}

function closeEditModal() {
  const modal = document.getElementById('editNoteModal');
  if (!modal) return;
  
  // Hide the modal
  modal.classList.add('hidden');
  document.body.style.overflow = 'auto'; // Re-enable scrolling
  
  // Reset the form
  const form = document.getElementById('editNoteForm');
  if (form) {
    form.reset();
  }
  
  // Clear any error messages
  const errorMessages = document.querySelectorAll('.error-message');
  errorMessages.forEach(el => el.textContent = '');
  
  // Reset the save button state
  const saveButton = document.getElementById('saveNoteChanges');
  if (saveButton) {
    saveButton.disabled = false;
    saveButton.innerHTML = 'Save Changes';
    if (window.lucide) lucide.createIcons();
  }
  
  // Clear any temporary data
  if (window.editNoteData) {
    delete window.editNoteData;
  } else {
    // Initialize counters even when no semester is selected
    updateStatsCounters();
  }
}


async function loadInitialData() {
  try {
    // Attempt to fetch access token (makes sure user session is valid and sets accessToken)
    if (!accessToken) await fetchAccessToken();
    state.semesters = await fetchSemesters();
    fillSemesterSelect();
    if (state.selectedSemester) {
      await loadSubjectsForSemester();
    } else {
      updateStatsCounters();
    }
  } catch (err) {
    // fetchAccessToken handles redirect; if we're here, show a quiet message
    console.warn("loadInitialData aborted:", err);
  }
}

async function loadSubjectsForSemester() {
  if (!state.selectedSemester) return;
  state.subjects = await fetchSubjects(state.selectedSemester);
  await render();
}

// Initial Render
async function render() {
  await renderSubjectsList();
  fillSubjectSelect(noteSubject);
  fillSubjectSelect(removeNoteSubject);
  await updateStatsCounters();
}

async function updateStatsCounters() {
  const totalSubjectsEl = document.getElementById('totalSubjects');
  const totalNotesEl = document.getElementById('totalNotes');
  const activeSemesterEl = document.getElementById('activeSemester');

  if (totalSubjectsEl) totalSubjectsEl.textContent = state.subjects.length;
  if (totalNotesEl) {
    if (state.selectedSemester) {
      const notesCount = await fetchNotesCount(state.selectedSemester);
      totalNotesEl.textContent = notesCount;
    } else {
      totalNotesEl.textContent = '0';
    }
  }
  if (activeSemesterEl) {
    if (state.selectedSemester) {
      const selectedSemester = state.semesters.find(s => s.id == state.selectedSemester);
      activeSemesterEl.textContent = selectedSemester ? selectedSemester.name : '-';
    } else {
      activeSemesterEl.textContent = '-';
    }
  }
}

/* ===================
   Event handlers
   =================== */

if (semesterSelect) {
  semesterSelect.addEventListener("change", async () => {
    state.selectedSemester = semesterSelect.value;
    if (state.selectedSemester) {
      await loadSubjectsForSemester();
    } else {
      state.subjects = [];
      await render();
    }
  });
}

  // Save note changes when clicking the save button
  document.getElementById('saveNoteChanges').addEventListener('click', saveNoteChanges);

if (addSubjectBtn) {
  addSubjectBtn.addEventListener("click", async () => {
    const name = subjectName.value?.trim();
    if (!name) return toast("Enter a subject name", "error");
    if (!state.selectedSemester) return toast("Select a semester first", "error");

    setButtonLoading("addSubjectBtn", true);
    try {
      await addSubject(name, state.selectedSemester);
      subjectName.value = "";
      await loadSubjectsForSemester();
      toast("Subject has been added!");
    } catch (error) {
      console.error("Add subject failed:", error);
      toast("Something went wrong trying to add a subject", "error");
    } finally {
      setButtonLoading("addSubjectBtn", false);
    }
  });
}

if (addNoteBtn) {
  addNoteBtn.addEventListener("click", async () => {
    const sid = noteSubject.value;
    const title = noteTitle.value?.trim();
    const description = noteDescription.value?.trim();
    const pdfId = notePdfId.value?.trim();
    const videoId = noteVideoId.value?.trim();

    if (!sid) return toast("Please select a subject!", "error");
    if (!title) return toast("Please enter a note title", "error");

    setButtonLoading("addNoteBtn", true);
    try {
      await addNote(title, sid, description, pdfId, videoId);
      noteTitle.value = "";
      noteDescription.value = "";
      notePdfId.value = "";
      noteVideoId.value = "";
      delete state.subjectNotes[sid]; // clear cached notes
      await loadSubjectsForSemester();
      toast("Notes have been added!");
    } catch (error) {
      console.error("Add note failed:", error);
      toast("Something went wrong trying to add notes!", "error");
    } finally {
      setButtonLoading("addNoteBtn", false);
    }
  });
}

if (removeNoteSubject) {
  removeNoteSubject.addEventListener("change", async () => {
    await fillNotesForSubject(removeNoteSubject.value, notesListContainer);
  });
}

if (document.getElementById('closeEditModal')) {
  document.getElementById('closeEditModal').addEventListener('click', closeEditModal);
}

if (document.getElementById('cancelEditNote')) {
  document.getElementById('cancelEditNote').addEventListener('click', closeEditModal);
}      


/* Pending notes rendering using secured APIs */
async function renderPendingNotes() {
  const notes = await fetchPendingNotes();
  const container = document.getElementById('pendingNotesList');
  if (!container) return;
  container.innerHTML = '';

  if (!notes.length) {
    container.innerHTML = `<p class="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">No pending notes for approval.</p>`;
    return;
  }

  notes.forEach(note => {
    const card = document.createElement('div');
    card.className = 'bg-white border rounded-lg p-4 shadow flex flex-col gap-2';

    // safe output via escapeHtml
    const uploader = escapeHtml(note.uploader || 'Anonymous');
    const title = escapeHtml(note.title || 'Untitled');
    const description = escapeHtml(note.description || 'No description provided');
    const pdfLink = note.pdf_id ? `<a href="https://drive.google.com/file/d/${encodeURIComponent(note.pdf_id)}/view" target="_blank" class="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors">View PDF</a>` : '';

    card.innerHTML = `
      <div class="bg-transparent border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
        <div class="space-y-3">
          <div class="space-y-2">
            <h4 class="font-semibold text-lg text-gray-900 leading-tight">${title}</h4>
            <p class="text-sm text-gray-600 leading-relaxed">${description}</p>
          </div>
          <div class="flex items-center justify-between text-base text-gray-500 pt-2 border-t border-gray-100">
            <span class="flex items-center gap-1">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
              </svg>
              ${uploader}
            </span>
            ${pdfLink}
          </div>
          <div class="flex gap-2 pt-3">
            <button class="approve-btn flex-1 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-md text-sm font-medium hover:bg-green-100 hover:border-green-300 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1" data-id="${encodeURIComponent(note.id)}">Approve</button>
            <button class="deny-btn flex-1 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm font-medium hover:bg-red-100 hover:border-red-300 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1" data-id="${encodeURIComponent(note.id)}">Deny</button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const id = decodeURIComponent(btn.getAttribute('data-id'));
      const success = await approveNote(id);
      if (success) {
        toast('Notes have been approved!');
        btn.closest('.bg-white').remove();
      } else {
        btn.disabled = false;
      }
    });
  });

  container.querySelectorAll('.deny-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const confirmed = await confirmDialog("Are you sure you want to deny this note? This will permanently delete it from the database.");
      if (!confirmed) return;
      btn.disabled = true;
      const id = decodeURIComponent(btn.getAttribute('data-id'));
      const success = await denyNote(id);
      if (success) {
        toast('Notes have been disapproved!', "error");
        btn.closest('.bg-white').remove();
      } else {
        btn.disabled = false;
      }
    });
  });
}

/* ===============
   Misc helpers
   ============== */

// Simple HTML escape to avoid XSS when injecting strings
function escapeHtml(str) {
  if (str == null || str == undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ==============
   Initial UI behavior (tabs, etc.) - preserve your original code
   ============== */
document.addEventListener("DOMContentLoaded", function () {
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetTab = button.getAttribute("data-tab");
      tabButtons.forEach((btn) => {
        btn.classList.remove("active", "border-color-primary");
        btn.classList.add("text-gray-600");
      });
      tabContents.forEach((content) => {
        content.classList.remove("active");
      });
      button.classList.add("active", "border-color-primary");
      button.classList.remove("text-gray-600");
      button.classList.add("color-primary");
      document.getElementById(targetTab).classList.add("active");
      if (targetTab == "approve") {
        const semSelect = document.getElementById('semSelect');
        if (semSelect) semSelect.style.display = 'none';
      } else {
        const semSelect = document.getElementById('semSelect');
        if (semSelect) semSelect.style.display = 'block';
      }
    });
  });

  // Close modals on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeEditModal();
      closeDeleteModal();
    }
  });

  const initial = document.querySelector('[data-tab="overview"]');
  if (initial) initial.classList.add("border-color-primary");
});

/* ===================
   Kick off initial data load
   =================== */

(async function init() {
  // Make sure session is valid & token fetched; load UI data afterwards
  await loadInitialData();
  // Render pending notes
  await renderPendingNotes();
})();
