(function () {
  var _wired = false;
  function wire() {
    if (_wired) return;
    _wired = true;

    var navCta = document.querySelector('.nav a.cta');
    if (navCta) {
      navCta.href = '/app/';
      navCta.addEventListener('click', function (e) {
        e.preventDefault();
        location.href = '/app/';
      });
    }

    var heroButtons = document.querySelectorAll('.hero .btn');
    heroButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        location.href = '/app/';
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
