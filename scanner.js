
let scanStream = null;
let scanRaf = null;
let detector = null;
let lastScanFound = null;

function parseScannedAsset(raw){
  const txt = String(raw || '').trim();
  if(!txt) return '';
  const match = txt.match(/\b([A-Z]{2,4}\d{3})\b/);
  if(match) return match[1];
  try{
    const url = new URL(txt);
    const asset = url.searchParams.get('asset') || url.searchParams.get('id');
    if(asset && /^[A-Z]{2,4}\d{3}$/.test(asset)) return asset;
  }catch(e){}
  return '';
}

function findAssetAcrossJobs(asset){
  const current = typeof activeJob === 'function' ? activeJob() : null;
  if(current){
    const item = (current.items || []).find(i => i.asset === asset);
    if(item) return {job: current, item, where: 'current'};
  }
  for(const job of (state.jobs || [])){
    if(current && job.id === current.id) continue;
    const item = (job.items || []).find(i => i.asset === asset);
    if(item) return {job: job, item: item, where: 'all'};
  }
  return null;
}

function getAssetHistory(asset){
  const rows = [];
  for(const job of (state.jobs || [])){
    for(const item of (job.items || [])){
      if(item.asset === asset){
        rows.push({
          date: job.date || '',
          client: job.client || '',
          appliance: item.appliance || '',
          result: item.overall || item.visual || '',
          location: item.location || '',
          engineer: job.engineer || ''
        });
      }
    }
  }
  rows.sort((a,b)=> String(b.date).localeCompare(String(a.date)));
  return rows;
}

function renderAssetHistoryHTML(asset){
  const history = getAssetHistory(asset);
  if(!history.length){
    return `<div style="margin-top:14px"><div style="font-weight:900;font-size:18px">Appliance History</div><div style="margin-top:8px">No history found.</div></div>`;
  }

  const rows = history.slice(0,5).map(h=>{
    const good = String(h.result || '').toUpperCase() === 'PASS';
    const color = good ? '#14894c' : '#c62828';
    return `
      <div style="display:grid;grid-template-columns:92px 72px 1fr;gap:8px;align-items:center;padding:8px 0;border-top:1px solid #d9e2ec">
        <div style="font-weight:700">${esc(h.date || '')}</div>
        <div style="font-weight:900;color:${color}">${esc(h.result || '')}</div>
        <div>${esc(h.client || '')}${h.location ? ' · ' + esc(h.location) : ''}</div>
      </div>
    `;
  }).join('');

  return `
    <div style="margin-top:14px">
      <div style="font-weight:900;font-size:18px">Appliance History</div>
      <div style="margin-top:6px;font-size:14px;color:#425466">Latest 5 records for this asset</div>
      <div style="margin-top:8px;border:1px solid #d9e2ec;border-radius:12px;padding:0 12px;background:#fff">
        ${rows}
      </div>
    </div>
  `;
}

