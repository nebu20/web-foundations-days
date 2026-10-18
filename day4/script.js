// Select the required HTML elements
const noteText = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");

// Update character and word counters
function updateCounts() {
  const text = noteText.value;
  const characterLength = text.length;

  // Count words, ignoring extra whitespace
  const trimmedText = text.trim();
  const words = trimmedText === "" ? [] : trimmedText.split(/\s+/);

  charCount.textContent = `${characterLength} / 200 characters`;
  wordCount.textContent = `${words.length} words`;

  // Update character counter warning classes
  charCount.classList.remove("warning", "over");

  if (characterLength > 200) {
    charCount.classList.add("over");
  } else if (characterLength > 180) {
    charCount.classList.add("warning");
  }
}

// Save the current note as a draft
function saveDraft() {
  localStorage.setItem("notesDraft", noteText.value);
}

// Clear the note, counters, and saved draft
function clearNote() {
  noteText.value = "";
  localStorage.removeItem("notesDraft");
  updateCounts();
}

// Toggle between light and dark themes
function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");

  localStorage.setItem("notesTheme", isDark ? "dark" : "light");
  themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
}

// Restore saved draft and theme when the page loads
const savedDraft = localStorage.getItem("notesDraft");

if (savedDraft !== null) {
  noteText.value = savedDraft;
}

const savedTheme = localStorage.getItem("notesTheme");

if (savedTheme === "dark") {
  document.body.classList.add("dark");
}

themeToggle.textContent = document.body.classList.contains("dark")
  ? "Light mode"
  : "Dark mode";

// Initialize counters and connect event listeners
updateCounts();

noteText.addEventListener("input", () => {
  updateCounts();
  saveDraft();
});

clearBtn.addEventListener("click", clearNote);

themeToggle.addEventListener("click", toggleTheme);

// Press Escape while focused on the textarea to clear the note
noteText.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    clearNote();
  }
});