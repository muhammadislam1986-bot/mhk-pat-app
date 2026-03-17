
function getSelectedLabelSize(){
  const width = parseInt(($('lblW')?.value || '50'), 10) || 50;
  const height = parseInt(($('lblH')?.value || '30'), 10) || 30;
  return { width, height, w: width + 'mm', h: height + 'mm' };
}

function getEngineerInitials(){
  try{
    const eng = state?.tester?.name || '';
    if(!eng) return '';
    const parts = eng.trim().split(' ').filter(Boolean);
    if(parts.length===1) return parts[0].substring(0,2).toUpperCase();
    return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  }catch(e){
    return '';
  }
}

function getLabelProfile(width, height){
  const compact = height <= 20 || width <= 40;
  return compact ? {
    compact: true,
    pagePad: 0.8,
    headerFont: 7.6,
    titleFont: 6.6,
    bodyFont: 5.4,
    resultFont: 8.8,
    failFont: 6.4,
    qrMm: 10.5,
    rowGap: 0.45,
    companyGap: 0.5
  } : {
    compact: false,
    pagePad: 1.2,
    headerFont: 8.8,
    titleFont: 7.4,
    bodyFont: 6.3,
    resultFont: 10.5,
    failFont: 7.2,
    qrMm: 12.5,
    rowGap: 0.7,
    companyGap: 0.9
  };
}

