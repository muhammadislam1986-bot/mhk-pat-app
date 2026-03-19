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
  company:{name:'MHK Building Solutions Ltd',service:'PAT Testing Services',phone:'',email:'',address:'',logo:'',pin:'',patTester:'',testerSerial:'',calibrationDue:'',signature:''},
  jobs:[], currentJobId:null, reportCounter:1
};
let state = load();

function load(){ try{return {...defaults, ...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return structuredClone(defaults)} }
function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }
function structuredClone(obj){ return JSON.parse(JSON.stringify(obj)); }
const $ = id => document.getElementById(id);
function esc(s){ return (s??'').toString().replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m])); }
function todayISO(){ const d=new Date(); return d.toISOString().slice(0,10); }
function fmtDateDMY(v){ if(!v) return ''; const d=new Date(v+'T00:00:00'); return d.toLocaleDateString('en-GB',{day:'2-digit',month:'2-digit',year:'numeric'}); }
function addYear(v){ if(!v) return ''; const d=new Date(v+'T00:00:00'); d.setFullYear(d.getFullYear()+1); return d.toISOString().slice(0,10); }
function nextTest(job){ return fmtDateDMY(addYear(job.date)); }
function uid(){ return Math.random().toString(36).slice(2,9); }

function brandedAlert(msg){
  const el = $('brandAlert');
  if(!el) return alert(msg);
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), 1800);
}
function askConfirm(msg){
  return new Promise(resolve=>{
    const m=$('confirmModal'), t=$('confirmText'), y=$('confirmYes'), n=$('confirmNo');
    t.textContent=msg; m.style.display='flex';
    const close=v=>{ m.style.display='none'; y.onclick=n.onclick=null; resolve(v); };
    y.onclick=()=>close(true); n.onclick=()=>close(false);
  });
}

function activeJob(){ return state.jobs.find(j=>j.id===state.currentJobId) || null; }
function getJob(id){ return state.jobs.find(j=>j.id===id) || null; }
function getItemById(id){
  for(const j of state.jobs){ const item=(j.items||[]).find(x=>x.id===id); if(item) return item; }
  return null;
}

