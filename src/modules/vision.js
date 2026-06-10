// src/modules/vision.js
// Phase 4-C: toggleVisionEdit / initVisionUI / saveVision / updateVisionDisplay を移植

export function toggleVisionEdit() {
  var edit = document.getElementById('vision-edit');
  if (!edit) return;
  edit.style.display = edit.style.display === 'none' ? 'block' : 'none';
}

export function initVisionUI() {
  var container = document.getElementById('vision-presets');
  if (!container) return;
  var s = window.getState ? window.getState() : (window.state || {});
  var VISION_PRESETS = window.VISION_PRESETS || [];
  container.innerHTML = '';
  VISION_PRESETS.forEach(function(text) {
    var btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = 'padding:6px 12px;border:1px solid #e8e0d8;border-radius:16px;background:var(--white);font-size:11px;font-family:Noto Sans JP,sans-serif;color:var(--ink);cursor:pointer;';
    if (s.myVision === text) {
      btn.style.background    = 'var(--rose)';
      btn.style.color         = 'white';
      btn.style.borderColor   = 'var(--rose)';
    }
    btn.onclick = function() {
      document.getElementById('vision-input').value = text;
      container.querySelectorAll('button').forEach(function(b) {
        b.style.background = 'var(--white)'; b.style.color = 'var(--ink)'; b.style.borderColor = '#e8e0d8';
      });
      btn.style.background = 'var(--rose)';
      btn.style.color = 'white';
      btn.style.borderColor = 'var(--rose)';
    };
    container.appendChild(btn);
  });
  var input = document.getElementById('vision-input');
  if (input && s.myVision) input.value = s.myVision;
  updateVisionDisplay();
}

export function saveVision() {
  var input = document.getElementById('vision-input');
  if (!input) return;
  var val = input.value.trim();
  var s = window.getState ? window.getState() : (window.state || {});
  if (window.setState) {
    window.setState(Object.assign({}, s, { myVision: val }));
  } else {
    s.myVision = val;
  }
  if (typeof window.saveState === 'function') window.saveState();
  updateVisionDisplay();
  var edit = document.getElementById('vision-edit');
  if (edit) edit.style.display = 'none';
}

export function updateVisionDisplay() {
  var el = document.getElementById('vision-display-text');
  if (!el) return;
  var s = window.getState ? window.getState() : (window.state || {});
  el.textContent = s.myVision || 'タップして設定';
}

window.toggleVisionEdit   = toggleVisionEdit;
window.initVisionUI       = initVisionUI;
window.saveVision         = saveVision;
window.updateVisionDisplay = updateVisionDisplay;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('vision-module-loaded');
}

export {};
