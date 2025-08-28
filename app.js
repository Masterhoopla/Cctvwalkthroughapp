// Data model
let state = {
  customer: { name: '', address: '', notes: '' },
  galleries: [] // { name, actions:{add,replace,relocate,remove}, note:'', photos:[] }
};

// DOM refs
const el = (id) => document.getElementById(id);
const galleriesEl = el('galleries');

// Init
load();
render();

// Event bindings
el('btnAddGallery').addEventListener('click', () => {
  const name = prompt('Enter gallery name:');
  if (!name) return;
  state.galleries.push({
    name,
    actions: { add:false, replace:false, relocate:false, remove:false },
    note: '',
    photos: []
  });
  save(); render();
});

el('btnExport').addEventListener('click', generatePDF);
el('btnSave').addEventListener('click', () => { collectHeader(); save(); alert('Saved'); });
el('btnReset').addEventListener('click', () => {
  if (confirm('Clear all data?')) { state = { customer:{name:'',address:'',notes:''}, galleries:[] }; save(); render(); }
});

// Helpers
function collectHeader(){
  state.customer.name = el('customerName').value.trim();
  state.customer.address = el('customerAddress').value.trim();
  state.customer.notes = el('customerNotes').value.trim();
}

function render(){
  // header
  el('customerName').value = state.customer.name || '';
  el('customerAddress').value = state.customer.address || '';
  el('customerNotes').value = state.customer.notes || '';

  // galleries
  galleriesEl.innerHTML = '';
  state.galleries.forEach((g, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'gallery';
    wrap.innerHTML = `
      <div class="row space-between center">
        <h3>${escapeHtml(g.name)}</h3>
        <div class="controls">
          <button data-act="photo" data-i="${idx}">Add Photo</button>
          <button data-act="rename" data-i="${idx}">Rename</button>
          <button class="danger" data-act="delete" data-i="${idx}">Remove</button>
        </div>
      </div>

      <div class="checklist">
        <input type="checkbox" id="add-${idx}" ${g.actions.add?'checked':''} />
        <label for="add-${idx}">Add</label>

        <input type="checkbox" id="replace-${idx}" ${g.actions.replace?'checked':''} />
        <label for="replace-${idx}">Replace</label>

        <input type="checkbox" id="relocate-${idx}" ${g.actions.relocate?'checked':''} />
        <label for="relocate-${idx}">Relocate</label>

        <input type="checkbox" id="remove-${idx}" ${g.actions.remove?'checked':''} />
        <label for="remove-${idx}">Remove</label>
      </div>

      <div class="note">
        <label>Notes
          <textarea id="note-${idx}" placeholder="Notes for this gallery">${escapeHtml(g.note)}</textarea>
        </label>
        <small class="muted">Tip: use the checklist above to mark planned work.</small>
      </div>

      <div class="photos" id="photos-${idx}">
        ${g.photos.map(src => `<img src="${src}" alt="gallery photo">`).join('')}
      </div>
    `;
    // Bind dynamic controls
    wrap.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', () => {
        const k = cb.id.split('-')[0];
        g.actions[k] = cb.checked; save();
      });
    });
    wrap.querySelector('textarea').addEventListener('input', (e) => { g.note = e.target.value; save(); });

    wrap.querySelectorAll('button[data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        const act = btn.getAttribute('data-act');
        if (act === 'photo') addPhoto(idx);
        if (act === 'rename') {
          const newName = prompt('New gallery name:', g.name);
          if (newName) { g.name = newName; save(); render(); }
        }
        if (act === 'delete') {
          if (confirm('Delete this gallery?')) { state.galleries.splice(idx,1); save(); render(); }
        }
      });
    });

    galleriesEl.appendChild(wrap);
  });
}

function addPhoto(index){
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';
  input.onchange = e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.galleries[index].photos.push(reader.result);
      save(); render();
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

// Storage
function save(){ localStorage.setItem('cctv-checklist', JSON.stringify(state)); }
function load(){
  try{
    const raw = localStorage.getItem('cctv-checklist');
    if (raw) state = JSON.parse(raw);
  }catch(e){ console.warn('Failed to load state', e); }
}

// PDF
async function generatePDF(){
  collectHeader();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'pt', format:'a4' });
  let y = 40;

  doc.setFontSize(18);
  doc.text('CCTV Pre-Installation Report', 40, y); y += 24;
  doc.setFontSize(12);
  doc.text(`Customer: ${state.customer.name || ''}`, 40, y); y += 18;
  doc.text(`Address: ${state.customer.address || ''}`, 40, y); y += 18;
  if (state.customer.notes){ doc.text('Notes:', 40, y); y += 16; y = wrapText(doc, state.customer.notes, 40, y, 515); y += 8; }

  for (const g of state.galleries){
    if (y > 760) { doc.addPage(); y = 40; }
    doc.setFontSize(14);
    doc.text(`Gallery: ${g.name}`, 40, y); y += 18;

    const acts = Object.entries(g.actions).filter(([k,v])=>v).map(([k])=>k.charAt(0).toUpperCase()+k.slice(1));
    if (acts.length){
      doc.setFontSize(12);
      doc.text(`Actions: ${acts.join(', ')}`, 40, y); y += 16;
    }
    if (g.note){
      doc.setFontSize(12);
      y = wrapText(doc, `Notes: ${g.note}`, 40, y, 515); y += 8;
    }

    for (const src of g.photos){
      if (y > 680) { doc.addPage(); y = 40; }
      try { doc.addImage(src, 'JPEG', 40, y, 200, 150); } catch {}
      y += 160;
    }
    y += 6;
  }

  doc.save('CCTV-Checklist.pdf');
}

// text wrap helper
function wrapText(doc, text, x, y, maxWidth){
  const lines = doc.splitTextToSize(text, maxWidth);
  for (const line of lines){ doc.text(line, x, y); y += 14; }
  return y;
}

function escapeHtml(s=''){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
