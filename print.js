
function getSelectedLabelSize(){
  const w = ($('lblW')?.value || '50') + 'mm';
  const h = ($('lblH')?.value || '30') + 'mm';
  return {w,h};
}

function getEngineerInitials(){
  try{
    const eng = state?.tester?.name || '';
    if(!eng) return '';
    const parts = eng.trim().split(' ');
    if(parts.length===1) return parts[0].substring(0,2).toUpperCase();
    return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  }catch(e){
    return '';
  }
}

function thermalLabelHTML(data, qrUrl, w, h){
  const resultLine = data.isFail ? 'FAIL' : 'PASS';
  const warningHtml = data.isFail
    ? `<div class="failNote">DO NOT USE</div>`
    : '';

  const initials = getEngineerInitials();
  const widthMm = parseFloat(String(w).replace('mm','')) || 50;
  const heightMm = parseFloat(String(h).replace('mm','')) || 30;
  const compact = widthMm <= 40 || heightMm <= 20;

  const assetSize = compact ? '12pt' : '14pt';
  const applianceSize = compact ? '7pt' : '8pt';
  const resultSize = compact ? '13pt' : '16pt';
  const metaSize = compact ? '6pt' : '7pt';
  const qrSize = compact ? '11mm' : '14mm';
  const pad = compact ? '1.2mm' : '1.8mm';

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
  height:${h};
  overflow:hidden;
  background:#fff;
  color:#000;
  font-family:Arial,Helvetica,sans-serif;
}
.label{
  width:100%;
  height:100%;
  border:1.2px solid #000;
  box-sizing:border-box;
  padding:${pad};
  display:grid;
  grid-template-columns:1fr auto;
  gap:${compact ? '1mm' : '1.4mm'};
  align-items:start;
}
.asset{
  font-size:${assetSize};
  font-weight:900;
  line-height:1;
}
.appliance{
  margin-top:0.5mm;
  font-size:${applianceSize};
  line-height:1.1;
}
.result{
  margin-top:${compact ? '0.8mm' : '1.2mm'};
  font-size:${resultSize};
  font-weight:900;
  line-height:1;
}
.failNote{
  margin-top:0.5mm;
  font-size:${metaSize};
  font-weight:900;
  line-height:1;
}
.meta{
  margin-top:${compact ? '0.8mm' : '1.2mm'};
  font-size:${metaSize};
  line-height:1.15;
}
.qr{
  width:${qrSize};
  height:${qrSize};
  display:block;
  border:1px solid #000;
}
</style>
</head>
<body>
<div class="label">
  <div>
    <div class="asset">${esc(data.asset)}</div>
    <div class="appliance">${esc(data.appliance)}</div>
    <div class="result">${resultLine}</div>
    ${warningHtml}
    <div class="meta">
      T: ${esc(data.tested)}<br>
      R: ${esc(data.retest)}<br>
      ${initials ? 'By: ' + esc(initials) : ''}
    </div>
  </div>
  <div><img class="qr" src="${qrUrl}" alt="QR"></div>
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
  const resultLine = data.isFail ? 'FAIL' : 'PASS';
  const initials = getEngineerInitials();

  const compact = canvas.width < 820;
  const pad = compact ? 20 : 28;
  const qrSize = compact ? 170 : 210;
  const leftW = canvas.width - pad*3 - qrSize;

  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, canvas.width-16, canvas.height-16);

  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';

  ctx.font = compact ? 'bold 60px Arial' : 'bold 72px Arial';
  ctx.fillText(data.asset, pad, compact ? 82 : 96);

  ctx.font = compact ? '30px Arial' : '36px Arial';
  const applianceText = String(data.appliance || '');
  if(ctx.measureText(applianceText).width > leftW){
    let short = applianceText;
    while(short.length > 4 && ctx.measureText(short + '…').width > leftW){
      short = short.slice(0, -1);
    }
    ctx.fillText(short + '…', pad, compact ? 126 : 146);
  }else{
    ctx.fillText(applianceText, pad, compact ? 126 : 146);
  }

  ctx.font = compact ? 'bold 62px Arial' : 'bold 76px Arial';
  ctx.fillText(resultLine, pad, compact ? 222 : 252);

  let y = compact ? 222 : 252;
  if(data.isFail){
    ctx.font = compact ? 'bold 26px Arial' : 'bold 32px Arial';
    ctx.fillText('DO NOT USE', pad, y + (compact ? 34 : 42));
    y += compact ? 34 : 42;
  }

  ctx.font = compact ? '24px Arial' : '30px Arial';
  ctx.fillText(`T: ${data.tested}`, pad, y + (compact ? 44 : 56));
  ctx.fillText(`R: ${data.retest}`, pad, y + (compact ? 78 : 96));
  if(initials){
    ctx.fillText(`By: ${initials}`, pad, y + (compact ? 112 : 136));
  }

  if(qrImg){
    const qrX = canvas.width - qrSize - pad;
    const qrY = pad;
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(qrX, qrY, qrSize, qrSize);
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
