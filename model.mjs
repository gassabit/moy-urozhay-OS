export const crops=['Свободна','Томаты','Огурцы','Перцы'];
export function seasonCalendar(state, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Moy Urozhay OS//Season 2027//RU', 'CALSCALE:GREGORIAN'];
  for (const [index, [date, title]] of plan(state).entries()) {
    const day = date.replaceAll('-', '');
    lines.push('BEGIN:VEVENT', 'UID:season2027-' + day + '-' + index + '@moy-urozhay-os',
      'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + day,
      'SUMMARY:' + title, 'DESCRIPTION:Ориентировочная дата', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  const encoder = new TextEncoder();
  return lines.map(line => {
    let folded = '';
    let bytes = 0;
    for (const character of line) {
      const size = encoder.encode(character).length;
      if (bytes + size > 75) {
        folded += '\r\n ';
        bytes = 1;
      }
      folded += character;
      bytes += size;
    }
    return folded;
  }).join('\r\n') + '\r\n';
}
export function addPlanTask(tasks, due, title) {
  if (tasks.some(task => task.due === due && task.title === title)) return tasks;
  return [...tasks, {title, due, done: false}];
}
export const initial=()=>({region:'Мой участок',width:3,length:6,date:'2027-05-25',beds:[1,2,0],tasks:[]});
export function valid(s){return !!s && typeof s.region==='string' && s.region.trim().length>0 && s.region.length<=80 && Number.isFinite(s.width)&&s.width>=1&&s.width<=50&&Number.isFinite(s.length)&&s.length>=1&&s.length<=100&&/^2027-\d{2}-\d{2}$/.test(s.date)&&isoDate(s.date)&&Array.isArray(s.beds)&&s.beds.length===3&&s.beds.every(x=>Number.isInteger(x)&&x>=0&&x<crops.length)&&Array.isArray(s.tasks)&&s.tasks.every(t=>t&&typeof t.title==='string'&&t.title.trim()&&t.title.length<=120&&isoDate(t.due)&&typeof t.done==='boolean')}
function isoDate(d){if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;const dt=new Date(d+'T12:00:00Z');return Number.isFinite(+dt)&&dt.toISOString().slice(0,10)===d}
export function bedEstimates(s) {
  const plantedArea = s.width * s.length * 0.7 / s.beds.length;
  const density = [0, 2, 2, 3];
  return s.beds.map(crop => Math.floor(plantedArea * density[crop]));
}
export function estimate(s) {
  return bedEstimates(s).reduce((total, count) => total + count, 0);
}
export function plan(s){const stages=[[-14,'Подготовить теплицу'],[0,'Проверить условия для высадки'],[7,'Проверить приживаемость']];return stages.map(([offset,title])=>{const d=new Date(s.date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return [d.toISOString().slice(0,10),title]})}
