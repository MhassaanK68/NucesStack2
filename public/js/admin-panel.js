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

// Fetch a new JWT token from the server using the frontend proxy
async function fetchAuthToken() {
  try {
    const response = await fetch('/frontend-get-token');
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to get authentication token');
    }
    
    const data = await response.json();
    if (data.success && data.token) {
      authToken = data.token;
      console.log('New authentication token obtained');
      return authToken;
    }
    
    throw new Error('Invalid token response from server');
  } catch (error) {
    console.error('Error fetching auth token:', error);
    const errorMessage = error.message.includes('404') 
      ? 'Authentication service unavailable. Please try again later.'
      : 'Failed to get authentication token';
      
    toast(errorMessage, 'error');
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
    console.log(`[fetchNotesCount] Fetching count for semester: ${semesterId}`);
    const url = `/api/notes-count?semester_id=${encodeURIComponent(semesterId)}`;
    console.log(`[fetchNotesCount] Request URL: ${url}`);
    
    const response = await authenticatedFetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[fetchNotesCount] API Error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json().catch(e => {
      console.error('[fetchNotesCount] Failed to parse JSON response:', e);
      throw new Error('Invalid response from server');
    });
    
    console.log('[fetchNotesCount] Response data:', data);
    
    if (typeof data.count === 'undefined') {
      console.warn('[fetchNotesCount] count property not found in response, using 0 as fallback');
      return 0;
    }
    
    return parseInt(data.count, 10) || 0;
    
  } catch (error) {
    console.error('[fetchNotesCount] Error:', error);
    toast('Failed to load notes count', 'error');
    return 0; // Return 0 as fallback
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

// Show/hide controller with close button support
function toast(message, type = "success", timeout = 5000) {
  const wrapper = document.getElementById("toast");
  const panel = document.getElementById("toast-panel");
  const icon = document.getElementById("toast-icon");
  const msg = document.getElementById("toast-message");
  const closeBtn = document.getElementById("toast-close");

  if (!wrapper || !panel || !icon || !msg || !closeBtn) {
    console.error('Toast elements not found');
    return;
  }

  // Set message and type
  msg.textContent = message;
  
  // Update icon color based on type
  icon.classList.remove("text-green-400", "text-red-400");
  icon.classList.add(type === "error" ? "text-red-400" : "text-green-400");

  // Clear any existing timeouts
  clearTimeout(panel._hideTimer);
  clearTimeout(panel._showTimer);

  // Reset any ongoing animations
  panel.classList.remove("opacity-0", "translate-y-6", "sm:-translate-y-6");
  
  // Show the toast
  wrapper.classList.remove("hidden");
  
  // Animate in
  requestAnimationFrame(() => {
    panel.classList.remove("opacity-0", "translate-y-6", "sm:-translate-y-6");
  });

  // Auto-hide after timeout
  if (timeout > 0) {
    panel._hideTimer = setTimeout(() => {
      hideToast();
    }, timeout);
  }

  // Close button handler
  const onClick = () => {
    hideToast();
    closeBtn.removeEventListener('click', onClick);
  };
  
  // Add event listener for close button
  closeBtn.addEventListener('click', onClick);
  
  // Function to hide the toast
  function hideToast() {
    clearTimeout(panel._hideTimer);
    clearTimeout(panel._showTimer);
    
    // Animate out
    panel.classList.add("opacity-0", "translate-y-6", "sm:-translate-y-6");
    
    // Hide after animation completes
    panel._hideTimer = setTimeout(() => {
      wrapper.classList.add("hidden");
    }, 300);
  }
  
  // Return hide function in case it needs to be called manually
  return hideToast;
}



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

  if (state.subjects.length === 0) {
    subjectList.innerHTML =
      '<li class="text-center text-slate-500 py-4">No subjects found for this semester</li>';
    return;
  }

  state.subjects.forEach((sub) => {
    const notesCount = sub.notesCount || 0;
    const li = document.createElement("li");
    li.className =
      "flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors";
    li.innerHTML = `
          <div class="flex items-center gap-3 flex-1">
            <div class="h-10 w-10 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="m12 14 9-5-9-5-9 5 9 5Z"/>
              </svg>
            </div>
            <div class="min-w-0">
              <div class="font-medium text-slate-800 truncate">${sub.name}</div>
              <div class="text-xs text-slate-500 flex items-center gap-1">
                <span class="inline-flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  ${notesCount} ${notesCount === 1 ? 'note' : 'notes'}
                </span>
              </div>
            </div>
          </div>
          <button data-id="${sub.id}" class="delete-sub px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 text-sm font-medium transition-colors">
            Remove
          </button>
        `;
    subjectList.appendChild(li);
  });

  // bind delete
  subjectList.querySelectorAll(".delete-sub").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-id");
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
    
    if (notes.length === 0) {
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
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          <div class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            ${note.subject_name || 'N/A'}
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
          <button class="edit-note inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" data-note-id="${note.id}">
            <i data-lucide="pencil" class="w-3 h-3 mr-1"></i> Edit
          </button>
          <button class="delete-note inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500" data-note-id="${note.id}" data-note-title="${note.title || 'this note'}">
            <i data-lucide="trash-2" class="w-3 h-3 mr-1"></i> Delete
          </button>
        </td>
      `;
      notesTableBody.appendChild(row);
    });
    
    // Initialize Lucide icons for the new elements
    if (window.lucide) {
      lucide.createIcons();
    }
    
    // Set up event listeners for edit and delete buttons
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
    let note = notes.find(n => n.id === noteId);
    
    // If note not found in cache, try to fetch it
    if (!note) {
      try {
        const response = await authenticatedFetch(`/api/notes/${noteId}`);
        if (!response.ok) throw new Error('Note not found');
        note = await response.json();
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
    document.getElementById('editNotePdfId').value = note.pdf_id || '';
    document.getElementById('editNoteVideoId').value = note.video_id || '';
    
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
    
    // Store the note ID and subject ID in the modal for later use
    const confirmButton = document.getElementById('confirmDeleteNote');
    confirmButton.dataset.noteId = noteId;
    confirmButton.dataset.subjectId = document.getElementById('removeNoteSubject').value;
    
    // Update the confirmation message with more details
    const confirmMessage = document.querySelector('#deleteConfirmModal p');
    confirmMessage.innerHTML = `
      <div class="text-center">
        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <i data-lucide="alert-triangle" class="h-6 w-6 text-red-600"></i>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Delete Note</h3>
        <p class="text-sm text-gray-500">
          Are you sure you want to delete <span class="font-medium">"${noteTitle}"</span>? 
          This action cannot be undone.
        </p>
      </div>
    `;
    
    // Initialize Lucide icons in the modal
    if (window.lucide) lucide.createIcons();
    
    // Show the delete confirmation modal
    document.getElementById('deleteConfirmModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    
    // Reset the button state after a short delay to ensure the modal is shown
    setTimeout(() => {
      button.disabled = false;
      button.innerHTML = originalContent;
      if (window.lucide) lucide.createIcons();
    }, 100);
    
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
    saveButton.innerHTML = '<i data-lucide="loader" class="w-4 h-4 mr-2 animate-spin"></i> Saving...';
    if (window.lucide) lucide.createIcons();
    
    // Prepare update data
    const updateData = { 
      title, 
      description,
      pdf_id: pdfId || null,
      video_id: videoId || null
    };
    
    // Send update request
    const response = await authenticatedFetch(`/api/notes/${noteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const updatedNote = await response.json();
    
    // Update local state
    if (state.subjectNotes[subjectId]) {
      const noteIndex = state.subjectNotes[subjectId].findIndex(n => n.id === noteId);
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

async function deleteNote() {
  const confirmButton = document.getElementById('confirmDeleteNote');
  const noteId = confirmButton.dataset.noteId;
  const subjectId = confirmButton.dataset.subjectId || document.getElementById('removeNoteSubject').value;
  
  if (!noteId || !subjectId) {
    console.error('Missing noteId or subjectId for deletion');
    toast('Error: Missing required information', 'error');
    closeDeleteModal();
    return;
  }
  
  try {
    // Set loading state on the confirm button
    const originalButtonContent = confirmButton.innerHTML;
    confirmButton.disabled = true;
    confirmButton.innerHTML = '<i data-lucide="loader" class="w-4 h-4 mr-2 animate-spin"></i> Deleting...';
    if (window.lucide) lucide.createIcons();
    
    // Send the delete request
    const response = await authenticatedFetch(`/api/notes/${noteId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Remove the note from the local state
    if (state.subjectNotes[subjectId]) {
      state.subjectNotes[subjectId] = state.subjectNotes[subjectId].filter(n => n.id !== noteId);
    }
    
    // Show success message
    toast('Note deleted successfully', 'success');
    
    // Close the modal after a short delay
    setTimeout(() => {
      closeDeleteModal();
      // Refresh the notes list
      fillNotesForSubject(subjectId);
      
      // Update the subjects list to reflect the change in note count
      if (state.selectedSemester) {
        loadSubjectsForSemester();
      }
    }, 500);
    
  } catch (error) {
    console.error('Error deleting note:', error);
    
    // Show error message with details if available
    const errorMessage = error.message || 'Failed to delete note';
    toast(errorMessage, 'error');
    
    // Re-enable the confirm button with error state
    confirmButton.disabled = false;
    confirmButton.innerHTML = '<i data-lucide="alert-circle" class="w-4 h-4 mr-2"></i> Try Again';
    if (window.lucide) lucide.createIcons();
    
  } finally {
    // Reset the button state if not already handled in the catch block
    if (!confirmButton.disabled) {
      confirmButton.disabled = false;
      confirmButton.innerHTML = 'Delete';
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

function closeDeleteModal() {
  document.getElementById('deleteConfirmModal').classList.add('hidden');
  document.body.style.overflow = ''; // Re-enable background scrolling
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
  try {
    state.subjects = await fetchSubjects(state.selectedSemester);
    renderSubjectsList();
    
    // Fill subject dropdowns in both add and remove note sections
    fillSubjectSelect(noteSubject);
    
    // Also populate the remove note subject dropdown
    const removeNoteSubject = document.getElementById('removeNoteSubject');
    if (removeNoteSubject) {
      // Clear existing options first
      while (removeNoteSubject.options.length > 0) {
        removeNoteSubject.remove(0);
      }
      // Add default option
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'Select a subject';
      removeNoteSubject.appendChild(defaultOption);
      
      // Add subjects
      state.subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.id;
        option.textContent = subject.name;
        removeNoteSubject.appendChild(option);
      });
    }
    
    updateStatsCounters();
  } catch (error) {
    console.error('Error loading subjects:', error);
    toast('Failed to load subjects', 'error');
  }
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

  try {
    // Update active semester display
    if (activeSemesterEl) {
      if (state.selectedSemester) {
        const semesters = await fetchSemesters();
        const activeSemester = semesters.find(s => s.id == state.selectedSemester);
        activeSemesterEl.textContent = activeSemester ? activeSemester.name : 'N/A';
      } else {
        activeSemesterEl.textContent = 'Select a semester';
      }
    }
    
    // Update total subjects for the selected semester
    if (totalSubjectsEl) {
      if (state.selectedSemester) {
        const subjects = await fetchSubjects(state.selectedSemester);
        totalSubjectsEl.textContent = subjects.length;
      } else {
        totalSubjectsEl.textContent = '-';
      }
    }
    
    // Update total notes for the selected semester
    if (totalNotesEl) {
      if (state.selectedSemester) {
        try {
          const notesCount = await fetchNotesCount(state.selectedSemester);
          totalNotesEl.textContent = notesCount !== undefined ? notesCount : 0;
        } catch (error) {
          console.error('Error updating notes count:', error);
          totalNotesEl.textContent = '0';
        }
      } else {
        totalNotesEl.textContent = '-';
      }
    }
  } catch (error) {
    console.error('Error in updateStatsCounters:', error);
    if (totalSubjectsEl) totalSubjectsEl.textContent = '-';
    if (totalNotesEl) totalNotesEl.textContent = '-';
    if (activeSemesterEl) activeSemesterEl.textContent = 'Error';
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
    toast("Something went wrong trying to add a subject", "error");
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
// Set up event listener for subject dropdown in remove notes section
const removeNoteSubjectEl = document.getElementById('removeNoteSubject');
if (removeNoteSubjectEl && !removeNoteSubjectEl.hasAttribute('data-event-bound')) {
  removeNoteSubjectEl.setAttribute('data-event-bound', 'true');
  removeNoteSubjectEl.addEventListener('change', function() {
    const subjectId = this.value;
    if (subjectId) {
      fillNotesForSubject(subjectId);
    } else {
      // Clear the notes table if no subject is selected
      const notesTableBody = document.getElementById('notesTableBody');
      const notesListContainer = document.getElementById('notesListContainer');
      const noNotesMessage = document.getElementById('noNotesMessage');
      
      if (notesTableBody && notesListContainer && noNotesMessage) {
        notesTableBody.innerHTML = '';
        notesListContainer.classList.add('hidden');
        noNotesMessage.classList.add('hidden');
      }
    }
  });
}

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
    // Show loading state
    document.body.classList.add('loading');
    
    // Get initial auth token
    try {
      await fetchAuthToken();
    } catch (error) {
      // If we can't get a token, we'll still try to load data
      // as some endpoints might be publicly accessible
      console.warn('Proceeding without authentication - some features may be limited');
    }
    
    // Load initial data
    try {
      await loadInitialData();
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast('Some data could not be loaded. Please try refreshing the page.', 'error');
    }
    
    // Set up periodic token refresh (every 4 minutes)
    setInterval(() => {
      fetchAuthToken().catch(err => {
        console.warn('Token refresh failed:', err);
      });
    }, 4 * 60 * 1000);
    
  } catch (error) {
    console.error('Failed to initialize app:', error);
    toast('Failed to initialize application. Please refresh the page.', 'error');
  } finally {
    // Remove loading state
    document.body.classList.remove('loading');
  }
}

// --- Event Listeners for Modals ---
document.addEventListener('DOMContentLoaded', function() {
  // Close edit modal when clicking the close button or outside the modal
  document.getElementById('closeEditModal').addEventListener('click', closeEditModal);
  document.getElementById('editNoteModal').addEventListener('click', function(e) {
    if (e.target === this) closeEditModal();
  });
  
  // Close delete modal when clicking the cancel button or outside the modal
  document.getElementById('cancelDeleteNote').addEventListener('click', closeDeleteModal);
  document.getElementById('deleteConfirmModal').addEventListener('click', function(e) {
    if (e.target === this) closeDeleteModal();
  });
  
  // Save note changes when clicking the save button
  document.getElementById('saveNoteChanges').addEventListener('click', saveNoteChanges);
  
  // Delete note when confirming deletion
  document.getElementById('confirmDeleteNote').addEventListener('click', deleteNote);
  
  // Close modals with Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeEditModal();
      closeDeleteModal();
    }
  });
  
  // Handle subject change in the remove notes section
  const removeNoteSubject = document.getElementById('removeNoteSubject');
  if (removeNoteSubject) {
    removeNoteSubject.addEventListener('change', function() {
      const subjectId = this.value;
      if (subjectId) {
        fillNotesForSubject(subjectId);
      } else {
        document.getElementById('notesListContainer').classList.add('hidden');
        document.getElementById('noNotesMessage').classList.add('hidden');
      }
    });
  }
});

// Initialize the application
initializeApp();
