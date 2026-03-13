
function getSelectedLabelSize(){
  const w = ($('lblW')?.value || '50') + 'mm';
  const h = ($('lblH')?.value || '30') + 'mm';
  return {w,h};
}

function thermalLabelHTML(data, qrUrl, w, h){
  const resultLine = data.isFail ? '⚠ FAIL' : '✔ PASS';
  const warningHtml = data.isFail
    ? `<div style="margin-top:6px;font-weight:900;font-size:13px">⚠ DO NOT USE</div>`
    : '';

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
  border-radius:0;
  box-sizing:border-box;
  background:#fff;
}
.head{
  border-bottom:1.2px solid #000;
  padding:1.2mm 1mm .8mm;
  text-align:center;
  font-weight:900;
  line-height:1.15;
  font-size:9pt;
}
.body{
  padding:1mm 1.2mm 1.2mm;
  font-size:7pt;
  line-height:1.25;
}
.row{margin-top:.6mm}
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
    <div class="head">${esc(data.company)}<br>PAT TEST</div>
    <div class="body">
      <div class="grid">
        <div>
          <div class="row"><b>Asset:</b> ${esc(data.asset)}</div>
          <div class="row"><b>Appliance:</b> ${esc(data.appliance)}</div>
          <div class="result">${resultLine}</div>
          ${warningHtml}
          <div class="meta"><b>Tested:</b> ${esc(data.tested)}</div>
          <div class="row"><b>Retest:</b> ${esc(data.retest)}</div>
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

function drawThermalLabel(ctx, canvas, data, qrImg=null){
  const resultLine = data.isFail ? '⚠ FAIL' : '✔ PASS';

  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 5;
  ctx.strokeRect(10, 10, canvas.width-20, canvas.height-20);

  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(20, 90);
  ctx.lineTo(canvas.width-20, 90);
  ctx.stroke();

  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.font = 'bold 40px Arial';
  ctx.fillText(data.company, canvas.width/2, 50);
  ctx.fillText('PAT TEST', canvas.width/2, 84);

  ctx.textAlign = 'left';
  ctx.font = 'bold 31px Arial';
  ctx.fillText('Asset:', 30, 145);
  ctx.font = '31px Arial';
  ctx.fillText(data.asset, 150, 145);

  ctx.font = 'bold 31px Arial';
  ctx.fillText('Appliance:', 30, 192);
  ctx.font = '31px Arial';
  ctx.fillText(data.appliance, 205, 192);

  ctx.font = 'bold 40px Arial';
  ctx.fillText(resultLine, 30, 250);

  let nextY = 250;
  if(data.isFail){
    ctx.font = 'bold 32px Arial';
    ctx.fillText('⚠ DO NOT USE', 30, 300);
    nextY = 300;
  }

  ctx.font = 'bold 27px Arial';
  ctx.fillText('Tested:', 30, nextY + 55);
  ctx.font = '27px Arial';
  ctx.fillText(data.tested, 150, nextY + 55);

  ctx.font = 'bold 27px Arial';
  ctx.fillText('Retest:', 30, nextY + 95);
  ctx.font = '27px Arial';
  ctx.fillText(data.retest, 150, nextY + 95);

  if(qrImg){
    ctx.drawImage(qrImg, canvas.width - 185, 118, 145, 145);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width - 185, 118, 145, 145);
  }
}

function labelCanvasBlob(callback){
  const data = getLabelData();
  if(!data){
    brandedAlert('No label to save');
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 520;
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
    const fileName = `${data.asset || 'label'}.png`;
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
    const file = new File([blob], `${data.asset || 'label'}.png`, {type:'image/png'});
    if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
      try{
        await navigator.share({files:[file], title:'PAT Label', text:`PAT label for ${data.asset}`});
      }catch(e){}
    }else{
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${data.asset || 'label'}.png`;
      document.body.appendChild(a);
      a.click();
      setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 500);
      brandedAlert('Share not supported on this device. Label saved instead.');
    }
  });
};
