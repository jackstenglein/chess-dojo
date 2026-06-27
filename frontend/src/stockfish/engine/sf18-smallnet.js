async function Sf_18_Smallnet_Web(moduleArg = {}) {
    var moduleRtn;
    var h = moduleArg,
        da = !!globalThis.window,
        k = !!globalThis.WorkerGlobalScope,
        l = k && self.name?.startsWith('em-pthread');
    h.listen || (h.listen = (a) => console.log(a));
    h.onError || (h.onError = (a) => console.error(a));
    h.getRecommendedNnue = (a = 0) => ea(fa(a));
    h.setNnueBuffer = function (a, b = 0) {
        if (!a) throw Error('buf is null');
        if (0 >= a.byteLength) throw Error(`${a.byteLength} bytes?`);
        const c = ha(a.byteLength);
        if (!c) throw Error(`could not allocate ${a.byteLength} bytes`);
        m();
        h.HEAPU8.set(a, c);
        ia(c, a.byteLength, b);
    };
    h.uci = function (a) {
        const b = ja(a) + 1,
            c = ha(b);
        if (!c) throw Error(`Could not allocate ${b} bytes`);
        q(a, c, b);
        ka(c);
    };
    h.print = (a) => h.listen?.(a);
    h.printErr = (a) => h.onError?.(a);
    var la = [],
        ma = import.meta.url,
        na = '',
        oa,
        pa;
    if (da || k) {
        try {
            na = new URL('.', ma).href;
        } catch {}
        k &&
            (pa = (a) => {
                var b = new XMLHttpRequest();
                b.open('GET', a, !1);
                b.responseType = 'arraybuffer';
                b.send(null);
                return new Uint8Array(b.response);
            });
        oa = async (a) => {
            a = await fetch(a, { credentials: 'same-origin' });
            if (a.ok) return a.arrayBuffer();
            throw Error(a.status + ' : ' + a.url);
        };
    }
    var qa = console.log.bind(console),
        t = console.error.bind(console),
        u,
        ra = !1,
        v;
    function m() {
        x.buffer != y.buffer && sa();
    }
    var ua, va, wa;
    if (l) {
        var xa = !1;
        self.onunhandledrejection = (b) => {
            throw b.reason || b;
        };
        function a(b) {
            try {
                var c = b.data,
                    d = c.la;
                if ('load' === d) {
                    let e = [];
                    self.onmessage = (f) => e.push(f);
                    wa = () => {
                        postMessage({ la: 'loaded' });
                        for (let f of e) a(f);
                        self.onmessage = a;
                    };
                    for (const f of c.Xa)
                        if (!h[f] || h[f].proxy)
                            ((h[f] = (...g) => {
                                postMessage({ la: 'callHandler', Wa: f, Ua: g });
                            }),
                                'print' == f && (qa = h[f]),
                                'printErr' == f && (t = h[f]));
                    x = c.ib;
                    sa();
                    u = c.jb;
                    ya();
                    za();
                } else if ('run' === d) {
                    Aa(c.ja);
                    Ba(c.ja, 0, 0, 1, 0, 0);
                    Ca();
                    Da(c.ja);
                    xa ||= !0;
                    try {
                        Ea(c.fb, c.Ca);
                    } catch (e) {
                        if ('unwind' != e) throw e;
                    }
                } else
                    'setimmediate' !== c.target &&
                        ('checkMailbox' === d
                            ? xa && Fa()
                            : d && (t(`worker: received unknown command ${d}`), t(c)));
            } catch (e) {
                throw (Ga(), e);
            }
        }
        self.onmessage = a;
    }
    var y,
        Ha,
        Ia,
        z,
        A,
        Ja,
        B,
        Ka = !1,
        La = !1;
    function sa() {
        var a = x.buffer;
        y = new Int8Array(a);
        Ia = new Int16Array(a);
        h.HEAPU8 = Ha = new Uint8Array(a);
        new Uint16Array(a);
        z = new Int32Array(a);
        A = new Uint32Array(a);
        new Float32Array(a);
        Ja = new Float64Array(a);
        B = new BigInt64Array(a);
        new BigUint64Array(a);
    }
    function Ma() {
        Ka = !0;
        l
            ? wa()
            : (h.noFSInit ||
                  Na ||
                  ((Na = !0),
                  Oa('/dev/tty', '/dev/stdin'),
                  Oa('/dev/tty', '/dev/stdout'),
                  Oa('/dev/tty1', '/dev/stderr'),
                  Pa('/dev/stdin', 0),
                  Pa('/dev/stdout', 1),
                  Pa('/dev/stderr', 1)),
              C.E(),
              (Qa = !1));
    }
    function Ra(a) {
        a = 'Aborted(' + a + ')';
        t(a);
        ra = !0;
        a = new WebAssembly.RuntimeError(a + '. Build with -sASSERTIONS for more info.');
        va?.(a);
        throw a;
    }
    var Sa;
    async function Ta(a) {
        try {
            var b = await oa(a);
            return new Uint8Array(b);
        } catch {}
        if (pa) a = pa(a);
        else throw 'both async and sync fetching of the wasm failed';
        return a;
    }
    async function Ua(a, b) {
        try {
            var c = await Ta(a);
            return await WebAssembly.instantiate(c, b);
        } catch (d) {
            (t(`failed to asynchronously prepare wasm: ${d}`), Ra(d));
        }
    }
    async function Va(a) {
        var b = Sa;
        try {
            var c = fetch(b, { credentials: 'same-origin' });
            return await WebAssembly.instantiateStreaming(c, a);
        } catch (d) {
            (t(`wasm streaming compile failed: ${d}`),
                t('falling back to ArrayBuffer instantiation'));
        }
        return Ua(b, a);
    }
    function Wa() {
        Xa = {
            C: Ya,
            f: Za,
            x: $a,
            y: ab,
            m: bb,
            k: cb,
            B: db,
            i: eb,
            o: fb,
            g: gb,
            j: Da,
            h: hb,
            p: ib,
            r: jb,
            D: kb,
            d: lb,
            l: mb,
            c: nb,
            q: ob,
            A: pb,
            v: qb,
            s: rb,
            t: sb,
            b: tb,
            e: ub,
            w: vb,
            u: wb,
            z: xb,
            a: x,
            n: yb,
        };
        return { a: Xa };
    }
    async function ya() {
        function a(d, e) {
            C = d.exports;
            zb.push(C.K);
            d = C;
            h._main = d.F;
            h.__Z10js_getlinev = d.G;
            ka = h._uci = d.H;
            ia = h._setNnueBuffer = d.I;
            fa = h._getRecommendedNnue = d.J;
            Ab = d.L;
            Bb = h.__emscripten_proxy_main = d.M;
            Cb = d.O;
            Ba = d.P;
            Ga = d.Q;
            Db = d.R;
            ha = h._malloc = d.S;
            Eb = d.T;
            Fb = d.U;
            Gb = d.V;
            Hb = d.W;
            Ib = d.X;
            Jb = d.Y;
            Kb = d.Z;
            Lb = d._;
            Mb = d.$;
            Nb = d.N;
            u = e;
            return C;
        }
        var b = Wa();
        if (h.instantiateWasm)
            return new Promise((d) => {
                h.instantiateWasm(b, (e, f) => {
                    d(a(e, f));
                });
            });
        if (l) {
            var c = new WebAssembly.Instance(u, Wa());
            return a(c, u);
        }
        Sa = `${window.location.origin}/static/engine/sf18-smallnet.wasm`;
        return (function (d) {
            return a(d.instance, d.module);
        })(await Va(b));
    }
    class Ob {
        name = 'ExitStatus';
        constructor(a) {
            this.message = `Program terminated with exit(${a})`;
            this.status = a;
        }
    }
    var Pb = (a) => {
            a.terminate();
            a.onmessage = () => {};
        },
        Qb = [],
        Sb = (a) => {
            if (0 == F.length) {
                if (h.mainScriptUrlOrBlob) {
                    var b = h.mainScriptUrlOrBlob;
                    'string' != typeof b && (b = URL.createObjectURL(b));
                    b = new Worker(b, { type: 'module', name: 'em-pthread' });
                } else
                    b = new Worker(
                        new URL(`${window.location.origin}/static/engine/sf18-smallnet.js`),
                        { type: 'module', name: 'em-pthread' },
                    );
                F.push(b);
                Rb();
            }
            b = F.pop();
            if (!b) return 6;
            G.push(b);
            H[a.ja] = b;
            b.ja = a.ja;
            b.postMessage({ la: 'run', fb: a.eb, Ca: a.Ca, ja: a.ja }, a.Sa);
            return 0;
        },
        I = 0,
        qb = () => 0 < I,
        J = (a, b, ...c) => {
            for (
                var d = 2 * c.length, e = Mb(), f = Lb(8 * d), g = f >> 3, n = 0;
                n < c.length;
                n++
            ) {
                var r = c[n];
                'bigint' == typeof r
                    ? (((m(), B)[g + 2 * n] = 1n), ((m(), B)[g + 2 * n + 1] = r))
                    : (((m(), B)[g + 2 * n] = 0n), ((m(), Ja)[g + 2 * n + 1] = r));
            }
            a = Eb(a, 0, d, f, b);
            Kb(e);
            return a;
        };
    function yb(a) {
        if (l) return J(0, 1, a);
        v = a;
        0 < I || (Tb(), (ra = !0));
        throw new Ob(a);
    }
    function Ub(a) {
        if (l) return J(1, 0, a);
        --I;
        tb(a);
    }
    var tb = (a) => {
            v = a;
            if (l) throw (Ub(a), 'unwind');
            if (!(0 < I || l)) {
                Cb();
                Na = !1;
                Db(0);
                for (var b of K) b && Vb(b);
                Tb();
                La = !0;
            }
            yb(a);
        },
        F = [],
        G = [],
        zb = [],
        H = {},
        Tb = () => {
            for (var a of G) Pb(a);
            for (a of F) Pb(a);
            F = [];
            G = [];
            H = {};
        },
        Wb = (a) => {
            var b = a.ja;
            delete H[b];
            F.push(a);
            G.splice(G.indexOf(a), 1);
            a.ja = 0;
            Fb(b);
        };
    function Ca() {
        zb.forEach((a) => a());
    }
    var Rb = () => {
        var a = F[0];
        new Promise((b) => {
            a.onmessage = (f) => {
                var g = f.data;
                f = g.la;
                if (g.Ba && g.Ba != Ab()) {
                    var n = H[g.Ba];
                    n
                        ? n.postMessage(g, g.Sa)
                        : t(
                              `Internal error! Worker sent a message "${f}" to target pthread ${g.Ba}, but that thread no longer exists!`,
                          );
                } else if ('checkMailbox' === f) Fa();
                else if ('spawnThread' === f) Sb(g);
                else if ('cleanupThread' === f)
                    Xb(() => {
                        Wb(H[g.gb]);
                    });
                else if ('loaded' === f) ((a.loaded = !0), b(a));
                else if ('setimmediate' === g.target) a.postMessage(g);
                else if ('callHandler' === f) h[g.Wa](...g.Ua);
                else f && t(`worker sent an unknown command ${f}`);
            };
            a.onerror = (f) => {
                t(`${'worker sent an error!'} ${f.filename}:${f.lineno}: ${f.message}`);
                throw f;
            };
            var c = [],
                d = ['print', 'printErr'],
                e;
            for (e of d) h.propertyIsEnumerable(e) && c.push(e);
            a.postMessage({ la: 'load', Xa: c, ib: x, jb: u });
        });
    };
    function Aa(a) {
        var b = (m(), A)[(a + 52) >> 2];
        a = (m(), A)[(a + 56) >> 2];
        Jb(b, b - a);
        Kb(b);
    }
    var Yb = [],
        Ea = (a, b) => {
            I = 0;
            var c = Yb[a];
            c || (Yb[a] = c = Nb.get(a));
            a = c(b);
            0 < I ? (v = a) : Gb(a);
        },
        x;
    function Zb(a, b, c, d) {
        return l ? J(2, 1, a, b, c, d) : Ya(a, b, c, d);
    }
    var Ya = (a, b, c, d) => {
            if (!globalThis.SharedArrayBuffer) return 6;
            var e = [];
            if (l && 0 === e.length) return Zb(a, b, c, d);
            a = { eb: c, ja: a, Ca: d, Sa: e };
            return l ? ((a.la = 'spawnThread'), postMessage(a, e), 0) : Sb(a);
        },
        M = () => {
            var a = (m(), z)[+L >> 2];
            L += 4;
            return a;
        },
        $b = (a, b) => {
            for (var c = 0, d = a.length - 1; 0 <= d; d--) {
                var e = a[d];
                '.' === e
                    ? a.splice(d, 1)
                    : '..' === e
                      ? (a.splice(d, 1), c++)
                      : c && (a.splice(d, 1), c--);
            }
            if (b) for (; c; c--) a.unshift('..');
            return a;
        },
        ac = (a) => {
            var b = '/' === a.charAt(0),
                c = '/' === a.slice(-1);
            (a = $b(
                a.split('/').filter((d) => !!d),
                !b,
            ).join('/')) ||
                b ||
                (a = '.');
            a && c && (a += '/');
            return (b ? '/' : '') + a;
        },
        bc = (a) => {
            var b = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/
                .exec(a)
                .slice(1);
            a = b[0];
            b = b[1];
            if (!a && !b) return '.';
            b &&= b.slice(0, -1);
            return a + b;
        },
        cc = () => (a) => a.set(crypto.getRandomValues(new Uint8Array(a.byteLength))),
        dc = (a) => {
            (dc = cc())(a);
        },
        ec = (...a) => {
            for (var b = '', c = !1, d = a.length - 1; -1 <= d && !c; d--) {
                c = 0 <= d ? a[d] : '/';
                if ('string' != typeof c)
                    throw new TypeError('Arguments to path.resolve must be strings');
                if (!c) return '';
                b = c + '/' + b;
                c = '/' === c.charAt(0);
            }
            b = $b(
                b.split('/').filter((e) => !!e),
                !c,
            ).join('/');
            return (c ? '/' : '') + b || '.';
        },
        fc = globalThis.TextDecoder && new TextDecoder(),
        O = (a, b = 0, c, d) => {
            var e = b;
            c = e + c;
            if (d) d = c;
            else {
                for (; a[e] && !(e >= c); ) ++e;
                d = e;
            }
            if (16 < d - b && a.buffer && fc)
                return fc.decode(
                    a.buffer instanceof ArrayBuffer ? a.subarray(b, d) : a.slice(b, d),
                );
            for (e = ''; b < d; )
                if (((c = a[b++]), c & 128)) {
                    var f = a[b++] & 63;
                    if (192 == (c & 224)) e += String.fromCharCode(((c & 31) << 6) | f);
                    else {
                        var g = a[b++] & 63;
                        c =
                            224 == (c & 240)
                                ? ((c & 15) << 12) | (f << 6) | g
                                : ((c & 7) << 18) | (f << 12) | (g << 6) | (a[b++] & 63);
                        65536 > c
                            ? (e += String.fromCharCode(c))
                            : ((c -= 65536),
                              (e += String.fromCharCode(55296 | (c >> 10), 56320 | (c & 1023))));
                    }
                } else e += String.fromCharCode(c);
            return e;
        },
        gc = [],
        ja = (a) => {
            for (var b = 0, c = 0; c < a.length; ++c) {
                var d = a.charCodeAt(c);
                127 >= d
                    ? b++
                    : 2047 >= d
                      ? (b += 2)
                      : 55296 <= d && 57343 >= d
                        ? ((b += 4), ++c)
                        : (b += 3);
            }
            return b;
        },
        hc = (a, b, c, d) => {
            if (!(0 < d)) return 0;
            var e = c;
            d = c + d - 1;
            for (var f = 0; f < a.length; ++f) {
                var g = a.codePointAt(f);
                if (127 >= g) {
                    if (c >= d) break;
                    b[c++] = g;
                } else if (2047 >= g) {
                    if (c + 1 >= d) break;
                    b[c++] = 192 | (g >> 6);
                    b[c++] = 128 | (g & 63);
                } else if (65535 >= g) {
                    if (c + 2 >= d) break;
                    b[c++] = 224 | (g >> 12);
                    b[c++] = 128 | ((g >> 6) & 63);
                    b[c++] = 128 | (g & 63);
                } else {
                    if (c + 3 >= d) break;
                    b[c++] = 240 | (g >> 18);
                    b[c++] = 128 | ((g >> 12) & 63);
                    b[c++] = 128 | ((g >> 6) & 63);
                    b[c++] = 128 | (g & 63);
                    f++;
                }
            }
            b[c] = 0;
            return c - e;
        },
        ic = [];
    function jc(a, b) {
        ic[a] = { input: [], output: [], na: b };
        kc(a, lc);
    }
    var lc = {
            open(a) {
                var b = ic[a.node.za];
                if (!b) throw new P(43);
                a.da = b;
                a.seekable = !1;
            },
            close(a) {
                a.da.na.wa(a.da);
            },
            wa(a) {
                a.da.na.wa(a.da);
            },
            read(a, b, c, d) {
                if (!a.da || !a.da.na.La) throw new P(60);
                for (var e = 0, f = 0; f < d; f++) {
                    try {
                        var g = a.da.na.La(a.da);
                    } catch (n) {
                        throw new P(29);
                    }
                    if (void 0 === g && 0 === e) throw new P(6);
                    if (null === g || void 0 === g) break;
                    e++;
                    b[c + f] = g;
                }
                e && (a.node.ra = Date.now());
                return e;
            },
            write(a, b, c, d) {
                if (!a.da || !a.da.na.Ha) throw new P(60);
                try {
                    for (var e = 0; e < d; e++) a.da.na.Ha(a.da, b[c + e]);
                } catch (f) {
                    throw new P(29);
                }
                d && (a.node.ga = a.node.fa = Date.now());
                return e;
            },
        },
        mc = {
            La() {
                a: {
                    if (!gc.length) {
                        var a = null;
                        globalThis.window?.prompt &&
                            ((a = window.prompt('Input: ')), null !== a && (a += '\n'));
                        if (!a) {
                            var b = null;
                            break a;
                        }
                        b = Array(ja(a) + 1);
                        a = hc(a, b, 0, b.length);
                        b.length = a;
                        gc = b;
                    }
                    b = gc.shift();
                }
                return b;
            },
            Ha(a, b) {
                null === b || 10 === b
                    ? (qa(O(a.output)), (a.output = []))
                    : 0 != b && a.output.push(b);
            },
            wa(a) {
                0 < a.output?.length && (qa(O(a.output)), (a.output = []));
            },
            Za() {
                return {
                    ob: 25856,
                    qb: 5,
                    nb: 191,
                    pb: 35387,
                    mb: [
                        3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0,
                        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                    ],
                };
            },
            $a() {
                return 0;
            },
            ab() {
                return [24, 80];
            },
        },
        nc = {
            Ha(a, b) {
                null === b || 10 === b
                    ? (t(O(a.output)), (a.output = []))
                    : 0 != b && a.output.push(b);
            },
            wa(a) {
                0 < a.output?.length && (t(O(a.output)), (a.output = []));
            },
        },
        Q = {
            ia: null,
            ma() {
                return Q.createNode(null, '/', 16895, 0);
            },
            createNode(a, b, c, d) {
                if (24576 === (c & 61440) || 4096 === (c & 61440)) throw new P(63);
                Q.ia ||
                    (Q.ia = {
                        dir: {
                            node: {
                                qa: Q.ca.qa,
                                ka: Q.ca.ka,
                                ta: Q.ca.ta,
                                xa: Q.ca.xa,
                                Qa: Q.ca.Qa,
                                Ta: Q.ca.Ta,
                                Ra: Q.ca.Ra,
                                Ia: Q.ca.Ia,
                                Aa: Q.ca.Aa,
                            },
                            stream: { ha: Q.aa.ha },
                        },
                        file: {
                            node: { qa: Q.ca.qa, ka: Q.ca.ka },
                            stream: {
                                ha: Q.aa.ha,
                                read: Q.aa.read,
                                write: Q.aa.write,
                                Na: Q.aa.Na,
                                Pa: Q.aa.Pa,
                            },
                        },
                        link: { node: { qa: Q.ca.qa, ka: Q.ca.ka, ua: Q.ca.ua }, stream: {} },
                        Ka: { node: { qa: Q.ca.qa, ka: Q.ca.ka }, stream: oc },
                    });
                c = pc(a, b, c, d);
                16384 === (c.mode & 61440)
                    ? ((c.ca = Q.ia.dir.node), (c.aa = Q.ia.dir.stream), (c.ba = {}))
                    : 32768 === (c.mode & 61440)
                      ? ((c.ca = Q.ia.file.node),
                        (c.aa = Q.ia.file.stream),
                        (c.ea = 0),
                        (c.ba = null))
                      : 40960 === (c.mode & 61440)
                        ? ((c.ca = Q.ia.link.node), (c.aa = Q.ia.link.stream))
                        : 8192 === (c.mode & 61440) &&
                          ((c.ca = Q.ia.Ka.node), (c.aa = Q.ia.Ka.stream));
                c.ra = c.ga = c.fa = Date.now();
                a && ((a.ba[b] = c), (a.ra = a.ga = a.fa = c.ra));
                return c;
            },
            ub(a) {
                return a.ba
                    ? a.ba.subarray
                        ? a.ba.subarray(0, a.ea)
                        : new Uint8Array(a.ba)
                    : new Uint8Array(0);
            },
            ca: {
                qa(a) {
                    var b = {};
                    b.rb = 8192 === (a.mode & 61440) ? a.id : 1;
                    b.wb = a.id;
                    b.mode = a.mode;
                    b.xb = 1;
                    b.uid = 0;
                    b.vb = 0;
                    b.za = a.za;
                    16384 === (a.mode & 61440)
                        ? (b.size = 4096)
                        : 32768 === (a.mode & 61440)
                          ? (b.size = a.ea)
                          : 40960 === (a.mode & 61440)
                            ? (b.size = a.link.length)
                            : (b.size = 0);
                    b.ra = new Date(a.ra);
                    b.ga = new Date(a.ga);
                    b.fa = new Date(a.fa);
                    b.Va = 4096;
                    b.lb = Math.ceil(b.size / b.Va);
                    return b;
                },
                ka(a, b) {
                    for (var c of ['mode', 'atime', 'mtime', 'ctime'])
                        null != b[c] && (a[c] = b[c]);
                    void 0 !== b.size &&
                        ((b = b.size),
                        a.ea != b &&
                            (0 == b
                                ? ((a.ba = null), (a.ea = 0))
                                : ((c = a.ba),
                                  (a.ba = new Uint8Array(b)),
                                  c && a.ba.set(c.subarray(0, Math.min(b, a.ea))),
                                  (a.ea = b))));
                },
                ta() {
                    Q.Da || ((Q.Da = new P(44)), (Q.Da.stack = '<generic error, no stack>'));
                    throw Q.Da;
                },
                xa(a, b, c, d) {
                    return Q.createNode(a, b, c, d);
                },
                Qa(a, b, c) {
                    try {
                        var d = qc(b, c);
                    } catch (f) {}
                    if (d) {
                        if (16384 === (a.mode & 61440)) for (var e in d.ba) throw new P(55);
                        e = rc(d.parent.id, d.name);
                        if (R[e] === d) R[e] = d.sa;
                        else
                            for (e = R[e]; e; ) {
                                if (e.sa === d) {
                                    e.sa = d.sa;
                                    break;
                                }
                                e = e.sa;
                            }
                    }
                    delete a.parent.ba[a.name];
                    b.ba[c] = a;
                    a.name = c;
                    b.fa = b.ga = a.parent.fa = a.parent.ga = Date.now();
                },
                Ta(a, b) {
                    delete a.ba[b];
                    a.fa = a.ga = Date.now();
                },
                Ra(a, b) {
                    var c = qc(a, b),
                        d;
                    for (d in c.ba) throw new P(55);
                    delete a.ba[b];
                    a.fa = a.ga = Date.now();
                },
                Ia(a) {
                    return ['.', '..', ...Object.keys(a.ba)];
                },
                Aa(a, b, c) {
                    a = Q.createNode(a, b, 41471, 0);
                    a.link = c;
                    return a;
                },
                ua(a) {
                    if (40960 !== (a.mode & 61440)) throw new P(28);
                    return a.link;
                },
            },
            aa: {
                read(a, b, c, d, e) {
                    var f = a.node.ba;
                    if (e >= a.node.ea) return 0;
                    a = Math.min(a.node.ea - e, d);
                    if (8 < a && f.subarray) b.set(f.subarray(e, e + a), c);
                    else for (d = 0; d < a; d++) b[c + d] = f[e + d];
                    return a;
                },
                write(a, b, c, d, e, f) {
                    b.buffer === (m(), y).buffer && (f = !1);
                    if (!d) return 0;
                    a = a.node;
                    a.ga = a.fa = Date.now();
                    if (b.subarray && (!a.ba || a.ba.subarray)) {
                        if (f) return ((a.ba = b.subarray(c, c + d)), (a.ea = d));
                        if (0 === a.ea && 0 === e) return ((a.ba = b.slice(c, c + d)), (a.ea = d));
                        if (e + d <= a.ea) return (a.ba.set(b.subarray(c, c + d), e), d);
                    }
                    f = e + d;
                    var g = a.ba ? a.ba.length : 0;
                    g >= f ||
                        ((f = Math.max(f, (g * (1048576 > g ? 2 : 1.125)) >>> 0)),
                        0 != g && (f = Math.max(f, 256)),
                        (g = a.ba),
                        (a.ba = new Uint8Array(f)),
                        0 < a.ea && a.ba.set(g.subarray(0, a.ea), 0));
                    if (a.ba.subarray && b.subarray) a.ba.set(b.subarray(c, c + d), e);
                    else for (f = 0; f < d; f++) a.ba[e + f] = b[c + f];
                    a.ea = Math.max(a.ea, e + d);
                    return d;
                },
                ha(a, b, c) {
                    1 === c
                        ? (b += a.position)
                        : 2 === c && 32768 === (a.node.mode & 61440) && (b += a.node.ea);
                    if (0 > b) throw new P(28);
                    return b;
                },
                Na(a, b, c, d, e) {
                    if (32768 !== (a.node.mode & 61440)) throw new P(43);
                    a = a.node.ba;
                    if (e & 2 || !a || a.buffer !== (m(), y).buffer) {
                        d = !0;
                        Ra();
                        e = void 0;
                        if (!e) throw new P(48);
                        if (a) {
                            if (0 < c || c + b < a.length)
                                a.subarray
                                    ? (a = a.subarray(c, c + b))
                                    : (a = Array.prototype.slice.call(a, c, c + b));
                            (m(), y).set(a, e);
                        }
                    } else ((d = !1), (e = a.byteOffset));
                    return { zb: e, kb: d };
                },
                Pa(a, b, c, d) {
                    Q.aa.write(a, b, 0, d, c, !1);
                    return 0;
                },
            },
        },
        sc = (a) => {
            var b = 0;
            a && (b |= 365);
            return b;
        },
        tc = 0,
        uc = null,
        vc = {},
        K = [],
        wc = 1,
        R = null,
        Na = !1,
        Qa = !0,
        P = class {
            name = 'ErrnoError';
            constructor(a) {
                this.oa = a;
            }
        },
        xc = class {
            va = {};
            node = null;
            get flags() {
                return this.va.flags;
            }
            set flags(a) {
                this.va.flags = a;
            }
            get position() {
                return this.va.position;
            }
            set position(a) {
                this.va.position = a;
            }
        },
        yc = class {
            ca = {};
            aa = {};
            ya = null;
            constructor(a, b, c, d) {
                a ||= this;
                this.parent = a;
                this.ma = a.ma;
                this.id = wc++;
                this.name = b;
                this.mode = c;
                this.za = d;
                this.ra = this.ga = this.fa = Date.now();
            }
            get read() {
                return 365 === (this.mode & 365);
            }
            set read(a) {
                a ? (this.mode |= 365) : (this.mode &= -366);
            }
            get write() {
                return 146 === (this.mode & 146);
            }
            set write(a) {
                a ? (this.mode |= 146) : (this.mode &= -147);
            }
        };
    function S(a, b = {}) {
        if (!a) throw new P(44);
        b.Fa ?? (b.Fa = !0);
        '/' === a.charAt(0) || (a = '//' + a);
        var c = 0;
        a: for (; 40 > c; c++) {
            a = a.split('/').filter((n) => !!n);
            for (var d = uc, e = '/', f = 0; f < a.length; f++) {
                var g = f === a.length - 1;
                if (g && b.parent) break;
                if ('.' !== a[f])
                    if ('..' === a[f])
                        if (((e = bc(e)), d === d.parent)) {
                            a = e + '/' + a.slice(f + 1).join('/');
                            c--;
                            continue a;
                        } else d = d.parent;
                    else {
                        e = ac(e + '/' + a[f]);
                        try {
                            d = qc(d, a[f]);
                        } catch (n) {
                            if (44 === n?.oa && g && b.cb) return { path: e };
                            throw n;
                        }
                        !d.ya || (g && !b.Fa) || (d = d.ya.root);
                        if (40960 === (d.mode & 61440) && (!g || b.Ea)) {
                            if (!d.ca.ua) throw new P(52);
                            d = d.ca.ua(d);
                            '/' === d.charAt(0) || (d = bc(e) + '/' + d);
                            a = d + '/' + a.slice(f + 1).join('/');
                            continue a;
                        }
                    }
            }
            return { path: e, node: d };
        }
        throw new P(32);
    }
    function rc(a, b) {
        for (var c = 0, d = 0; d < b.length; d++) c = ((c << 5) - c + b.charCodeAt(d)) | 0;
        return ((a + c) >>> 0) % R.length;
    }
    function qc(a, b) {
        var c = 16384 === (a.mode & 61440) ? ((c = zc(a, 'x')) ? c : a.ca.ta ? 0 : 2) : 54;
        if (c) throw new P(c);
        for (c = R[rc(a.id, b)]; c; c = c.sa) {
            var d = c.name;
            if (c.parent.id === a.id && d === b) return c;
        }
        return a.ca.ta(a, b);
    }
    function pc(a, b, c, d) {
        a = new yc(a, b, c, d);
        b = rc(a.parent.id, a.name);
        a.sa = R[b];
        return (R[b] = a);
    }
    function Ac(a) {
        var b = ['r', 'w', 'rw'][a & 3];
        a & 512 && (b += 'w');
        return b;
    }
    function zc(a, b) {
        if (Qa) return 0;
        if (!b.includes('r') || a.mode & 292) {
            if ((b.includes('w') && !(a.mode & 146)) || (b.includes('x') && !(a.mode & 73)))
                return 2;
        } else return 2;
        return 0;
    }
    function Bc(a, b) {
        if (16384 !== (a.mode & 61440)) return 54;
        try {
            return (qc(a, b), 20);
        } catch (c) {}
        return zc(a, 'wx');
    }
    function T(a) {
        a = K[a];
        if (!a) throw new P(8);
        return a;
    }
    function Cc(a, b = -1) {
        a = Object.assign(new xc(), a);
        if (-1 == b)
            a: {
                for (b = 0; 4096 >= b; b++) if (!K[b]) break a;
                throw new P(33);
            }
        a.pa = b;
        return (K[b] = a);
    }
    function Dc(a, b = -1) {
        a = Cc(a, b);
        a.aa?.tb?.(a);
        return a;
    }
    function Ec(a, b) {
        var c = null?.aa.ka,
            d = c ? null : a;
        c ??= a.ca.ka;
        if (!c) throw new P(63);
        c(d, b);
    }
    var oc = {
        open(a) {
            a.aa = vc[a.node.za].aa;
            a.aa.open?.(a);
        },
        ha() {
            throw new P(70);
        },
    };
    function kc(a, b) {
        vc[a] = { aa: b };
    }
    function Fc(a, b) {
        var c = '/' === b;
        if (c && uc) throw new P(10);
        if (!c && b) {
            var d = S(b, { Fa: !1 });
            b = d.path;
            d = d.node;
            if (d.ya) throw new P(10);
            if (16384 !== (d.mode & 61440)) throw new P(54);
        }
        b = { type: a, yb: {}, Oa: b, bb: [] };
        a = a.ma(b);
        a.ma = b;
        b.root = a;
        c ? (uc = a) : d && ((d.ya = b), d.ma && d.ma.bb.push(b));
    }
    function Gc(a, b, c) {
        var d = S(a, { parent: !0 }).node;
        a = a && a.match(/([^\/]+|\/)\/*$/)[1];
        if (!a) throw new P(28);
        if ('.' === a || '..' === a) throw new P(20);
        var e = Bc(d, a);
        if (e) throw new P(e);
        if (!d.ca.xa) throw new P(63);
        return d.ca.xa(d, a, b, c);
    }
    function U(a) {
        return Gc(a, 16895, 0);
    }
    function Hc(a, b, c) {
        'undefined' == typeof c && ((c = b), (b = 438));
        Gc(a, b | 8192, c);
    }
    function Oa(a, b) {
        if (!ec(a)) throw new P(44);
        var c = S(b, { parent: !0 }).node;
        if (!c) throw new P(44);
        b = b && b.match(/([^\/]+|\/)\/*$/)[1];
        var d = Bc(c, b);
        if (d) throw new P(d);
        if (!c.ca.Aa) throw new P(63);
        c.ca.Aa(c, b, a);
    }
    function Pa(a, b, c = 438) {
        if ('' === a) throw new P(44);
        if ('string' == typeof b) {
            var d = { r: 0, 'r+': 2, w: 577, 'w+': 578, a: 1089, 'a+': 1090 }[b];
            if ('undefined' == typeof d) throw Error(`Unknown file open mode: ${b}`);
            b = d;
        }
        c = b & 64 ? (c & 4095) | 32768 : 0;
        if ('object' == typeof a) d = a;
        else {
            var e = a.endsWith('/');
            var f = S(a, { Ea: !(b & 131072), cb: !0 });
            d = f.node;
            a = f.path;
        }
        f = !1;
        if (b & 64)
            if (d) {
                if (b & 128) throw new P(20);
            } else {
                if (e) throw new P(31);
                d = Gc(a, c | 511, 0);
                f = !0;
            }
        if (!d) throw new P(44);
        8192 === (d.mode & 61440) && (b &= -513);
        if (b & 65536 && 16384 !== (d.mode & 61440)) throw new P(54);
        if (
            !f &&
            (e = d
                ? 40960 === (d.mode & 61440)
                    ? 32
                    : 16384 === (d.mode & 61440) && ('r' !== Ac(b) || b & 576)
                      ? 31
                      : zc(d, Ac(b))
                : 44)
        )
            throw new P(e);
        if (b & 512 && !f) {
            e = d;
            e = 'string' == typeof e ? S(e, { Ea: !0 }).node : e;
            if (16384 === (e.mode & 61440)) throw new P(31);
            if (32768 !== (e.mode & 61440)) throw new P(28);
            if ((a = zc(e, 'w'))) throw new P(a);
            Ec(e, { size: 0, timestamp: Date.now() });
        }
        a: for (e = d; ; ) {
            if (e === e.parent) {
                e = e.ma.Oa;
                var g = g ? ('/' !== e[e.length - 1] ? `${e}/${g}` : e + g) : e;
                break a;
            }
            g = g ? `${e.name}/${g}` : e.name;
            e = e.parent;
        }
        b = Cc({
            node: d,
            path: g,
            flags: b & -131713,
            seekable: !0,
            position: 0,
            aa: d.aa,
            hb: [],
            error: !1,
        });
        b.aa.open && b.aa.open(b);
        f &&
            ((c &= 511),
            (d = 'string' == typeof d ? S(d, { Ea: !0 }).node : d),
            Ec(d, { mode: (c & 4095) | (d.mode & -4096), fa: Date.now(), sb: void 0 }));
        return b;
    }
    function Vb(a) {
        if (null === a.pa) throw new P(8);
        a.Ga && (a.Ga = null);
        try {
            a.aa.close && a.aa.close(a);
        } catch (b) {
            throw b;
        } finally {
            K[a.pa] = null;
        }
        a.pa = null;
    }
    function Ic(a, b, c) {
        if (null === a.pa) throw new P(8);
        if (!a.seekable || !a.aa.ha) throw new P(70);
        if (0 != c && 1 != c && 2 != c) throw new P(28);
        a.position = a.aa.ha(a, b, c);
        a.hb = [];
    }
    function V(a, b) {
        a = ac('/dev/' + a);
        var c = sc(!!b);
        V.Ma ?? (V.Ma = 64);
        var d = (V.Ma++ << 8) | 0;
        kc(d, {
            open(e) {
                e.seekable = !1;
            },
            close() {
                (void 0)?.buffer?.length && (void 0)(10);
            },
            read(e, f, g, n) {
                for (var r = 0, p = 0; p < n; p++) {
                    try {
                        var w = b();
                    } catch (ta) {
                        throw new P(29);
                    }
                    if (void 0 === w && 0 === r) throw new P(6);
                    if (null === w || void 0 === w) break;
                    r++;
                    f[g + p] = w;
                }
                r && (e.node.ra = Date.now());
                return r;
            },
            write(e, f, g, n) {
                for (var r = 0; r < n; r++)
                    try {
                        (void 0)(f[g + r]);
                    } catch (p) {
                        throw new P(29);
                    }
                n && (e.node.ga = e.node.fa = Date.now());
                return r;
            },
        });
        Hc(a, c, d);
    }
    var W = {},
        ea = (a, b, c) => (a ? O((m(), Ha), a, b, c) : ''),
        L = void 0;
    function Za(a, b, c) {
        if (l) return J(3, 1, a, b, c);
        L = c;
        try {
            var d = T(a);
            switch (b) {
                case 0:
                    var e = M();
                    if (0 > e) break;
                    for (; K[e]; ) e++;
                    return Dc(d, e).pa;
                case 1:
                case 2:
                    return 0;
                case 3:
                    return d.flags;
                case 4:
                    return ((e = M()), (d.flags |= e), 0);
                case 12:
                    return ((e = M()), ((m(), Ia)[(e + 0) >> 1] = 2), 0);
                case 13:
                case 14:
                    return 0;
            }
            return -28;
        } catch (f) {
            if ('undefined' == typeof W || 'ErrnoError' !== f.name) throw f;
            return -f.oa;
        }
    }
    function $a(a, b, c) {
        if (l) return J(4, 1, a, b, c);
        L = c;
        try {
            var d = T(a);
            switch (b) {
                case 21509:
                    return d.da ? 0 : -59;
                case 21505:
                    if (!d.da) return -59;
                    if (d.da.na.Za) {
                        a = [
                            3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0,
                            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        ];
                        var e = M();
                        (m(), z)[e >> 2] = 25856;
                        (m(), z)[(e + 4) >> 2] = 5;
                        (m(), z)[(e + 8) >> 2] = 191;
                        (m(), z)[(e + 12) >> 2] = 35387;
                        for (var f = 0; 32 > f; f++) (m(), y)[e + f + 17] = a[f] || 0;
                    }
                    return 0;
                case 21510:
                case 21511:
                case 21512:
                    return d.da ? 0 : -59;
                case 21506:
                case 21507:
                case 21508:
                    if (!d.da) return -59;
                    if (d.da.na.$a)
                        for (e = M(), m(), m(), m(), m(), a = [], f = 0; 32 > f; f++)
                            a.push((m(), y)[e + f + 17]);
                    return 0;
                case 21519:
                    if (!d.da) return -59;
                    e = M();
                    return ((m(), z)[e >> 2] = 0);
                case 21520:
                    return d.da ? -28 : -59;
                case 21537:
                case 21531:
                    e = M();
                    if (!d.aa.Ya) throw new P(59);
                    return d.aa.Ya(d, b, e);
                case 21523:
                    if (!d.da) return -59;
                    d.da.na.ab &&
                        ((f = [24, 80]),
                        (e = M()),
                        ((m(), Ia)[e >> 1] = f[0]),
                        ((m(), Ia)[(e + 2) >> 1] = f[1]));
                    return 0;
                case 21524:
                    return d.da ? 0 : -59;
                case 21515:
                    return d.da ? 0 : -59;
                default:
                    return -28;
            }
        } catch (g) {
            if ('undefined' == typeof W || 'ErrnoError' !== g.name) throw g;
            return -g.oa;
        }
    }
    function ab(a, b, c, d) {
        if (l) return J(5, 1, a, b, c, d);
        L = d;
        try {
            b = ea(b);
            var e = b;
            if ('/' === e.charAt(0)) b = e;
            else {
                var f = -100 === a ? '/' : T(a).path;
                if (0 == e.length) throw new P(44);
                b = f + '/' + e;
            }
            var g = d ? M() : 0;
            return Pa(b, c, g).pa;
        } catch (n) {
            if ('undefined' == typeof W || 'ErrnoError' !== n.name) throw n;
            return -n.oa;
        }
    }
    var bb = () => Ra(''),
        cb = (a) => {
            Ba(a, !k, 1, !da, 3145728, !1);
            Ca();
        },
        Jc = (a) => {
            if (!(a instanceof Ob || 'unwind' == a)) throw a;
        },
        Xb = (a) => {
            if (!La && !ra)
                try {
                    if ((a(), !(La || 0 < I)))
                        try {
                            l ? Ab() && Gb(v) : tb(v);
                        } catch (b) {
                            Jc(b);
                        }
                } catch (b) {
                    Jc(b);
                }
        },
        Da = (a) => {
            Atomics.waitAsync &&
                (Atomics.waitAsync((m(), z), a >> 2, a).value.then(Fa),
                (a += 128),
                Atomics.store((m(), z), a >> 2, 1));
        },
        Fa = () =>
            Xb(() => {
                var a = Ab();
                a && (Da(a), Ib());
            }),
        db = (a, b) => {
            a == b
                ? setTimeout(Fa)
                : l
                  ? postMessage({ Ba: a, la: 'checkMailbox' })
                  : (a = H[a]) && a.postMessage({ la: 'checkMailbox' });
        },
        Kc = [],
        eb = (a, b, c, d, e) => {
            d /= 2;
            Kc.length = d;
            b = e >> 3;
            for (c = 0; c < d; c++)
                (m(), B)[b + 2 * c]
                    ? (Kc[c] = (m(), B)[b + 2 * c + 1])
                    : (Kc[c] = (m(), Ja)[b + 2 * c + 1]);
            return (0, Lc[a])(...Kc);
        },
        fb = () => {
            I = 0;
        },
        gb = (a) => {
            l ? postMessage({ la: 'cleanupThread', gb: a }) : Wb(H[a]);
        },
        hb = () => {},
        X = {},
        nb = () => performance.timeOrigin + performance.now();
    function ib(a, b) {
        if (l) return J(6, 1, a, b);
        X[a] && (clearTimeout(X[a].id), delete X[a]);
        if (!b) return 0;
        var c = setTimeout(() => {
            delete X[a];
            Xb(() => Hb(a, performance.timeOrigin + performance.now()));
        }, b);
        X[a] = { id: c, Ab: b };
        return 0;
    }
    var q = (a, b, c) => hc(a, (m(), Ha), b, c),
        jb = (a, b, c, d) => {
            var e = new Date().getFullYear(),
                f = new Date(e, 0, 1).getTimezoneOffset();
            e = new Date(e, 6, 1).getTimezoneOffset();
            var g = Math.max(f, e);
            (m(), A)[a >> 2] = 60 * g;
            (m(), z)[b >> 2] = Number(f != e);
            b = (n) => {
                var r = Math.abs(n);
                return `UTC${0 <= n ? '-' : '+'}${String(Math.floor(r / 60)).padStart(2, '0')}${String(r % 60).padStart(2, '0')}`;
            };
            a = b(f);
            b = b(e);
            e < f ? (q(a, c, 17), q(b, d, 17)) : (q(a, d, 17), q(b, c, 17));
        },
        Mc = 1;
    function kb(a, b, c) {
        if (!(0 <= a && 3 >= a)) return 28;
        if (0 === a) a = Date.now();
        else if (Mc) a = performance.timeOrigin + performance.now();
        else return 52;
        a = Math.round(1e6 * a);
        (m(), B)[c >> 3] = BigInt(a);
        return 0;
    }
    var Y = () => {
            Y.Ja || (Y.Ja = {});
            Y.Ja[
                'Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread'
            ] ||
                ((Y.Ja[
                    'Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread'
                ] = 1),
                t(
                    'Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread',
                ));
        },
        lb = () => {
            k ||
                (Y(),
                Ra(
                    'Blocking on the main thread is not allowed by default. See https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread',
                ));
        },
        mb = () => {
            I += 1;
            throw 'unwind';
        },
        ob = () => navigator.hardwareConcurrency,
        pb = (a) => {
            var b = (m(), Ha).length;
            a >>>= 0;
            if (a <= b || 2147483648 < a) return !1;
            for (var c = 1; 4 >= c; c *= 2) {
                var d = b * (1 + 0.2 / c);
                d = Math.min(d, a + 100663296);
                a: {
                    d =
                        ((Math.min(2147483648, 65536 * Math.ceil(Math.max(a, d) / 65536)) -
                            x.buffer.byteLength +
                            65535) /
                            65536) |
                        0;
                    try {
                        x.grow(d);
                        sa();
                        var e = 1;
                        break a;
                    } catch (f) {}
                    e = void 0;
                }
                if (e) return !0;
            }
            return !1;
        },
        Nc = {},
        Pc = () => {
            if (!Oc) {
                var a = {
                        USER: 'web_user',
                        LOGNAME: 'web_user',
                        PATH: '/',
                        PWD: '/',
                        HOME: '/home/web_user',
                        LANG:
                            (('object' == typeof navigator && navigator.language) || 'C').replace(
                                '-',
                                '_',
                            ) + '.UTF-8',
                        _: './this.program',
                    },
                    b;
                for (b in Nc) void 0 === Nc[b] ? delete a[b] : (a[b] = Nc[b]);
                var c = [];
                for (b in a) c.push(`${b}=${a[b]}`);
                Oc = c;
            }
            return Oc;
        },
        Oc;
    function rb(a, b) {
        if (l) return J(7, 1, a, b);
        var c = 0,
            d = 0,
            e;
        for (e of Pc()) {
            var f = b + c;
            (m(), A)[(a + d) >> 2] = f;
            c += q(e, f, Infinity) + 1;
            d += 4;
        }
        return 0;
    }
    function sb(a, b) {
        if (l) return J(8, 1, a, b);
        var c = Pc();
        (m(), A)[a >> 2] = c.length;
        a = 0;
        for (var d of c) a += ja(d) + 1;
        (m(), A)[b >> 2] = a;
        return 0;
    }
    function ub(a) {
        if (l) return J(9, 1, a);
        try {
            var b = T(a);
            Vb(b);
            return 0;
        } catch (c) {
            if ('undefined' == typeof W || 'ErrnoError' !== c.name) throw c;
            return c.oa;
        }
    }
    function vb(a, b, c, d) {
        if (l) return J(10, 1, a, b, c, d);
        try {
            a: {
                var e = T(a);
                a = b;
                for (var f, g = (b = 0); g < c; g++) {
                    var n = (m(), A)[a >> 2],
                        r = (m(), A)[(a + 4) >> 2];
                    a += 8;
                    var p = e,
                        w = (m(), y),
                        ta = n,
                        Z = r,
                        D = f;
                    if (0 > Z || 0 > D) throw new P(28);
                    if (null === p.pa) throw new P(8);
                    if (1 === (p.flags & 2097155)) throw new P(8);
                    if (16384 === (p.node.mode & 61440)) throw new P(31);
                    if (!p.aa.read) throw new P(28);
                    var aa = 'undefined' != typeof D;
                    if (!aa) D = p.position;
                    else if (!p.seekable) throw new P(70);
                    var ba = p.aa.read(p, w, ta, Z, D);
                    aa || (p.position += ba);
                    var E = ba;
                    if (0 > E) {
                        var ca = -1;
                        break a;
                    }
                    b += E;
                    if (E < r) break;
                    'undefined' != typeof f && (f += E);
                }
                ca = b;
            }
            (m(), A)[d >> 2] = ca;
            return 0;
        } catch (N) {
            if ('undefined' == typeof W || 'ErrnoError' !== N.name) throw N;
            return N.oa;
        }
    }
    function wb(a, b, c, d) {
        if (l) return J(11, 1, a, b, c, d);
        b = -9007199254740992 > b || 9007199254740992 < b ? NaN : Number(b);
        try {
            if (isNaN(b)) return 61;
            var e = T(a);
            Ic(e, b, c);
            (m(), B)[d >> 3] = BigInt(e.position);
            e.Ga && 0 === b && 0 === c && (e.Ga = null);
            return 0;
        } catch (f) {
            if ('undefined' == typeof W || 'ErrnoError' !== f.name) throw f;
            return f.oa;
        }
    }
    function xb(a, b, c, d) {
        if (l) return J(12, 1, a, b, c, d);
        try {
            a: {
                var e = T(a);
                a = b;
                for (var f, g = (b = 0); g < c; g++) {
                    var n = (m(), A)[a >> 2],
                        r = (m(), A)[(a + 4) >> 2];
                    a += 8;
                    var p = e,
                        w = (m(), y),
                        ta = n,
                        Z = r,
                        D = f;
                    if (0 > Z || 0 > D) throw new P(28);
                    if (null === p.pa) throw new P(8);
                    if (0 === (p.flags & 2097155)) throw new P(8);
                    if (16384 === (p.node.mode & 61440)) throw new P(31);
                    if (!p.aa.write) throw new P(28);
                    p.seekable && p.flags & 1024 && Ic(p, 0, 2);
                    var aa = 'undefined' != typeof D;
                    if (!aa) D = p.position;
                    else if (!p.seekable) throw new P(70);
                    var ba = p.aa.write(p, w, ta, Z, D, void 0);
                    aa || (p.position += ba);
                    var E = ba;
                    if (0 > E) {
                        var ca = -1;
                        break a;
                    }
                    b += E;
                    if (E < r) break;
                    'undefined' != typeof f && (f += E);
                }
                ca = b;
            }
            (m(), A)[d >> 2] = ca;
            return 0;
        } catch (N) {
            if ('undefined' == typeof W || 'ErrnoError' !== N.name) throw N;
            return N.oa;
        }
    }
    R = Array(4096);
    Fc(Q, '/');
    U('/tmp');
    U('/home');
    U('/home/web_user');
    (function () {
        U('/dev');
        kc(259, { read: () => 0, write: (d, e, f, g) => g, ha: () => 0 });
        Hc('/dev/null', 259);
        jc(1280, mc);
        jc(1536, nc);
        Hc('/dev/tty', 1280);
        Hc('/dev/tty1', 1536);
        var a = new Uint8Array(1024),
            b = 0,
            c = () => {
                0 === b && (dc(a), (b = a.byteLength));
                return a[--b];
            };
        V('random', c);
        V('urandom', c);
        U('/dev/shm');
        U('/dev/shm/tmp');
    })();
    (function () {
        U('/proc');
        var a = U('/proc/self');
        U('/proc/self/fd');
        Fc(
            {
                ma() {
                    var b = pc(a, 'fd', 16895, 73);
                    b.aa = { ha: Q.aa.ha };
                    b.ca = {
                        ta(c, d) {
                            c = +d;
                            var e = T(c);
                            c = {
                                parent: null,
                                ma: { Oa: 'fake' },
                                ca: { ua: () => e.path },
                                id: c + 1,
                            };
                            return (c.parent = c);
                        },
                        Ia() {
                            return Array.from(K.entries())
                                .filter(([, c]) => c)
                                .map(([c]) => c.toString());
                        },
                    };
                    return b;
                },
            },
            '/proc/self/fd',
        );
    })();
    l ||
        (h.wasmMemory
            ? (x = h.wasmMemory)
            : (x = new WebAssembly.Memory({ initial: 1024, maximum: 32768, shared: !0 })),
        sa());
    h.print && (qa = h.print);
    h.printErr && (t = h.printErr);
    h.UTF8ToString = ea;
    h.stringToUTF8 = q;
    var Lc = [yb, Ub, Zb, Za, $a, ab, ib, rb, sb, ub, vb, wb, xb],
        ka,
        ia,
        fa,
        Ab,
        Bb,
        Cb,
        Ba,
        Ga,
        Db,
        ha,
        Eb,
        Fb,
        Gb,
        Hb,
        Ib,
        Jb,
        Kb,
        Lb,
        Mb,
        Nb,
        Xa;
    function Qc(a = []) {
        var b = Bb;
        I += 1;
        a.unshift('./this.program');
        var c = a.length,
            d = Lb(4 * (c + 1)),
            e = d;
        a.forEach((g) => {
            var n = (m(), A),
                r = e >> 2,
                p = ja(g) + 1,
                w = Lb(p);
            q(g, w, p);
            n[r] = w;
            e += 4;
        });
        (m(), A)[e >> 2] = 0;
        try {
            var f = b(c, d);
            tb(f, !0);
        } catch (g) {
            Jc(g);
        }
    }
    function za() {
        if (!(0 < tc))
            if (l) (ua?.(h), Ma());
            else {
                for (var a = Qb; 0 < a.length; ) a.shift()(h);
                0 < tc || ((h.calledRun = !0), ra || (Ma(), ua?.(h), Qc(la)));
            }
    }
    var C;
    l || ((C = await ya()), za());
    Ka
        ? (moduleRtn = h)
        : (moduleRtn = new Promise((a, b) => {
              ua = a;
              va = b;
          }));
    return moduleRtn;
}
export default Sf_18_Smallnet_Web;
var isPthread = globalThis.self?.name?.startsWith('em-pthread');
isPthread && Sf_18_Smallnet_Web();
