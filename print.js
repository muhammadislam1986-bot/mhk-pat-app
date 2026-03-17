
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
  font-size:7pt;
}
.label{
  width:100%;
  height:100%;
  border:2px solid #000;
  padding:2mm;
  box-sizing:border-box;
}
.top{
  text-align:center;
  font-weight:bold;
  font-size:8pt;
  border-bottom:1px solid #000;
  padding-bottom:1mm;
  margin-bottom:1mm;
}
.row{
  display:flex;
  justify-content:space-between;
  align-items:center;
}
.left{
  width:70%;
}
.right{
  width:28%;
}
.qr{
  width:100%;
}
.result{
  font-size:10pt;
  font-weight:bold;
  margin:1mm 0;
}
.fail{
  font-size:8pt;
  font-weight:bold;
}
.small{
  font-size:6pt;
}
</style>
</head>
<body>
<div class="label">
  <div class="top">PAT TEST</div>

  <div class="row">
    <div class="left">
      <div><b>${data.asset}</b></div>
      <div class="small">${data.appliance}</div>

      <div class="result">${result}</div>

      ${data.isFail ? '<div class="fail">DO NOT USE</div>' : ''}

      <div class="small">T: ${data.testDate}</div>
      <div class="small">R: ${data.retestDate}</div>
      <div class="small">${initials}</div>
    </div>

    <div class="right">
      <img class="qr" src="${qrUrl}">
    </div>
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
