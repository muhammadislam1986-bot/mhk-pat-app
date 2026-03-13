const KEY='mhk_pat_final_v1';
const INTERNAL_BACKUP_KEY='mhk_pat_internal_backup_v1';
const BACKUP_META_KEY='mhk_pat_backup_meta_v1';
const APPLIANCES = [
 ['Kettle','KTL'],['Microwave','MCR'],['Toaster','TST'],['Air Fryer','AFR'],['Oven','OVN'],
 ['Fridge','FRG'],['Freezer','FRZ'],['TV','TV'],['Monitor','MON'],['Printer','PRN'],
 ['Desktop PC','DPC'],['Laptop Charger','LCH'],['Router','RTR'],['Extension Lead','EXT'],
 ['Lamp','LMP'],['Charger / PSU','CRG'],['Fan Heater','FHT'],['Vacuum Cleaner','VAC'],
 ['Iron','IRN'],['Hair Straightener','HST'],['Hand Dryer','HDR'],['Other','OTH']
];
const FUSES=['1A','3A','5A','7A','10A','13A','N/A','Other'];
const IRS=['>200 MΩ','>100 MΩ','>50 MΩ','>20 MΩ','>10 MΩ','>2 MΩ','N/A','Manual'];
const LOCATIONS=['Office','Reception','Kitchen','Staff Room','Meeting Room','Server Room','Warehouse','Workshop','Store','Hallway','Bedroom','Living Room','Utility Room','Classroom','Other'];
const defaults = {
  company:{name:'MHK Building Solutions Ltd',service:'Portable Appliance Testing (PAT)',phone:'07876786286',email:'mhkbuildingsolutions@gmail.com',address:'60 Little Horton Lane, Bradford BD5 0BS',logo:'',signature:'',pin:'',patTester:'Apollo 400+',testerSerial:'010182',calibrationDue:''},
  clients:[],jobs:[],activeJobId:null,lastLabelItemId:null,reportCounter:0
};
let state = JSON.parse(localStorage.getItem(KEY) || JSON.stringify(defaults));
function save(){localStorage.setItem(KEY, JSON.stringify(state)); const meta=getBackupMeta(); if(shouldRunInternalBackup(meta)) takeInternalBackup('scheduled');}
function $(id){return document.getElementById(id)}
function today(){return new Date().toISOString().slice(0,10)}
function esc(s){return String(s||'').replace(/[&<>"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
function activeJob(){return state.jobs.find(j=>j.id===state.activeJobId)}
function nextId(prefix){return prefix + Math.random().toString(36).slice(2,7).toUpperCase()}
let appModalResolver = null;

function showAppModal(msg, opts={}){
  $('mhkModalTitle').textContent = opts.title || 'Notice';
  $('mhkModalMsg').textContent = msg;
  $('mhkModalCancel').style.display = opts.confirm ? 'inline-block' : 'none';
  $('mhkModalBack').style.display='flex';
  return new Promise(resolve => { appModalResolver = resolve; });
}
function brandedAlert(msg){
  return showAppModal(msg, {title:'Notice', confirm:false});
}

function getBackupMeta(){
  const defaultsMeta = {frequency:'weekly', lastExportAt:'', lastInternalBackupAt:'', lastReminderAt:''};
  try{
    return Object.assign({}, defaultsMeta, JSON.parse(localStorage.getItem(BACKUP_META_KEY) || '{}'));
  }catch(e){
    return defaultsMeta;
  }
}
function setBackupMeta(meta){
  localStorage.setItem(BACKUP_META_KEY, JSON.stringify(meta));
}
function fmtDateTime(v){
  if(!v) return 'Never';
  const d = new Date(v);
  return isNaN(d.getTime()) ? 'Never' : d.toLocaleString('en-GB');
}
function diffDays(iso){
  if(!iso) return Infinity;
  const then = new Date(iso).getTime();
  if(!then) return Infinity;
  return (Date.now() - then) / 86400000;
}
function backupThresholdDays(freq){
  if(freq === 'daily') return 1;
  if(freq === 'weekly') return 7;
  if(freq === 'monthly') return 30;
  return Infinity;
}
function shouldRunInternalBackup(meta){
  if(!meta || meta.frequency === 'off') return false;
  return diffDays(meta.lastInternalBackupAt) >= backupThresholdDays(meta.frequency);
}
function takeInternalBackup(reason='auto'){
  try{
    localStorage.setItem(INTERNAL_BACKUP_KEY, JSON.stringify({
      savedAt: new Date().toISOString(),
      reason,
      data: state
    }));
    const meta = getBackupMeta();
    meta.lastInternalBackupAt = new Date().toISOString();
    setBackupMeta(meta);
    refreshBackupUI();
    return true;
  }catch(e){
    return false;
  }
}
function restoreInternalBackupNow(){
  const raw = localStorage.getItem(INTERNAL_BACKUP_KEY);
  if(!raw){
    brandedAlert('No internal backup found yet.');
    return;
  }
  try{
    const parsed = JSON.parse(raw);
    if(!parsed || !parsed.data) throw new Error('Invalid backup');
    state = mergeState(parsed.data);
    save();
    brandedAlert('Internal backup restored. Reloading now.');
    setTimeout(()=>location.reload(), 300);
  }catch(e){
    brandedAlert('Internal backup could not be restored.');
  }
}
function exportBackupNow(){
  const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'MHK_PAT_Backup_Latest.json';
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 400);
  const meta = getBackupMeta();
  meta.lastExportAt = new Date().toISOString();
  setBackupMeta(meta);
  refreshBackupUI();
  localStorage.setItem('MHK_BACKUP_FLASH','exported');
  showBackupInline('success', 'Backup exported successfully. File saved to your Downloads folder.');
}
function getBackupStatus(meta){
  if(!meta.lastExportAt) return {cls:'danger', title:'Backup needed', text:'No export backup has been created yet. Export a backup before clearing browser history or changing phone.'};
  if(meta.frequency === 'off') return {cls:'safe', title:'Backup protection active', text:'Automatic internal backup is off, but you have an export backup saved.'};
  if(diffDays(meta.lastExportAt) > backupThresholdDays(meta.frequency)) return {cls:'overdue', title:'Backup overdue', text:'Your export backup is older than your chosen backup schedule. Export a fresh backup now.'};
  return {cls:'safe', title:'Backup protection active', text:'Your backup status looks good.'};
}
function showBackupInline(type, message){
  const banner = $('backupBanner');
  if(!banner) return;
  const existing = $('backupInlineMsg');
  if(existing) existing.remove();
  const box = document.createElement('div');
  box.id = 'backupInlineMsg';
  box.className = 'backupInline ' + type;
  box.textContent = message;
  banner.insertAdjacentElement('afterend', box);
}
function consumeBackupFlash(){
  const flash = localStorage.getItem('MHK_BACKUP_FLASH');
  if(!flash) return;
  localStorage.removeItem('MHK_BACKUP_FLASH');
  if(flash === 'exported'){
    showBackupInline('success', 'Backup exported successfully. File saved to your Downloads folder.');
  }else if(flash === 'imported'){
    showBackupInline('info', 'Backup imported successfully. App data has been restored.');
  }
}
function refreshBackupUI(){
  const banner = $('backupBanner');
  if(!banner) return;
  const meta = getBackupMeta();
  const status = getBackupStatus(meta);
  banner.className = 'notice backupWarn ' + status.cls;
  $('backupStatusTitle').textContent = status.title;
  $('backupStatusText').textContent = status.text;
  $('lastExportText').textContent = fmtDateTime(meta.lastExportAt);
  $('lastInternalText').textContent = fmtDateTime(meta.lastInternalBackupAt);
  if($('backupFrequency')) $('backupFrequency').value = meta.frequency || 'weekly';
}
function maybeShowBackupReminder(){
  const meta = getBackupMeta();
  const status = getBackupStatus(meta);
  if(status.cls === 'safe') return;
  if(diffDays(meta.lastReminderAt) < 1) return;
  meta.lastReminderAt = new Date().toISOString();
  setBackupMeta(meta);
  brandedAlert(status.title + ': ' + status.text);
}


function nl2br(s){
  return esc(s).replace(/\n/g,'<br>');
}
function mergeState(incoming){
  const merged = JSON.parse(JSON.stringify(defaults));
  merged.company = Object.assign({}, merged.company, incoming.company||{});
  merged.clients = Array.isArray(incoming.clients) ? incoming.clients : [];
  merged.jobs = Array.isArray(incoming.jobs) ? incoming.jobs : [];
  merged.activeJobId = incoming.activeJobId || null;
  merged.lastLabelItemId = incoming.lastLabelItemId || null;
  merged.reportCounter = typeof incoming.reportCounter==='number' ? incoming.reportCounter : 0;
  return merged;
}
function askConfirm(msg){
  return showAppModal(msg, {title:'Confirmation', confirm:true});
}
function prefixFor(appliance){const x=APPLIANCES.find(a=>a[0]===appliance); return x?x[1]:'OTH'}
function nextAsset(prefix){
  const job = activeJob();
  const items = job ? job.items : [];
  const nums = items
    .filter(i => typeof i.asset === 'string' && i.asset.startsWith(prefix))
    .map(i => parseInt(i.asset.replace(prefix,''),10))
    .filter(n => !isNaN(n) && n > 0)
    .sort((a,b) => a - b);

  let next = 1;
  for(const n of nums){
    if(n === next){ next++; }
    else if(n > next){ break; }
  }

  return prefix + String(next).padStart(3,'0');
}
function switchView(v){
  document.querySelectorAll('section').forEach(s=>s.classList.add('hidden'));
  $(v).classList.remove('hidden');
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelector(`.tab[data-view="${v}"]`).classList.add('active');
  if(v==='clientsView') renderClients();
  if(v==='itemsView') renderItems();
  if(v==='labelsView') renderLabel();
  if(v==='signView') renderSign();
  if(v==='reportView') renderReport();
  if(v==='settingsView') loadSettings();
}
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>switchView(t.dataset.view));

function refreshHeader(){
  $('heroName').textContent = state.company.name;
  $('heroService').textContent = state.company.service;
  $('heroMeta').innerHTML = `${esc(state.company.address)}<br>${esc(state.company.phone)} · ${esc(state.company.email)}`;
  const heroLogo = $('heroLogo');
  if(state.company.logo){ heroLogo.src = state.company.logo; heroLogo.style.display='block'; }
  else { heroLogo.style.display='none'; }
}
function populateLists(){
  $('itemAppliance').innerHTML = APPLIANCES.map(a=>`<option>${a[0]}</option>`).join('');
  $('itemFuse').innerHTML = FUSES.map(x=>`<option>${x}</option>`).join('');
  $('itemInsulation').innerHTML = IRS.map(x=>`<option>${x}</option>`).join('');
  $('itemLocation').innerHTML = LOCATIONS.map(x=>`<option>${x}</option>`).join('');
  $('jobClientPick').innerHTML = '<option value="">-- Select saved client --</option>' + state.clients.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
}
$('itemAppliance').onchange = ()=>{
  const selected = $('itemAppliance').value;
  $('otherWrap').classList.toggle('hidden', selected!=='Other');
  $('itemAsset').value = nextAsset(prefixFor(selected));
};
$('itemFuse').onchange = ()=> $('fuseOtherWrap').classList.toggle('hidden', $('itemFuse').value!=='Other');
$('itemInsulation').onchange = ()=> $('insOtherWrap').classList.toggle('hidden', $('itemInsulation').value!=='Manual');
$('itemLocation').onchange = ()=> $('locOtherWrap').classList.toggle('hidden', $('itemLocation').value!=='Other');
$('itemClass').onchange = ()=>{
  const visualOnly = $('itemClass').value==='Visual Only';
  $('itemEarth').disabled = visualOnly;
  $('itemInsulation').disabled = visualOnly;
  if(visualOnly){
    $('itemEarth').value='N/A';
    $('itemInsulation').value='N/A';
    $('insOtherWrap').classList.add('hidden');
  } else {
    if($('itemEarth').value==='N/A') $('itemEarth').value='';
    if($('itemInsulation').value==='N/A') $('itemInsulation').value='>200 MΩ';
  }
};
function syncOverallFromVisual(){
  const visualFail = $('itemVisual').value==='FAIL';
  if(visualFail){
    $('itemResult').value='FAIL';
    $('itemResult').disabled=true;
  } else {
    $('itemResult').disabled=false;
  }
}
$('itemVisual').onchange = syncOverallFromVisual;
$('jobClientPick').onchange = ()=>{
  const c = state.clients.find(x=>x.id==$('jobClientPick').value); if(!c) return;
  $('jobClient').value=c.name; $('jobContact').value=c.contact; $('jobEmail').value=c.email; $('jobAddress').value=c.address;
};
$('jobDate').value = today();

$('saveClientBtn').onclick = ()=>{
  const name = $('clientName').value.trim(); if(!name) return brandedAlert('Enter client name');
  state.clients.unshift({id:nextId('CLI'),name,contact:$('clientContact').value.trim(),email:$('clientEmail').value.trim(),phone:$('clientPhone').value.trim(),address:$('clientAddress').value.trim()});
  save(); populateLists(); renderClients();
  ['clientName','clientContact','clientEmail','clientPhone','clientAddress'].forEach(id=>$(id).value='');
};
function renderClients(){
  $('clientsList').innerHTML = state.clients.length ? state.clients.map(c=>`<div class="client"><div class="top"><div><div class="title">${esc(c.name)}</div><div class="small">${esc(c.address)}</div><div class="small">${esc(c.contact)} ${c.email?'· '+esc(c.email):''}</div></div><button class="red" onclick="delClient('${c.id}')">Delete</button></div></div>`).join('') : '<div class="small">No saved clients yet.</div>';
}
window.delClient = id => {state.clients = state.clients.filter(c=>c.id!==id); save(); populateLists(); renderClients();};

$('createJobBtn').onclick = ()=>{
  const client = $('jobClient').value.trim(), addr = $('jobAddress').value.trim();
  if(!client || !addr) return brandedAlert('Enter client name and site address');
  const job = {id:nextId('JOB'),client,contact:$('jobContact').value.trim(),email:$('jobEmail').value.trim(),engineer:$('jobEngineer').value.trim(),address:addr,date:$('jobDate').value || today(),retest:$('jobRetest').value.trim()||'12',notes:$('jobNotes').value.trim(),items:[]};
  state.jobs.unshift(job); state.activeJobId=job.id; save(); renderJobs(); switchView('itemsView');
};
function renderJobs(){
  $('jobsList').innerHTML = state.jobs.length ? state.jobs.map(j=>`<div class="job"><div class="top"><div><div class="title">${esc(j.client)}</div><div class="small">${esc(j.address)}</div><div class="small">${esc(j.date)} · ${j.items.length} item(s)</div></div><div class="btns"><button onclick="openJob('${j.id}')">Open</button><button class="red" onclick="delJob('${j.id}')">Delete</button></div></div></div>`).join('') : '<div class="small">No jobs created yet.</div>';
}
window.openJob = id => {state.activeJobId=id; save(); switchView('itemsView');};
window.delJob = id => {state.jobs = state.jobs.filter(j=>j.id!==id); if(state.activeJobId===id) state.activeJobId=null; save(); renderJobs(); renderItems();};
window.delItem = id => {
  const job = activeJob(); if(!job) return;
  job.items = job.items.filter(i=>i.id!==id);
  if(state.lastLabelItemId===id) state.lastLabelItemId = job.items[0] ? job.items[0].id : null;
  save(); renderItems(); renderLabel();
};
window.selectLabelItem = id => {
  state.lastLabelItemId = id;
  save();
  switchView('labelsView');
};

let pendingPhotoItemId = null;
function getItemById(id){
  const job = activeJob();
  if(!job) return null;
  return job.items.find(i=>i.id===id) || null;
}
function compressImageDataUrl(dataUrl, maxSide=1400, quality=.78){
  return new Promise(resolve=>{
    const img = new Image();
    img.onload = ()=>{
      let w = img.width, h = img.height;
      const scale = Math.min(1, maxSide / Math.max(w,h));
      w = Math.round(w * scale); h = Math.round(h * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.drawImage(img,0,0,w,h);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}
window.addItemPhoto = id => { pendingPhotoItemId = id; $('itemPhotoInput').click(); };
window.viewItemPhoto = id => {
  const item = getItemById(id);
  if(!item || !item.photo) return;
  $('imgModalPic').src = item.photo;
  $('imgModalBack').style.display='flex';
};
window.removeItemPhoto = async id => {
  const item = getItemById(id);
  if(!item || !item.photo) return;
  if(!(await askConfirm('Remove this photo?'))) return;
  item.photo = '';
  save(); renderItems(); renderReport();
};
$('itemPhotoInput').onchange = async e => {
  const f = e.target.files && e.target.files[0];
  if(!f || !pendingPhotoItemId) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    const item = getItemById(pendingPhotoItemId);
    if(!item) return;
    item.photo = await compressImageDataUrl(ev.target.result);
    save(); renderItems(); renderReport();
    brandedAlert('Photo saved');
    pendingPhotoItemId = null;
    $('itemPhotoInput').value='';
  };
  reader.readAsDataURL(f);
};

$('saveItemBtn').onclick = ()=>saveItem(false);
$('toLabelsBtn').onclick = ()=>saveItem(true);

function saveItem(showLabel){
  const job = activeJob(); if(!job) return brandedAlert('Create or open a job first');
  let appliance = $('itemAppliance').value==='Other' ? ($('itemOther').value.trim() || 'Other') : $('itemAppliance').value;
  const prefix = prefixFor($('itemAppliance').value);
  const item = {
    id:nextId('ITM'),
    appliance,
    asset:$('itemAsset').value.trim() || nextAsset(prefix),
    location:$('itemLocation').value==='Other' ? $('itemLocationOther').value.trim() : $('itemLocation').value,
    classType:$('itemClass').value,
    fuse:$('itemFuse').value==='Other' ? $('itemFuseOther').value.trim() : $('itemFuse').value,
    visual:$('itemVisual').value,
    earth:$('itemClass').value==='Visual Only' ? 'N/A' : $('itemEarth').value.trim(),
    ir:$('itemClass').value==='Visual Only' ? 'N/A' : ($('itemInsulation').value==='Manual' ? $('itemInsOther').value.trim() : $('itemInsulation').value),
    result:$('itemVisual').value==='FAIL' ? 'FAIL' : $('itemResult').value,
    notes:$('itemNotes').value.trim(),
    photo:''
  };
  job.items.unshift(item);
  state.lastLabelItemId = item.id;
  save();
  ['itemAsset','itemLocationOther','itemOther','itemFuseOther','itemEarth','itemInsOther','itemNotes'].forEach(id=>{ if($(id)) $(id).value=''; });
  $('itemAppliance').value='Kettle'; $('itemLocation').value='Office'; $('itemFuse').value='1A'; $('itemInsulation').value='>200 MΩ'; $('itemVisual').value='PASS'; $('itemResult').value='PASS'; $('itemClass').value='Class I';
  $('otherWrap').classList.add('hidden'); $('locOtherWrap').classList.add('hidden'); $('fuseOtherWrap').classList.add('hidden'); $('insOtherWrap').classList.add('hidden');
  $('itemEarth').disabled = false; $('itemInsulation').disabled = false;
  $('itemAsset').value = nextAsset('KTL');
  syncOverallFromVisual();
  renderItems();
  if(showLabel){switchView('labelsView')}
}
function renderItems(){
  const job = activeJob();
  $('jobSummary').innerHTML = job ? `<div class="title">${esc(job.client)}</div><div class="small">${esc(job.address)}</div><div class="small">Engineer: ${esc(job.engineer)} · Test date: ${esc(job.date)} · Retest: ${esc(job.retest)} months</div>` : '<div class="small">No active job.</div>';
  $('itemsList').innerHTML = job && job.items.length ? job.items.map(i=>{
    const photoBtns = i.photo
      ? `<button class="secondary" onclick="viewItemPhoto('${i.id}')">View Photo</button><button class="secondary" onclick="addItemPhoto('${i.id}')">Change Photo</button><button class="ghost" onclick="removeItemPhoto('${i.id}')">Remove Photo</button>`
      : `<button class="secondary" onclick="addItemPhoto('${i.id}')">${i.result==='FAIL' ? 'Add Failure Photo' : 'Add Photo'}</button>`;
    const thumb = i.photo ? `<img class="photoThumb" src="${i.photo}" alt="Photo evidence">` : '';
    return `<div class="item"><div class="top"><div><div class="title">${esc(i.asset)} · ${esc(i.appliance)}</div><div class="small">${esc(i.location)} · ${esc(i.classType)} · Fuse ${esc(i.fuse)}</div><div class="small">Visual ${esc(i.visual)} · Earth ${esc(i.earth)} · IR ${esc(i.ir)}</div>${thumb}</div><span class="tag ${i.result==='PASS'?'pass':'fail'}">${esc(i.result)}</span></div><div class="itemActions"><button class="secondary" onclick="selectLabelItem('${i.id}')">Print Label</button>${photoBtns}<button class="red" onclick="delItem('${i.id}')">Delete</button></div></div>`;
  }).join('') : '<div class="small">No appliances saved yet.</div>';
}
function nextTest(job){
  const d = new Date(job.date);
  d.setMonth(d.getMonth()+parseInt(job.retest||12,10));
  return d.toLocaleDateString('en-GB');
}
function fmtDateDMY(v){
  if(!v) return '';
  if(/^\d{4}-\d{2}-\d{2}$/.test(v)){
    const parts = v.split('-');
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }
  const dt = new Date(v);
  return isNaN(dt.getTime()) ? String(v) : dt.toLocaleDateString('en-GB');
}
function ensureReportNumber(job){
  if(job.reportNo) return job.reportNo;
  if(typeof state.reportCounter !== 'number') state.reportCounter = 0;
  state.reportCounter += 1;
  const year = (job.date && /^\d{4}/.test(job.date)) ? job.date.slice(0,4) : String(new Date().getFullYear());
  job.reportNo = 'MHK-' + year + '-' + String(state.reportCounter).padStart(4,'0');
  save();
  return job.reportNo;
}
function nl2br(s){
  return esc(s).replace(/\n/g,'<br>');
}

function renderReport(){
  const job = activeJob();
  if(!job){$('reportArea').innerHTML='<div class="small">No active job.</div>'; return}
  const pass = job.items.filter(i=>i.result==='PASS');
  const fail = job.items.filter(i=>i.result==='FAIL');
  const failPhotos = fail.filter(i=>i.photo);
  const reportNo = ensureReportNumber(job);
  const logoHtml = state.company.logo
    ? '<img src="' + state.company.logo + '" alt="Logo" style="max-width:165px;max-height:82px;display:block">'
    : '';
  const sigHtml = state.company.signature
    ? '<img src="' + state.company.signature + '" alt="Signature" style="max-width:220px;max-height:34px;display:block">'
    : '';

  const passRows = pass.length ? pass.map(i =>
    '<tr>' +
      '<td>' + esc(i.asset) + '</td>' +
      '<td>' + esc(i.appliance) + '</td>' +
      '<td>' + esc(i.location) + '</td>' +
      '<td>' + esc(i.classType) + '</td>' +
      '<td>' + esc(i.fuse) + '</td>' +
      '<td>' + esc(i.earth) + '</td>' +
      '<td>' + esc(i.ir) + '</td>' +
      '<td>' + esc(i.visual) + '</td>' +
      '<td style="color:#14894c;font-weight:800">' + esc(i.result) + '</td>' +
    '</tr>'
  ).join('') : '<tr><td colspan="9">None</td></tr>';

  const failRows = fail.length ? fail.map(i =>
    '<tr>' +
      '<td>' + esc(i.asset) + '</td>' +
      '<td>' + esc(i.appliance) + '</td>' +
      '<td>' + esc(i.location) + '</td>' +
      '<td>' + esc(i.classType) + '</td>' +
      '<td>' + esc(i.fuse) + '</td>' +
      '<td>' + esc(i.earth) + '</td>' +
      '<td>' + esc(i.ir) + '</td>' +
      '<td>' + esc(i.visual) + '</td>' +
      '<td style="color:#c62828;font-weight:800">' + esc(i.result) + '</td>' +
      '<td>' + esc(i.notes) + '</td>' +
    '</tr>'
  ).join('') : '<tr><td colspan="10">None</td></tr>';

  const photoBlocks = failPhotos.length ? failPhotos.map(i =>
    '<div class="reportPhotoCard">' +
      '<div style="font-weight:800;color:#111">' + esc(i.asset) + ' · ' + esc(i.appliance) + '</div>' +
      '<div class="reportMuted" style="margin-top:4px;font-size:.88rem"><b>Failure reason:</b> ' + esc(i.notes || 'See failed items table') + '</div>' +
      '<div style="margin-top:8px"><img src="' + i.photo + '" alt="Failure photo"></div>' +
    '</div>'
  ).join('') : '<div class="reportBoxSq" style="margin-top:0">No failure photos attached.</div>';

  $('reportArea').innerHTML = ''
    + '<div id="reportBox">'
    +   '<div class="reportPage">'
    +     '<div class="reportPageInner">'
    +       '<div class="reportTopLine"></div>'
    +       '<div style="display:flex;justify-content:space-between;gap:18px;align-items:flex-start">'
    +         '<div style="flex:1">'
    +           '<div style="font-size:1.52rem;font-weight:900;color:#111">' + esc(state.company.name) + '</div>'
    +           '<div style="margin-top:4px;font-size:1rem;color:#111">' + esc(state.company.service) + '</div>'
    +           '<div style="margin-top:10px;line-height:1.48;color:#111">' + nl2br(state.company.address) + '<br>' + esc(state.company.phone) + ' · ' + esc(state.company.email) + '</div>'
    +         '</div>'
    +         '<div style="flex:0 0 auto;text-align:right">' + logoHtml + '</div>'
    +       '</div>'

    +       '<div style="margin-top:16px;text-align:center">'
    +         '<div style="font-size:1.26rem;font-weight:900;color:#111;letter-spacing:.3px">PORTABLE APPLIANCE TESTING REPORT</div>'
    +         '<div style="margin-top:6px;color:#111"><b>Report Number:</b> ' + esc(reportNo) + '</div>'
    +         '<div style="margin-top:4px;color:#111"><b>Test Date:</b> ' + fmtDateDMY(job.date) + ' &nbsp; <b>Retest Date:</b> ' + nextTest(job) + '</div>'
    +       '</div>'

    +       '<div class="reportSplit" style="margin-top:14px">'
    +         '<div class="reportBoxSq">'
    +           '<div class="reportSectionTitle">Client Details</div>'
    +           '<div><b>Client:</b> ' + esc(job.client) + '</div>'
    +           '<div><b>Contact:</b> ' + esc(job.contact) + '</div>'
    +           '<div><b>Email:</b> ' + esc(job.email) + '</div>'
    +           '<div style="margin-top:8px"><b>Site Address:</b><br>' + nl2br(job.address) + '</div>'
    +         '</div>'
    +         '<div class="reportBoxSq">'
    +           '<div class="reportSectionTitle">Test Details</div>'
    +           '<div><b>Engineer:</b> ' + esc(job.engineer) + '</div>'
    +           '<div><b>Instrument:</b> ' + esc(state.company.patTester || '-') + '</div>'
    +           '<div><b>Serial Number:</b> ' + esc(state.company.testerSerial || '-') + '</div>'
    +           '<div><b>Calibration Due:</b> ' + esc(fmtDateDMY(state.company.calibrationDue) || '-') + '</div>'
    +         '</div>'
    +       '</div>'

    +       '<table class="reportTable" style="margin-top:12px">'
    +         '<tr><th>Total Tested</th><th>Total Passed</th><th>Total Failed</th><th>Next Test</th></tr>'
    +         '<tr>'
    +           '<td>' + job.items.length + '</td>'
    +           '<td style="color:#14894c;font-weight:800">' + pass.length + '</td>'
    +           '<td style="color:#c62828;font-weight:800">' + fail.length + '</td>'
    +           '<td>' + nextTest(job) + '</td>'
    +         '</tr>'
    +       '</table>'

    +       '<div class="reportBoxSq">'
    +         '<div class="reportSectionTitle">Passed Items</div>'
    +         '<table class="reportTable">'
    +           '<tr><th>Asset</th><th>Appliance</th><th>Location</th><th>Class</th><th>Fuse</th><th>Earth Ω</th><th>IR MΩ</th><th>Visual</th><th>Result</th></tr>'
    +           passRows
    +         '</table>'
    +       '</div>'

    +       '<div class="reportBoxSq">'
    +         '<div class="reportSectionTitle">Failed Items</div>'
    +         '<table class="reportTable">'
    +           '<tr><th>Asset</th><th>Appliance</th><th>Location</th><th>Class</th><th>Fuse</th><th>Earth Ω</th><th>IR MΩ</th><th>Visual</th><th>Result</th><th>Notes</th></tr>'
    +           failRows
    +         '</table>'
    +       '</div>'

    +       '<div class="reportFoot">'
    +         '<div>' + esc(state.company.name) + ' · Portable Appliance Testing (PAT)</div>'
    +         '<div>Page 1 of 2</div>'
    +       '</div>'
    +     '</div>'
    +   '</div>'

    +   '<div class="reportPage">'
    +     '<div class="reportPageInner">'
    +       '<div class="reportTopLine"></div>'
    +       '<div style="font-size:1.15rem;font-weight:900;color:#111">Additional Safety Information & Evidence</div>'

    +       '<div class="reportBoxSq">'
    +         '<div class="reportSectionTitle">Important Safety Notice</div>'
    +         '<div style="line-height:1.5;color:#111">Appliances that have failed testing must be removed from service immediately and must not be used until they have been repaired and successfully re-tested. These items may present an electrical safety risk and should be clearly identified and isolated from normal use.</div>'
    +       '</div>'

    +       '<div class="reportBoxSq keepTogether">'
    +         '<div class="reportSectionTitle">Compliance Statement</div>'
    +         '<div style="line-height:1.5;color:#111">Inspection and testing has been carried out in accordance with the Electricity at Work Regulations 1989 and the IET Code of Practice for In-Service Inspection and Testing of Electrical Equipment.</div>'
    +       '</div>'

    +       '<div class="reportBoxSq">'
    +         '<div class="reportSectionTitle">Failure Photos</div>'
    +         (failPhotos.length ? '<div class="reportPhotoGrid">' + photoBlocks + '</div>' : '<div style="color:#111">No failure photos attached.</div>')
    +       '</div>'

    +       '<div class="reportBoxSq keepTogether">'
    +         '<div class="reportSectionTitle">Engineer Signature</div>'
    +         '<div class="reportSignatureBox">' + sigHtml + '</div>'
    +         '<div style="display:flex;justify-content:space-between;gap:12px;margin-top:8px;color:#111;font-size:.92rem">'
    +           '<div><b>Engineer:</b> ' + esc(job.engineer) + '</div>'
    +           '<div><b>Date:</b> ' + fmtDateDMY(job.date) + '</div>'
    +         '</div>'
    +       '</div>'

    +       '<div class="reportBoxSq keepTogether">'
    +         '<div class="reportSectionTitle">Thank You</div>'
    +         '<div style="line-height:1.5;color:#111">Thank you for choosing <b>' + esc(state.company.name) + '</b>. If you require further electrical safety testing, PAT maintenance, or compliance inspections, please contact us using the details on page 1 of this report.</div>'
    +       '</div>'

    +       '<div class="reportFoot">'
    +         '<div>' + esc(state.company.name) + ' · Portable Appliance Testing (PAT)</div>'
    +         '<div>Page 2 of 2</div>'
    +       '</div>'
    +     '</div>'
    +   '</div>'
    + '</div>';
}
$('printReportBtn').onclick = ()=>window.print();

function renderSign(){
  const c = $('sigCanvas');
  if(!c) return;
  const wrap = c.parentElement;
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const w = Math.max(280, Math.floor(wrap.clientWidth - 16));
  const h = 180;
  const prev = state.company.signature || '';
  c.width = Math.floor(w * ratio);
  c.height = Math.floor(h * ratio);
  c.style.width = w + 'px';
  c.style.height = h + 'px';
  const ctx = c.getContext('2d');
  ctx.setTransform(ratio,0,0,ratio,0,0);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0,0,w,h);
  if(prev){
    const img = new Image();
    img.onload = ()=>{ ctx.drawImage(img, 0, 0, w, h); };
    img.src = prev;
  }
}
function initSignaturePad(){
  const c = $('sigCanvas');
  if(!c || c.dataset.ready==='1') return;
  c.dataset.ready='1';
  const getPos = e => {
    const rect = c.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return {x:p.clientX - rect.left, y:p.clientY - rect.top};
  };
  let drawing = false;
  const start = e => {
    drawing = true;
    const p = getPos(e);
    const ctx = c.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(p.x,p.y);
    e.preventDefault();
  };
  const move = e => {
    if(!drawing) return;
    const p = getPos(e);
    const ctx = c.getContext('2d');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0b3560';
    ctx.lineTo(p.x,p.y);
    ctx.stroke();
    e.preventDefault();
  };
  const end = e => { drawing = false; if(e) e.preventDefault(); };
  c.addEventListener('mousedown', start);
  c.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);
  c.addEventListener('touchstart', start, {passive:false});
  c.addEventListener('touchmove', move, {passive:false});
  c.addEventListener('touchend', end, {passive:false});
}
function saveSignature(){
  const c = $('sigCanvas');
  state.company.signature = c.toDataURL('image/png');
  save();
  brandedAlert('Signature saved');
}
function clearSignature(){
  state.company.signature = '';
  save();
  renderSign();
}
function loadSettings(){
  $('setName').value = state.company.name;
  $('setService').value = state.company.service;
  $('setPhone').value = state.company.phone;
  $('setEmail').value = state.company.email;
  $('setAddress').value = state.company.address;
  $('setPatTester').value = state.company.patTester || '';
  $('setTesterSerial').value = state.company.testerSerial || '';
  $('setCalibrationDue').value = state.company.calibrationDue || '';
  $('setPin').value = state.company.pin || '';
  if(state.company.logo){$('logoPrev').src=state.company.logo; $('logoPrev').style.display='block'}
  refreshBackupUI();
}
$('setLogo').onchange = e => {
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=ev=>{$('logoPrev').src=ev.target.result; $('logoPrev').style.display='block'; state.company.logo=ev.target.result; save(); refreshHeader();}
  r.readAsDataURL(f);
};
$('saveSettingsBtn').onclick = ()=>{
  state.company.name=$('setName').value.trim()||defaults.company.name;
  state.company.service=$('setService').value.trim()||defaults.company.service;
  state.company.phone=$('setPhone').value.trim();
  state.company.email=$('setEmail').value.trim();
  state.company.address=$('setAddress').value.trim();
  state.company.patTester=$('setPatTester').value.trim();
  state.company.testerSerial=$('setTesterSerial').value.trim();
  state.company.calibrationDue=$('setCalibrationDue').value.trim();
  state.company.pin=$('setPin').value.trim();
  const meta = getBackupMeta();
  meta.frequency = $('backupFrequency') ? $('backupFrequency').value : (meta.frequency || 'weekly');
  setBackupMeta(meta);
  save(); refreshHeader(); refreshBackupUI(); brandedAlert('Settings saved');
};
$('clearDataBtn').onclick = async ()=>{
  if(!(await askConfirm('Reset all app data? This will erase PAT jobs stored in the app. Export a backup first if you need to keep them.'))) return;
  localStorage.removeItem(KEY);
  localStorage.removeItem(INTERNAL_BACKUP_KEY);
  localStorage.removeItem(BACKUP_META_KEY);
  location.reload();
};

$('exportDataBtn').onclick = ()=> exportBackupNow();
$('settingsExportBtn').onclick = ()=> exportBackupNow();
$('settingsRestoreBtn').onclick = ()=> restoreInternalBackupNow();
$('restoreInternalBtn').onclick = async ()=>{
  if(!(await askConfirm('Restore the internal backup? Current app data will be replaced.'))) return;
  restoreInternalBackupNow();
};
$('importDataBtn').onclick = ()=> $('importFileInput').click();
$('importFileInput').onchange = e => {
  const f = e.target.files && e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    try{
      const incoming = JSON.parse(ev.target.result);
      if(!(await askConfirm('Import backup and replace current app data?'))) return;
      state = mergeState(incoming);
      save();
      takeInternalBackup('post-import');
      const meta = getBackupMeta();
      meta.lastExportAt = meta.lastExportAt || new Date().toISOString();
      setBackupMeta(meta);
      localStorage.setItem('MHK_BACKUP_FLASH','imported');
      location.reload();
    }catch(err){
      brandedAlert('Import failed. Please choose a valid backup file.');
    }finally{
      $('importFileInput').value='';
    }
  };
  reader.readAsText(f);
};
$('imgModalOk').onclick = ()=> $('imgModalBack').style.display='none';
$('imgModalBack').onclick = e => { if(e.target.id==='imgModalBack') $('imgModalBack').style.display='none'; };

function checkPinLock(){
  if(!state.company.pin){
    $('pinModalBack').style.display='none';
    return;
  }
  $('pinUnlockInput').value='';
  $('pinMsg').style.display='none';
  $('pinModalBack').style.display='flex';
}
$('pinUnlockBtn').onclick = ()=>{
  if(($('pinUnlockInput').value||'').trim() === (state.company.pin||'')){
    $('pinModalBack').style.display='none';
  } else {
    $('pinMsg').style.display='block';
    $('pinUnlockInput').value='';
  }
};
$('pinUnlockInput').addEventListener('keydown', e=>{ if(e.key==='Enter') $('pinUnlockBtn').click(); });

$('saveSigBtn').onclick = ()=>saveSignature();
$('clearSigBtn').onclick = ()=>clearSignature();
window.addEventListener('resize', ()=>{ if(!$('signView').classList.contains('hidden')) renderSign(); });
$('mhkModalOk').onclick = ()=>{ $('mhkModalBack').style.display='none'; if(appModalResolver){ const r=appModalResolver; appModalResolver=null; r(true);} };
$('mhkModalCancel').onclick = ()=>{ $('mhkModalBack').style.display='none'; if(appModalResolver){ const r=appModalResolver; appModalResolver=null; r(false);} };
$('mhkModalBack').onclick = (e)=>{ if(e.target.id==='mhkModalBack'){ $('mhkModalBack').style.display='none'; if(appModalResolver){ const r=appModalResolver; appModalResolver=null; r(false);} } };

renderJobs(); renderClients(); populateLists(); renderItems(); refreshHeader(); initSignaturePad(); renderSign();
if(!localStorage.getItem(INTERNAL_BACKUP_KEY)){
  takeInternalBackup('initial');
}
refreshBackupUI();
consumeBackupFlash();
maybeShowBackupReminder();
$('itemLocation').value='Office'; $('itemAsset').value='KTL001'; syncOverallFromVisual();
checkPinLock();
if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js?v=15').catch(()=>{}); }