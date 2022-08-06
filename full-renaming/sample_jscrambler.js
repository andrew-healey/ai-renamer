(function () {
  function v7() {
    E5 = [];
    var r_;
    var X1;
    var W5;
    var y$;
    var y5;
    var N$;
    var l6;
    for (var r_ = 0; r_ < 200; r_++) {
      y$ = Math.random() * Util.randomChoice([-.8, .8]);
      y5 = Math.floor(Math.random() * u.length) * q;
      N$ = Util.randomChoice(SPRITES.CARS);
      l6 = r / 4 + Math.random() * r / (N$ == SPRITES.SEMI ? 4 : 2);
      X1 = {offset: y$, z: y5, sprite: N$, speed: l6};
      W5 = g(X1.z);
      W5.cars.push(X1);
      E5.push(X1);
    }
  }
  function V3(D_, K4, c7) {
    D_ = D_ || Q.LENGTH.MEDIUM;
    K4 = K4 || Q.CURVE.MEDIUM;
    c7 = c7 || Q.HILL.NONE;
    P(D_, D_, D_, K4, c7);
  }
  function g(v$) {
    return u[Math.floor(v$ / q) % u.length];
  }
  function M1() {
    {
      const T6 = g(F);
      const L4 = Util.percentRemaining(F, q);
      const s4 = g(F + O);
      const k8 = Util.percentRemaining(F + O, q);
      const R$ = Util.interpolate(s4.p1.world.y, s4.p2.world.y, k8);
      var r9 = X;
      var u5 = 0;
      var M3 = -(T6.curve * L4);
      c.clearRect(0, 0, V, X);
      Render.background(c, D3, V, X, BACKGROUND.SKY, e$, E * .001 * R$);
      Render.background(c, D3, V, X, BACKGROUND.HILLS, t3, E * .002 * R$);
      Render.background(c, D3, V, X, BACKGROUND.TREES, u0, E * .003 * R$);
      var n_;
      var o1;
      var k5;
      var m6;
      var l_;
      var G$;
      var C3;
      var F7;
      for (n_ = 0; n_ < s; n_++) {
        k5 = u[(T6.index + n_) % u.length];
        k5.looped = k5.index < T6.index;
        k5.fog = Util.exponentialFog(n_ / s, J9);
        k5.clip = r9;
        Util.project(k5.p1, H * Z - u5, R$ + v, F - (k5.looped ? N : 0), h, V, X, Z);
        Util.project(k5.p2, H * Z - u5 - M3, R$ + v, F - (k5.looped ? N : 0), h, V, X, Z);
        u5 = u5 + M3;
        M3 = M3 + k5.curve;
        if (!(k5.p1.camera.z <= h) && !(k5.p2.screen.y >= k5.p1.screen.y) && !(k5.p2.screen.y >= r9)) {
          Render.segment(c, V, C4, k5.p1.screen.x, k5.p1.screen.y, k5.p1.screen.w, k5.p2.screen.x, k5.p2.screen.y, k5.p2.screen.w, k5.fog, k5.color);
          r9 = k5.p1.screen.y;
        }
      }
      for (n_ = s - 1; n_ > 0; n_--) {
        k5 = u[(T6.index + n_) % u.length];
        for (o1 = 0; o1 < k5.cars.length; o1++) {
          m6 = k5.cars[o1];
          l_ = m6.sprite;
          G$ = Util.interpolate(k5.p1.screen.scale, k5.p2.screen.scale, m6.percent);
          C3 = Util.interpolate(k5.p1.screen.x, k5.p2.screen.x, m6.percent) + G$ * m6.offset * Z * V / 2;
          F7 = Util.interpolate(k5.p1.screen.y, k5.p2.screen.y, m6.percent);
          Render.sprite(c, V, X, E, Z, g$, m6.sprite, G$, C3, F7, -.5, -1, k5.clip);
        }
        for (o1 = 0; o1 < k5.sprites.length; o1++) {
          l_ = k5.sprites[o1];
          G$ = k5.p1.screen.scale;
          C3 = k5.p1.screen.x + G$ * l_.offset * Z * V / 2;
          F7 = k5.p1.screen.y;
          Render.sprite(c, V, X, E, Z, g$, l_.source, G$, C3, F7, l_.offset < 0 ? -1 : 0, -1, k5.clip);
        }
        if (k5 == s4) {
          Render.player(c, V, X, E, Z, g$, l / r, h / O, V / 2, X / 2 - h / O * Util.interpolate(s4.p1.camera.y, s4.p2.camera.y, k8) * X / 2, l * (d8 ? -1 : S0 ? 1 : 0), s4.p2.world.y - s4.p1.world.y);
        }
      }
    }
  }
  function D4(R0) {
    {
      var o7;
      var i9;
      var Q$;
      var z6;
      var u2;
      const P0 = g(F + O);
      const z$ = SPRITES.PLAYER_STRAIGHT.w * SPRITES.SCALE;
      const k6 = l / r;
      const J7 = R0 * 2 * k6;
      const n5 = F;
      A1(R0, P0, z$);
      F = Util.increase(F, R0 * l, N);
      if (d8) {
        H = H - J7;
      } else if (S0) {
        H = H + J7;
      }
      H = H - J7 * k6 * P0.curve * .3;
      if (n$) {
        l = Util.accelerate(l, b6, R0);
      } else if (f3) {
        l = Util.accelerate(l, P4, R0);
      } else {
        l = Util.accelerate(l, e2, R0);
      }
      if (H < -1 || H > 1) {
        if (l > O6) {
          l = Util.accelerate(l, D$, R0);
        }
        o7 = 0;
        while (o7 < P0.sprites.length) {
          z6 = P0.sprites[o7];
          u2 = z6.source.w * SPRITES.SCALE;
          if (Util.overlap(H, z$, z6.offset + u2 / 2 * (z6.offset > 0 ? 1 : -1), u2)) {
            l = r / 5;
            F = Util.increase(P0.p1.world.z, -O, N);
            break;
          } else {
            o7++;
          }
        }
      }
      for (o7 = 0; o7 < P0.cars.length; o7++) {
        i9 = P0.cars[o7];
        Q$ = i9.sprite.w * SPRITES.SCALE;
        if (l > i9.speed) {
          if (Util.overlap(H, z$, i9.offset, Q$, .8)) {
            l = i9.speed * (i9.speed / l);
            F = Util.increase(i9.z, -O, N);
            break;
          }
        }
      }
      H = Util.limit(H, -3, 3);
      l = Util.limit(l, 0, r);
      e$ = Util.increase(e$, .001 * P0.curve * (F - n5) / q, 1);
      t3 = Util.increase(t3, .002 * P0.curve * (F - n5) / q, 1);
      u0 = Util.increase(u0, .003 * P0.curve * (F - n5) / q, 1);
      if (F > O) {
        if (t6 && n5 < O) {
          w9 = t6;
          t6 = 0;
          if (w9 <= Util.toFloat(Dom.storage.fast_lap_time)) {
            Dom.storage.fast_lap_time = w9;
            i2("fast_lap_time", O1(w9));
            Dom.addClassName("fast_lap_time", "fastest");
            Dom.addClassName("last_lap_time", "fastest");
          } else {
            Dom.removeClassName("fast_lap_time", "fastest");
            Dom.removeClassName("last_lap_time", "fastest");
          }
          i2("last_lap_time", O1(w9));
          Dom.show("last_lap_time");
        } else {
          t6 += R0;
        }
      }
      i2("speed", 5 * Math.round(l / 500));
      i2("current_lap_time", O1(t6));
      if (window.renderWarning) {
        window.renderWarning();
      }
    }
  }
  function B1(r5) {
    r5 = r5 || {};
    Y9.width = V = Util.toInt(r5.width, V);
    Y9.height = X = Util.toInt(r5.height, X);
    C4 = Util.toInt(r5.lanes, C4);
    Z = Util.toInt(r5.roadWidth, Z);
    v = Util.toInt(r5.cameraHeight, v);
    s = Util.toInt(r5.drawDistance, s);
    J9 = Util.toInt(r5.fogDensity, J9);
    c4 = Util.toInt(r5.fieldOfView, c4);
    q = Util.toInt(r5.segmentLength, q);
    m3 = Util.toInt(r5.rumbleLength, m3);
    h = 1 / Math.tan(c4 / 2 * Math.PI / 180);
    O = v * h;
    E = X / 480;
    if (u.length == 0 || r5.segmentLength || r5.rumbleLength) {
      V6();
    }
  }
  function R(d3, Q5, P$) {
    u[d3].sprites.push({source: Q5, offset: P$});
  }
  function P3() {
    P(Q.LENGTH.MEDIUM, Q.LENGTH.MEDIUM, Q.LENGTH.MEDIUM, -Q.CURVE.EASY, Q.HILL.NONE);
    P(Q.LENGTH.MEDIUM, Q.LENGTH.MEDIUM, Q.LENGTH.MEDIUM, Q.CURVE.MEDIUM, Q.HILL.MEDIUM);
    P(Q.LENGTH.MEDIUM, Q.LENGTH.MEDIUM, Q.LENGTH.MEDIUM, Q.CURVE.EASY, -Q.HILL.LOW);
    P(Q.LENGTH.MEDIUM, Q.LENGTH.MEDIUM, Q.LENGTH.MEDIUM, -Q.CURVE.EASY, Q.HILL.MEDIUM);
    P(Q.LENGTH.MEDIUM, Q.LENGTH.MEDIUM, Q.LENGTH.MEDIUM, -Q.CURVE.MEDIUM, -Q.HILL.MEDIUM);
  }
  function A3(O$) {
    O$ = O$ || 200;
    P(O$, O$, O$, -Q.CURVE.EASY, -c$() / q);
  }
  function l5(s8, w3) {
    s8 = s8 || Q.LENGTH.MEDIUM;
    w3 = w3 || Q.HILL.MEDIUM;
    P(s8, s8, s8, 0, w3);
  }
  function P8() {
    var p4;
    R(20, SPRITES.BILLBOARD07, -1);
    R(40, SPRITES.BILLBOARD06, -1);
    R(60, SPRITES.BILLBOARD08, -1);
    R(80, SPRITES.BILLBOARD09, -1);
    R(100, SPRITES.BILLBOARD01, -1);
    R(120, SPRITES.BILLBOARD02, -1);
    R(140, SPRITES.BILLBOARD03, -1);
    R(160, SPRITES.BILLBOARD04, -1);
    R(180, SPRITES.BILLBOARD05, -1);
    R(240, SPRITES.BILLBOARD07, -1.2);
    R(240, SPRITES.BILLBOARD06, 1.2);
    R(u.length - 25, SPRITES.BILLBOARD07, -1.2);
    R(u.length - 25, SPRITES.BILLBOARD06, 1.2);
    for (var o0 = 10; o0 < 200; o0 += 4 + Math.floor(o0 / 100)) {
      R(o0, SPRITES.PALM_TREE, .5 + Math.random() * .5);
      R(o0, SPRITES.PALM_TREE, 1 + Math.random() * 2);
    }
    for (o0 = 250; o0 < 1e3; o0 += 5) {
      R(o0, SPRITES.COLUMN, 1.1);
      R(o0 + Util.randomInt(0, 5), SPRITES.TREE1, -1 - Math.random() * 2);
      R(o0 + Util.randomInt(0, 5), SPRITES.TREE2, -1 - Math.random() * 2);
    }
    for (o0 = 200; o0 < u.length; o0 += 3) {
      R(o0, Util.randomChoice(SPRITES.PLANTS), Util.randomChoice([1, -1]) * (2 + Math.random() * 5));
    }
    var a3;
    var m8;
    var x6;
    for (o0 = 1e3; o0 < u.length - 50; o0 += 100) {
      a3 = Util.randomChoice([1, -1]);
      R(o0 + Util.randomInt(0, 50), Util.randomChoice(SPRITES.BILLBOARDS), -a3);
      for (p4 = 0; p4 < 20; p4++) {
        m8 = Util.randomChoice(SPRITES.PLANTS);
        x6 = a3 * (1.5 + Math.random());
        R(o0 + Util.randomInt(0, 50), m8, x6);
      }
    }
  }
  function W$(b8, G0, b7, X0) {
    var B3;
    var g7;
    var n8;
    var N5;
    var C1;
    var J0;
    var p$ = 20;
    var Q_ = b8.sprite.w * SPRITES.SCALE;
    if (G0.index - b7.index > s) {
      return 0;
    } else {
      B3 = 1;
    }
    while (B3 < p$) {
      N5 = u[(G0.index + B3) % u.length];
      if (N5 === b7 && b8.speed > l && Util.overlap(H, X0, b8.offset, Q_, 1.2)) {
        if (H > .5) {
          n8 = -1;
        } else if (H < -.5) {
          n8 = 1;
        } else {
          n8 = b8.offset > H ? 1 : -1;
        }
        return n8 * 1 / B3 * (b8.speed - l) / r;
      } else {
        g7 = 0;
        while (g7 < N5.cars.length) {
          C1 = N5.cars[g7];
          J0 = C1.sprite.w * SPRITES.SCALE;
          if (b8.speed > C1.speed && Util.overlap(b8.offset, Q_, C1.offset, J0, 1.2)) {
            if (C1.offset > .5) {
              n8 = -1;
            } else if (C1.offset < -.5) {
              n8 = 1;
            } else {
              n8 = b8.offset > C1.offset ? 1 : -1;
            }
            return n8 * 1 / B3 * (b8.speed - C1.speed) / r;
          } else {
            g7++;
          }
        }
        B3++;
      }
    }
    if (b8.offset < -.9) {
      return .1;
    } else if (b8.offset > .9) {
      return -.1;
    } else {
      return 0;
    }
  }
  function V6() {
    u = [];
    D0(Q.LENGTH.SHORT);
    f0();
    P3();
    V3(Q.LENGTH.MEDIUM, Q.CURVE.MEDIUM, Q.HILL.LOW);
    H4();
    f0();
    V3(Q.LENGTH.LONG * 2, Q.CURVE.MEDIUM, Q.HILL.MEDIUM);
    D0();
    l5(Q.LENGTH.MEDIUM, Q.HILL.HIGH);
    P3();
    V3(Q.LENGTH.LONG, -Q.CURVE.MEDIUM, Q.HILL.NONE);
    l5(Q.LENGTH.LONG, Q.HILL.HIGH);
    V3(Q.LENGTH.LONG, Q.CURVE.MEDIUM, -Q.HILL.LOW);
    H4();
    l5(Q.LENGTH.LONG, -Q.HILL.MEDIUM);
    D0();
    P3();
    A3();
    P8();
    v7();
    u[g(O).index + 2].color = COLORS.START;
    u[g(O).index + 3].color = COLORS.START;
    for (var g6 = 0; g6 < m3; g6++) {
      u[u.length - 1 - g6].color = COLORS.FINISH;
    }
    N = u.length * q;
  }
  function P(L8, Y_, R_, D5, v6) {
    {
      const F4 = c$();
      const E6 = F4 + Util.toInt(v6, 0) * q;
      var G9;
      var d$ = L8 + Y_ + R_;
      for (G9 = 0; G9 < L8; G9++) {
        D7(Util.easeIn(0, D5, G9 / L8), Util.easeInOut(F4, E6, G9 / d$));
      }
      for (G9 = 0; G9 < Y_; G9++) {
        D7(D5, Util.easeInOut(F4, E6, (L8 + G9) / d$));
      }
      for (G9 = 0; G9 < R_; G9++) {
        D7(Util.easeInOut(D5, 0, G9 / R_), Util.easeInOut(F4, E6, (L8 + Y_ + G9) / d$));
      }
    }
  }
  function i2(z4, w_) {
    if (F5[z4].value !== w_) {
      F5[z4].value = w_;
      Dom.set(F5[z4].dom, w_);
    }
  }
  function A1(U8, I6, Q9) {
    var h2;
    var r1;
    var R2;
    for (var b3 = 0; b3 < E5.length; b3++) {
      h2 = E5[b3];
      r1 = g(h2.z);
      h2.offset = h2.offset + W$(h2, r1, I6, Q9);
      h2.z = Util.increase(h2.z, U8 * h2.speed, N);
      h2.percent = Util.percentRemaining(h2.z, q);
      R2 = g(h2.z);
      if (r1 != R2) {
        const index = r1.cars.indexOf(h2);
        r1.cars.splice(index, 1);
        R2.cars.push(h2);
      }
    }
  }
  function D7(e9, m4) {
    {
      const n7 = u.length;
      u.push({index: n7, p1: {world: {y: c$(), z: n7 * q}, camera: {}, screen: {}}, p2: {world: {y: m4, z: (n7 + 1) * q}, camera: {}, screen: {}}, curve: e9, sprites: [], cars: [], color: Math.floor(n7 / m3) % 2 ? COLORS.DARK : COLORS.LIGHT});
    }
  }
  function H4() {
    P(10, 10, 10, 0, 5);
    P(10, 10, 10, 0, -2);
    P(10, 10, 10, 0, -5);
    P(10, 10, 10, 0, 8);
    P(10, 10, 10, 0, 5);
    P(10, 10, 10, 0, -7);
    P(10, 10, 10, 0, 5);
    P(10, 10, 10, 0, -2);
  }
  function D0(U9) {
    U9 = U9 || Q.LENGTH.MEDIUM;
    P(U9, U9, U9, 0, 0);
  }
  function c$() {
    if (u.length == 0) {
      return 0;
    } else {
      return u[u.length - 1].p2.world.y;
    }
  }
  function O1(x5) {
    {
      const o4 = Math.floor(x5 / 60);
      const n4 = Math.floor(x5 - o4 * 60);
      const o5 = Math.floor(10 * (x5 - Math.floor(x5)));
      if (o4 > 0) {
        return o4 + "." + (n4 < 10 ? "0" : "") + n4 + "." + o5;
      } else {
        return n4 + "." + o5;
      }
    }
  }
  function f0(t0, D2) {
    t0 = t0 || Q.LENGTH.SHORT;
    D2 = D2 || Q.HILL.LOW;
    P(t0, t0, t0, 0, D2 / 2);
    P(t0, t0, t0, 0, -D2);
    P(t0, t0, t0, Q.CURVE.EASY, D2);
    P(t0, t0, t0, 0, 0);
    P(t0, t0, t0, -Q.CURVE.EASY, D2 / 2);
    P(t0, t0, t0, 0, 0);
  }
  const L0 = 1 / 60;
  var V = 1024;
  var X = 768;
  var D$ = .99;
  var e$ = 0;
  var t3 = 0;
  var u0 = 0;
  var u = [];
  var E5 = [];
  const Y9 = Dom.get("canvas");
  const c = Y9.getContext("2d");
  var D3 = null;
  var g$ = null;
  var E = "high";
  var Z = 2e3;
  var q = 200;
  var m3 = 3;
  var N = null;
  var C4 = 3;
  var c4 = 100;
  var v = 1e3;
  var h = null;
  var s = 300;
  var H = 0;
  var O = null;
  var J9 = 5;
  var F = 0;
  var l = 0;
  const r = q / L0;
  const b6 = r / 5;
  const P4 = -r;
  const e2 = -r / 5;
  var D$ = -r / 2;
  const O6 = r / 4;
  var t6 = 0;
  var w9 = null;
  var d8 = false;
  var S0 = false;
  var n$ = false;
  var f3 = false;
  const F5 = {speed: {value: null, dom: Dom.get("speed_value")}, current_lap_time: {value: null, dom: Dom.get("current_lap_time_value")}, last_lap_time: {value: null, dom: Dom.get("last_lap_time_value")}, fast_lap_time: {value: null, dom: Dom.get("fast_lap_time_value")}};
  ({LENGTH: {NONE: 0, SHORT: 25, MEDIUM: 50, LONG: 100}, HILL: {NONE: 0, LOW: 20, MEDIUM: 40, HIGH: 60}, CURVE: {NONE: 0, EASY: 2, MEDIUM: 4, HARD: 6}});
  Game.run({canvas: Y9, render: M1, update: D4, step: L0, images: ["background", "sprites"], keys: [{keys: [KEY.LEFT, KEY.A], mode: "down", action: function () {
    d8 = true;
  }}, {keys: [KEY.RIGHT, KEY.D], mode: "down", action: function () {
    S0 = true;
  }}, {keys: [KEY.UP, KEY.W], mode: "down", action: function () {
    n$ = true;
  }}, {keys: [KEY.DOWN, KEY.S], mode: "down", action: function () {
    f3 = true;
  }}, {keys: [KEY.LEFT, KEY.A], mode: "up", action: function () {
    d8 = !"1";
  }}, {keys: [KEY.RIGHT, KEY.D], mode: "up", action: function () {
    S0 = false;
  }}, {keys: [KEY.UP, KEY.W], mode: "up", action: function () {
    n$ = false;
  }}, {keys: [KEY.DOWN, KEY.S], mode: "up", action: function () {
    f3 = false;
  }}], ready: function (O2) {
    D3 = O2[0];
    g$ = O2[1];
    B1();
    Dom.storage.fast_lap_time = Dom.storage.fast_lap_time || 180;
    i2("fast_lap_time", O1(Util.toFloat(Dom.storage.fast_lap_time)));
  }});
}());
