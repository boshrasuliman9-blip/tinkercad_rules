// كود بسيط لإضافة تفاعل عند الضغط
        document.querySelectorAll('.level-btn:not(.level-4)').forEach(btn => {
            btn.addEventListener('click', function() {
                const level = this.innerText.trim().split('\n')[0];
                alert('جاري تحميل المرحلة رقم: ' + level);
            });
        });

(function(){
  var b=document.getElementById('themeToggle');
  var s=localStorage.getItem('cq-theme');
  if(s==='dark'){document.documentElement.setAttribute('data-theme','dark');b.textContent='☀️';}
  b.addEventListener('click',function(){
    var d=document.documentElement.getAttribute('data-theme')==='dark';
    if(d){document.documentElement.removeAttribute('data-theme');b.textContent='🌙';localStorage.setItem('cq-theme','light');}
    else{document.documentElement.setAttribute('data-theme','dark');b.textContent='☀️';localStorage.setItem('cq-theme','dark');}
  });
})();
