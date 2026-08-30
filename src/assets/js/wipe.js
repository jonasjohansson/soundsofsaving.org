/* ==================================================================== *
 *  The hero cut.
 *
 *  Ported from elverket.com, where it is the only motion on an otherwise
 *  static site. Same idea here: this file holds the one thing that moves.
 *
 *  Three pictures and one shader — the outgoing frame, the incoming one, and
 *  a greyscale film matte. White in the matte lets the incoming picture
 *  through, black holds the outgoing one, and a smoothstep on the matte's red
 *  channel sets how hard that boundary is: a narrow window (see `edge`) makes
 *  a defined front travel across the frame, a wide one softens into something
 *  barely distinguishable from a crossfade. The result dissolves the way ink
 *  spreads rather than the way an opacity ramp fades: the picture arrives in
 *  patches, from the middle outward.
 *
 *  `rate` slows the clip down without re-encoding it; the stall guard is
 *  derived from the clip's own length at that rate.
 *
 *  `object-fit: cover` is emulated per texture from each source's own aspect
 *  ratio and its object-position, so the frame the shader draws is exactly
 *  the frame the CSS was drawing a moment before — no jump into or out of a
 *  cut.
 *
 *  The outgoing picture can also be the CANVAS ITSELF, captured mid-cut.
 *  That is what makes an interrupted transition continuous: a new cut
 *  part-way through the last one does not finish or abandon it, it
 *  photographs whatever is on screen at that instant and dissolves from
 *  there. Two things differ for a captured frame and both are handled by
 *  uFlipA: the capture is already canvas-shaped, so it must not go through
 *  the cover maths a second time, and copyTexImage2D ignores
 *  UNPACK_FLIP_Y_WEBGL, so it arrives upside down relative to every texture
 *  uploaded from the DOM.
 *
 *  It refuses, and the caller falls back to the CSS crossfade, on four
 *  paths: reduced motion, no WebGL context, a matte that never buffered, and
 *  a play() that rejects.
 * ==================================================================== */
