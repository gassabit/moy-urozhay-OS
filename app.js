import {initial,crops,valid,estimate,bedEstimates,plan,addPlanTask,seasonCalendar} from './model.mjs';
const by=id=>document.getElementById(id), key='moy-urozhay:season2027:v1';let state=initial(),locked=false;
function notice(msg){by('notice').textContent=msg}
try{const raw=localStorage.getItem(key);if(raw!==null){const saved=JSON.parse(raw);if(!valid(saved))throw Error();state=saved}}catch{locked=true;notice('Хранилище недоступно или запись повреждена. Изменения действуют до закрытия страницы.')}
function save(next){if(!valid(next)){notice('Проверьте заполненные поля.');return false}state=next;try{if(locked)throw Error();localStorage.setItem(key,JSON.stringify(state));notice('Сохранено на этом устройстве.')}catch{notice('Изменения действуют только в открытой странице.')}render();return true}
const form=by('profile'),task=by('newtask');
let taskFilter = 'all';
let editingTask = null;
const el=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node};
const fmt=d=>new Intl.DateTimeFormat('ru',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));
function render(){for(const k of ['region','width','length','date'])form.elements.namedItem(k).value=state[k];
by('summary').textContent=state.region+' · '+state.width+' × '+state.length+' м';
by('overview').textContent = new Intl.NumberFormat('ru').format(state.width * state.length)
  + ' м² · ' + state.beds.filter(Boolean).length + ' из 3 грядок занято';
const counts = bedEstimates(state);
const map=by('map');map.replaceChildren();state.beds.forEach((crop,i)=>{const label=el('label','Грядка '+(i+1)),select=el('select');crops.forEach((name,j)=>select.add(new Option(name,j)));select.value=crop;select.onchange=()=>{const beds=state.beds.slice();beds[i]=Number(select.value);save({...state,beds});map.querySelectorAll('select')[i].focus()};label.append(select, el('small', crop ? '≈ ' + counts[i] + ' раст.' : 'Без посадок'));map.append(label)});
by('estimate').textContent='Приблизительная вместимость выбранных грядок — '+estimate(state)+' растений. Условно 70% площади под посадки, 2 растения/м² для томатов и огурцов, 3 для перцев. Число округляется вниз для каждой грядки. Уточните расстояния по сорту.';
const timeline = by('timeline');
const stages = plan(state);
const stageTasks = stages.map(([due, title]) =>
  state.tasks.find(item => item.due === due && item.title === title));
const nextStage = stages.findIndex((_, index) => !stageTasks[index]?.done);
by('next-stage').textContent = nextStage === -1
  ? 'Все работы плана выполнены'
  : 'Следующая работа · ' + fmt(stages[nextStage][0]) + ' · ' + stages[nextStage][1];
const bulkButton = by('add-plan');
const plannedTasks = stages.reduce((tasks, [due, title]) => addPlanTask(tasks, due, title), state.tasks);
bulkButton.disabled = plannedTasks === state.tasks;
bulkButton.textContent = bulkButton.disabled ? 'Весь план в задачах' : 'Добавить весь план в задачи';
bulkButton.onclick = () => {
  if (save({...state, tasks: plannedTasks})) {
    by('list').querySelector('li:last-child input')?.focus();
  }
};
timeline.replaceChildren();
for (const [index, [due, title]] of stages.entries()) {
  const cultures = [...new Set(state.beds.filter(Boolean).map(crop => crops[crop]))];
  const detail = due === state.date && cultures.length ? ' · ' + cultures.join(', ') : '';
  const row = el('li', fmt(due) + ' — ' + title + detail);
  const existing = stageTasks[index];
  if (existing) {
    row.append(el('small', existing.done ? ' · Выполнено' : ' · В списке задач'));
  } else {
    const button = el('button', 'В задачи');
    button.setAttribute('aria-label', 'Добавить задачу «' + title + '»');
    button.onclick = () => {
      if (save({...state, tasks: addPlanTask(state.tasks, due, title)})) {
        by('list').querySelector('li:last-child input')?.focus();
      }
    };
    row.append(' ', button);
  }
  timeline.append(row);
}
renderTasks();
}

function renderTasks() {
  const list = by('list');
  const completed = state.tasks.filter(item => item.done).length;
  by('task-progress').textContent = 'Выполнено ' + completed + ' из ' + state.tasks.length;
  list.replaceChildren();
  const ordered = state.tasks.map((item, index) => ({item, index}));
  ordered.sort((a, b) => Number(a.item.done) - Number(b.item.done) || a.item.due.localeCompare(b.item.due));
  for (const {item, index} of ordered) {
    if (taskFilter !== 'all' && item.done !== (taskFilter === 'done')) continue;
    const row = el('li');
    const label = el('label');
    const box = el('input');
    box.type = 'checkbox';
    box.checked = item.done;
    box.id = 'task-' + index;
    box.onchange = () => {
      const tasks = state.tasks.map((entry, position) => position === index ? {...entry, done: box.checked} : entry);
      if (save({...state, tasks})) (by(box.id) || by('task-filter')).focus();
    };
    label.append(box, el('span', item.title + ' · ' + fmt(item.due)));
    const edit = el('button', 'Изменить');
    edit.type = 'button';
    edit.setAttribute('aria-label', 'Изменить задачу «' + item.title + '»');
    edit.onclick = () => {
      editingTask = index;
      task.elements.title.value = item.title;
      task.elements.due.value = item.due;
      by('task-submit').textContent = 'Сохранить правки';
      by('task-cancel').hidden = false;
      task.elements.title.focus();
    };
    row.append(label, edit);
    list.append(row);
  }
  if (!list.childElementCount) list.append(el('li', 'В этом списке пока нет задач.'));
}

by('task-filter').onchange = event => {
  taskFilter = event.target.value;
  renderTasks();
};

function download(content, type, filename) {
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const link = el('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

by('backup-export').onclick = () => {
  download(JSON.stringify({version: 1, diary: state}, null, 2), 'application/json', 'moy-urozhay-2027.json');
};
by('calendar-export').onclick = () => {
  download(seasonCalendar(state), 'text/calendar;charset=utf-8', 'moy-urozhay-2027.ics');
};

by('backup-import').onchange = async event => {
  const input = event.currentTarget;
  const file = input.files[0];
  input.value = '';
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw Error();
    const backup = JSON.parse(await file.text());
    if (backup?.version !== 1 || !valid(backup.diary)) throw Error();
    if (window.confirm('Заменить текущий дневник данными из резервной копии?')) {
      if (save(backup.diary)) resetTaskForm();
    }
  } catch {
    notice('Не удалось прочитать резервную копию. Выберите файл дневника «Мой урожай OS» размером до 5 МБ.');
  }
};
form.onsubmit=e=>{e.preventDefault();const f=form.elements;save({...state,region:f.region.value.trim(),width:Number(f.width.value),length:Number(f.namedItem('length').value),date:f.date.value})};
function resetTaskForm() {
  editingTask = null;
  task.reset();
  by('task-submit').textContent = 'Добавить задачу';
  by('task-cancel').hidden = true;
}

by('task-cancel').onclick = resetTaskForm;
task.onsubmit = event => {
  event.preventDefault();
  const fields = task.elements;
  const title = fields.title.value.trim();
  const due = fields.due.value;
  const tasks = editingTask === null
    ? [...state.tasks, {title, due, done: false}]
    : state.tasks.map((item, index) => index === editingTask ? {...item, title, due} : item);
  if (save({...state, tasks})) resetTaskForm();
};
by('print').onclick=by('sheet').onclick=()=>window.print();render();if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>notice('Офлайн-режим недоступен.'));
