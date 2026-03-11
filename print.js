
function getSelectedLabelSize(){
  const w = ($('lblW')?.value || '50') + 'mm';
  const h = ($('lblH')?.value || '30') + 'mm';
  return {w,h};
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
  const html = `<!DOCTYPE html>
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
  font-family:Arial,Helvetica,sans-serif;
}
.printWrap{
  width:${w};
  min-height:${h};
  padding:0;
  margin:0;
}
.labelCard{background:#fff;color:#111;border:2px solid ${data.headColor};border-radius:12px;padding:10px;width:100%;box-sizing:border-box}
.labelHead{background:${data.headColor};color:#fff;padding:8px 10px;border-radius:8px;font-weight:bold}
.small{display:none}
</style>
</head>
<body>
<div class="printWrap">${buildLabelHTML(data, false)}</div>
<script>
window.onload = function(){
  setTimeout(function(){ window.print(); }, 250);
};
window.onafterprint = function(){ window.close(); };
</script>
</body>
</html>`;
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
  canvas.height = 520;
  const ctx = canvas.getContext('2d');

  const drawBase = (qrImg=null) => {
    ctx.clearRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle = data.headColor;
    ctx.lineWidth = 6;
    roundRect(ctx, 10, 10, canvas.width-20, canvas.height-20, 26, false, true);

    ctx.fillStyle = data.headColor;
    roundRect(ctx, 28, 28, canvas.width-56, 100, 16, true, false);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(data.company, canvas.width/2, 70);
    ctx.fillText('PAT TEST', canvas.width/2, 112);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 34px Arial';
    ctx.fillText('Asset:', 36, 190);
    ctx.font = '34px Arial';
    ctx.fillText(data.asset, 170, 190);

    ctx.font = 'bold 34px Arial';
    ctx.fillText('Appliance:', 36, 250);
    ctx.font = '34px Arial';
    ctx.fillText(data.appliance, 220, 250);

    ctx.font = 'bold 36px Arial';
    ctx.fillText('Result:', 36, 315);
    ctx.fillStyle = data.resultColor;
    ctx.fillText(data.result, 170, 315);

    if(data.isFail){
      ctx.fillStyle = '#c62828';
      ctx.font = 'bold 34px Arial';
      ctx.fillText('⚠ DO NOT USE', 36, 370);
    }

    ctx.fillStyle = '#111111';
    ctx.font = 'bold 30px Arial';
    ctx.fillText('Tested:', 36, 430);
    ctx.font = '30px Arial';
    ctx.fillText(data.tested, 170, 430);

    ctx.font = 'bold 30px Arial';
    ctx.fillText('Retest:', 36, 475);
    ctx.font = '30px Arial';
    ctx.fillText(data.retest, 170, 475);

    if(qrImg){
      ctx.drawImage(qrImg, 700, 150, 150, 150);
      ctx.strokeStyle = '#dddddd';
      ctx.lineWidth = 2;
      ctx.strokeRect(700, 150, 150, 150);
    }

    canvas.toBlob(callback, 'image/png');
  };

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = ()=> drawBase(img);
  img.onerror = ()=> drawBase(null);
  img.src = qrImageUrl(data, 180);
}

function roundRect(ctx, x, y, w, h, r, fill, stroke){
  if (typeof r === 'number') r = {tl:r, tr:r, br:r, bl:r};
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
  ctx.lineTo(x + r.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
  if(fill) ctx.fill();
  if(stroke) ctx.stroke();
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
