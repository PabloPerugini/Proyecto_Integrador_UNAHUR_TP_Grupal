const btn = document.getElementById('themeBtn');
const root = document.documentElement;
let saved = null;
try { saved = localStorage.getItem('gradify-proposal-theme'); } catch {}
if (saved) root.dataset.theme = saved;
function sync() {
  btn.textContent = root.dataset.theme === 'dark' ? '◑ Modo claro' : '◐ Modo oscuro';
}
btn.addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('gradify-proposal-theme', root.dataset.theme); } catch {}
  sync();
});
sync();
