
function getCurrentLabelItem(){
  const job = activeJob();
  if(!job) return {job:null,item:null};
  const item = job.items.find(x=>x.id===state.lastLabelItemId) || job.items[0] || null;
  return {job,item};
}

function getLabelData(){
  const {job,item} = getCurrentLabelItem();
  if(!job || !item) return null;
  const isFail = item.result === 'FAIL';
  return {
    company: state.company.name || '',
    asset: item.asset || '',
    appliance: item.appliance || '',
    result: item.result || '',
    tested: fmtDateDMY(job.date),
    retest: nextTest(job),
    isFail,
    headColor: isFail ? '#c62828' : '#14894c',
    resultColor: isFail ? '#c62828' : '#14894c'
  };
}


function qrPayloadFromData(data){
  return [
    'ASSET:' + data.asset,
    'APPLIANCE:' + data.appliance,
    'RESULT:' + data.result,
    'TESTED:' + data.tested,
    'RETEST:' + data.retest
  ].join('\n');
}

function qrImageUrl(data, size=96){
  const payload = encodeURIComponent(qrPayloadFromData(data));
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${payload}`;
}

function buildLabelHTML(data, includeMeta=true){
  if(!data) return '<div class="small">No items to label yet.</div>';
  const meta = includeMeta ? `<div class="small noprint">Selected appliance: ${esc(data.asset)} · ${esc(data.appliance)}</div>` : '';
  const warningHtml = data.isFail
    ? `<div style="margin-top:6px;color:#c62828;font-weight:900;font-size:14px;letter-spacing:.2px">⚠ DO NOT USE</div>`
    : '';

  return `${meta}<div class="labelCard" style="margin-top:10px;border-color:${data.headColor}">
    <div class="labelHead" style="background:${data.headColor}">${esc(data.company)}<br>PAT TEST</div>
    <div style="padding:8px 4px;font-size:13px;line-height:1.35">
      <div style="display:flex;gap:8px;align-items:flex-start">
        <div style="flex:1">
          <div><b>Asset:</b> ${esc(data.asset)}</div>
          <div><b>Appliance:</b> ${esc(data.appliance)}</div>
          <div style="margin-top:4px"><b>Result:</b> <span style="color:${data.resultColor};font-weight:900;font-size:14px">${esc(data.result)}</span></div>
          ${warningHtml}
          <div style="margin-top:6px"><b>Tested:</b> ${esc(data.tested)}</div>
          <div><b>Retest:</b> ${esc(data.retest)}</div>
        </div>
        <div style="flex:0 0 76px;text-align:right">
          <img src="${qrImageUrl(data,96)}" alt="QR Code" style="width:72px;height:72px;border:1px solid #ddd;border-radius:4px;background:#fff">
        </div>
      </div>
    </div>
  </div>`;
}

function renderLabel(){
  const data = getLabelData();
  if(!data){
    const {job,item} = getCurrentLabelItem();
    if(!job){$('labelArea').innerHTML='<div class="small">No active job.</div>'; return}
    if(!item){$('labelArea').innerHTML='<div class="small">No items to label yet.</div>'; return}
  }
  $('labelArea').innerHTML = buildLabelHTML(data, true) + `<div class="labelPreviewNote noprint">Tip: use Save Label or Share Label for Bluetooth and different printers. QR code is included on the label.</div>`;
}
