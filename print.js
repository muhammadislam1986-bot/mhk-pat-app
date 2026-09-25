
function getSelectedLabelSize(){
  const w = ($('lblW')?.value || '50') + 'mm';
  const h = ($('lblH')?.value || '30') + 'mm';
  return {w,h};
}

function getEngineerInitials(){
  try{
    const eng = state?.tester?.name || (typeof activeJob === 'function' ? activeJob()?.engineer : '') || '';
    if(!eng) return '';
    const parts = eng.trim().split(' ').filter(Boolean);
    if(parts.length===0) return '';
    if(parts.length===1) return parts[0].substring(0,2).toUpperCase();
    return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  }catch(e){
    return '';
  }
}

function thermalLabelHTML(data, qrUrl, w, h){
  const resultLine = data.isFail ? '⚠ FAIL' : '✔ PASS';
  const warningHtml = data.isFail
    ? `<div style="margin-top:6px;font-weight:900;font-size:13px">⚠ DO NOT USE</div>`
    : '';

  const initials = getEngineerInitials();

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
  padding:1.5mm;
  box-sizing:border-box;
}
.card{
  width:100%;
  min-height:100%;
  border:1.2px solid #000;
  box-sizing:border-box;
}
.head{
  border-bottom:1.2px solid #000;
  padding:1.4mm 1mm 1.2mm;
  text-align:center;
  font-weight:900;
  line-height:1.35;
  font-size:9pt;
}
.company{
  display:block;
  margin-bottom:1.4mm;
}
.body{
  padding:1mm 1.2mm 1.2mm;
  font-size:7pt;
  line-height:1.3;
}
.row{margin-top:.7mm}
.result{
  margin-top:1mm;
  font-weight:900;
  font-size:10pt;
}
.meta{
  margin-top:1mm;
}
.grid{
  display:grid;
  grid-template-columns:1fr auto;
  gap:1mm;
  align-items:start;
}
.qr{
  width:13mm;
  height:13mm;
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

function drawThermalLabel(ctx, canvas, data, qrImg=null){
  // High-contrast monochrome layout optimised for 50 x 30 mm thermal labels.
  // This function is used only by Save Label / Share Label image generation.
  const initials = getEngineerInitials();
  const company = String(data.company || 'MHK Building Solutions Ltd');
  const W = canvas.width;
  const H = canvas.height;
  const sx = W / 900;
  const sy = H / 540;
  const S = Math.min(sx, sy);
  const X = n => n * sx;
  const Y = n => n * sy;
  const F = n => Math.max(1, Math.round(n * S));

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = F(5);
  ctx.strokeRect(X(12), Y(12), W-X(24), H-Y(24));
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const left = X(32);
  const qrSize = Math.min(X(222), Y(222));
  const qrX = W - X(32) - qrSize;
  const qrY = Y(32);
  const textRight = qrX - X(22);
  const textWidth = textRight - left;

  // Professional, printer-safe sans-serif stack. Canvas uses the first available font.
  const font = 'Arial, Helvetica, sans-serif';
  const heavy = 'Arial Black, Arial, Helvetica, sans-serif';

  // Company name: deliberately large and bold for clear branding.
  let companySize = F(43);
  ctx.font = `900 ${companySize}px ${heavy}`;
  while(ctx.measureText(company).width > textWidth && companySize > F(28)){
    companySize -= 1;
    ctx.font = `900 ${companySize}px ${heavy}`;
  }
  ctx.fillText(company, left, Y(72));

  ctx.font = `700 ${F(25)}px ${font}`;
  ctx.fillText('PORTABLE APPLIANCE TESTING (PAT)', left, Y(108));

  // Asset number is the primary identifier.
  ctx.font = `900 ${F(76)}px ${heavy}`;
  ctx.fillText(String(data.asset || ''), left, Y(205));

  // Appliance description.
  ctx.font = `700 ${F(38)}px ${font}`;
  wrapText(ctx, String(data.appliance || ''), left, Y(254), textWidth, Y(42), 1);

  // PASS / FAIL banner: black-and-white so meaning never depends on colour.
  const boxX = left;
  const boxY = Y(282);
  const boxW = textWidth;
  const boxH = data.isFail ? Y(112) : Y(92);
  const radius = F(12);
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, radius);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${F(data.isFail ? 56 : 62)}px ${heavy}`;
  ctx.textAlign = 'center';
  ctx.fillText(data.isFail ? '✕  FAIL' : '✓  PASS', boxX + boxW/2, boxY + Y(data.isFail ? 64 : 64));
  if(data.isFail){
    ctx.font = `900 ${F(27)}px ${heavy}`;
    ctx.fillText('DO NOT USE', boxX + boxW/2, boxY + Y(98));
  }

  // Dates remain large enough to read at arm's length.
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.font = `700 ${F(28)}px ${font}`;
  const dateY1 = data.isFail ? Y(430) : Y(410);
  const dateY2 = data.isFail ? Y(474) : Y(454);
  ctx.fillText(`Tested: ${String(data.tested || '')}`, left, dateY1);
  ctx.fillText(`Retest: ${String(data.retest || '')}`, left, dateY2);
  if(initials){
    ctx.font = `700 ${F(21)}px ${font}`;
    ctx.fillText(`By: ${initials}`, left, Y(505));
  }

  // Large QR with a clean white quiet zone for reliable scanning.
  if(qrImg){
    const quiet = X(9);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(qrX-quiet, qrY-quiet, qrSize+quiet*2, qrSize+quiet*2);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    ctx.imageSmoothingEnabled = true;
  }
}

function openLabelPrintWindow(){
  const data = getLabelData();
  if(!data){
    brandedAlert('No label to print');
    return;
  }
  const {w,h} = getSelectedLabelSize();
  const win = window.open('', '_blank');
  if(!win){
    brandedAlert('Please allow popups to print the label');
    return;
  }
  const qrUrl = qrImageUrl(data, 180);
  const html = thermalLabelHTML(data, qrUrl, w, h);
  win.document.open();
  win.document.write(html);
  win.document.close();
}


function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines){
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if(!words.length) return;
  let line = '';
  let lines = [];
  for(const word of words){
    const test = line ? line + ' ' + word : word;
    if(ctx.measureText(test).width > maxWidth && line){
      lines.push(line);
      line = word;
      if(lines.length >= maxLines - 1) break;
    }else{
      line = test;
    }
  }
  if(line) lines.push(line);
  lines = lines.slice(0, maxLines);
  if(words.join(' ') !== lines.join(' ')){
    let last = lines[lines.length - 1];
    while(ctx.measureText(last + '…').width > maxWidth && last.length > 1){
      last = last.slice(0, -1);
    }
    lines[lines.length - 1] = last + '…';
  }
  lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * lineHeight));
}

function labelCanvasBlob(callback){
  const data = getLabelData();
  if(!data){
    brandedAlert('No label to save');
    return;
  }

  const canvas = document.createElement('canvas');
  const size = getSelectedLabelSize();
  const widthMm = parseFloat(String(size.w).replace('mm','')) || 50;
  const heightMm = parseFloat(String(size.h).replace('mm','')) || 30;
  const scale = 18;
  canvas.width = Math.max(720, Math.round(widthMm * scale));
  canvas.height = Math.max(360, Math.round(heightMm * scale));
  const ctx = canvas.getContext('2d');

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = ()=>{
    drawThermalLabel(ctx, canvas, data, img);
    canvas.toBlob(callback, 'image/png');
  };
  img.onerror = ()=>{
    drawThermalLabel(ctx, canvas, data, null);
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
