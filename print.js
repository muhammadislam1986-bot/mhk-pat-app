
function getSelectedLabelSize(){
  const wMm = parseFloat($('lblW')?.value || '50') || 50;
  const hMm = parseFloat($('lblH')?.value || '30') || 30;
  return {w: wMm + 'mm', h: hMm + 'mm', wMm, hMm};
}

function getEngineerInitials(){
  try{
    const job = typeof activeJob === 'function' ? activeJob() : null;
    const name = (job?.engineer || state?.tester?.name || '').trim();
    if(!name) return '';
    const parts = name.split(/\s+/).filter(Boolean);
    if(parts.length === 1) return parts[0].substring(0,2).toUpperCase();
    return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  }catch(e){
    return '';
  }
}

function getLabelScale(wMm, hMm){
  return Math.max(0.62, Math.min(1, Math.min(wMm / 50, hMm / 30)));
}

function thermalLabelHTML(data, qrUrl, w, h, wMm, hMm){
  const resultLine = data.isFail ? '⚠ FAIL' : '✔ PASS';
  const warningHtml = data.isFail
    ? `<div style="margin-top:${Math.max(2, 6*getLabelScale(wMm,hMm))}px;font-weight:900;font-size:${Math.max(8,13*getLabelScale(wMm,hMm))}px">⚠ DO NOT USE</div>`
    : '';

  const initials = getEngineerInitials();
  const scale = getLabelScale(wMm, hMm);
  const headPt = Math.max(6.5, 9 * scale);
  const bodyPt = Math.max(5.2, 7 * scale);
  const resultPt = Math.max(7.5, 10 * scale);
  const qrMm = Math.max(9, Math.min(13, Math.round(Math.min(wMm, hMm) * 0.38)));

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Label Print</title>
<style>
@page { size: ${w} ${h}; margin: 0; }
html,body{
  margin:0;
  padding:0;
  width:${w};
  min-height:${h};
  background:#fff;
  color:#000;
  font-family:Arial,Helvetica,sans-serif;
}
.page{
  width:${w};
  min-height:${h};
  padding:${Math.max(0.8, 1.5*scale)}mm;
  box-sizing:border-box;
}
.card{
  width:100%;
  min-height:100%;
  border:1.2px solid #000;
  box-sizing:border-box;
  background:#fff;
}
.head{
  border-bottom:1.2px solid #000;
  padding:${Math.max(0.6, 1.4*scale)}mm ${Math.max(0.5, 1*scale)}mm ${Math.max(0.5, 1.2*scale)}mm;
  text-align:center;
  font-weight:900;
  line-height:1.18;
  font-size:${headPt}pt;
}
.company{
  display:block;
  margin-bottom:${Math.max(0.4, 1.1*scale)}mm;
}
.body{
  padding:${Math.max(0.5, 1*scale)}mm ${Math.max(0.6, 1.2*scale)}mm ${Math.max(0.6, 1.2*scale)}mm;
  font-size:${bodyPt}pt;
  line-height:1.18;
}
.row{margin-top:${Math.max(0.25, 0.55*scale)}mm}
.result{
  margin-top:${Math.max(0.4, 0.8*scale)}mm;
  font-weight:900;
  font-size:${resultPt}pt;
}
.meta{
  margin-top:${Math.max(0.4, 0.8*scale)}mm;
}
.grid{
  display:grid;
  grid-template-columns:1fr auto;
  gap:${Math.max(0.35, 0.8*scale)}mm;
  align-items:start;
}
.qr{
  width:${qrMm}mm;
  height:${qrMm}mm;
  border:1px solid #000;
}
</style>
</head>
<body>
<div class="page">
  <div class="card">
    <div class="head">
      <span class="company">${esc(data.company)}</span>
      PAT TEST
    </div>
    <div class="body">
      <div class="grid">
        <div>
          <div class="row"><b>Asset:</b> ${esc(data.asset)}</div>
          <div class="row"><b>Appliance:</b> ${esc(data.appliance)}</div>
          <div class="result">${resultLine}</div>
          ${warningHtml}
          <div class="meta"><b>Tested:</b> ${esc(data.tested)}</div>
          <div class="row"><b>Retest:</b> ${esc(data.retest)}</div>
          ${initials ? `<div class="row"><b>By:</b> ${initials}</div>` : ``}
        </div>
        <div><img class="qr" src="${qrUrl}" alt="QR"></div>
      </div>
    </div>
  </div>
</div>
<script>
window.onload = function(){
  setTimeout(function(){ window.print(); }, 250);
};
window.onafterprint = function(){ window.close(); };
</script>
</body>
</html>`;
}

function drawThermalLabel(ctx, canvas, data, qrImg=null, wMm=50, hMm=30){
  const resultLine = data.isFail ? '⚠ FAIL' : '✔ PASS';
  const initials = getEngineerInitials();
  const sx = canvas.width / 900;
  const sy = canvas.height / 540;
  const s = Math.min(sx, sy);

  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(2, 5 * s);
  ctx.strokeRect(10*sx, 10*sy, canvas.width-20*sx, canvas.height-20*sy);

  ctx.lineWidth = Math.max(1.5, 3 * s);
  ctx.beginPath();
  ctx.moveTo(20*sx, 105*sy);
  ctx.lineTo(canvas.width-20*sx, 105*sy);
  ctx.stroke();

  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.max(18, 38*s)}px Arial`;
  ctx.fillText(data.company, canvas.width/2, 50*sy);

  ctx.font = `bold ${Math.max(16, 34*s)}px Arial`;
  ctx.fillText('PAT TEST', canvas.width/2, 90*sy);

  ctx.textAlign = 'left';
  ctx.font = `bold ${Math.max(13, 31*s)}px Arial`;
  ctx.fillText('Asset:', 30*sx, 160*sy);
  ctx.font = `${Math.max(13, 31*s)}px Arial`;
  ctx.fillText(data.asset, 150*sx, 160*sy);

  ctx.font = `bold ${Math.max(13, 31*s)}px Arial`;
  ctx.fillText('Appliance:', 30*sx, 205*sy);
  ctx.font = `${Math.max(13, 31*s)}px Arial`;
  ctx.fillText(data.appliance, 205*sx, 205*sy);

  ctx.font = `bold ${Math.max(16, 40*s)}px Arial`;
  ctx.fillText(resultLine, 30*sx, 260*sy);

  let nextY = 260*sy;

  if(data.isFail){
    ctx.font = `bold ${Math.max(14, 32*s)}px Arial`;
    ctx.fillText('⚠ DO NOT USE', 30*sx, 305*sy);
    nextY = 305*sy;
  }

  ctx.font = `bold ${Math.max(11, 27*s)}px Arial`;
  ctx.fillText('Tested:', 30*sx, nextY + 55*sy);
  ctx.font = `${Math.max(11, 27*s)}px Arial`;
  ctx.fillText(data.tested, 150*sx, nextY + 55*sy);

  ctx.font = `bold ${Math.max(11, 27*s)}px Arial`;
  ctx.fillText('Retest:', 30*sx, nextY + 95*sy);
  ctx.font = `${Math.max(11, 27*s)}px Arial`;
  ctx.fillText(data.retest, 150*sx, nextY + 95*sy);

  if(initials){
    ctx.font = `bold ${Math.max(11, 27*s)}px Arial`;
    ctx.fillText('By:', 30*sx, nextY + 135*sy);
    ctx.font = `${Math.max(11, 27*s)}px Arial`;
    ctx.fillText(initials, 150*sx, nextY + 135*sy);
  }

  if(qrImg){
    const qrW = 145*sx;
    const qrH = 145*sy;
    const qrX = canvas.width - 185*sx;
    const qrY = 140*sy;
    ctx.drawImage(qrImg, qrX, qrY, qrW, qrH);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1, 2*s);
    ctx.strokeRect(qrX, qrY, qrW, qrH);
  }
}

