let state = {
    semesters: [],
    subjects: [],
    selectedSemester: null,
};

// --- DOM refs ---
const semesterSelect = document.getElementById("semesterSelect");
const noteSubject = document.getElementById("noteSubject");

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
    if (!state.selectedSemester) return;
    state.subjects = await fetchSubjects(state.selectedSemester);
    fillSubjectSelect(noteSubject);
}

// --- Event handlers ---
semesterSelect.addEventListener("change", async () => {
    state.selectedSemester = semesterSelect.value;
    if (state.selectedSemester) {
        await loadSubjectsForSemester();
    } else {
        state.subjects = [];
        fillSubjectSelect(noteSubject);
    }
});

// --- Initialize ---
loadInitialData();

// --- API functions for notes ---
async function fetchSemesters() {
    try {
        const response = await fetch("/api/semesters");
        return await response.json();
    } catch (error) {
        console.error("Error fetching semesters:", error);
        return [];
    }
}

async function fetchSubjects(semesterId = null) {
    try {
        const url = semesterId
            ? `/api/subjects?semester_id=${semesterId}`
            : "/api/subjects";
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error("Error fetching subjects:", error);
        return [];
    }
}

async function fetchNotesForSubject(subjectId) {
    try {
        const response = await fetch(`/api/subjects/${subjectId}/notes`);
        return await response.json();
    } catch (error) {
        console.error("Error fetching notes:", error);
        return [];
    }
}

async function addNote(title, subjectId, description, pdfId, videoId) {
    try {
        const response = await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title,
                subject_id: subjectId,
                description,
                pdf_id: pdfId,
                video_id: videoId,
            }),
        });
        return await response.json();
    } catch (error) {
        console.error("Error adding note:", error);
        throw error;
    }
}

async function deleteNote(id) {
    try {
        const response = await fetch(`/api/notes/${id}`, {
            method: "DELETE",
        });
        return await response.json();
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

// --- DOM refs ---
const noteTitle = document.getElementById("noteTitle");
const noteDescription = document.getElementById("noteDescription");
const notePdfId = document.getElementById("notePdfId");
const noteVideoId = document.getElementById("noteVideoId");
const addNoteBtn = document.getElementById("addNoteBtn");

const removeNoteBtn = document.getElementById("removeNoteBtn");

// --- Event handlers ---
addNoteBtn.addEventListener("click", async () => {
    const sid = noteSubject.value;
    const title = noteTitle.value.trim();
    const description = noteDescription.value.trim();
    const pdfId = notePdfId.value.trim();
    const videoId = noteVideoId.value.trim();

    if (!sid) return toast("Select a subject");
    if (!title) return toast("Enter a note title");

    setButtonLoading("addNoteBtn", true);
    try {
        await addNote(title, sid, description, pdfId, videoId);
        noteTitle.value = "";
        noteDescription.value = "";
        notePdfId.value = "";
        noteVideoId.value = "";
        toast("Note added");
    } catch (error) {
        toast("Failed to add note");
    } finally {
        setButtonLoading("addNoteBtn", false);
    }
});

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

document.getElementById("upload-your-notes-form").addEventListener("submit", function(e) {
    toast("Uploading... Please wait.");
});



