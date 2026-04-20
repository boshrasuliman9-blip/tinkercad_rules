(function(){
  var b=document.getElementById('themeToggle');
  var s=localStorage.getItem('cq-theme');
  if(s==='dark'){document.documentElement.setAttribute('data-theme','dark');b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>';}
  b.addEventListener('click',function(){
    var d=document.documentElement.getAttribute('data-theme')==='dark';
    if(d){document.documentElement.removeAttribute('data-theme');b.innerHTML='<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="16" height="16"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';localStorage.setItem('cq-theme','light');}
    else{document.documentElement.setAttribute('data-theme','dark');b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>';localStorage.setItem('cq-theme','dark');}
  });
})();