(function (global) {
  "use strict";

  var reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function motionAllowed() { return !(reduce && reduce.matches); }

  function makeWipe(canvas) {
    var gl = null, ready = null, loc = {}, tex = {};

    var VS = "attribute vec2 p;varying vec2 v;void main(){v=p*0.5+0.5;gl_Position=vec4(p,0.,1.);}";
    var FS = [
      "precision mediump float;varying vec2 v;",
      "uniform sampler2D uA,uB,uM;",
      "uniform float aA,aB,aM,aC,uFlipA,uE0,uE1;",
      "uniform vec2 oA,oB;",
      // uv -> texture coords for a source of aspect `ta` covering a box of
      // aspect `ca`, anchored at object-position `o` (0..1, left->right and
      // top->bottom). v.y runs bottom-up, which is why y is written out
      // rather than mirrored from x.
      "vec2 cover(vec2 uv,float ta,float ca,vec2 o){",
      "  vec2 s = ta>ca ? vec2(ca/ta,1.0) : vec2(1.0,ta/ca);",
      "  return vec2(uv.x*s.x + o.x*(1.0-s.x),",
      "              uv.y*s.y + (1.0 - o.y*(1.0-s.y) - s.y));}",
      "void main(){",
      "  float m = texture2D(uM,cover(v,aM,aC,vec2(0.5))).r;",
      "  m = smoothstep(uE0,uE1,m);",
      // A captured frame is already the canvas: no cover, and flipped.
      "  vec2 va = uFlipA > 0.5 ? vec2(v.x, 1.0 - v.y) : cover(v,aA,aC,oA);",
      "  gl_FragColor = mix(texture2D(uA,va), texture2D(uB,cover(v,aB,aC,oB)), m);}"
    ].join("\n");

    function sh(t, src) { var o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); return o; }
    function mkTex() {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return t;
    }
    function init() {
      // preserveDrawingBuffer, because an interrupt copies the last drawn
      // frame out of the buffer from a timer rather than from inside the
      // animation frame that drew it.
      var opts = { alpha: false, antialias: false, preserveDrawingBuffer: true };
      try {
        gl = canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts);
      } catch (e) { gl = null; }
      if (!gl) return false;
      var prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { gl = null; return false; }
      gl.useProgram(prog);
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var p = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(p);
      gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
      ["uA", "uB", "uM", "aA", "aB", "aM", "aC", "oA", "oB", "uFlipA", "uE0", "uE1"].forEach(function (n) {
        loc[n] = gl.getUniformLocation(prog, n);
      });
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      tex.A = mkTex(); tex.B = mkTex(); tex.M = mkTex();
      gl.uniform1i(loc.uA, 0); gl.uniform1i(loc.uB, 1); gl.uniform1i(loc.uM, 2);
      return true;
    }
    function upload(unit, t, src) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
    }
    // "50% 40%" -> [0.5, 0.4]. Anything unexpected is dead centre.
    function anchor(img) {
      var v = window.getComputedStyle(img).objectPosition.split(/\s+/);
      var n = v.map(function (s) { return parseFloat(s) / 100; });
      return (n.length === 2 && isFinite(n[0]) && isFinite(n[1])) ? n : [0.5, 0.5];
    }

    return {
      // Whether a cut can be composited at all. This is about the device, not
      // about any one clip: motion allowed, and a WebGL context available.
      available: function () {
        if (!motionAllowed()) return false;
        if (ready === null) ready = init();
        return !!ready;
      },
      // Photograph the canvas into texture A. Only meaningful while a cut is
      // on screen; returns false otherwise so the caller falls back to the
      // outgoing <img>.
      capture: function () {
        if (!ready || canvas.hidden || !canvas.width || !canvas.height) return false;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex.A);
        gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGB, 0, 0, canvas.width, canvas.height, 0);
        return true;
      },
      // `fromImg` null means texture A already holds a captured frame.
      // Returns { stop, end }; stop halts the loop and leaves the canvas up,
      // which is what an interrupt needs — done() is not called.
      run: function (video, fromImg, toImg, done, opts) {
        opts = opts || {};
        var finished = false, stopped = false;
        function finish() {
          if (finished || stopped) return;
          finished = true;
          canvas.hidden = true;
          done();
        }
        // Unhide before measuring: `[hidden]` is display:none, and a canvas
        // measured while it is would size itself to 0x0 and draw nothing.
        var wasUp = !canvas.hidden;
        canvas.hidden = false;
        if (!wasUp) {
          var dpr = Math.min(window.devicePixelRatio || 1, 2);
          var w = Math.round(canvas.clientWidth * dpr);
          var h = Math.round(canvas.clientHeight * dpr);
          if (!w || !h) { finish(); return null; }
          canvas.width = w; canvas.height = h;
        }
        gl.viewport(0, 0, canvas.width, canvas.height);
        var ac = canvas.width / canvas.height;

        var oB = anchor(toImg);
        if (fromImg) {
          var oA = anchor(fromImg);
          gl.uniform1f(loc.uFlipA, 0);
          gl.uniform1f(loc.aA, fromImg.naturalWidth / fromImg.naturalHeight);
          gl.uniform2f(loc.oA, oA[0], oA[1]);
        } else {
          // A captured frame is the canvas: same aspect, no cover, flipped.
          gl.uniform1f(loc.uFlipA, 1);
          gl.uniform1f(loc.aA, ac);
          gl.uniform2f(loc.oA, 0.5, 0.5);
        }
        gl.uniform1f(loc.aB, toImg.naturalWidth / toImg.naturalHeight);
        gl.uniform1f(loc.aM, video.videoWidth / video.videoHeight);
        gl.uniform1f(loc.aC, ac);
        gl.uniform2f(loc.oB, oB[0], oB[1]);
        // Narrow window = a defined front travelling across the frame.
        var edge = opts.edge || 0.14;
        gl.uniform1f(loc.uE0, 0.5 - edge);
        gl.uniform1f(loc.uE1, 0.5 + edge);
        try {
          if (fromImg) upload(0, tex.A, fromImg);
          upload(1, tex.B, toImg);
        } catch (e) { finish(); return null; }

        function frame() {
          if (finished || stopped) return;
          if (video.readyState >= 2) {
            upload(2, tex.M, video);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
          }
          if (video.ended) { finish(); return; }
          requestAnimationFrame(frame);
        }
        var rate = opts.rate || 1;
        try { video.playbackRate = rate; } catch (e) { rate = 1; }
        try { video.currentTime = 0; } catch (e) { /* not seekable yet */ }
        var pr = video.play();
        if (pr && pr.catch) pr.catch(finish);   // autoplay refused -> it cuts
        requestAnimationFrame(frame);
        // A matte that stalls must not leave the canvas up for ever. Derived
        // from the clip's own length at the rate it is playing, so slowing a
        // cut down can never let the guard cut it short.
        var span = (isFinite(video.duration) ? video.duration : 2.2) / rate;
        var guard = setTimeout(finish, Math.max(6000, span * 1000 + 2500));
        return {
          stop: function () { stopped = true; clearTimeout(guard); try { video.pause(); } catch (e) {} },
          end: finish
        };
      }
    };
  }

  global.SoSWipe = { make: makeWipe, motionAllowed: motionAllowed };
})(window);
