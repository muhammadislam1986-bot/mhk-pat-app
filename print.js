
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
  const initials = getEngineerInitials();
  const result = data.isFail ? 'FAIL' : 'PASS';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
@page { size: ${w} ${h}; margin:0; }
body{
  margin:0;
  font-family:Arial;
}
.label{
  width:100%;
  height:100%;
  border:2px solid #000;
  padding:2mm;
  box-sizing:border-box;
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
.fail{
  font-size:8pt;
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
      <div class="result">${result}</div>
      ${data.isFail ? '<div class="fail">DO NOT USE</div>' : ''}
    </div>

    <div class="small">
      T: ${data.testDate}<br>
      R: ${data.retestDate}<br>
      ${initials}
    </div>
  </div>

  <div class="right">
    <img class="qr" src="${qrUrl}">
  </div>
</div>

<script>
window.onload = function(){
  setTimeout(()=>window.print(),300);
};
</script>

</body>
</html>`;
}
