$('printLabelBtn').onclick = ()=>{
  renderLabel();
  const w = ($('lblW').value || '50') + 'mm';
  const h = ($('lblH').value || '30') + 'mm';
  document.body.classList.add('print-label');
  document.body.style.setProperty('--print-label-width', w);
  document.body.style.setProperty('--print-label-height', h);

  let style = document.getElementById('labelPrintStyle');
  if(style) style.remove();
  style = document.createElement('style');
  style.id = 'labelPrintStyle';
  style.textContent = `@page { size: ${w} ${h}; margin: 0; }`;
  document.head.appendChild(style);

  setTimeout(()=>window.print(), 100);
};

window.addEventListener('afterprint', ()=>{
  document.body.classList.remove('print-label');
  const style = document.getElementById('labelPrintStyle');
  if(style) style.remove();
});
