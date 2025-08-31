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

// --- API functions ---
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

async function addSubject(name, semesterId) {
  try {
    const response = await fetch("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, semester_id: semesterId }),
    });
    return await response.json();
  } catch (error) {
    console.error("Error adding subject:", error);
    throw error;
  }
}

async function deleteSubject(id) {
  try {
    const response = await fetch(`/api/subjects/${id}`, {
      method: "DELETE",
    });
    return await response.json();
  } catch (error) {
    console.error("Error deleting subject:", error);
    throw error;
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
        semester_id: state.selectedSemester,
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

function toast(msg) {
  const t = document.getElementById("toast");
  t.querySelector("div").textContent = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 1600);
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
      try {
        await deleteSubject(id);
        await loadSubjectsForSemester();
        toast("Subject removed");
      } catch (error) {
        toast("Failed to remove subject");
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
  if (!name) return toast("Enter a subject name");
  if (!state.selectedSemester) return toast("Select a semester first");

  setButtonLoading("addSubjectBtn", true);
  try {
    await addSubject(name, state.selectedSemester);
    subjectName.value = "";
    await loadSubjectsForSemester();
    toast("Subject added");
  } catch (error) {
    toast("Failed to add subject");
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

  if (!sid) return toast("Select a subject");
  if (!title) return toast("Enter a note title");

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
    toast("Note added");
  } catch (error) {
    toast("Failed to add note");
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
    toast("Note removed");
  } catch (error) {
    toast("Failed to remove note");
  } finally {
    setButtonLoading("removeNoteBtn", false);
  }
});

// init
loadInitialData();
