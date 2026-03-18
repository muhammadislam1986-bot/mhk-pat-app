
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
  const initials = getEngineerInitials();

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
@page { size: ${w} ${h}; margin:0; }
html,body{
  margin:0;
  padding:0;
  width:${w};
  height:${h};
  font-family:Arial;
}
.label{
  width:100%;
  height:100%;
  border:2px solid #000;
  box-sizing:border-box;
  padding:2mm;
  display:flex;
  justify-content:space-between;
}
.left{
  width:65%;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
}
.asset{
  font-size:12pt;
  font-weight:bold;
}
.appliance{
  font-size:8pt;
}
.result{
  font-size:14pt;
  font-weight:bold;
}
.small{
  font-size:7pt;
}
.right{
  width:30%;
  display:flex;
  align-items:center;
}
.qr{
  width:100%;
}
</style>
</head>
<body>
<div class="label">
  <div class="left">
    <div>
      <div class="asset">${data.asset}</div>
      <div class="appliance">${data.appliance}</div>
    </div>

    <div>
      <div class="result">${resultLine}</div>
      ${data.isFail ? '<div class="small">DO NOT USE</div>' : ''}
    </div>

    <div class="small">
      T: ${data.tested}<br>
      R: ${data.retest}<br>
      ${initials}
    </div>
  </div>

  <div class="right">
    <img class="qr" src="${qrUrl}">
  </div>
</div>

<script>
window.onload = function(){
  setTimeout(()=>window.print(),200);
};
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
  const resultLine = data.isFail ? '⚠ FAIL' : '✔ PASS';
  const initials = getEngineerInitials();

  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 5;
  ctx.strokeRect(10, 10, canvas.width-20, canvas.height-20);

  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(20, 105);
  ctx.lineTo(canvas.width-20, 105);
  ctx.stroke();

  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.font = 'bold 38px Arial';
  ctx.fillText(data.company, canvas.width/2, 50);

  ctx.font = 'bold 34px Arial';
  ctx.fillText('PAT TEST', canvas.width/2, 90);

  ctx.textAlign = 'left';
  ctx.font = 'bold 31px Arial';
  ctx.fillText('Asset:', 30, 160);
  ctx.font = '31px Arial';
  ctx.fillText(data.asset, 150, 160);

  ctx.font = 'bold 31px Arial';
  ctx.fillText('Appliance:', 30, 205);
  ctx.font = '31px Arial';
  ctx.fillText(data.appliance, 205, 205);

  ctx.font = 'bold 40px Arial';
  ctx.fillText(resultLine, 30, 260);

  let nextY = 260;

  if(data.isFail){
    ctx.font = 'bold 32px Arial';
    ctx.fillText('⚠ DO NOT USE', 30, 305);
    nextY = 305;
  }

  ctx.font = 'bold 27px Arial';
  ctx.fillText('Tested:', 30, nextY + 55);
  ctx.font = '27px Arial';
  ctx.fillText(data.tested, 150, nextY + 55);

  ctx.font = 'bold 27px Arial';
  ctx.fillText('Retest:', 30, nextY + 95);
  ctx.font = '27px Arial';
  ctx.fillText(data.retest, 150, nextY + 95);

  if(initials){
    ctx.font = 'bold 27px Arial';
    ctx.fillText('By:', 30, nextY + 135);
    ctx.font = '27px Arial';
    ctx.fillText(initials, 150, nextY + 135);
  }

  if(qrImg){
    ctx.drawImage(qrImg, canvas.width - 185, 140, 145, 145);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width - 185, 140, 145, 145);
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
  canvas.width = 900;
  canvas.height = 540;
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
