
let scanStream = null;
let scanRaf = null;
let detector = null;

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
    if(item) return {job, item, where: 'all'};
  }
  return null;
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

  state.activeJobId = found.job.id;
  state.lastLabelItemId = found.item.id;
  save();

  stopScanner();
  $('scanModalBack').style.display='none';
  switchView('itemsView');
  renderItems();

  brandedAlert(
    found.where === 'current'
      ? `Found ${asset} in the current job.`
      : `Found ${asset} in job "${found.job.client}". Opened that job.`
  );
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
  $('scanStatus').textContent = 'Point the camera at a PAT QR code.';
  $('scanModalBack').style.display='flex';

  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    $('scanStatus').textContent = 'Camera access is not supported on this device/browser.';
    return;
  }

  try{
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
    $('scanStatus').textContent = 'Camera permission denied or unavailable.';
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

document.addEventListener('DOMContentLoaded', ()=>{
  if($('scanQrHomeBtn')) $('scanQrHomeBtn').onclick = ()=>openScanner();
  if($('scanQrJobBtn')) $('scanQrJobBtn').onclick = ()=>openScanner();
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
});

window.addEventListener('beforeunload', stopScanner);