function compressImageDataUrl(dataUrl, maxW=1400, quality=0.82){
  return new Promise(resolve=>{
    const img = new Image();
    img.onload = ()=>{
      let {width, height} = img;
      if(width > maxW){ height = Math.round(height * (maxW/width)); width = maxW; }
      const c = document.createElement('canvas');
      c.width = width; c.height = height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img,0,0,width,height);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

function refreshHeader(){
  $('heroName').textContent = state.company.name;
  $('heroService').textContent = state.company.service;
  $('heroMeta').innerHTML = `${esc(state.company.address)}<br>${esc(state.company.phone)} · ${esc(state.company.email)}`;
  if(state.company.logo){ $('heroLogo').src=state.company.logo; $('heroLogo').style.display='block'; $('heroLogoFallback').style.display='none'; }
  else { $('heroLogo').style.display='none'; $('heroLogoFallback').style.display='grid'; }
}

function switchView(v){
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  $(v).classList.add('active');
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active', x.dataset.view===v));
  if(v==='clientsView') renderClients();
  if(v==='itemsView') renderItems();
  if(v==='labelsView') renderLabel();
  if(v==='signView') renderSign();
  if(v==='reportView') renderReport();
  if(v==='settingsView') loadSettings();
}
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>switchView(t.dataset.view));

function renderClients(){
  const wrap = $('jobList');
  if(!state.jobs.length){ wrap.innerHTML='<div class="small">No jobs yet.</div>'; return; }
  wrap.innerHTML = state.jobs.map(j=>`
    <div class="jobCard ${state.currentJobId===j.id?'active':''}">
      <div>
        <div><b>${esc(j.client||'Untitled Job')}</b></div>
        <div class="small">${fmtDateDMY(j.date)} · ${esc(j.address||'')}</div>
      </div>
      <div class="jobBtns">
        <button class="smallBtn" onclick="openJob('${j.id}')">Open</button>
        <button class="smallBtn danger" onclick="deleteJob('${j.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}
window.openJob = id => { state.currentJobId=id; save(); renderClients(); renderItems(); renderLabel(); renderReport(); brandedAlert('Job opened'); };
window.deleteJob = async id => {
  if(!(await askConfirm('Delete this job?'))) return;
  state.jobs = state.jobs.filter(j=>j.id!==id);
  if(state.currentJobId===id) state.currentJobId = state.jobs[0]?.id || null;
  save(); renderClients(); renderItems(); renderLabel(); renderReport();
};

$('newJobBtn').onclick = ()=>{
  const client = $('clientName').value.trim();
  const contact = $('clientContact').value.trim();
  const email = $('clientEmail').value.trim();
  const address = $('clientAddress').value.trim();
  const date = $('testDate').value || todayISO();
  const engineer = $('engineerName').value.trim();
  if(!client) return brandedAlert('Enter client name');
  const job = {id:uid(), client, contact, email, address, date, engineer, items:[], reportNo:''};
  state.jobs.unshift(job);
  state.currentJobId = job.id;
  save(); renderClients(); renderItems(); renderLabel(); renderReport();
  brandedAlert('Job created');
};

function buildLocationOptions(selected=''){
  return LOCATIONS.map(x=>`<option ${x===selected?'selected':''}>${esc(x)}</option>`).join('');
}
function buildApplianceOptions(selected=''){
  return APPLIANCES.map(([n])=>`<option ${n===selected?'selected':''}>${esc(n)}</option>`).join('');
}
function suggestAsset(job, appliance){
  const pair = APPLIANCES.find(([n])=>n===appliance); const code = pair?pair[1]:'ITM';
  const n = ((job.items||[]).filter(i=>i.appliance===appliance).length + 1).toString().padStart(3,'0');
  return `${code}-${n}`;
}
function clearItemForm(){
  $('itemId').value='';
  $('itemAppliance').value='Kettle';
  $('itemAsset').value='';
  $('itemLocation').value='Office';
  $('itemClass').value='Class I';
  $('itemFuse').value='13A';
  $('itemEarth').value='0.10';
  $('itemIR').value='>200 MΩ';
  $('itemVisual').value='Pass';
  $('itemResult').value='PASS';
  $('itemNotes').value='';
  $('itemPhotoPreview').style.display='none';
  $('saveItemBtn').textContent='Save Item';
}
function renderItems(){
  const job = activeJob();
  $('currentJobTag').textContent = job ? `Active job: ${job.client}` : 'No active job';
  if(!job){ $('itemList').innerHTML='<div class="small">Create or open a job first.</div>'; return; }
  if(!$('itemAsset').value) $('itemAsset').value = suggestAsset(job, $('itemAppliance').value || 'Kettle');
  const rows = job.items.map(i=>`
    <div class="itemRow">
      <div>
        <div><b>${esc(i.asset)}</b> · ${esc(i.appliance)} · ${esc(i.location)}</div>
        <div class="small">${esc(i.classType)} · Fuse ${esc(i.fuse)} · Earth ${esc(i.earth)}Ω · IR ${esc(i.ir)} · Visual ${esc(i.visual)} · <b>${esc(i.result)}</b>${i.notes?` · ${esc(i.notes)}`:''}</div>
      </div>
      <div class="itemBtns">
        <button class="smallBtn" onclick="editItem('${i.id}')">Edit</button>
        <button class="smallBtn" onclick="addPhotoToItem('${i.id}')">Photo</button>
        <button class="smallBtn danger" onclick="deleteItem('${i.id}')">Delete</button>
      </div>
    </div>`).join('');
  $('itemList').innerHTML = rows || '<div class="small">No items yet.</div>';
}
$('itemAppliance').onchange = ()=>{ const job=activeJob(); if(job && !$('itemId').value) $('itemAsset').value=suggestAsset(job,$('itemAppliance').value); };
let pendingPhotoItemId = null;
window.addPhotoToItem = id => { pendingPhotoItemId = id; $('itemPhotoInput').click(); };
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
  let appliance = $('itemAppliance').value;
  let asset = $('itemAsset').value.trim();
  let location = $('itemLocation').value.trim();
  const classType = $('itemClass').value;
  let fuse = $('itemFuse').value;
  const earth = $('itemEarth').value.trim();
  let ir = $('itemIR').value;
  const visual = $('itemVisual').value;
  const result = $('itemResult').value;
  const notes = $('itemNotes').value.trim();

  if(appliance==='Other') appliance = prompt('Enter appliance type:') || 'Other';
  if(location==='Other') location = prompt('Enter location:') || 'Other';
  if(fuse==='Other') fuse = prompt('Enter fuse value:') || 'Other';
  if(ir==='Manual') ir = prompt('Enter IR reading:') || 'Manual';

  if(!asset) asset = suggestAsset(job, appliance);
  const id = $('itemId').value;
  const payload = {id:id||uid(), appliance, asset, location, classType, fuse, earth, ir, visual, result, notes, photo:getItemById(id)?.photo || ''};

  if(id){
    const idx = job.items.findIndex(x=>x.id===id);
    job.items[idx] = payload;
  } else {
    job.items.push(payload);
  }
  save(); renderItems(); renderLabel(); renderReport(); clearItemForm();
  brandedAlert('Item saved');
  if(showLabel) switchView('labelsView');
}
window.editItem = id => {
  const item = getItemById(id); if(!item) return;
  $('itemId').value=item.id;
  $('itemAppliance').value=APPLIANCES.some(([n])=>n===item.appliance)?item.appliance:'Other';
  $('itemAsset').value=item.asset;
  $('itemLocation').value=LOCATIONS.includes(item.location)?item.location:'Other';
  $('itemClass').value=item.classType;
  $('itemFuse').value=FUSES.includes(item.fuse)?item.fuse:'Other';
  $('itemEarth').value=item.earth;
  $('itemIR').value=IRS.includes(item.ir)?item.ir:'Manual';
  $('itemVisual').value=item.visual;
  $('itemResult').value=item.result;
  $('itemNotes').value=item.notes || '';
  if(item.photo){ $('itemPhotoPreview').src=item.photo; $('itemPhotoPreview').style.display='block'; }
  else $('itemPhotoPreview').style.display='none';
  $('saveItemBtn').textContent='Update Item';
  switchView('itemsView');
};
window.deleteItem = async id => {
  const job = activeJob(); if(!job) return;
  if(!(await askConfirm('Delete this item?'))) return;
  job.items = job.items.filter(i=>i.id!==id);
  save(); renderItems(); renderLabel(); renderReport(); brandedAlert('Item deleted');
};

function renderLabel(){
  const job = activeJob();
  if(!job){ $('labelArea').innerHTML='<div class="small">No active job.</div>'; return; }
  const itemId = $('labelSelect').value;
  $('labelSelect').innerHTML = job.items.map(i=>`<option value="${i.id}">${esc(i.asset)} · ${esc(i.appliance)}</option>`).join('');
  if(itemId) $('labelSelect').value = itemId;
  const item = getItemById($('labelSelect').value) || job.items[0];
  if(!item){ $('labelArea').innerHTML='<div class="small">Add an item first.</div>'; return; }
  $('labelArea').innerHTML = `
    <div id="labelCard">
      <div class="labelTop">${esc(state.company.name)}</div>
      <div class="labelMid ${item.result==='PASS'?'pass':'fail'}">${esc(item.result)}</div>
      <div class="labelBody">
        <div><b>Asset:</b> ${esc(item.asset)}</div>
        <div><b>Appliance:</b> ${esc(item.appliance)}</div>
        <div><b>Date:</b> ${fmtDateDMY(job.date)}</div>
        <div><b>Retest:</b> ${nextTest(job)}</div>
      </div>
    </div>`;
}
$('labelSelect').onchange = renderLabel;
$('printLabelBtn').onclick = ()=>window.print();

function ensureReportNumber(job){
  if(job.reportNo) return job.reportNo;
  const year = new Date(job.date||todayISO()).getFullYear();
  job.reportNo = 'MHK-' + year + '-' + String(state.reportCounter).padStart(4,'0');
  state.reportCounter += 1;
  save();
  return job.reportNo;
}
function nl2br(s){
  return esc(s).replace(/
/g,'<br>');
}

function renderReport(){
  const job = activeJob();
  if(!job){$('reportArea').innerHTML='<div class="small">No active job.</div>'; return}
  const pass = job.items.filter(i=>i.result==='PASS');
  const fail = job.items.filter(i=>i.result==='FAIL');
  const failPhotos = fail.filter(i=>i.photo);
  const reportNo = ensureReportNumber(job);
  const logoHtml = state.company.logo
    ? '<img src="' + state.company.logo + '" alt="Logo" style="max-width:78px;max-height:78px;display:block;border-radius:12px">'
    : '<div class="reportBrandBolt">⚡</div>';
  const sigHtml = state.company.signature
    ? '<img src="' + state.company.signature + '" alt="Signature" style="max-width:220px;max-height:34px;display:block">'
    : '<div class="reportMuted">Signature not saved</div>';

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
      '<td class="reportResultPass">' + esc(i.result) + '</td>' +
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
      '<td class="reportResultFail">' + esc(i.result) + '</td>' +
      '<td>' + esc(i.notes) + '</td>' +
    '</tr>'
  ).join('') : '<tr><td colspan="10">None</td></tr>';

  const photoBlocks = failPhotos.length ? failPhotos.map(i =>
    '<div class="reportPhotoCard premium">' +
      '<div class="reportPhotoMeta">' +
        '<div class="reportPhotoAsset">' + esc(i.asset) + ' · ' + esc(i.appliance) + '</div>' +
        '<div class="reportMuted" style="margin-top:4px;font-size:.88rem"><b>Failure reason:</b> ' + esc(i.notes || 'See failed items table') + '</div>' +
      '</div>' +
      '<div style="margin-top:8px"><img src="' + i.photo + '" alt="Failure photo"></div>' +
    '</div>'
  ).join('') : '<div class="reportBoxSq premium" style="margin-top:0">No failure photos attached.</div>';

  $('reportArea').innerHTML = ''
    + '<div id="reportBox">'
    +   '<div class="reportPage">'
    +     '<div class="reportPageInner premium">'
    +       '<div class="reportHero">'
    +         '<div class="reportHeroLeft">'
    +           '<div class="reportBrandIconWrap">' + logoHtml + '</div>'
    +           '<div class="reportBrandText">'
    +             '<div class="reportCompanyName">' + esc(state.company.name) + '</div>'
    +             '<div class="reportServiceLine">' + esc(state.company.service) + '</div>'
    +             '<div class="reportCompanyMeta">' + nl2br(state.company.address) + '<br>' + esc(state.company.phone) + ' · ' + esc(state.company.email) + '</div>'
    +           '</div>'
    +         '</div>'
    +         '<div class="reportHeroRight">'
    +           '<div class="reportNextCard">'
    +             '<div class="reportNextLabel">Next Test</div>'
    +             '<div class="reportNextDate">' + nextTest(job) + '</div>'
    +           '</div>'
    +         '</div>'
    +       '</div>'

    +       '<div class="reportRibbon">PORTABLE APPLIANCE TESTING REPORT</div>'

    +       '<div class="reportMetaBar">'
    +         '<div><b>Report Number:</b> <span class="reportNoInline">' + esc(reportNo) + '</span></div>'
    +         '<div><b>Test Date:</b> ' + fmtDateDMY(job.date) + '</div>'
    +         '<div><b>Retest Date:</b> ' + nextTest(job) + '</div>'
    +       '</div>'

    +       '<div class="reportSummaryCard">'
    +         '<div class="reportClientMini">'
    +           '<div class="reportSectionTitle">Client Details</div>'
    +           '<div><b>Client:</b> ' + esc(job.client) + '</div>'
    +           '<div><b>Contact:</b> ' + esc(job.contact) + '</div>'
    +           '<div><b>Email:</b> ' + esc(job.email) + '</div>'
    +           '<div style="margin-top:8px"><b>Site Address:</b><br>' + nl2br(job.address) + '</div>'
    +         '</div>'
    +         '<div class="reportStatGrid">'
    +           '<div class="reportStat total"><div class="num">' + job.items.length + '</div><div class="lbl">Total Tested</div></div>'
    +           '<div class="reportStat pass"><div class="num">' + pass.length + '</div><div class="lbl">Passed</div></div>'
    +           '<div class="reportStat fail"><div class="num">' + fail.length + '</div><div class="lbl">Failed</div></div>'
    +           '<div class="reportStat neutral"><div class="num date">' + nextTest(job) + '</div><div class="lbl">Next Test</div></div>'
    +         '</div>'
    +       '</div>'

    +       '<div class="reportSplit premium reportSingleBox" style="margin-top:14px">'
    +         '<div class="reportBoxSq premium">'
    +           '<div class="reportSectionTitle">Test Details</div>'
    +           '<div><b>Engineer:</b> ' + esc(job.engineer) + '</div>'
    +           '<div><b>Instrument:</b> ' + esc(state.company.patTester || '-') + '</div>'
    +           '<div><b>Serial Number:</b> ' + esc(state.company.testerSerial || '-') + '</div>'
    +           '<div><b>Calibration Due:</b> ' + esc(fmtDateDMY(state.company.calibrationDue) || '-') + '</div>'
    +         '</div>'
    +       '</div>'

    +       '<div class="reportBoxSq premium">'
    +         '<div class="reportTableTitle pass">Passed Items</div>'
    +         '<table class="reportTable premium">'
    +           '<tr><th>Asset</th><th>Appliance</th><th>Location</th><th>Class</th><th>Fuse</th><th>Earth Ω</th><th>IR MΩ</th><th>Visual</th><th>Result</th></tr>'
    +           passRows
    +         '</table>'
    +       '</div>'

    +       '<div class="reportBoxSq premium">'
    +         '<div class="reportTableTitle fail">Failed Items</div>'
    +         '<table class="reportTable premium">'
    +           '<tr><th>Asset</th><th>Appliance</th><th>Location</th><th>Class</th><th>Fuse</th><th>Earth Ω</th><th>IR MΩ</th><th>Visual</th><th>Result</th><th>Notes</th></tr>'
    +           failRows
    +         '</table>'
    +       '</div>'

    +       '<div class="reportFoot premium">'
    +         '<div>' + esc(state.company.name) + ' · ' + esc(state.company.service || 'Portable Appliance Testing (PAT)') + '</div>'
    +         '<div>Page 1 of 2</div>'
    +       '</div>'
    +     '</div>'
    +   '</div>'

    +   '<div class="reportPage">'
    +     '<div class="reportPageInner premium">'
    +       '<div class="reportPageTitle">ADDITIONAL SAFETY INFORMATION & EVIDENCE</div>'

    +       '<div class="reportSplit premium">'
    +         '<div class="reportBoxSq premium">'
    +           '<div class="reportSectionTitle">Important Safety Notice</div>'
    +           '<div style="line-height:1.6;color:#111">Appliances that have failed testing must be removed from service immediately and must not be used until they have been repaired and successfully re-tested. These items may present an electrical safety risk and should be clearly identified and isolated from normal use.</div>'
    +         '</div>'
    +         '<div class="reportBoxSq premium keepTogether">'
    +           '<div class="reportSectionTitle">Failure Photos</div>'
    +           (failPhotos.length ? '<div class="reportPhotoGrid premium">' + photoBlocks + '</div>' : '<div style="color:#111">No failure photos attached.</div>')
    +         '</div>'
    +       '</div>'

    +       '<div class="reportSplit premium" style="margin-top:12px">'
    +         '<div class="reportBoxSq premium keepTogether">'
    +           '<div class="reportSectionTitle">Compliance Statement</div>'
    +           '<div style="line-height:1.6;color:#111">Inspection and testing has been carried out in accordance with the Electricity at Work Regulations 1989 and the IET Code of Practice for In-Service Inspection and Testing of Electrical Equipment.</div>'
    +         '</div>'
    +         '<div class="reportBoxSq premium keepTogether">'
    +           '<div class="reportSectionTitle">Engineer Signature</div>'
    +           '<div class="reportSignatureBox premium">' + sigHtml + '</div>'
    +           '<div style="display:flex;justify-content:space-between;gap:12px;margin-top:8px;color:#111;font-size:.92rem">'
    +             '<div><b>Engineer:</b> ' + esc(job.engineer) + '</div>'
    +             '<div><b>Date:</b> ' + fmtDateDMY(job.date) + '</div>'
    +           '</div>'
    +         '</div>'
    +       '</div>'

    +       '<div class="reportBoxSq premium keepTogether">'
    +         '<div class="reportSectionTitle">Thank You</div>'
    +         '<div style="line-height:1.6;color:#111">Thank you for choosing <b>' + esc(state.company.name) + '</b>. If you require further electrical safety testing, PAT maintenance, or compliance inspections, please contact us using the details on page 1 of this report.</div>'
    +       '</div>'

    +       '<div class="reportFoot premium">'
    +         '<div>' + esc(state.company.name) + ' · ' + esc(state.company.service || 'Portable Appliance Testing (PAT)') + '</div>'
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
  if(!(await askConfirm('Reset all app data? This will erase PAT jobs stored in the app. Export a backup first if you need it.'))) return;
  localStorage.removeItem(KEY);
  localStorage.removeItem(INTERNAL_BACKUP_KEY);
  localStorage.removeItem(BACKUP_META_KEY);
  state = structuredClone(defaults);
  $('clientName').value=''; $('clientContact').value=''; $('clientEmail').value=''; $('clientAddress').value=''; $('testDate').value=todayISO(); $('engineerName').value='';
  clearItemForm(); refreshHeader(); renderClients(); renderItems(); renderLabel(); renderReport(); loadSettings();
  brandedAlert('All data cleared');
};

function exportBackupObject(){
  return {
    app:'MHK PAT',
    version:1,
    exportedAt:new Date().toISOString(),
    data: state
  };
}
function getBackupMeta(){
  try{return JSON.parse(localStorage.getItem(BACKUP_META_KEY)||'{}')||{}}catch{return {}}
}
function setBackupMeta(meta){
  localStorage.setItem(BACKUP_META_KEY, JSON.stringify(meta||{}));
}
function makeBackupFilename(kind='backup'){
  const d=new Date();
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,'0');
  const day=String(d.getDate()).padStart(2,'0');
  const hh=String(d.getHours()).padStart(2,'0');
  const mm=String(d.getMinutes()).padStart(2,'0');
  return `mhk-pat-${kind}-${y}${m}${day}-${hh}${mm}.json`;
}
function downloadJson(filename,obj){
  const blob = new Blob([JSON.stringify(obj,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 500);
}
function updateBackupStatus(){
  const meta = getBackupMeta();
  const auto = $('autoBackupStatus');
  const last = meta.lastInternalBackupAt ? new Date(meta.lastInternalBackupAt) : null;
  auto.textContent = last
    ? `Internal backup saved: ${last.toLocaleString('en-GB')}`
    : 'No internal backup saved yet';
}
function saveInternalBackup(reason='manual'){
  const payload = exportBackupObject();
  localStorage.setItem(INTERNAL_BACKUP_KEY, JSON.stringify(payload));
  const meta = getBackupMeta();
  meta.lastInternalBackupAt = new Date().toISOString();
  meta.lastInternalBackupReason = reason;
  setBackupMeta(meta);
  updateBackupStatus();
}
function maybeScheduledInternalBackup(){
  const meta = getBackupMeta();
  const freq = meta.frequency || 'weekly';
  if(freq==='off') return;
  const last = meta.lastInternalBackupAt ? new Date(meta.lastInternalBackupAt) : null;
  const now = new Date();
  let dueMs = 7*24*60*60*1000;
  if(freq==='daily') dueMs = 24*60*60*1000;
  if(freq==='monthly') dueMs = 30*24*60*60*1000;
  if(!last || (now - last) >= dueMs){
    saveInternalBackup('scheduled');
  }
}
function refreshBackupUI(){
  const meta = getBackupMeta();
  if($('backupFrequency')) $('backupFrequency').value = meta.frequency || 'weekly';
  updateBackupStatus();
}
$('downloadBackupBtn').onclick = ()=>{
  downloadJson(makeBackupFilename('backup'), exportBackupObject());
  brandedAlert('Backup downloaded');
};
$('saveInternalBackupBtn').onclick = ()=>{
  saveInternalBackup('manual');
  brandedAlert('Internal backup saved');
};
$('restoreInternalBackupBtn').onclick = async ()=>{
  const raw = localStorage.getItem(INTERNAL_BACKUP_KEY);
  if(!raw) return brandedAlert('No internal backup found');
  if(!(await askConfirm('Restore the latest internal backup? This replaces current app data.'))) return;
  try{
    const parsed = JSON.parse(raw);
    if(!parsed || !parsed.data) throw new Error('Invalid backup');
    state = {...structuredClone(defaults), ...parsed.data};
    save();
    refreshHeader(); renderClients(); renderItems(); renderLabel(); renderReport(); loadSettings();
    brandedAlert('Internal backup restored');
  }catch(e){ brandedAlert('Failed to restore backup'); }
};
$('restoreBackupInput').onchange = e => {
  const f = e.target.files && e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    try{
      const parsed = JSON.parse(ev.target.result);
      if(!parsed || !parsed.data) throw new Error('Invalid backup');
      if(!(await askConfirm('Restore this backup file? This replaces current app data.'))) return;
      state = {...structuredClone(defaults), ...parsed.data};
      save();
      refreshHeader(); renderClients(); renderItems(); renderLabel(); renderReport(); loadSettings();
      brandedAlert('Backup restored');
    }catch(err){ brandedAlert('Backup file invalid'); }
    $('restoreBackupInput').value='';
  };
  reader.readAsText(f);
};

window.addEventListener('beforeunload', ()=>{ try{ saveInternalBackup('autosave'); }catch{} });

$('testDate').value = todayISO();
refreshHeader();
renderClients();
renderItems();
renderLabel();
renderReport();
initSignaturePad();
maybeScheduledInternalBackup();
updateBackupStatus();