function ensureScanResultModal(){
  if(document.getElementById('scanResultBack')) return;

  const wrap = document.createElement('div');
  wrap.id = 'scanResultBack';
  wrap.className = 'modalBack';
  wrap.style.display = 'none';
  wrap.innerHTML = `
    <div class="modal" style="width:min(94vw,720px)">
      <div class="modalHead">QR Result Found</div>
      <div class="modalBody">
        <div id="scanResultInfo" style="line-height:1.5;font-size:16px"></div>
        <div id="scanHistoryArea"></div>
        <div style="display:grid;gap:12px;margin-top:16px">
          <button type="button" id="scanActionView" class="modalBtn" style="background:#1f6feb;color:#fff;min-height:52px;font-weight:800">View Appliance</button>
          <button type="button" id="scanActionJob" class="modalBtn" style="background:#14894c;color:#fff;min-height:52px;font-weight:800">Open Previous Job</button>
          <button type="button" id="scanActionNew" class="modalBtn" style="background:#d89b0d;color:#102338;min-height:52px;font-weight:800">Start New Test For This Site</button>
        </div>
      </div>
      <div class="modalFoot" style="justify-content:center">
        <button type="button" id="scanResultClose" class="modalBtn ghost">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  document.getElementById('scanActionView').onclick = ()=>openScannedApplianceOnly();
  document.getElementById('scanActionJob').onclick = ()=>openScannedPreviousJob();
  document.getElementById('scanActionNew').onclick = ()=>startNewTestFromScannedJob();
  document.getElementById('scanResultClose').onclick = ()=>closeScanResultModal();
  wrap.onclick = (e)=>{ if(e.target.id === 'scanResultBack') closeScanResultModal(); };
}

function openScanResultModal(found, asset){
  ensureScanResultModal();
  lastScanFound = {found: found, asset: asset};

  const info = document.getElementById('scanResultInfo');
  info.innerHTML = `
    <div style="font-weight:900;font-size:20px">${esc(asset)}</div>
    <div style="margin-top:6px"><b>Appliance:</b> ${esc(found.item.appliance || '')}</div>
    <div><b>Client:</b> ${esc(found.job.client || '')}</div>
    <div><b>Test Date:</b> ${esc(found.job.date || '')}</div>
    <div><b>Site:</b> ${esc(found.job.address || '')}</div>
  `;

  const history = document.getElementById('scanHistoryArea');
  history.innerHTML = renderAssetHistoryHTML(asset);

  document.getElementById('scanResultBack').style.display = 'flex';
}

function closeScanResultModal(){
  const back = document.getElementById('scanResultBack');
  if(back) back.style.display = 'none';
}

function openScannedApplianceOnly(){
  if(!lastScanFound) return;
  const found = lastScanFound.found;
  const asset = lastScanFound.asset;
  state.activeJobId = found.job.id;
  state.lastLabelItemId = found.item.id;
  save();
  closeScanResultModal();
  switchView('itemsView');
  renderItems();
  brandedAlert(`Opened appliance ${asset}.`);
}

function openScannedPreviousJob(){
  if(!lastScanFound) return;
  const found = lastScanFound.found;
  state.activeJobId = found.job.id;
  state.lastLabelItemId = found.item.id;
  save();
  closeScanResultModal();
  switchView('itemsView');
  renderItems();
  brandedAlert(`Opened previous job for ${found.job.client}.`);
}

function startNewTestFromScannedJob(){
  if(!lastScanFound) return;
  const found = lastScanFound.found;
  closeScanResultModal();

  switchView('jobsView');

  if($('jobClientPick')) $('jobClientPick').value = '';
  if($('jobDate')) $('jobDate').value = today();
  if($('jobClient')) $('jobClient').value = found.job.client || '';
  if($('jobContact')) $('jobContact').value = found.job.contact || '';
  if($('jobEmail')) $('jobEmail').value = found.job.email || '';
  if($('jobEngineer')) $('jobEngineer').value = found.job.engineer || '';
  if($('jobAddress')) $('jobAddress').value = found.job.address || '';
  if($('jobRetest')) $('jobRetest').value = found.job.retestMonths || 12;
  if($('jobNotes')) $('jobNotes').value = found.job.notes || '';

  brandedAlert('Previous site details loaded. Create the new job when ready.');
}

async function handleScannedText(text){
  const asset = parseScannedAsset(text);
  if(!asset){
    $('scanStatus').textContent = 'QR scanned, but no valid asset ID was found.';
    return;
  }

  const found = findAssetAcrossJobs(asset);
  if(!found){
    $('scanStatus').textContent = `No appliance found for ${asset}.`;
    return;
  }

  stopScanner();
  $('scanModalBack').style.display = 'none';
  openScanResultModal(found, asset);
}

async function scanLoop(){
  const video = $('scanVideo');
  if(!video || video.readyState < 2){
    scanRaf = requestAnimationFrame(scanLoop);
    return;
  }

  try{
    if('BarcodeDetector' in window){
      if(!detector) detector = new BarcodeDetector({formats:['qr_code']});
      const codes = await detector.detect(video);
      if(codes && codes.length){
        await handleScannedText(codes[0].rawValue || '');
        return;
      }
    }else{
      $('scanStatus').textContent = 'QR scanning is not supported on this device/browser.';
      return;
    }
  }catch(e){
    $('scanStatus').textContent = 'Unable to read QR code right now.';
  }

  scanRaf = requestAnimationFrame(scanLoop);
}

async function openScanner(){
  $('scanStatus').textContent = 'Point the camera at a PAT QR code or use Upload Photo.';
  $('scanModalBack').style.display='flex';

  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    $('scanStatus').textContent = 'Camera access is not supported on this device/browser. Use Upload Photo instead.';
    return;
  }

  try{
    stopScanner();
    scanStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });
    const video = $('scanVideo');
    video.srcObject = scanStream;
    await video.play();
    if(scanRaf) cancelAnimationFrame(scanRaf);
    scanRaf = requestAnimationFrame(scanLoop);
  }catch(e){
    $('scanStatus').textContent = 'Camera permission denied or unavailable. Use Upload Photo instead.';
  }
}

function stopScanner(){
  if(scanRaf){
    cancelAnimationFrame(scanRaf);
    scanRaf = null;
  }
  if(scanStream){
    scanStream.getTracks().forEach(t => t.stop());
    scanStream = null;
  }
  const video = $('scanVideo');
  if(video) video.srcObject = null;
}

async function scanImageFile(file){
  if(!file){
    $('scanStatus').textContent = 'No image selected.';
    return;
  }
  if(!('BarcodeDetector' in window)){
    $('scanStatus').textContent = 'Scan from photo is not supported on this device/browser.';
    return;
  }
  try{
    const bitmap = await createImageBitmap(file);
    if(!detector) detector = new BarcodeDetector({formats:['qr_code']});
    const codes = await detector.detect(bitmap);
    if(codes && codes.length){
      await handleScannedText(codes[0].rawValue || '');
      return;
    }
    $('scanStatus').textContent = 'No QR code found in that image.';
  }catch(e){
    $('scanStatus').textContent = 'Unable to read that image.';
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  ensureScanResultModal();

  if($('scanQrHomeBtn')) $('scanQrHomeBtn').onclick = ()=>openScanner();
  if($('scanQrJobBtn')) $('scanQrJobBtn').onclick = ()=>openScanner();
  if($('scanLiveBtn')) $('scanLiveBtn').onclick = ()=>openScanner();
  if($('scanCloseBtn')) $('scanCloseBtn').onclick = ()=>{
    stopScanner();
    $('scanModalBack').style.display='none';
  };
  if($('scanModalBack')){
    $('scanModalBack').onclick = (e)=>{
      if(e.target.id === 'scanModalBack'){
        stopScanner();
        $('scanModalBack').style.display='none';
      }
    };
  }

  const photoBtn = $('scanPhotoBtn');
  const photoInput = $('scanPhotoInput');
  if(photoBtn && photoInput){
    photoBtn.onclick = ()=> photoInput.click();
    photoInput.onchange = async (e)=>{
      const file = e.target.files && e.target.files[0];
      await scanImageFile(file);
      photoInput.value = '';
    };
  }
});

window.addEventListener('beforeunload', stopScanner);
