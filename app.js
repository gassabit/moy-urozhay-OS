import {initial,crops,valid,estimate,plan,addPlanTask} from './model.mjs';
const by=id=>document.getElementById(id), key='moy-urozhay:season2027:v1';let state=initial(),locked=false;
function notice(msg){by('notice').textContent=msg}
try{const raw=localStorage.getItem(key);if(raw!==null){const saved=JSON.parse(raw);if(!valid(saved))throw Error();state=saved}}catch{locked=true;notice('Хранилище недоступно или запись повреждена. Изменения действуют до закрытия страницы.')}
function save(next){if(!valid(next)){notice('Проверьте заполненные поля.');return false}state=next;try{if(locked)throw Error();localStorage.setItem(key,JSON.stringify(state));notice('Сохранено на этом устройстве.')}catch{notice('Изменения действуют только в открытой странице.')}render();return true}
const form=by('profile'),task=by('newtask');
const el=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node};
const fmt=d=>new Intl.DateTimeFormat('ru',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));
function render(){for(const k of ['region','width','length','date'])form.elements.namedItem(k).value=state[k];
by('summary').textContent=state.region+' · '+state.width+' × '+state.length+' м';
const map=by('map');map.replaceChildren();state.beds.forEach((crop,i)=>{const label=el('label','Грядка '+(i+1)),select=el('select');crops.forEach((name,j)=>select.add(new Option(name,j)));select.value=crop;select.onchange=()=>{const beds=state.beds.slice();beds[i]=Number(select.value);save({...state,beds});map.querySelectorAll('select')[i].focus()};label.append(select);map.append(label)});
by('estimate').textContent='Приблизительная вместимость выбранных грядок — '+estimate(state)+' растений. Условно 70% площади под посадки, 2 растения/м² для томатов и огурцов, 3 для перцев. Уточните расстояния по сорту.';
const timeline = by('timeline');
const stages = plan(state);
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
for (const [due, title] of stages) {
  const cultures = [...new Set(state.beds.filter(Boolean).map(crop => crops[crop]))];
  const detail = due === state.date && cultures.length ? ' · ' + cultures.join(', ') : '';
  const row = el('li', fmt(due) + ' — ' + title + detail);
  const tasks = addPlanTask(state.tasks, due, title);
  if (tasks === state.tasks) {
    row.append(el('small', ' · В списке задач'));
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
const list=by('list');list.replaceChildren();if(!state.tasks.length)list.append(el('li','Пока задач нет.'));state.tasks.forEach((t,i)=>{const li=el('li'),label=el('label'),box=el('input');box.type='checkbox';box.checked=t.done;box.onchange=()=>{save({...state,tasks:state.tasks.map((item,j)=>i===j?{...item,done:box.checked}:item)});list.querySelectorAll('input')[i].focus()};label.append(box,el('span',t.title+' · '+fmt(t.due)));li.append(label);list.append(li)})}
form.onsubmit=e=>{e.preventDefault();const f=form.elements;save({...state,region:f.region.value.trim(),width:Number(f.width.value),length:Number(f.namedItem('length').value),date:f.date.value})};
task.onsubmit=e=>{e.preventDefault();const f=task.elements;if(save({...state,tasks:[...state.tasks,{title:f.title.value.trim(),due:f.due.value,done:false}]}))task.reset()};
by('print').onclick=by('sheet').onclick=()=>window.print();render();if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>notice('Офлайн-режим недоступен.'));
