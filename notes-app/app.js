// ====== localStorage helpers ======
const STORAGE_KEY = 'notes_app_v1';
const loadNotes = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
const saveNotes = (data) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

let notes = loadNotes();
let currentId = null;

const els = {
  search: document.getElementById('search'),
  newNote: document.getElementById('newNote'),
  deleteNote: document.getElementById('deleteNote'),
  togglePreview: document.getElementById('togglePreview'),
  notesList: document.getElementById('notesList'),
  title: document.getElementById('title'),
  content: document.getElementById('content'),
  preview: document.getElementById('preview')
};

// ====== Minimal Markdown (regex-based, basic features) ======
function escapeHtml(str){
  return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function mdToHtml(md){
  let html = escapeHtml(md);
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code}</code></pre>`);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  html = html.replace(/^(?:-|\*) (.*)(\n(?!\n)(?:-|\*) .*)*/gm, (block) => {
    const items = block.split('\n').map(line => line.replace(/^(?:-|\*) /,'').trim());
    return `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
  });
  html = html.replace(/(^|\n)([^<\n][^\n]*)/g, (m, nl, line) => {
    if (/^\s*$/.test(line) || /<(h\d|ul|pre|code)/.test(line)) return m;
    return `${nl}<p>${line}</p>`;
  });
  return html;
}

function renderPreview(){
  const html = mdToHtml(els.content.value);
  els.preview.innerHTML = html || '<em>Không có nội dung…</em>';
}

// ====== CRUD ======
function renderList(filter=''){
  const q = filter.trim().toLowerCase();
  els.notesList.innerHTML = '';
  const sorted = [...notes].sort((a,b)=>b.updatedAt - a.updatedAt);
  sorted
    .filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
    .forEach(n => {
      const li = document.createElement('li');
      li.dataset.id = n.id;
      li.className = (n.id===currentId?'active':'');
      const dt = new Date(n.updatedAt).toLocaleString();
      li.innerHTML = `<strong>${n.title || '(Không tiêu đề)'}</strong><small>${dt}</small>`;
      li.onclick = () => openNote(n.id);
      els.notesList.appendChild(li);
    });
}

function openNote(id){
  currentId = id;
  const n = notes.find(x=>x.id===id);
  if (!n) return;
  els.title.value = n.title;
  els.content.value = n.content;
  renderPreview();
  renderList(els.search.value);
}

function newNote(){
  const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  const note = { id, title:'Ghi chú mới', content:'', updatedAt:Date.now() };
  notes.unshift(note);
  saveNotes(notes);
  openNote(id);
}

function deleteCurrent(){
  if (!currentId) return;
  if (!confirm('Xóa ghi chú hiện tại?')) return;
  notes = notes.filter(n=>n.id!==currentId);
  saveNotes(notes);
  currentId = notes[0]?.id || null;
  if (currentId) openNote(currentId);
  renderList(els.search.value);
  if (!currentId){
    els.title.value=''; els.content.value=''; renderPreview();
  }
}

function saveCurrent(){
  if (!currentId) return;
  const n = notes.find(x=>x.id===currentId);
  if (!n) return;
  n.title = els.title.value.trim();
  n.content = els.content.value;
  n.updatedAt = Date.now();
  saveNotes(notes);
  renderList(els.search.value);
}

// ====== Events ======
els.newNote.onclick = newNote;
els.deleteNote.onclick = deleteCurrent;
els.togglePreview.onclick = ()=> {
  els.preview.classList.toggle('hidden');
  renderPreview();
};

// ====== TỰ ĐỘNG LƯU ======
let t1, t2;
els.title.addEventListener('input', () => {
  clearTimeout(t1);
  t1 = setTimeout(saveCurrent, 300);
});

els.content.addEventListener('input', () => {
  clearTimeout(t2);
  t2 = setTimeout(() => {
    saveCurrent();
    renderPreview();
  }, 300);
});

els.search.addEventListener('input', ()=> renderList(els.search.value));

// ====== init ======
if (notes.length === 0){
  notes = []; // không tạo ghi chú mặc định
  saveNotes(notes);
}

currentId = notes[0]?.id || null;
if (currentId) openNote(currentId);
renderList();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')  // Đảm bảo đường dẫn chính xác
      .then(registration => {
        console.log('Service Worker registered with scope: ', registration.scope);
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  });
}


