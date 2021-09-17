/*!
  Copyright (c) 2021 Momo Bassit.
  Licensed under the MIT License (MIT), see
  https://github.com/mdbassit/Verdigris
*/

(() => {
  const ctx = document.createElement('canvas').getContext('2d');
  const currentColor = { r: 0, g: 0, b: 0, a: 1 };
  let picker, container, colorArea, colorMarker, colorPreview, colorValue,
      hueSlider, hueMarker, alphaSlider, alphaMarker, currentEl, dimensions, margin = 5; 

  function configure(options) {
    if (typeof options !== 'object') {
      return;
    }

    for (const key in options) {
      switch (key) {
        case 'el':
          attach(options[key]);
          break;
        case 'parent':
          container = document.querySelector(options[key]);
          container.appendChild(picker);
          break;
        case 'theme':
          picker.setAttribute('class', `vdg-picker vdg-${options[key]}`);
          break;
        case 'margin':
          options[key] = Number(options[key]);
          margin = !isNaN(options[key]) ? options[key] : margin;
          break;
        case 'wrap':
          if (options.el && options[key]) {
            wrapFields(options.el);
          }
          break;
      }
    }
  }

  function attach(selector) {
    const matches = Element.prototype.matches;

    // Show the color picker on click on the field
    addListener(document, 'click', event => {
      if (matches.call(event.target, selector)) {
        const coords = event.target.getBoundingClientRect();
        let offset = { x: 0, y: 0 };
        let left = coords.x;
        let top =  window.scrollY + coords.y + coords.height + margin;

        currentEl = event.target;
        picker.style.display = 'block';

        if (container) {
          const style = window.getComputedStyle(container);
          const marginTop = parseFloat(style.marginTop);
          const borderTop = parseFloat(style.borderTopWidth);

          offset = container.getBoundingClientRect();
          offset.y += borderTop;
          left -= offset.x;
          top = top + container.scrollTop - offset.y;

          if (top + picker.offsetHeight >  container.clientHeight  + container.scrollTop - marginTop) {
            top -= coords.height + picker.offsetHeight + margin * 2;        
          }
        } else {
          if (top + picker.offsetHeight > document.documentElement.clientHeight) {
            top = window.scrollY + coords.y - picker.offsetHeight - margin;        
          }
        }

        picker.style.left = `${left}px`;
        picker.style.top = `${top}px`;
        dimensions = {
          width: colorArea.offsetWidth,
          height: colorArea.offsetHeight,
          x: picker.offsetLeft + offset.x,
          y: picker.offsetTop + offset.y
        };

        setColorFromStr(currentEl.value);
      }
    });

    // Set the color of the parent of the field to the picked color
    addListener(document, 'input', event => {
      if (matches.call(event.target, selector)) {
        const parent = event.target.parentNode;

        if (parent.classList.contains('vdg-field')) {
          parent.style.color = event.target.value;
        }
      }
    });
  }

  function wrapFields(selector) {
    document.querySelectorAll(selector).forEach(field => {
      field.outerHTML = `<div class="vdg-field" style="color: ${field.value};">${field.outerHTML}</div>`;
    });
  }

  function dettach() {
    picker.style.display = 'none';

    if (currentEl) {
      currentEl.dispatchEvent(new Event('change', {bubbles: true}));
      currentEl = null;
    }
  }

  function setColorFromStr(str) {
    const rgba = strToRGBA(str);
    const hsva = RGBAtoHSVA(rgba);
    const hex = getHex(rgba);

    setRGBA(rgba);
    setHex(hex);
    updateUI(hsva);
  }

  function pickColor() {
    if (currentEl) {
      currentEl.value = colorValue.value;
      currentEl.dispatchEvent(new Event('input', {bubbles: true}));
    }
  }

  function updateColor(x, y) {
    const hsva = {
      h: hueSlider.value * 1,
      s: x / dimensions.width * 100,
      v: 100 - (y / dimensions.height * 100),
      a: alphaSlider.value * 1
    };
    const rgba = HSVAtoRGBA(hsva);
    const hex = getHex(rgba);

    setRGBA(rgba);
    setHex(hex);
    pickColor();
  }

  function moveMarker(event) {
    let x = event.pageX - dimensions.x;
    let y = event.pageY - dimensions.y;

    if (container) {
      y += container.scrollTop;
    }

    x = (x < 0) ? 0 : (x > dimensions.width) ? dimensions.width : x;
    y = (y < 0) ? 0 : (y > dimensions.height) ? dimensions.height : y;

    colorMarker.style.left = `${x}px`;
    colorMarker.style.top = `${y}px`;

    updateColor(x, y);
  }

  function setRGBA(rgba) {
    currentColor.r = rgba.r;
    currentColor.g = rgba.g;
    currentColor.b = rgba.b;
    currentColor.a = rgba.a;
  }

  function setHex(hex) {
    colorPreview.style.color = hex;
    colorValue.value = hex;
  }

  function setAlpha() {
    const alpha = alphaSlider.value;

    alphaMarker.style.color = `rgba(0,0,0,${alpha})`;
    alphaMarker.style.left = `${alpha * 100}%`;
    currentColor.a = alpha;

    setHex(getHex(currentColor));
    pickColor();
  }

  function updateUI(hsva) {
    if (hsva) {
      hueSlider.value = hsva.h;
      colorMarker.style.left = `${dimensions.width * hsva.s / 100}px`;
      colorMarker.style.top = `${100 - (dimensions.height * hsva.v / 100)}px`;
      alphaSlider.value = hsva.a;

    // Update the picker color when the hue slider is moved  
    } else {
      const x = Number(colorMarker.style.left.replace('px', ''));
      const y =  Number(colorMarker.style.top.replace('px', ''));
      updateColor(x, y);
    }

    picker.style.color = `hsl(${hueSlider.value}, 100%, 50%)`;
    hueMarker.style.left = `${hueSlider.value / 360 * 100}%`;

    alphaMarker.style.color = `rgba(0,0,0,${alphaSlider.value})`;
    alphaMarker.style.left = `${alphaSlider.value * 100}%`;
  }

  function HSVAtoRGBA(hsva) {
    const saturation = hsva.s / 100;
    const value = hsva.v / 100;
    let chroma = saturation * value;
    let hueBy60 = hsva.h / 60;
    let x = chroma * (1 - Math.abs(hueBy60 % 2 - 1));
    let m = value - chroma;

    chroma = (chroma + m);
    x = (x + m);
    m = m;

    const index = Math.floor(hueBy60) % 6;
    const red = [chroma, x, m, m, x, chroma][index];
    const green = [x, chroma, chroma, x, m, m][index];
    const blue = [m, m, x, chroma, chroma, x][index];

    return {
      r: Math.round(red * 255),
      g: Math.round(green * 255),
      b: Math.round(blue * 255),
      a: hsva.a
    }
  }

  function RGBAtoHSVA(rgba) {
    const red   = rgba.r / 255;
    const green = rgba.g / 255;
    const blue  = rgba.b / 255;
    const xmax = Math.max(red, green, blue);
    const xmin = Math.min(red, green, blue);
    const chroma = xmax - xmin;
    const value = xmax;
    let hue = 0;
    let saturation = 0;

    if (chroma) {
      if (xmax === red ) { hue = ((green - blue) / chroma); }
      if (xmax === green ) { hue = 2 + (blue - red) / chroma; }
      if (xmax === blue ) { hue = 4 + (red - green) / chroma; }
      if (xmax) { saturation = chroma / xmax; }
    }

    hue = Math.floor(hue * 60);

    return {
      h: hue < 0 ? hue + 360 : hue,
      s: Math.round(saturation * 100),
      v: Math.round(value * 100),
      a: rgba.a
    }
  }

  function strToRGBA(str) {
    const regex = /^((rgba)|rgb)[\D]+([\d.]+)[\D]+([\d.]+)[\D]+([\d.]+)[\D]*?([\d.]+|$)/i;
    let match, rgba;

    ctx.fillStyle = '#000';
    ctx.fillStyle = str;
    match = regex.exec(ctx.fillStyle);

    if (match) {
      rgba = {
        r: match[3] * 1,
        g: match[4] * 1,
        b: match[5] * 1,
        a: match[6] * 1
      };

    } else {
      match = ctx.fillStyle.replace('#', '').match(/.{2}/g).map(h => parseInt(h, 16));
      rgba = {
        r: match[0],
        g: match[1],
        b: match[2],
        a: 1
      };
    }

    return rgba;
  }

  function getHex(rgba) {
    let R = rgba.r.toString(16);
    let G = rgba.g.toString(16);
    let B = rgba.b.toString(16);
    let A = '';

    if (rgba.r < 16) {
      R = '0' + R;
    }

    if (rgba.g < 16) {
      G = '0' + G;
    }

    if (rgba.b < 16) {
      B = '0' + B;
    }

    if (rgba.a < 1) {
      const alpha = rgba.a * 255 | 0;
      A = alpha.toString(16);

      if (alpha < 16) {
        A = '0' + A;
      }
    }

    return '#' + R + G + B + A;
  }

  // Render the UI of color picker
  function render() {
    picker = document.createElement('div');
    picker.setAttribute('id', 'vdg-picker');
    picker.setAttribute('class', 'vdg-picker');

    picker.innerHTML =
    '<div id="vdg-color-area" class="vdg-gradient">'+
      '<div class="vdg-marker" id="vdg-color-marker"></div>'+
    '</div>'+
    '<div class="vdg-widgets">'+
      '<div class="vdg-hue">'+
        '<input id="vdg-hue-slider" type="range" min="0" max="360" step="1">'+
        '<div id="vdg-hue-marker"></div>'+
      '</div>'+
      '<div class="vdg-alpha">'+
        '<input id="vdg-alpha-slider" type="range" min="0" max="1" step=".01">'+
        '<div id="vdg-alpha-marker"></div>'+
      '</div>'+
      '<div class="vdg-color">'+
        '<input id="vdg-color-value" type="text" value="">'+
        '<div id="vdg-color-preview" class="vdg-preview"></div>'+
      '</div>'+
    '</div>';

    document.body.appendChild(picker);
  }

  // Shortcut for document.getElementById()
  function getEl(id) {
    return document.getElementById(id);
  }

  // Shortcut for context.addEventListener()
  function addListener(context, type, handler) {
    context.addEventListener(type, handler);
  }

  // Init the color picker
  function init() {
    render();

    colorArea = getEl('vdg-color-area');
    colorMarker = getEl('vdg-color-marker');
    colorPreview = getEl('vdg-color-preview');
    colorValue = getEl('vdg-color-value');
    hueSlider = getEl('vdg-hue-slider');
    hueMarker = getEl('vdg-hue-marker');
    alphaSlider = getEl('vdg-alpha-slider');
    alphaMarker = getEl('vdg-alpha-marker');

    addListener(picker, 'mousedown', event => {
      event.stopPropagation();
    });

    addListener(document, 'mousedown', event => {
      dettach();
    });    

    addListener(colorArea, 'click', event => {
      moveMarker(event);
    });

    addListener(colorArea, 'mousedown', event => {
      addListener(document, 'mousemove', moveMarker);
    });

    addListener(colorMarker, 'mousedown', event => {
      addListener(document, 'mousemove', moveMarker);
    });

    addListener(document, 'mouseup', event => {
      document.removeEventListener('mousemove', moveMarker);
    });

    addListener(hueSlider, 'input', event => {
      updateUI();
    });

    addListener(alphaSlider, 'input', event => {
      setAlpha();
    });

    addListener(colorValue, 'change', event => {
      setColorFromStr(this.value);
      pickColor();
    });

    addListener(document, 'keydown', event => {
      if (event.key === 'Escape') {
        dettach();
      }
    });
  }

  function ready(callback, args) {
    if (document.readyState != 'loading') {
      callback(args);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        callback(args);
      });
    }
  }

  // Alt names: Coloris, Chroma, Sienna
  window.Verdigris = (() => {
    const methods = {
      set: configure,
      wrap: wrapFields,
      close: dettach
    }

    function Verdigris(options) {
      ready(() => {
        if (options) {
          if (typeof options === 'string') {
            attach(options);
          } else {
            configure(options);
          }
        }
      });
    }

    for (const key in methods) {
      Verdigris[key] = args => {
        ready(methods[key], args);
      };
    }

    return Verdigris;
  })();

  ready(init);
})();