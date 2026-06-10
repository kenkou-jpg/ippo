// src/modules/meal-tracker.js
// Phase 4-C: openMealTimePicker / addMealTime を app-legacy.js から移植

export function openMealTimePicker() {
  var picker = document.getElementById('meal-time-picker');
  var input  = document.getElementById('meal-time-input');
  var now = new Date();
  var hh = String(now.getHours()).padStart(2, '0');
  var mm = String(now.getMinutes()).padStart(2, '0');
  if (input)  input.value = hh + ':' + mm;
  if (picker) picker.style.display = 'block';
}

export function addMealTime() {
  var ta    = document.getElementById('rs-meal-free');
  var input = document.getElementById('meal-time-input');
  if (!ta || !input) return;
  var time    = input.value.replace(':', '');
  var current = ta.value.trim();
  ta.value = current ? current + '\n' + time + ' ' : time + ' ';
  var lines = ta.value.trim().split('\n').filter(function(l) { return l.trim(); });
  lines.sort();
  ta.value = lines.join('\n');
  ta.focus();
  ta.selectionStart = ta.selectionEnd = ta.value.length;
  if (typeof window.closeMealTimePicker === 'function') window.closeMealTimePicker();
  if (typeof window.updateMealParse === 'function') window.updateMealParse();
}

window.openMealTimePicker = openMealTimePicker;
window.addMealTime        = addMealTime;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('meal-tracker-loaded');
}

export {};
