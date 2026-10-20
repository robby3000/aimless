/**
 * Promise-based modal dialogs (confirm, text entry). Extracted from
 * index.html — self-contained: they look up their own DOM and wire their
 * own listeners at module load.
 */

// --- Confirm dialog ---
// Promise-based modal for destructive actions; resolves true/false.
const confirmOverlay = document.getElementById('confirm-overlay');
const confirmText = document.getElementById('confirm-text');
let confirmResolve = null;
export function askConfirm(message, confirmLabel = 'Delete') {
  return new Promise((resolve) => {
    confirmResolve = resolve;
    confirmText.textContent = message;
    const yes = document.getElementById('btn-confirm-yes');
    yes.textContent = confirmLabel;
    confirmOverlay.hidden = false;
    yes.focus();
  });
}
const settleConfirm = (answer) => {
  confirmOverlay.hidden = true;
  if (confirmResolve) { confirmResolve(answer); confirmResolve = null; }
};
document.getElementById('btn-confirm-yes').addEventListener('click', () => settleConfirm(true));
document.getElementById('btn-confirm-cancel').addEventListener('click', () => settleConfirm(false));
confirmOverlay.addEventListener('click', (e) => {
  if (e.target === confirmOverlay) settleConfirm(false);  // backdrop cancels
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !confirmOverlay.hidden) settleConfirm(false);
});

// Text-entry dialog — same overlay pattern as askConfirm. Used for the
// HTML artifact filename (extension '.html') and for filter names (no
// extension). Resolves the entered text, or null on cancel; Save stays
// disabled while the field is empty.
const filenameOverlay = document.getElementById('filename-overlay');
const filenameLabel = document.getElementById('filename-label');
const filenameInput = document.getElementById('filename-input');
const filenameSave = document.getElementById('btn-filename-save');
let filenameResolve = null;
let filenameOpts = {};
export function askText({ label = 'File name', defaultValue = '', extension = '' } = {}) {
  return new Promise((resolve) => {
    filenameResolve = resolve;
    filenameOpts = { extension };
    filenameLabel.textContent = label;
    filenameInput.value = defaultValue;
    filenameSave.disabled = !defaultValue.trim();
    filenameOverlay.hidden = false;
    filenameInput.focus();
    filenameInput.select();
  });
}
const settleFilename = (name) => {
  filenameOverlay.hidden = true;
  if (filenameResolve) { filenameResolve(name); filenameResolve = null; }
};
const confirmFilename = () => {
  const value = filenameInput.value.trim();
  if (!value) return;
  if (!filenameOpts.extension) return settleFilename(value);
  const clean = value.replace(/[\\/:*?"<>|]/g, '').replace(/\.[^.]+$/, '');
  settleFilename(clean ? `${clean}${filenameOpts.extension}` : null);
};
filenameInput.addEventListener('input', () => {
  filenameSave.disabled = !filenameInput.value.trim();
});
filenameSave.addEventListener('click', confirmFilename);
document.getElementById('btn-filename-cancel').addEventListener('click', () => settleFilename(null));
filenameOverlay.addEventListener('click', (e) => {
  if (e.target === filenameOverlay) settleFilename(null);  // backdrop cancels
});
filenameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') confirmFilename();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !filenameOverlay.hidden) settleFilename(null);
});
