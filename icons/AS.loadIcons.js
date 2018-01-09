(function() {
  function injectSVG() {
    // 200 for web servers, 0 for CEP panels
    if (this.status !== 200 && this.status !== 0) {
      console.error('Icons: Failed to fetch icons, server returned ' + this.status);
      return;
    }

    // Parse the SVG
    var parser = new DOMParser();
    try {
      var doc = parser.parseFromString(this.responseText, 'image/svg+xml');
      var svg = doc.firstChild;
    }
    catch (err) {
      console.error('Icons: Error parsing icon SVG sprite: ' + err);
      return;
    }

    // Make sure a real SVG was returned
    if (svg && svg.tagName === 'svg') {
      // Hide the element
      svg.style.display = 'none';

      // Insert it into the head
      document.head.insertBefore(svg, null);
    }
    else {
      console.error('Icons: Parse SVG document contained something other than a SVG');
    }
  }

  function loadIcons(svgURL) {
    // Request the SVG sprite
    var req = new XMLHttpRequest();
    req.open('GET', svgURL, true);
    req.addEventListener('load', injectSVG);
    req.addEventListener('error', function(event) {
      console.log('Icons: Request failed');
    });
    req.send();
  }

  window.$AS = window.AdobeSpectrum = window.AdobeSpectrum || {};
  AdobeSpectrum.loadIcons = loadIcons;
}());
