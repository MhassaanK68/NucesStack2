// API client will be available globally through window.apiClient
// Make toast function globally available for API client
window.showToast = toast;

let state = {
    semesters: [],
    subjects: [],
    selectedSemester: null,
};

// --- DOM refs ---
const semesterSelect = document.getElementById("semesterSelect");
const noteSubject = document.getElementById("noteSubject");
const uploadForm = document.getElementById("upload-your-notes-form");
const noteTitle = document.getElementById("noteTitle");
const noteDescription = document.getElementById("noteDescription");
const fileInput = document.getElementById("dropzone-file");
const uploadContent = document.getElementById("upload-content");
const fileSelected = document.getElementById("file-selected");
const fileNameSpan = document.getElementById("file-name");

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

async function loadInitialData() {
    state.semesters = await fetchSemesters();
    fillSemesterSelect();
    if (state.selectedSemester) {
        await loadSubjectsForSemester();
    }
}

async function loadSubjectsForSemester() {
    if (!state.selectedSemester) {
        noteSubject.innerHTML = '<option value="">Select semester first</option>';
        return;
    }
    
    try {
        const subjects = await fetchSubjects(state.selectedSemester);
        if (subjects && subjects.length > 0) {
            state.subjects = subjects;
            fillSubjectSelect(noteSubject);
        } else {
            noteSubject.innerHTML = '<option value="">No subjects found</option>';
        }
    } catch (error) {
        console.error('Error in loadSubjectsForSemester:', error);
        noteSubject.innerHTML = '<option value="">Error loading subjects</option>';
        throw error;
    }
}

// --- Event handlers ---
async function handleSemesterChange() {
    const semesterId = semesterSelect.value;
    state.selectedSemester = semesterId;
    
    // Clear subjects when semester changes
    state.subjects = [];
    noteSubject.innerHTML = '<option value="">Loading subjects...</option>';
    
    if (semesterId) {
        try {
            await loadSubjectsForSemester();
        } catch (error) {
            console.error('Error loading subjects:', error);
            noteSubject.innerHTML = '<option value="">Error loading subjects</option>';
        }
    } else {
        fillSubjectSelect(noteSubject);
    }
}

// Add event listener for semester change
semesterSelect.addEventListener("change", handleSemesterChange);

// --- Initialize ---
// Wait for the API client to be available
function initializeApp() {
    if (window.apiClient) {
        // Initialize with empty semester select
        fillSemesterSelect();
        
        // Load semesters
        loadInitialData().catch(error => {
            console.error('Error in loadInitialData:', error);
            toast('Failed to load initial data. Please refresh the page.', 'error');
        });
    } else {
        // Try again after a short delay if apiClient isn't loaded yet
        setTimeout(initializeApp, 100);
    }
}

// Start the app
initializeApp();

// --- API functions for notes ---
async function fetchSemesters() {
    try {
        // Use the global apiClient instance
        state.semesters = await window.apiClient.get("/api/semesters");
        fillSemesterSelect();
        return state.semesters;
    } catch (error) {
        console.error("Error fetching semesters:", error);
        toast("Failed to load semesters. Please try again.", "error");
        return [];
    }
}

async function fetchSubjects(semesterId = null) {
    if (!semesterId) return [];
    try {
        // Use the global apiClient instance
        state.subjects = await window.apiClient.get(`/api/subjects?semester=${semesterId}`);
        fillSubjectSelect(noteSubject);
        return state.subjects;
    } catch (error) {
        console.error("Error fetching subjects:", error);
        toast("Failed to load subjects. Please try again.", "error");
        return [];
    }
}

async function fetchNotesForSubject(subjectId) {
    if (!subjectId) return [];
    try {
        return await apiClient.get(`/api/notes?subject=${subjectId}`);
    } catch (error) {
        console.error("Error fetching notes:", error);
        toast("Failed to load notes. Please try again.", "error");
        return [];
    }
}

async function addNote(title, subjectId, description, pdfId) {
    try {
        return await apiClient.post("/api/notes", {
            title,
            subjectId,
            description,
            pdfId
        });
    } catch (error) {
        console.error("Error adding note:", error);
        throw error;
    }
}

async function deleteNote(id) {
    try {
        await apiClient.delete(`/api/notes/${id}`);
        return true;
    } catch (error) {
        console.error("Error deleting note:", error);
        throw error;
    }
}

// --- Helpers ---
// Displays a temporary toast message to the user for feedback.
// Usage: toast("Your message here");
// Show/hide controller (no custom CSS needed)
function toast(message, type = "success", timeout = 6000) {
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



// Sets a button to a loading state by toggling visibility of spinner and text.
// Expects the button to contain elements with classes 'loading-spinner' and 'btn-text'.
// Example button HTML:
// <button id="addNoteBtn">
//   <span class="loading-spinner" style="display:none"></span>
//   <span class="btn-text">Add Note</span>
// </button>
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

// Initialize file upload UI
if (fileInput && fileNameSpan && uploadContent && fileSelected) {
    fileInput.addEventListener("change", () => {
        if (fileInput.files.length > 0) {
            const fileName = fileInput.files[0].name;
            fileNameSpan.textContent = fileName;
            uploadContent.classList.add("hidden");
            fileSelected.classList.remove("hidden");
        } else {
            uploadContent.classList.remove("hidden");
            fileSelected.classList.add("hidden");
        }
    });
}

const lockedBtns = document.querySelectorAll(".locked-for-contributors");
lockedBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        toast("This Tab is Locked for Contributors", "error");
    });
});



// --- Fill notes dropdown ---
async function fillNotesForSubject(subjectId, el) {
    el.innerHTML = "";
    if (!subjectId) {
        el.innerHTML = '<option value="">Select subject first</option>';
        return;
    }

    const notes = await fetchNotesForSubject(subjectId);
    el.innerHTML = '<option value="">Select Note</option>';
    notes.forEach((n) => {
        const opt = document.createElement("option");
        opt.value = n.id;
        opt.textContent = n.title;
        el.appendChild(opt);
    });
}

// Handle form submission
if (uploadForm) {
    uploadForm.addEventListener("submit", async function(e) {
        e.preventDefault();
        
        const title = noteTitle?.value?.trim() || '';
        const subjectId = noteSubject?.value;
        const semesterId = semesterSelect?.value;
        const description = noteDescription?.value?.trim() || '';
        
        // Basic validation
        if (!title || !subjectId || !semesterId || !fileInput?.files?.[0]) {
            toast("Please fill in all required fields and select a file", "error");
            return;
        }
        
        const formData = new FormData();
        formData.append('title', title);
        formData.append('semester', semesterId);
        formData.append('subject', subjectId);
        formData.append('description', description);
        formData.append('file', fileInput.files[0]);
        
        try {
            // Show loading state
            setButtonLoading("addNoteBtn", true);
            
            // Make the API request
            const response = await fetch('/contribute/upload-your-notes', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.apiClient?.token || ''}`
                },
                body: formData
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to upload note');
            }
            
            // Show success message
            toast(result.message || "Note uploaded successfully!", "success");
            
            // Reset form
            uploadForm.reset();
            if (uploadContent) uploadContent.classList.remove("hidden");
            if (fileSelected) fileSelected.classList.add("hidden");
            
            // Stay on the same page after successful upload
            
        } catch (error) {
            console.error("Error submitting form:", error);
            toast(error.message || "Failed to upload note. Please try again.", "error");
        } finally {
            // Reset loading state
            setButtonLoading("addNoteBtn", false);
        }
    });
}
