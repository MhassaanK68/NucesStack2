// Make toast function globally available
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

semesterSelect.addEventListener("change", handleSemesterChange);

// --- Initialize ---
function initializeApp() {
    fillSemesterSelect();
    loadInitialData().catch(error => {
        console.error('Error in loadInitialData:', error);
        toast('Failed to load initial data. Please refresh the page.', 'error');
    });
}

initializeApp();

// --- API functions (no JWT, plain fetch) ---
async function fetchSemesters() {
    try {
        const res = await fetch("/api/semesters");
        if (!res.ok) throw new Error("Failed to fetch semesters");
        const data = await res.json();
        state.semesters = data;
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
        const res = await fetch(`/api/subjects?semester=${semesterId}`);
        if (!res.ok) throw new Error("Failed to fetch subjects");
        const data = await res.json();
        state.subjects = data;
        fillSubjectSelect(noteSubject);
        return state.subjects;
    } catch (error) {
        console.error("Error fetching subjects:", error);
        toast("Failed to load subjects. Please try again.", "error");
        return [];
    }
}

// --- Helpers ---
function toast(message, type = "success", timeout = 6000) {
  const wrapper = document.getElementById("toast");
  const panel = document.getElementById("toast-panel");
  const icon = document.getElementById("toast-icon");
  const msg = document.getElementById("toast-message");

  msg.textContent = message;
  icon.classList.remove("text-green-400", "text-red-400");
  icon.classList.add(type === "error" ? "text-red-400" : "text-green-400");

  wrapper.classList.remove("hidden");
  requestAnimationFrame(() => {
    panel.classList.remove("translate-y-6", "sm:-translate-y-6", "opacity-0");
  });

  clearTimeout(panel._hideTimer);
  panel._hideTimer = setTimeout(() => {
    panel.classList.add("opacity-0", "translate-y-6", "sm:-translate-y-6");
    setTimeout(() => wrapper.classList.add("hidden"), 300);
  }, timeout);
}

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
            setButtonLoading("addNoteBtn", true);
            
            const response = await fetch('/contribute/upload-your-notes', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to upload note');
            }
            
            toast(result.message || "Note uploaded successfully!", "success");
            
            uploadForm.reset();
            if (uploadContent) uploadContent.classList.remove("hidden");
            if (fileSelected) fileSelected.classList.add("hidden");
            
        } catch (error) {
            console.error("Error submitting form:", error);
            toast(error.message || "Failed to upload note. Please try again.", "error");
        } finally {
            setButtonLoading("addNoteBtn", false);
        }
    });
}