function openLabelPrintWindow(){
  const data = getLabelData();
  if(!data){
    brandedAlert('No label to print');
    return;
  }
  const {w,h,wMm,hMm} = getSelectedLabelSize();
  const win = window.open('', '_blank');
  if(!win){
    brandedAlert('Please allow popups to print the label');
    return;
  }
  const qrUrl = qrImageUrl(data, 180);
  const html = thermalLabelHTML(data, qrUrl, w, h, wMm, hMm);
  win.document.open();
  win.document.write(html);
  win.document.close();
}

function labelCanvasBlob(callback){
  const data = getLabelData();
  if(!data){
    brandedAlert('No label to save');
    return;
  }

  const {wMm, hMm} = getSelectedLabelSize();
  const pxPerMm = 12;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(320, Math.round(wMm * pxPerMm));
  canvas.height = Math.max(180, Math.round(hMm * pxPerMm));
  const ctx = canvas.getContext('2d');

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = ()=>{
    drawThermalLabel(ctx, canvas, data, img, wMm, hMm);
    canvas.toBlob(callback, 'image/png');
  };
  img.onerror = ()=>{
    drawThermalLabel(ctx, canvas, data, null, wMm, hMm);
    canvas.toBlob(callback, 'image/png');
  };
  img.src = qrImageUrl(data, 180);
}

$('printLabelBtn').onclick = ()=>{
  renderLabel();
  openLabelPrintWindow();
};

$('saveLabelBtn').onclick = ()=>{
  labelCanvasBlob((blob)=>{
    if(!blob){
      brandedAlert('Unable to create label image');
      return;
    }
    const a = document.createElement('a');
    const data = getLabelData();
    const fileName = `${data.asset || 'label'}_PAT_Label.png`;
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 500);
  });
};

$('shareLabelBtn').onclick = ()=>{
  labelCanvasBlob(async (blob)=>{
    if(!blob){
      brandedAlert('Unable to create label image');
      return;
    }
    const data = getLabelData();
    const file = new File([blob], `${data.asset || 'label'}_PAT_Label.png`, {type:'image/png'});
    if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
      try{
        await navigator.share({files:[file], title:'PAT Label', text:`PAT label for ${data.asset}`});
      }catch(e){}
    }else{
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${data.asset || 'label'}_PAT_Label.png`;
      document.body.appendChild(a);
      a.click();
      setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 500);
      brandedAlert('Share not supported on this device. Label saved instead.');
    }
  });
};