function thermalLabelHTML(data, qrUrl, width, height){
  const initials = getEngineerInitials();
  const p = getLabelProfile(width, height);
  const resultText = data.isFail ? 'FAIL' : 'PASS';
  const resultColor = '#000';
  const failBlock = data.isFail
    ? `<div class="failText">⚠ DO NOT USE</div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Label Print</title>
<style>
@page { size: ${width}mm ${height}mm; margin:0; }
html,body{
  margin:0;
  padding:0;
  width:${width}mm;
  min-height:${height}mm;
  background:#fff;
  color:#000;
  font-family:Arial,Helvetica,sans-serif;
}
.page{
  width:${width}mm;
  min-height:${height}mm;
  padding:${p.pagePad}mm;
  box-sizing:border-box;
}
.card{
  width:100%;
  min-height:100%;
  border:0.5mm solid #000;
  box-sizing:border-box;
  background:#fff;
}
.head{
  border-bottom:0.35mm solid #000;
  padding:${p.compact ? '0.6mm .8mm 0.5mm' : '0.9mm 1mm 0.8mm'};
  text-align:center;
  font-weight:900;
  line-height:1.05;
}
.company{
  display:block;
  font-size:${p.headerFont}pt;
  margin-bottom:${p.companyGap}mm;
}
.title{
  display:block;
  font-size:${p.titleFont}pt;
}
.body{
  padding:${p.compact ? '0.7mm 0.9mm 0.9mm' : '0.9mm 1.1mm 1mm'};
  font-size:${p.bodyFont}pt;
  line-height:1.08;
}
.grid{
  display:grid;
  grid-template-columns:1fr auto;
  gap:${p.compact ? '0.6mm' : '1mm'};
  align-items:start;
}
.qrWrap{
  width:${p.qrMm}mm;
  flex:0 0 ${p.qrMm}mm;
}
.qr{
  width:${p.qrMm}mm;
  height:${p.qrMm}mm;
  display:block;
  border:0.28mm solid #000;
}
.row{
  margin-top:${p.rowGap}mm;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.row b{
  font-weight:900;
}
.result{
  margin-top:${p.compact ? '0.8mm' : '1mm'};
  font-size:${p.resultFont}pt;
  font-weight:900;
  line-height:1;
  color:${resultColor};
}
.failText{
  margin-top:${p.compact ? '0.4mm' : '0.5mm'};
  font-size:${p.failFont}pt;
  font-weight:900;
  line-height:1;
}
.meta{
  margin-top:${p.compact ? '0.7mm' : '0.9mm'};
}
</style>
</head>
<body>
<div class="page">
  <div class="card">
    <div class="head">
      <span class="company">${esc(data.company)}</span>
      <span class="title">PAT TEST</span>
    </div>
    <div class="body">
      <div class="grid">
        <div>
          <div class="row"><b>Asset:</b> ${esc(data.asset)}</div>
          <div class="row"><b>Appliance:</b> ${esc(data.appliance)}</div>
          <div class="result">${data.isFail ? '⚠ ' : '✔ '}${resultText}</div>
          ${failBlock}
          <div class="meta row"><b>T:</b> ${esc(data.tested)}</div>
          <div class="row"><b>R:</b> ${esc(data.retest)}</div>
          ${initials ? `<div class="row"><b>By:</b> ${initials}</div>` : ``}
        </div>
        <div class="qrWrap"><img class="qr" src="${qrUrl}" alt="QR"></div>
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

function drawThermalLabel(ctx, canvas, data, qrImg=null, width=50, height=30){
  const p = getLabelProfile(width, height);
  const initials = getEngineerInitials();

  const W = canvas.width;
  const H = canvas.height;
  const m = Math.round(W * 0.02);
  const border = Math.max(2, Math.round(W * 0.0045));
  const headH = Math.round(H * (p.compact ? 0.22 : 0.24));
  const innerX = m + Math.round(W * 0.018);
  const innerY = headH + Math.round(H * 0.03);

  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0,0,W,H);

  ctx.strokeStyle = '#000';
  ctx.lineWidth = border;
  ctx.strokeRect(m, m, W - (m*2), H - (m*2));

  ctx.lineWidth = Math.max(1, Math.round(border * 0.7));
  ctx.beginPath();
  ctx.moveTo(m, headH);
  ctx.lineTo(W - m, headH);
  ctx.stroke();

  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `bold ${Math.round(H * (p.compact ? 0.09 : 0.085))}px Arial`;
  ctx.fillText(data.company, W/2, m + Math.round(H * 0.085));
  ctx.font = `bold ${Math.round(H * (p.compact ? 0.075 : 0.07))}px Arial`;
  ctx.fillText('PAT TEST', W/2, m + Math.round(H * 0.155));

  const qrSize = Math.round(Math.min(W, H) * (p.compact ? 0.29 : 0.27));
  const qrX = W - m - qrSize - Math.round(W * 0.02);
  const qrY = innerY + Math.round(H * 0.01);
  const leftW = qrX - innerX - Math.round(W * 0.02);

  let y = innerY + Math.round(H * (p.compact ? 0.05 : 0.06));
  const drawRow = (label, value, boldValue=false) => {
    ctx.textAlign = 'left';
    ctx.font = `bold ${Math.round(H * (p.compact ? 0.07 : 0.065))}px Arial`;
    ctx.fillText(label, innerX, y);
    const offset = Math.round(leftW * 0.34);
    ctx.font = `${boldValue ? 'bold ' : ''}${Math.round(H * (p.compact ? 0.07 : 0.065))}px Arial`;
    ctx.fillText(String(value || ''), innerX + offset, y);
    y += Math.round(H * (p.compact ? 0.095 : 0.105));
  };

  drawRow('Asset:', data.asset);
  drawRow('Appliance:', data.appliance);

  ctx.font = `bold ${Math.round(H * (p.compact ? 0.10 : 0.095))}px Arial`;
  ctx.fillText(`${data.isFail ? '⚠ ' : '✔ '}${data.isFail ? 'FAIL' : 'PASS'}`, innerX, y);
  y += Math.round(H * (p.compact ? 0.11 : 0.12));

  if(data.isFail){
    ctx.font = `bold ${Math.round(H * (p.compact ? 0.072 : 0.07))}px Arial`;
    ctx.fillText('⚠ DO NOT USE', innerX, y);
    y += Math.round(H * (p.compact ? 0.09 : 0.10));
  }

  ctx.font = `bold ${Math.round(H * (p.compact ? 0.062 : 0.06))}px Arial`;
  ctx.fillText('T:', innerX, y);
  ctx.font = `${Math.round(H * (p.compact ? 0.062 : 0.06))}px Arial`;
  ctx.fillText(data.tested, innerX + Math.round(leftW * 0.16), y);
  y += Math.round(H * (p.compact ? 0.085 : 0.09));

  ctx.font = `bold ${Math.round(H * (p.compact ? 0.062 : 0.06))}px Arial`;
  ctx.fillText('R:', innerX, y);
  ctx.font = `${Math.round(H * (p.compact ? 0.062 : 0.06))}px Arial`;
  ctx.fillText(data.retest, innerX + Math.round(leftW * 0.16), y);
  y += Math.round(H * (p.compact ? 0.085 : 0.09));

  if(initials){
    ctx.font = `bold ${Math.round(H * (p.compact ? 0.062 : 0.06))}px Arial`;
    ctx.fillText('By:', innerX, y);
    ctx.font = `${Math.round(H * (p.compact ? 0.062 : 0.06))}px Arial`;
    ctx.fillText(initials, innerX + Math.round(leftW * 0.16), y);
  }

  if(qrImg){
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    ctx.lineWidth = Math.max(1, Math.round(border * 0.5));
    ctx.strokeRect(qrX, qrY, qrSize, qrSize);
  }
}

function openLabelPrintWindow(){
  const data = getLabelData();
  if(!data){
    brandedAlert('No label to print');
    return;
  }
  const {width, height} = getSelectedLabelSize();
  const win = window.open('', '_blank');
  if(!win){
    brandedAlert('Please allow popups to print the label');
    return;
  }
  const qrUrl = qrImageUrl(data, 180);
  const html = thermalLabelHTML(data, qrUrl, width, height);
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

  const {width, height} = getSelectedLabelSize();
  const scale = 16;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(640, width * scale * 2);
  canvas.height = Math.max(320, height * scale * 2);
  const ctx = canvas.getContext('2d');

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = ()=>{
    drawThermalLabel(ctx, canvas, data, img, width, height);
    canvas.toBlob(callback, 'image/png');
  };
  img.onerror = ()=>{
    drawThermalLabel(ctx, canvas, data, null, width, height);
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
