/* DAS PR0GRAMM MAG JAVASCRIPT UND...

jquery
    http://jquery.com/

jquery-cookie
    https://github.com/carhartl/jquery-cookie

jquery-tagsinput
    https://github.com/xoxco/jQuery-Tags-Input

John Resig's Simple JavaScript Inheritance
    http://ejohn.org/blog/simple-javascript-inheritance/
*/

/* Amalgamation 2015-09-21 14:55:08 */
"use strict";
window.p = {
    NAVIGATE: {
        DEFAULT: 0,
        SILENT: 1,
        FORCE: 2
    },
    path: 'frontend/',
    currentView: null,
    $container: null,
    dispatchFromHistory: false,
    mobile: (/mobile|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)),
    _routes: [],
    _loaded: {
        'lib/pproject.js': true
    },
    _current: [],
    _loadedCache: {},
    _navigationStack: [],
    _hasPushState: (window.history && window.history.pushState),
    location: '--p-invalid',
    debug: false,
    log: function() {
        if (this.debug) {
            console.log.apply(console, arguments);
        }
    },
    token: function() {
        return Math.random().toString(36).substr(2);
    },
    copy: function(object) {
        if (!object || typeof(object) != 'object' || object instanceof p.Class || object === null) {
            return object;
        } else if (object instanceof Array) {
            var c = [];
            for (var i = 0, l = object.length; i < l; i++) {
                c[i] = p.copy(object[i]);
            }
            return c;
        } else {
            var c = {};
            for (var i in object) {
                c[i] = p.copy(object[i]);
            }
            return c;
        }
    },
    merge: function(original, extended) {
        for (var key in extended) {
            var ext = extended[key];
            if (typeof(ext) != 'object' || ext instanceof HTMLElement || ext instanceof p.Class || ext === null) {
                original[key] = ext;
            } else {
                if (!original[key] || typeof(original[key]) != 'object') {
                    original[key] = (ext instanceof Array) ? [] : {};
                }
                p.merge(original[key], ext);
            }
        }
        return original;
    },
    load: function(file, asObject) {
        var request = new XMLHttpRequest();
        request.open('GET', '/' + file, false);
        request.send();
        return (asObject === false) ? request.responseText : {
            src: request.responseText,
            path: file
        };
    },
    require: function(file) {
        if (this._loaded[file]) {
            return;
        }
        if ([].indexOf && this._current.indexOf(file) !== -1) {
            console.log('Circular dependency: ' + this._current.join(' -> ') + ' -> ' + file);
            return;
        }
        this._current.push(file);
        var code = this.load(this.path + file, false) + "\n //# sourceURL=" + this.path + file;
        try {
            eval.call(window, code);
        } catch (error) {
            console.error(error, error.message, error.lineNumber, this.path + file);
        }
        this._current.pop();
        this._loaded[file] = true;
    },
    _cachedRegexp: {
        escapeQuotes: /'/g,
        escapeBackslashes: /\\/g,
        unescapeQuotes: /\\'/g,
        removeWhitspace: /[\r\t\n]+/g,
        printEscaped: /\{\{([\w\.\,\(\)\[\]\"]+?)\}\}/mg,
        print: /\{([\w\.\,\(\)\[\]\"]+?)\}/g,
        js: /<\?js(.*?)\?>/mg
    },
    compileTemplate: function(t) {
        var path = t.path || 'unknown';
        t = t.src || t;
        try {
            var re = this._cachedRegexp;
            var compiled = new Function("data", "try {" + "data = data || {};" + "var _parts = [];" + "var print = function(a){ _parts.push(a); };" + "with(data){ _parts.push('" +
                t.replace(re.escapeBackslashes, "\\\\").replace(re.escapeQuotes, "\\'").replace(re.removeWhitspace, " ").replace(re.printEscaped, function(m, js) {
                    return "'," + js.replace(re.unescapeQuotes, "'") + ".escape(),'";
                }).replace(re.print, function(m, js) {
                    return "'," + js.replace(re.unescapeQuotes, "'") + ",'";
                }).replace(re.js, function(m, js) {
                    return "');" + js.replace(re.unescapeQuotes, "'") + ";_parts.push('";
                }) + "');} " + "} catch( error ) { console.error(error.message + ' in " + path + "'); }" + "return _parts.join('');");
        } catch (error) {
            console.error(error.message, path);
        }
        return compiled;
    },
    link: function(link) {
        return '#' + link;
    },
    getURL: function() {
        var f = '';
        if (document.location.pathname != '/') {
            f = document.location.pathname.substr(1);
        } else {
            var match = window.location.href.match(/#(.*)$/);
            f = match ? match[1] : '';
        }
        return f;
    },
    getLocation: function() {
        return this.getURL().split(':')[0];
    },
    getFragment: function() {
        return this.getURL().split(':')[1] || '';
    },
    navigateTo: function(location, mode) {
        this._navigateSilent = (mode == p.NAVIGATE.SILENT);
        if (this._hasPushState) {
            var url = '/' + location;
            window.history.pushState({}, document.title, url);
            this._dispatch(null, mode == p.NAVIGATE.FORCE);
        } else {
            var url = document.location.href.replace(/#.*$/, '') + '#' + location;
            document.location.assign(url);
        }
        if (CONFIG.ANALYTICS.ENABLED && window.ga) {
            ga('send', 'pageview', {
                page: location
            });
        }
    },
    navigateToPopStack: function() {
        if (!this._navigationStack.length) {
            this.navigateTo('');
        } else {
            this.navigateTo(this._navigationStack.pop());
        }
    },
    navigateToPushStack: function(location) {
        this._navigationStack.push(this.getLocation());
        this.navigateTo(location);
    },
    addRoute: function(viewClass, rule) {
        if (!viewClass) {
            throw ('Invalid viewClass ' + viewClass + ' for rule ' + rule);
        }
        var compiledRegexp = /(.*)/,
            names = [];
        if (rule !== '*') {
            names = rule.match(/<([^>]+)>/g) || [];
            for (var i = 0; names && i < names.length; i++) {
                names[i] = names[i].replace(/<|:.*>|>/g, '');
            }
            var regexp = rule.replace(/\//g, '\\/').replace(/<\w+:d>/g, '(\\d+)').replace(/<\w+:(.*?)>/g, '($1)').replace(/<\w+>/g, '([^\\/]+)');
            compiledRegexp = new RegExp('^' + regexp + '$');
        }
        this._routes.push({
            rule: compiledRegexp,
            paramNames: names,
            viewClass: viewClass
        });
    },
    setView: function(viewClass, params) {
        if (!this.currentView || this.currentView.classId !== viewClass.classId) {
            if (this.currentView) {
                this.currentView.hide();
            }
            var newView = new(viewClass)(this.$container);
            if (newView.aborted) {
                return;
            }
            this.currentView = newView;
        }
        $(document).scrollTop(0);
        if (this.onsetview) {
            this.onsetview(this.currentView);
        }
        this.currentView.show(params);
    },
    reload: function() {
        window.location.reload(true);
    },
    _dispatch: function(event, force) {
        var prevLocation = this.location;
        this.location = this.getLocation();
        var prevFragment = this.fragment;
        this.fragment = this.getFragment();
        if (this._navigateSilent || (prevLocation == this.location && force !== true)) {
            this._navigateSilent = false;
            if (prevFragment != this.fragment && this.currentView && this.currentView.fragmentChange) {
                this.currentView.fragmentChange(this.fragment);
            }
            return;
        }
        var matches = null;
        for (var r = 0; r < this._routes.length; r++) {
            var route = this._routes[r];
            if ((matches = this.location.match(route.rule))) {
                var params = {};
                for (var i = 0; i < route.paramNames.length; i++) {
                    params[route.paramNames[i]] = decodeURIComponent(matches[i + 1]);
                }
                this.dispatchFromHistory = !!event;
                this.setView(this._routes[r].viewClass, params);
                this.dispatchFromHistory = false;
                return;
            }
        }
    },
    _started: false,
    start: function(container) {
        if (this._started) {
            return;
        }
        var hashMatch = window.location.href.match(/#(.+)$/);
        if (this._hasPushState && hashMatch) {
            window.history.replaceState({}, document.title, '/' + hashMatch[1]);
        } else if (!this._hasPushState && document.location.pathname != '/') {
            document.location.href = '/#' + this.getLocation();
            return;
        }
        this._started = true;
        this.$container = $(container || 'body');
        var ev = this._hasPushState ? 'popstate' : 'hashchange';
        $(window).bind(ev, this._dispatch.bind(this));
        this._dispatch();
    }
};
"use strict";
(function(window) {
    var initializing = false,
        fnTest = /xyz/.test(function() {
            xyz;
        }) ? /\bparent\b/ : /.*/;
    window.p.Class = function() {};
    window.p.Class.extend = function(prop) {
        var parent = this.prototype;
        initializing = true;
        var prototype = new this();
        initializing = false;
        for (var name in prop) {
            if (typeof(prop[name]) == "function" && typeof(parent[name]) == "function" && fnTest.test(prop[name])) {
                prototype[name] = (function(name, fn) {
                    return function() {
                        var tmp = this.parent;
                        this.parent = parent[name];
                        var ret = fn.apply(this, arguments);
                        this.parent = tmp;
                        return ret;
                    };
                })(name, prop[name]);
            } else {
                prototype[name] = prop[name];
            }
        }

        function Class() {
            if (!initializing) {
                if (this.staticInstantiate) {
                    var obj = this.staticInstantiate.apply(this, arguments);
                    if (obj) {
                        return obj;
                    }
                }
                for (var prop in this) {
                    if (typeof(this[prop]) == 'object') {
                        this[prop] = p.copy(this[prop]);
                    }
                }
                if (this.init) {
                    this.init.apply(this, arguments);
                }
            }
            return this;
        }
        Class.prototype = prototype;
        Class.prototype.constructor = Class;
        Class.extend = window.p.Class.extend;
        Class.classId = prototype.classId = ++window.p.Class._lastId;
        return Class;
    };
    window.p.Class._lastId = 0;
})(window);
! function(a, b) {
    "object" == typeof module && "object" == typeof module.exports ? module.exports = a.document ? b(a, !0) : function(a) {
        if (!a.document) throw new Error("jQuery requires a window with a document");
        return b(a)
    } : b(a)
}("undefined" != typeof window ? window : this, function(a, b) {
    var c = [],
        d = c.slice,
        e = c.concat,
        f = c.push,
        g = c.indexOf,
        h = {},
        i = h.toString,
        j = h.hasOwnProperty,
        k = "".trim,
        l = {},
        m = a.document,
        n = "2.1.0",
        o = function(a, b) {
            return new o.fn.init(a, b)
        },
        p = /^-ms-/,
        q = /-([\da-z])/gi,
        r = function(a, b) {
            return b.toUpperCase()
        };
    o.fn = o.prototype = {
        jquery: n,
        constructor: o,
        selector: "",
        length: 0,
        toArray: function() {
            return d.call(this)
        },
        get: function(a) {
            return null != a ? 0 > a ? this[a + this.length] : this[a] : d.call(this)
        },
        pushStack: function(a) {
            var b = o.merge(this.constructor(), a);
            return b.prevObject = this, b.context = this.context, b
        },
        each: function(a, b) {
            return o.each(this, a, b)
        },
        map: function(a) {
            return this.pushStack(o.map(this, function(b, c) {
                return a.call(b, c, b)
            }))
        },
        slice: function() {
            return this.pushStack(d.apply(this, arguments))
        },
        first: function() {
            return this.eq(0)
        },
        last: function() {
            return this.eq(-1)
        },
        eq: function(a) {
            var b = this.length,
                c = +a + (0 > a ? b : 0);
            return this.pushStack(c >= 0 && b > c ? [this[c]] : [])
        },
        end: function() {
            return this.prevObject || this.constructor(null)
        },
        push: f,
        sort: c.sort,
        splice: c.splice
    }, o.extend = o.fn.extend = function() {
        var a, b, c, d, e, f, g = arguments[0] || {},
            h = 1,
            i = arguments.length,
            j = !1;
        for ("boolean" == typeof g && (j = g, g = arguments[h] || {}, h++), "object" == typeof g || o.isFunction(g) || (g = {}), h === i && (g = this, h--); i > h; h++)
            if (null != (a = arguments[h]))
                for (b in a) c = g[b], d = a[b], g !== d && (j && d && (o.isPlainObject(d) || (e = o.isArray(d))) ? (e ? (e = !1, f = c && o.isArray(c) ? c : []) : f = c && o.isPlainObject(c) ? c : {}, g[b] = o.extend(j, f, d)) : void 0 !== d && (g[b] = d));
        return g
    }, o.extend({
        expando: "jQuery" + (n + Math.random()).replace(/\D/g, ""),
        isReady: !0,
        error: function(a) {
            throw new Error(a)
        },
        noop: function() {},
        isFunction: function(a) {
            return "function" === o.type(a)
        },
        isArray: Array.isArray,
        isWindow: function(a) {
            return null != a && a === a.window
        },
        isNumeric: function(a) {
            return a - parseFloat(a) >= 0
        },
        isPlainObject: function(a) {
            if ("object" !== o.type(a) || a.nodeType || o.isWindow(a)) return !1;
            try {
                if (a.constructor && !j.call(a.constructor.prototype, "isPrototypeOf")) return !1
            } catch (b) {
                return !1
            }
            return !0
        },
        isEmptyObject: function(a) {
            var b;
            for (b in a) return !1;
            return !0
        },
        type: function(a) {
            return null == a ? a + "" : "object" == typeof a || "function" == typeof a ? h[i.call(a)] || "object" : typeof a
        },
        globalEval: function(a) {
            var b, c = eval;
            a = o.trim(a), a && (1 === a.indexOf("use strict") ? (b = m.createElement("script"), b.text = a, m.head.appendChild(b).parentNode.removeChild(b)) : c(a))
        },
        camelCase: function(a) {
            return a.replace(p, "ms-").replace(q, r)
        },
        nodeName: function(a, b) {
            return a.nodeName && a.nodeName.toLowerCase() === b.toLowerCase()
        },
        each: function(a, b, c) {
            var d, e = 0,
                f = a.length,
                g = s(a);
            if (c) {
                if (g) {
                    for (; f > e; e++)
                        if (d = b.apply(a[e], c), d === !1) break
                } else
                    for (e in a)
                        if (d = b.apply(a[e], c), d === !1) break
            } else if (g) {
                for (; f > e; e++)
                    if (d = b.call(a[e], e, a[e]), d === !1) break
            } else
                for (e in a)
                    if (d = b.call(a[e], e, a[e]), d === !1) break; return a
        },
        trim: function(a) {
            return null == a ? "" : k.call(a)
        },
        makeArray: function(a, b) {
            var c = b || [];
            return null != a && (s(Object(a)) ? o.merge(c, "string" == typeof a ? [a] : a) : f.call(c, a)), c
        },
        inArray: function(a, b, c) {
            return null == b ? -1 : g.call(b, a, c)
        },
        merge: function(a, b) {
            for (var c = +b.length, d = 0, e = a.length; c > d; d++) a[e++] = b[d];
            return a.length = e, a
        },
        grep: function(a, b, c) {
            for (var d, e = [], f = 0, g = a.length, h = !c; g > f; f++) d = !b(a[f], f), d !== h && e.push(a[f]);
            return e
        },
        map: function(a, b, c) {
            var d, f = 0,
                g = a.length,
                h = s(a),
                i = [];
            if (h)
                for (; g > f; f++) d = b(a[f], f, c), null != d && i.push(d);
            else
                for (f in a) d = b(a[f], f, c), null != d && i.push(d);
            return e.apply([], i)
        },
        guid: 1,
        proxy: function(a, b) {
            var c, e, f;
            return "string" == typeof b && (c = a[b], b = a, a = c), o.isFunction(a) ? (e = d.call(arguments, 2), f = function() {
                return a.apply(b || this, e.concat(d.call(arguments)))
            }, f.guid = a.guid = a.guid || o.guid++, f) : void 0
        },
        now: Date.now,
        support: l
    }), o.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(a, b) {
        h["[object " + b + "]"] = b.toLowerCase()
    });

    function s(a) {
        var b = a.length,
            c = o.type(a);
        return "function" === c || o.isWindow(a) ? !1 : 1 === a.nodeType && b ? !0 : "array" === c || 0 === b || "number" == typeof b && b > 0 && b - 1 in a
    }
    var t = function(a) {
        var b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s = "sizzle" + -new Date,
            t = a.document,
            u = 0,
            v = 0,
            w = eb(),
            x = eb(),
            y = eb(),
            z = function(a, b) {
                return a === b && (j = !0), 0
            },
            A = "undefined",
            B = 1 << 31,
            C = {}.hasOwnProperty,
            D = [],
            E = D.pop,
            F = D.push,
            G = D.push,
            H = D.slice,
            I = D.indexOf || function(a) {
                for (var b = 0, c = this.length; c > b; b++)
                    if (this[b] === a) return b;
                return -1
            },
            J = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",
            K = "[\\x20\\t\\r\\n\\f]",
            L = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",
            M = L.replace("w", "w#"),
            N = "\\[" + K + "*(" + L + ")" + K + "*(?:([*^$|!~]?=)" + K + "*(?:(['\"])((?:\\\\.|[^\\\\])*?)\\3|(" + M + ")|)|)" + K + "*\\]",
            O = ":(" + L + ")(?:\\(((['\"])((?:\\\\.|[^\\\\])*?)\\3|((?:\\\\.|[^\\\\()[\\]]|" + N.replace(3, 8) + ")*)|.*)\\)|)",
            P = new RegExp("^" + K + "+|((?:^|[^\\\\])(?:\\\\.)*)" + K + "+$", "g"),
            Q = new RegExp("^" + K + "*," + K + "*"),
            R = new RegExp("^" + K + "*([>+~]|" + K + ")" + K + "*"),
            S = new RegExp("=" + K + "*([^\\]'\"]*?)" + K + "*\\]", "g"),
            T = new RegExp(O),
            U = new RegExp("^" + M + "$"),
            V = {
                ID: new RegExp("^#(" + L + ")"),
                CLASS: new RegExp("^\\.(" + L + ")"),
                TAG: new RegExp("^(" + L.replace("w", "w*") + ")"),
                ATTR: new RegExp("^" + N),
                PSEUDO: new RegExp("^" + O),
                CHILD: new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + K + "*(even|odd|(([+-]|)(\\d*)n|)" + K + "*(?:([+-]|)" + K + "*(\\d+)|))" + K + "*\\)|)", "i"),
                bool: new RegExp("^(?:" + J + ")$", "i"),
                needsContext: new RegExp("^" + K + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + K + "*((?:-\\d)?\\d*)" + K + "*\\)|)(?=[^-]|$)", "i")
            },
            W = /^(?:input|select|textarea|button)$/i,
            X = /^h\d$/i,
            Y = /^[^{]+\{\s*\[native \w/,
            Z = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,
            $ = /[+~]/,
            _ = /'|\\/g,
            ab = new RegExp("\\\\([\\da-f]{1,6}" + K + "?|(" + K + ")|.)", "ig"),
            bb = function(a, b, c) {
                var d = "0x" + b - 65536;
                return d !== d || c ? b : 0 > d ? String.fromCharCode(d + 65536) : String.fromCharCode(d >> 10 | 55296, 1023 & d | 56320)
            };
        try {
            G.apply(D = H.call(t.childNodes), t.childNodes), D[t.childNodes.length].nodeType
        } catch (cb) {
            G = {
                apply: D.length ? function(a, b) {
                    F.apply(a, H.call(b))
                } : function(a, b) {
                    var c = a.length,
                        d = 0;
                    while (a[c++] = b[d++]);
                    a.length = c - 1
                }
            }
        }

        function db(a, b, d, e) {
            var f, g, h, i, j, m, p, q, u, v;
            if ((b ? b.ownerDocument || b : t) !== l && k(b), b = b || l, d = d || [], !a || "string" != typeof a) return d;
            if (1 !== (i = b.nodeType) && 9 !== i) return [];
            if (n && !e) {
                if (f = Z.exec(a))
                    if (h = f[1]) {
                        if (9 === i) {
                            if (g = b.getElementById(h), !g || !g.parentNode) return d;
                            if (g.id === h) return d.push(g), d
                        } else if (b.ownerDocument && (g = b.ownerDocument.getElementById(h)) && r(b, g) && g.id === h) return d.push(g), d
                    } else {
                        if (f[2]) return G.apply(d, b.getElementsByTagName(a)), d;
                        if ((h = f[3]) && c.getElementsByClassName && b.getElementsByClassName) return G.apply(d, b.getElementsByClassName(h)), d
                    }
                if (c.qsa && (!o || !o.test(a))) {
                    if (q = p = s, u = b, v = 9 === i && a, 1 === i && "object" !== b.nodeName.toLowerCase()) {
                        m = ob(a), (p = b.getAttribute("id")) ? q = p.replace(_, "\\$&") : b.setAttribute("id", q), q = "[id='" + q + "'] ", j = m.length;
                        while (j--) m[j] = q + pb(m[j]);
                        u = $.test(a) && mb(b.parentNode) || b, v = m.join(",")
                    }
                    if (v) try {
                        return G.apply(d, u.querySelectorAll(v)), d
                    } catch (w) {} finally {
                        p || b.removeAttribute("id")
                    }
                }
            }
            return xb(a.replace(P, "$1"), b, d, e)
        }

        function eb() {
            var a = [];

            function b(c, e) {
                return a.push(c + " ") > d.cacheLength && delete b[a.shift()], b[c + " "] = e
            }
            return b
        }

        function fb(a) {
            return a[s] = !0, a
        }

        function gb(a) {
            var b = l.createElement("div");
            try {
                return !!a(b)
            } catch (c) {
                return !1
            } finally {
                b.parentNode && b.parentNode.removeChild(b), b = null
            }
        }

        function hb(a, b) {
            var c = a.split("|"),
                e = a.length;
            while (e--) d.attrHandle[c[e]] = b
        }

        function ib(a, b) {
            var c = b && a,
                d = c && 1 === a.nodeType && 1 === b.nodeType && (~b.sourceIndex || B) - (~a.sourceIndex || B);
            if (d) return d;
            if (c)
                while (c = c.nextSibling)
                    if (c === b) return -1;
            return a ? 1 : -1
        }

        function jb(a) {
            return function(b) {
                var c = b.nodeName.toLowerCase();
                return "input" === c && b.type === a
            }
        }

        function kb(a) {
            return function(b) {
                var c = b.nodeName.toLowerCase();
                return ("input" === c || "button" === c) && b.type === a
            }
        }

        function lb(a) {
            return fb(function(b) {
                return b = +b, fb(function(c, d) {
                    var e, f = a([], c.length, b),
                        g = f.length;
                    while (g--) c[e = f[g]] && (c[e] = !(d[e] = c[e]))
                })
            })
        }

        function mb(a) {
            return a && typeof a.getElementsByTagName !== A && a
        }
        c = db.support = {}, f = db.isXML = function(a) {
            var b = a && (a.ownerDocument || a).documentElement;
            return b ? "HTML" !== b.nodeName : !1
        }, k = db.setDocument = function(a) {
            var b, e = a ? a.ownerDocument || a : t,
                g = e.defaultView;
            return e !== l && 9 === e.nodeType && e.documentElement ? (l = e, m = e.documentElement, n = !f(e), g && g !== g.top && (g.addEventListener ? g.addEventListener("unload", function() {
                k()
            }, !1) : g.attachEvent && g.attachEvent("onunload", function() {
                k()
            })), c.attributes = gb(function(a) {
                return a.className = "i", !a.getAttribute("className")
            }), c.getElementsByTagName = gb(function(a) {
                return a.appendChild(e.createComment("")), !a.getElementsByTagName("*").length
            }), c.getElementsByClassName = Y.test(e.getElementsByClassName) && gb(function(a) {
                return a.innerHTML = "<div class='a'></div><div class='a i'></div>", a.firstChild.className = "i", 2 === a.getElementsByClassName("i").length
            }), c.getById = gb(function(a) {
                return m.appendChild(a).id = s, !e.getElementsByName || !e.getElementsByName(s).length
            }), c.getById ? (d.find.ID = function(a, b) {
                if (typeof b.getElementById !== A && n) {
                    var c = b.getElementById(a);
                    return c && c.parentNode ? [c] : []
                }
            }, d.filter.ID = function(a) {
                var b = a.replace(ab, bb);
                return function(a) {
                    return a.getAttribute("id") === b
                }
            }) : (delete d.find.ID, d.filter.ID = function(a) {
                var b = a.replace(ab, bb);
                return function(a) {
                    var c = typeof a.getAttributeNode !== A && a.getAttributeNode("id");
                    return c && c.value === b
                }
            }), d.find.TAG = c.getElementsByTagName ? function(a, b) {
                return typeof b.getElementsByTagName !== A ? b.getElementsByTagName(a) : void 0
            } : function(a, b) {
                var c, d = [],
                    e = 0,
                    f = b.getElementsByTagName(a);
                if ("*" === a) {
                    while (c = f[e++]) 1 === c.nodeType && d.push(c);
                    return d
                }
                return f
            }, d.find.CLASS = c.getElementsByClassName && function(a, b) {
                return typeof b.getElementsByClassName !== A && n ? b.getElementsByClassName(a) : void 0
            }, p = [], o = [], (c.qsa = Y.test(e.querySelectorAll)) && (gb(function(a) {
                a.innerHTML = "<select t=''><option selected=''></option></select>", a.querySelectorAll("[t^='']").length && o.push("[*^$]=" + K + "*(?:''|\"\")"), a.querySelectorAll("[selected]").length || o.push("\\[" + K + "*(?:value|" + J + ")"), a.querySelectorAll(":checked").length || o.push(":checked")
            }), gb(function(a) {
                var b = e.createElement("input");
                b.setAttribute("type", "hidden"), a.appendChild(b).setAttribute("name", "D"), a.querySelectorAll("[name=d]").length && o.push("name" + K + "*[*^$|!~]?="), a.querySelectorAll(":enabled").length || o.push(":enabled", ":disabled"), a.querySelectorAll("*,:x"), o.push(",.*:")
            })), (c.matchesSelector = Y.test(q = m.webkitMatchesSelector || m.mozMatchesSelector || m.oMatchesSelector || m.msMatchesSelector)) && gb(function(a) {
                c.disconnectedMatch = q.call(a, "div"), q.call(a, "[s!='']:x"), p.push("!=", O)
            }), o = o.length && new RegExp(o.join("|")), p = p.length && new RegExp(p.join("|")), b = Y.test(m.compareDocumentPosition), r = b || Y.test(m.contains) ? function(a, b) {
                var c = 9 === a.nodeType ? a.documentElement : a,
                    d = b && b.parentNode;
                return a === d || !(!d || 1 !== d.nodeType || !(c.contains ? c.contains(d) : a.compareDocumentPosition && 16 & a.compareDocumentPosition(d)))
            } : function(a, b) {
                if (b)
                    while (b = b.parentNode)
                        if (b === a) return !0;
                return !1
            }, z = b ? function(a, b) {
                if (a === b) return j = !0, 0;
                var d = !a.compareDocumentPosition - !b.compareDocumentPosition;
                return d ? d : (d = (a.ownerDocument || a) === (b.ownerDocument || b) ? a.compareDocumentPosition(b) : 1, 1 & d || !c.sortDetached && b.compareDocumentPosition(a) === d ? a === e || a.ownerDocument === t && r(t, a) ? -1 : b === e || b.ownerDocument === t && r(t, b) ? 1 : i ? I.call(i, a) - I.call(i, b) : 0 : 4 & d ? -1 : 1)
            } : function(a, b) {
                if (a === b) return j = !0, 0;
                var c, d = 0,
                    f = a.parentNode,
                    g = b.parentNode,
                    h = [a],
                    k = [b];
                if (!f || !g) return a === e ? -1 : b === e ? 1 : f ? -1 : g ? 1 : i ? I.call(i, a) - I.call(i, b) : 0;
                if (f === g) return ib(a, b);
                c = a;
                while (c = c.parentNode) h.unshift(c);
                c = b;
                while (c = c.parentNode) k.unshift(c);
                while (h[d] === k[d]) d++;
                return d ? ib(h[d], k[d]) : h[d] === t ? -1 : k[d] === t ? 1 : 0
            }, e) : l
        }, db.matches = function(a, b) {
            return db(a, null, null, b)
        }, db.matchesSelector = function(a, b) {
            if ((a.ownerDocument || a) !== l && k(a), b = b.replace(S, "='$1']"), !(!c.matchesSelector || !n || p && p.test(b) || o && o.test(b))) try {
                var d = q.call(a, b);
                if (d || c.disconnectedMatch || a.document && 11 !== a.document.nodeType) return d
            } catch (e) {}
            return db(b, l, null, [a]).length > 0
        }, db.contains = function(a, b) {
            return (a.ownerDocument || a) !== l && k(a), r(a, b)
        }, db.attr = function(a, b) {
            (a.ownerDocument || a) !== l && k(a);
            var e = d.attrHandle[b.toLowerCase()],
                f = e && C.call(d.attrHandle, b.toLowerCase()) ? e(a, b, !n) : void 0;
            return void 0 !== f ? f : c.attributes || !n ? a.getAttribute(b) : (f = a.getAttributeNode(b)) && f.specified ? f.value : null
        }, db.error = function(a) {
            throw new Error("Syntax error, unrecognized expression: " + a)
        }, db.uniqueSort = function(a) {
            var b, d = [],
                e = 0,
                f = 0;
            if (j = !c.detectDuplicates, i = !c.sortStable && a.slice(0), a.sort(z), j) {
                while (b = a[f++]) b === a[f] && (e = d.push(f));
                while (e--) a.splice(d[e], 1)
            }
            return i = null, a
        }, e = db.getText = function(a) {
            var b, c = "",
                d = 0,
                f = a.nodeType;
            if (f) {
                if (1 === f || 9 === f || 11 === f) {
                    if ("string" == typeof a.textContent) return a.textContent;
                    for (a = a.firstChild; a; a = a.nextSibling) c += e(a)
                } else if (3 === f || 4 === f) return a.nodeValue
            } else
                while (b = a[d++]) c += e(b);
            return c
        }, d = db.selectors = {
            cacheLength: 50,
            createPseudo: fb,
            match: V,
            attrHandle: {},
            find: {},
            relative: {
                ">": {
                    dir: "parentNode",
                    first: !0
                },
                " ": {
                    dir: "parentNode"
                },
                "+": {
                    dir: "previousSibling",
                    first: !0
                },
                "~": {
                    dir: "previousSibling"
                }
            },
            preFilter: {
                ATTR: function(a) {
                    return a[1] = a[1].replace(ab, bb), a[3] = (a[4] || a[5] || "").replace(ab, bb), "~=" === a[2] && (a[3] = " " + a[3] + " "), a.slice(0, 4)
                },
                CHILD: function(a) {
                    return a[1] = a[1].toLowerCase(), "nth" === a[1].slice(0, 3) ? (a[3] || db.error(a[0]), a[4] = +(a[4] ? a[5] + (a[6] || 1) : 2 * ("even" === a[3] || "odd" === a[3])), a[5] = +(a[7] + a[8] || "odd" === a[3])) : a[3] && db.error(a[0]), a
                },
                PSEUDO: function(a) {
                    var b, c = !a[5] && a[2];
                    return V.CHILD.test(a[0]) ? null : (a[3] && void 0 !== a[4] ? a[2] = a[4] : c && T.test(c) && (b = ob(c, !0)) && (b = c.indexOf(")", c.length - b) - c.length) && (a[0] = a[0].slice(0, b), a[2] = c.slice(0, b)), a.slice(0, 3))
                }
            },
            filter: {
                TAG: function(a) {
                    var b = a.replace(ab, bb).toLowerCase();
                    return "*" === a ? function() {
                        return !0
                    } : function(a) {
                        return a.nodeName && a.nodeName.toLowerCase() === b
                    }
                },
                CLASS: function(a) {
                    var b = w[a + " "];
                    return b || (b = new RegExp("(^|" + K + ")" + a + "(" + K + "|$)")) && w(a, function(a) {
                        return b.test("string" == typeof a.className && a.className || typeof a.getAttribute !== A && a.getAttribute("class") || "")
                    })
                },
                ATTR: function(a, b, c) {
                    return function(d) {
                        var e = db.attr(d, a);
                        return null == e ? "!=" === b : b ? (e += "", "=" === b ? e === c : "!=" === b ? e !== c : "^=" === b ? c && 0 === e.indexOf(c) : "*=" === b ? c && e.indexOf(c) > -1 : "$=" === b ? c && e.slice(-c.length) === c : "~=" === b ? (" " + e + " ").indexOf(c) > -1 : "|=" === b ? e === c || e.slice(0, c.length + 1) === c + "-" : !1) : !0
                    }
                },
                CHILD: function(a, b, c, d, e) {
                    var f = "nth" !== a.slice(0, 3),
                        g = "last" !== a.slice(-4),
                        h = "of-type" === b;
                    return 1 === d && 0 === e ? function(a) {
                        return !!a.parentNode
                    } : function(b, c, i) {
                        var j, k, l, m, n, o, p = f !== g ? "nextSibling" : "previousSibling",
                            q = b.parentNode,
                            r = h && b.nodeName.toLowerCase(),
                            t = !i && !h;
                        if (q) {
                            if (f) {
                                while (p) {
                                    l = b;
                                    while (l = l[p])
                                        if (h ? l.nodeName.toLowerCase() === r : 1 === l.nodeType) return !1;
                                    o = p = "only" === a && !o && "nextSibling"
                                }
                                return !0
                            }
                            if (o = [g ? q.firstChild : q.lastChild], g && t) {
                                k = q[s] || (q[s] = {}), j = k[a] || [], n = j[0] === u && j[1], m = j[0] === u && j[2], l = n && q.childNodes[n];
                                while (l = ++n && l && l[p] || (m = n = 0) || o.pop())
                                    if (1 === l.nodeType && ++m && l === b) {
                                        k[a] = [u, n, m];
                                        break
                                    }
                            } else if (t && (j = (b[s] || (b[s] = {}))[a]) && j[0] === u) m = j[1];
                            else
                                while (l = ++n && l && l[p] || (m = n = 0) || o.pop())
                                    if ((h ? l.nodeName.toLowerCase() === r : 1 === l.nodeType) && ++m && (t && ((l[s] || (l[s] = {}))[a] = [u, m]), l === b)) break; return m -= e, m === d || m % d === 0 && m / d >= 0
                        }
                    }
                },
                PSEUDO: function(a, b) {
                    var c, e = d.pseudos[a] || d.setFilters[a.toLowerCase()] || db.error("unsupported pseudo: " + a);
                    return e[s] ? e(b) : e.length > 1 ? (c = [a, a, "", b], d.setFilters.hasOwnProperty(a.toLowerCase()) ? fb(function(a, c) {
                        var d, f = e(a, b),
                            g = f.length;
                        while (g--) d = I.call(a, f[g]), a[d] = !(c[d] = f[g])
                    }) : function(a) {
                        return e(a, 0, c)
                    }) : e
                }
            },
            pseudos: {
                not: fb(function(a) {
                    var b = [],
                        c = [],
                        d = g(a.replace(P, "$1"));
                    return d[s] ? fb(function(a, b, c, e) {
                        var f, g = d(a, null, e, []),
                            h = a.length;
                        while (h--)(f = g[h]) && (a[h] = !(b[h] = f))
                    }) : function(a, e, f) {
                        return b[0] = a, d(b, null, f, c), !c.pop()
                    }
                }),
                has: fb(function(a) {
                    return function(b) {
                        return db(a, b).length > 0
                    }
                }),
                contains: fb(function(a) {
                    return function(b) {
                        return (b.textContent || b.innerText || e(b)).indexOf(a) > -1
                    }
                }),
                lang: fb(function(a) {
                    return U.test(a || "") || db.error("unsupported lang: " + a), a = a.replace(ab, bb).toLowerCase(),
                        function(b) {
                            var c;
                            do
                                if (c = n ? b.lang : b.getAttribute("xml:lang") || b.getAttribute("lang")) return c = c.toLowerCase(), c === a || 0 === c.indexOf(a + "-");
                            while ((b = b.parentNode) && 1 === b.nodeType);
                            return !1
                        }
                }),
                target: function(b) {
                    var c = a.location && a.location.hash;
                    return c && c.slice(1) === b.id
                },
                root: function(a) {
                    return a === m
                },
                focus: function(a) {
                    return a === l.activeElement && (!l.hasFocus || l.hasFocus()) && !!(a.type || a.href || ~a.tabIndex)
                },
                enabled: function(a) {
                    return a.disabled === !1
                },
                disabled: function(a) {
                    return a.disabled === !0
                },
                checked: function(a) {
                    var b = a.nodeName.toLowerCase();
                    return "input" === b && !!a.checked || "option" === b && !!a.selected
                },
                selected: function(a) {
                    return a.parentNode && a.parentNode.selectedIndex, a.selected === !0
                },
                empty: function(a) {
                    for (a = a.firstChild; a; a = a.nextSibling)
                        if (a.nodeType < 6) return !1;
                    return !0
                },
                parent: function(a) {
                    return !d.pseudos.empty(a)
                },
                header: function(a) {
                    return X.test(a.nodeName)
                },
                input: function(a) {
                    return W.test(a.nodeName)
                },
                button: function(a) {
                    var b = a.nodeName.toLowerCase();
                    return "input" === b && "button" === a.type || "button" === b
                },
                text: function(a) {
                    var b;
                    return "input" === a.nodeName.toLowerCase() && "text" === a.type && (null == (b = a.getAttribute("type")) || "text" === b.toLowerCase())
                },
                first: lb(function() {
                    return [0]
                }),
                last: lb(function(a, b) {
                    return [b - 1]
                }),
                eq: lb(function(a, b, c) {
                    return [0 > c ? c + b : c]
                }),
                even: lb(function(a, b) {
                    for (var c = 0; b > c; c += 2) a.push(c);
                    return a
                }),
                odd: lb(function(a, b) {
                    for (var c = 1; b > c; c += 2) a.push(c);
                    return a
                }),
                lt: lb(function(a, b, c) {
                    for (var d = 0 > c ? c + b : c; --d >= 0;) a.push(d);
                    return a
                }),
                gt: lb(function(a, b, c) {
                    for (var d = 0 > c ? c + b : c; ++d < b;) a.push(d);
                    return a
                })
            }
        }, d.pseudos.nth = d.pseudos.eq;
        for (b in {
                radio: !0,
                checkbox: !0,
                file: !0,
                password: !0,
                image: !0
            }) d.pseudos[b] = jb(b);
        for (b in {
                submit: !0,
                reset: !0
            }) d.pseudos[b] = kb(b);

        function nb() {}
        nb.prototype = d.filters = d.pseudos, d.setFilters = new nb;

        function ob(a, b) {
            var c, e, f, g, h, i, j, k = x[a + " "];
            if (k) return b ? 0 : k.slice(0);
            h = a, i = [], j = d.preFilter;
            while (h) {
                (!c || (e = Q.exec(h))) && (e && (h = h.slice(e[0].length) || h), i.push(f = [])), c = !1, (e = R.exec(h)) && (c = e.shift(), f.push({
                    value: c,
                    type: e[0].replace(P, " ")
                }), h = h.slice(c.length));
                for (g in d.filter) !(e = V[g].exec(h)) || j[g] && !(e = j[g](e)) || (c = e.shift(), f.push({
                    value: c,
                    type: g,
                    matches: e
                }), h = h.slice(c.length));
                if (!c) break
            }
            return b ? h.length : h ? db.error(a) : x(a, i).slice(0)
        }

        function pb(a) {
            for (var b = 0, c = a.length, d = ""; c > b; b++) d += a[b].value;
            return d
        }

        function qb(a, b, c) {
            var d = b.dir,
                e = c && "parentNode" === d,
                f = v++;
            return b.first ? function(b, c, f) {
                while (b = b[d])
                    if (1 === b.nodeType || e) return a(b, c, f)
            } : function(b, c, g) {
                var h, i, j = [u, f];
                if (g) {
                    while (b = b[d])
                        if ((1 === b.nodeType || e) && a(b, c, g)) return !0
                } else
                    while (b = b[d])
                        if (1 === b.nodeType || e) {
                            if (i = b[s] || (b[s] = {}), (h = i[d]) && h[0] === u && h[1] === f) return j[2] = h[2];
                            if (i[d] = j, j[2] = a(b, c, g)) return !0
                        }
            }
        }

        function rb(a) {
            return a.length > 1 ? function(b, c, d) {
                var e = a.length;
                while (e--)
                    if (!a[e](b, c, d)) return !1;
                return !0
            } : a[0]
        }

        function sb(a, b, c, d, e) {
            for (var f, g = [], h = 0, i = a.length, j = null != b; i > h; h++)(f = a[h]) && (!c || c(f, d, e)) && (g.push(f), j && b.push(h));
            return g
        }

        function tb(a, b, c, d, e, f) {
            return d && !d[s] && (d = tb(d)), e && !e[s] && (e = tb(e, f)), fb(function(f, g, h, i) {
                var j, k, l, m = [],
                    n = [],
                    o = g.length,
                    p = f || wb(b || "*", h.nodeType ? [h] : h, []),
                    q = !a || !f && b ? p : sb(p, m, a, h, i),
                    r = c ? e || (f ? a : o || d) ? [] : g : q;
                if (c && c(q, r, h, i), d) {
                    j = sb(r, n), d(j, [], h, i), k = j.length;
                    while (k--)(l = j[k]) && (r[n[k]] = !(q[n[k]] = l))
                }
                if (f) {
                    if (e || a) {
                        if (e) {
                            j = [], k = r.length;
                            while (k--)(l = r[k]) && j.push(q[k] = l);
                            e(null, r = [], j, i)
                        }
                        k = r.length;
                        while (k--)(l = r[k]) && (j = e ? I.call(f, l) : m[k]) > -1 && (f[j] = !(g[j] = l))
                    }
                } else r = sb(r === g ? r.splice(o, r.length) : r), e ? e(null, g, r, i) : G.apply(g, r)
            })
        }

        function ub(a) {
            for (var b, c, e, f = a.length, g = d.relative[a[0].type], i = g || d.relative[" "], j = g ? 1 : 0, k = qb(function(a) {
                    return a === b
                }, i, !0), l = qb(function(a) {
                    return I.call(b, a) > -1
                }, i, !0), m = [function(a, c, d) {
                    return !g && (d || c !== h) || ((b = c).nodeType ? k(a, c, d) : l(a, c, d))
                }]; f > j; j++)
                if (c = d.relative[a[j].type]) m = [qb(rb(m), c)];
                else {
                    if (c = d.filter[a[j].type].apply(null, a[j].matches), c[s]) {
                        for (e = ++j; f > e; e++)
                            if (d.relative[a[e].type]) break;
                        return tb(j > 1 && rb(m), j > 1 && pb(a.slice(0, j - 1).concat({
                            value: " " === a[j - 2].type ? "*" : ""
                        })).replace(P, "$1"), c, e > j && ub(a.slice(j, e)), f > e && ub(a = a.slice(e)), f > e && pb(a))
                    }
                    m.push(c)
                }
            return rb(m)
        }

        function vb(a, b) {
            var c = b.length > 0,
                e = a.length > 0,
                f = function(f, g, i, j, k) {
                    var m, n, o, p = 0,
                        q = "0",
                        r = f && [],
                        s = [],
                        t = h,
                        v = f || e && d.find.TAG("*", k),
                        w = u += null == t ? 1 : Math.random() || .1,
                        x = v.length;
                    for (k && (h = g !== l && g); q !== x && null != (m = v[q]); q++) {
                        if (e && m) {
                            n = 0;
                            while (o = a[n++])
                                if (o(m, g, i)) {
                                    j.push(m);
                                    break
                                }
                            k && (u = w)
                        }
                        c && ((m = !o && m) && p--, f && r.push(m))
                    }
                    if (p += q, c && q !== p) {
                        n = 0;
                        while (o = b[n++]) o(r, s, g, i);
                        if (f) {
                            if (p > 0)
                                while (q--) r[q] || s[q] || (s[q] = E.call(j));
                            s = sb(s)
                        }
                        G.apply(j, s), k && !f && s.length > 0 && p + b.length > 1 && db.uniqueSort(j)
                    }
                    return k && (u = w, h = t), r
                };
            return c ? fb(f) : f
        }
        g = db.compile = function(a, b) {
            var c, d = [],
                e = [],
                f = y[a + " "];
            if (!f) {
                b || (b = ob(a)), c = b.length;
                while (c--) f = ub(b[c]), f[s] ? d.push(f) : e.push(f);
                f = y(a, vb(e, d))
            }
            return f
        };

        function wb(a, b, c) {
            for (var d = 0, e = b.length; e > d; d++) db(a, b[d], c);
            return c
        }

        function xb(a, b, e, f) {
            var h, i, j, k, l, m = ob(a);
            if (!f && 1 === m.length) {
                if (i = m[0] = m[0].slice(0), i.length > 2 && "ID" === (j = i[0]).type && c.getById && 9 === b.nodeType && n && d.relative[i[1].type]) {
                    if (b = (d.find.ID(j.matches[0].replace(ab, bb), b) || [])[0], !b) return e;
                    a = a.slice(i.shift().value.length)
                }
                h = V.needsContext.test(a) ? 0 : i.length;
                while (h--) {
                    if (j = i[h], d.relative[k = j.type]) break;
                    if ((l = d.find[k]) && (f = l(j.matches[0].replace(ab, bb), $.test(i[0].type) && mb(b.parentNode) || b))) {
                        if (i.splice(h, 1), a = f.length && pb(i), !a) return G.apply(e, f), e;
                        break
                    }
                }
            }
            return g(a, m)(f, b, !n, e, $.test(a) && mb(b.parentNode) || b), e
        }
        return c.sortStable = s.split("").sort(z).join("") === s, c.detectDuplicates = !!j, k(), c.sortDetached = gb(function(a) {
            return 1 & a.compareDocumentPosition(l.createElement("div"))
        }), gb(function(a) {
            return a.innerHTML = "<a href='#'></a>", "#" === a.firstChild.getAttribute("href")
        }) || hb("type|href|height|width", function(a, b, c) {
            return c ? void 0 : a.getAttribute(b, "type" === b.toLowerCase() ? 1 : 2)
        }), c.attributes && gb(function(a) {
            return a.innerHTML = "<input/>", a.firstChild.setAttribute("value", ""), "" === a.firstChild.getAttribute("value")
        }) || hb("value", function(a, b, c) {
            return c || "input" !== a.nodeName.toLowerCase() ? void 0 : a.defaultValue
        }), gb(function(a) {
            return null == a.getAttribute("disabled")
        }) || hb(J, function(a, b, c) {
            var d;
            return c ? void 0 : a[b] === !0 ? b.toLowerCase() : (d = a.getAttributeNode(b)) && d.specified ? d.value : null
        }), db
    }(a);
    o.find = t, o.expr = t.selectors, o.expr[":"] = o.expr.pseudos, o.unique = t.uniqueSort, o.text = t.getText, o.isXMLDoc = t.isXML, o.contains = t.contains;
    var u = o.expr.match.needsContext,
        v = /^<(\w+)\s*\/?>(?:<\/\1>|)$/,
        w = /^.[^:#\[\.,]*$/;

    function x(a, b, c) {
        if (o.isFunction(b)) return o.grep(a, function(a, d) {
            return !!b.call(a, d, a) !== c
        });
        if (b.nodeType) return o.grep(a, function(a) {
            return a === b !== c
        });
        if ("string" == typeof b) {
            if (w.test(b)) return o.filter(b, a, c);
            b = o.filter(b, a)
        }
        return o.grep(a, function(a) {
            return g.call(b, a) >= 0 !== c
        })
    }
    o.filter = function(a, b, c) {
        var d = b[0];
        return c && (a = ":not(" + a + ")"), 1 === b.length && 1 === d.nodeType ? o.find.matchesSelector(d, a) ? [d] : [] : o.find.matches(a, o.grep(b, function(a) {
            return 1 === a.nodeType
        }))
    }, o.fn.extend({
        find: function(a) {
            var b, c = this.length,
                d = [],
                e = this;
            if ("string" != typeof a) return this.pushStack(o(a).filter(function() {
                for (b = 0; c > b; b++)
                    if (o.contains(e[b], this)) return !0
            }));
            for (b = 0; c > b; b++) o.find(a, e[b], d);
            return d = this.pushStack(c > 1 ? o.unique(d) : d), d.selector = this.selector ? this.selector + " " + a : a, d
        },
        filter: function(a) {
            return this.pushStack(x(this, a || [], !1))
        },
        not: function(a) {
            return this.pushStack(x(this, a || [], !0))
        },
        is: function(a) {
            return !!x(this, "string" == typeof a && u.test(a) ? o(a) : a || [], !1).length
        }
    });
    var y, z = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,
        A = o.fn.init = function(a, b) {
            var c, d;
            if (!a) return this;
            if ("string" == typeof a) {
                if (c = "<" === a[0] && ">" === a[a.length - 1] && a.length >= 3 ? [null, a, null] : z.exec(a), !c || !c[1] && b) return !b || b.jquery ? (b || y).find(a) : this.constructor(b).find(a);
                if (c[1]) {
                    if (b = b instanceof o ? b[0] : b, o.merge(this, o.parseHTML(c[1], b && b.nodeType ? b.ownerDocument || b : m, !0)), v.test(c[1]) && o.isPlainObject(b))
                        for (c in b) o.isFunction(this[c]) ? this[c](b[c]) : this.attr(c, b[c]);
                    return this
                }
                return d = m.getElementById(c[2]), d && d.parentNode && (this.length = 1, this[0] = d), this.context = m, this.selector = a, this
            }
            return a.nodeType ? (this.context = this[0] = a, this.length = 1, this) : o.isFunction(a) ? "undefined" != typeof y.ready ? y.ready(a) : a(o) : (void 0 !== a.selector && (this.selector = a.selector, this.context = a.context), o.makeArray(a, this))
        };
    A.prototype = o.fn, y = o(m);
    var B = /^(?:parents|prev(?:Until|All))/,
        C = {
            children: !0,
            contents: !0,
            next: !0,
            prev: !0
        };
    o.extend({
        dir: function(a, b, c) {
            var d = [],
                e = void 0 !== c;
            while ((a = a[b]) && 9 !== a.nodeType)
                if (1 === a.nodeType) {
                    if (e && o(a).is(c)) break;
                    d.push(a)
                }
            return d
        },
        sibling: function(a, b) {
            for (var c = []; a; a = a.nextSibling) 1 === a.nodeType && a !== b && c.push(a);
            return c
        }
    }), o.fn.extend({
        has: function(a) {
            var b = o(a, this),
                c = b.length;
            return this.filter(function() {
                for (var a = 0; c > a; a++)
                    if (o.contains(this, b[a])) return !0
            })
        },
        closest: function(a, b) {
            for (var c, d = 0, e = this.length, f = [], g = u.test(a) || "string" != typeof a ? o(a, b || this.context) : 0; e > d; d++)
                for (c = this[d]; c && c !== b; c = c.parentNode)
                    if (c.nodeType < 11 && (g ? g.index(c) > -1 : 1 === c.nodeType && o.find.matchesSelector(c, a))) {
                        f.push(c);
                        break
                    }
            return this.pushStack(f.length > 1 ? o.unique(f) : f)
        },
        index: function(a) {
            return a ? "string" == typeof a ? g.call(o(a), this[0]) : g.call(this, a.jquery ? a[0] : a) : this[0] && this[0].parentNode ? this.first().prevAll().length : -1
        },
        add: function(a, b) {
            return this.pushStack(o.unique(o.merge(this.get(), o(a, b))))
        },
        addBack: function(a) {
            return this.add(null == a ? this.prevObject : this.prevObject.filter(a))
        }
    });

    function D(a, b) {
        while ((a = a[b]) && 1 !== a.nodeType);
        return a
    }
    o.each({
        parent: function(a) {
            var b = a.parentNode;
            return b && 11 !== b.nodeType ? b : null
        },
        parents: function(a) {
            return o.dir(a, "parentNode")
        },
        parentsUntil: function(a, b, c) {
            return o.dir(a, "parentNode", c)
        },
        next: function(a) {
            return D(a, "nextSibling")
        },
        prev: function(a) {
            return D(a, "previousSibling")
        },
        nextAll: function(a) {
            return o.dir(a, "nextSibling")
        },
        prevAll: function(a) {
            return o.dir(a, "previousSibling")
        },
        nextUntil: function(a, b, c) {
            return o.dir(a, "nextSibling", c)
        },
        prevUntil: function(a, b, c) {
            return o.dir(a, "previousSibling", c)
        },
        siblings: function(a) {
            return o.sibling((a.parentNode || {}).firstChild, a)
        },
        children: function(a) {
            return o.sibling(a.firstChild)
        },
        contents: function(a) {
            return a.contentDocument || o.merge([], a.childNodes)
        }
    }, function(a, b) {
        o.fn[a] = function(c, d) {
            var e = o.map(this, b, c);
            return "Until" !== a.slice(-5) && (d = c), d && "string" == typeof d && (e = o.filter(d, e)), this.length > 1 && (C[a] || o.unique(e), B.test(a) && e.reverse()), this.pushStack(e)
        }
    });
    var E = /\S+/g,
        F = {};

    function G(a) {
        var b = F[a] = {};
        return o.each(a.match(E) || [], function(a, c) {
            b[c] = !0
        }), b
    }
    o.Callbacks = function(a) {
        a = "string" == typeof a ? F[a] || G(a) : o.extend({}, a);
        var b, c, d, e, f, g, h = [],
            i = !a.once && [],
            j = function(l) {
                for (b = a.memory && l, c = !0, g = e || 0, e = 0, f = h.length, d = !0; h && f > g; g++)
                    if (h[g].apply(l[0], l[1]) === !1 && a.stopOnFalse) {
                        b = !1;
                        break
                    }
                d = !1, h && (i ? i.length && j(i.shift()) : b ? h = [] : k.disable())
            },
            k = {
                add: function() {
                    if (h) {
                        var c = h.length;
                        ! function g(b) {
                            o.each(b, function(b, c) {
                                var d = o.type(c);
                                "function" === d ? a.unique && k.has(c) || h.push(c) : c && c.length && "string" !== d && g(c)
                            })
                        }(arguments), d ? f = h.length : b && (e = c, j(b))
                    }
                    return this
                },
                remove: function() {
                    return h && o.each(arguments, function(a, b) {
                        var c;
                        while ((c = o.inArray(b, h, c)) > -1) h.splice(c, 1), d && (f >= c && f--, g >= c && g--)
                    }), this
                },
                has: function(a) {
                    return a ? o.inArray(a, h) > -1 : !(!h || !h.length)
                },
                empty: function() {
                    return h = [], f = 0, this
                },
                disable: function() {
                    return h = i = b = void 0, this
                },
                disabled: function() {
                    return !h
                },
                lock: function() {
                    return i = void 0, b || k.disable(), this
                },
                locked: function() {
                    return !i
                },
                fireWith: function(a, b) {
                    return !h || c && !i || (b = b || [], b = [a, b.slice ? b.slice() : b], d ? i.push(b) : j(b)), this
                },
                fire: function() {
                    return k.fireWith(this, arguments), this
                },
                fired: function() {
                    return !!c
                }
            };
        return k
    }, o.extend({
        Deferred: function(a) {
            var b = [
                    ["resolve", "done", o.Callbacks("once memory"), "resolved"],
                    ["reject", "fail", o.Callbacks("once memory"), "rejected"],
                    ["notify", "progress", o.Callbacks("memory")]
                ],
                c = "pending",
                d = {
                    state: function() {
                        return c
                    },
                    always: function() {
                        return e.done(arguments).fail(arguments), this
                    },
                    then: function() {
                        var a = arguments;
                        return o.Deferred(function(c) {
                            o.each(b, function(b, f) {
                                var g = o.isFunction(a[b]) && a[b];
                                e[f[1]](function() {
                                    var a = g && g.apply(this, arguments);
                                    a && o.isFunction(a.promise) ? a.promise().done(c.resolve).fail(c.reject).progress(c.notify) : c[f[0] + "With"](this === d ? c.promise() : this, g ? [a] : arguments)
                                })
                            }), a = null
                        }).promise()
                    },
                    promise: function(a) {
                        return null != a ? o.extend(a, d) : d
                    }
                },
                e = {};
            return d.pipe = d.then, o.each(b, function(a, f) {
                var g = f[2],
                    h = f[3];
                d[f[1]] = g.add, h && g.add(function() {
                    c = h
                }, b[1 ^ a][2].disable, b[2][2].lock), e[f[0]] = function() {
                    return e[f[0] + "With"](this === e ? d : this, arguments), this
                }, e[f[0] + "With"] = g.fireWith
            }), d.promise(e), a && a.call(e, e), e
        },
        when: function(a) {
            var b = 0,
                c = d.call(arguments),
                e = c.length,
                f = 1 !== e || a && o.isFunction(a.promise) ? e : 0,
                g = 1 === f ? a : o.Deferred(),
                h = function(a, b, c) {
                    return function(e) {
                        b[a] = this, c[a] = arguments.length > 1 ? d.call(arguments) : e, c === i ? g.notifyWith(b, c) : --f || g.resolveWith(b, c)
                    }
                },
                i, j, k;
            if (e > 1)
                for (i = new Array(e), j = new Array(e), k = new Array(e); e > b; b++) c[b] && o.isFunction(c[b].promise) ? c[b].promise().done(h(b, k, c)).fail(g.reject).progress(h(b, j, i)) : --f;
            return f || g.resolveWith(k, c), g.promise()
        }
    });
    var H;
    o.fn.ready = function(a) {
        return o.ready.promise().done(a), this
    }, o.extend({
        isReady: !1,
        readyWait: 1,
        holdReady: function(a) {
            a ? o.readyWait++ : o.ready(!0)
        },
        ready: function(a) {
            (a === !0 ? --o.readyWait : o.isReady) || (o.isReady = !0, a !== !0 && --o.readyWait > 0 || (H.resolveWith(m, [o]), o.fn.trigger && o(m).trigger("ready").off("ready")))
        }
    });

    function I() {
        m.removeEventListener("DOMContentLoaded", I, !1), a.removeEventListener("load", I, !1), o.ready()
    }
    o.ready.promise = function(b) {
        return H || (H = o.Deferred(), "complete" === m.readyState ? setTimeout(o.ready) : (m.addEventListener("DOMContentLoaded", I, !1), a.addEventListener("load", I, !1))), H.promise(b)
    }, o.ready.promise();
    var J = o.access = function(a, b, c, d, e, f, g) {
        var h = 0,
            i = a.length,
            j = null == c;
        if ("object" === o.type(c)) {
            e = !0;
            for (h in c) o.access(a, b, h, c[h], !0, f, g)
        } else if (void 0 !== d && (e = !0, o.isFunction(d) || (g = !0), j && (g ? (b.call(a, d), b = null) : (j = b, b = function(a, b, c) {
                return j.call(o(a), c)
            })), b))
            for (; i > h; h++) b(a[h], c, g ? d : d.call(a[h], h, b(a[h], c)));
        return e ? a : j ? b.call(a) : i ? b(a[0], c) : f
    };
    o.acceptData = function(a) {
        return 1 === a.nodeType || 9 === a.nodeType || !+a.nodeType
    };

    function K() {
        Object.defineProperty(this.cache = {}, 0, {
            get: function() {
                return {}
            }
        }), this.expando = o.expando + Math.random()
    }
    K.uid = 1, K.accepts = o.acceptData, K.prototype = {
        key: function(a) {
            if (!K.accepts(a)) return 0;
            var b = {},
                c = a[this.expando];
            if (!c) {
                c = K.uid++;
                try {
                    b[this.expando] = {
                        value: c
                    }, Object.defineProperties(a, b)
                } catch (d) {
                    b[this.expando] = c, o.extend(a, b)
                }
            }
            return this.cache[c] || (this.cache[c] = {}), c
        },
        set: function(a, b, c) {
            var d, e = this.key(a),
                f = this.cache[e];
            if ("string" == typeof b) f[b] = c;
            else if (o.isEmptyObject(f)) o.extend(this.cache[e], b);
            else
                for (d in b) f[d] = b[d];
            return f
        },
        get: function(a, b) {
            var c = this.cache[this.key(a)];
            return void 0 === b ? c : c[b]
        },
        access: function(a, b, c) {
            var d;
            return void 0 === b || b && "string" == typeof b && void 0 === c ? (d = this.get(a, b), void 0 !== d ? d : this.get(a, o.camelCase(b))) : (this.set(a, b, c), void 0 !== c ? c : b)
        },
        remove: function(a, b) {
            var c, d, e, f = this.key(a),
                g = this.cache[f];
            if (void 0 === b) this.cache[f] = {};
            else {
                o.isArray(b) ? d = b.concat(b.map(o.camelCase)) : (e = o.camelCase(b), b in g ? d = [b, e] : (d = e, d = d in g ? [d] : d.match(E) || [])), c = d.length;
                while (c--) delete g[d[c]]
            }
        },
        hasData: function(a) {
            return !o.isEmptyObject(this.cache[a[this.expando]] || {})
        },
        discard: function(a) {
            a[this.expando] && delete this.cache[a[this.expando]]
        }
    };
    var L = new K,
        M = new K,
        N = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
        O = /([A-Z])/g;

    function P(a, b, c) {
        var d;
        if (void 0 === c && 1 === a.nodeType)
            if (d = "data-" + b.replace(O, "-$1").toLowerCase(), c = a.getAttribute(d), "string" == typeof c) {
                try {
                    c = "true" === c ? !0 : "false" === c ? !1 : "null" === c ? null : +c + "" === c ? +c : N.test(c) ? o.parseJSON(c) : c
                } catch (e) {}
                M.set(a, b, c)
            } else c = void 0;
        return c
    }
    o.extend({
        hasData: function(a) {
            return M.hasData(a) || L.hasData(a)
        },
        data: function(a, b, c) {
            return M.access(a, b, c)
        },
        removeData: function(a, b) {
            M.remove(a, b)
        },
        _data: function(a, b, c) {
            return L.access(a, b, c)
        },
        _removeData: function(a, b) {
            L.remove(a, b)
        }
    }), o.fn.extend({
        data: function(a, b) {
            var c, d, e, f = this[0],
                g = f && f.attributes;
            if (void 0 === a) {
                if (this.length && (e = M.get(f), 1 === f.nodeType && !L.get(f, "hasDataAttrs"))) {
                    c = g.length;
                    while (c--) d = g[c].name, 0 === d.indexOf("data-") && (d = o.camelCase(d.slice(5)), P(f, d, e[d]));
                    L.set(f, "hasDataAttrs", !0)
                }
                return e
            }
            return "object" == typeof a ? this.each(function() {
                M.set(this, a)
            }) : J(this, function(b) {
                var c, d = o.camelCase(a);
                if (f && void 0 === b) {
                    if (c = M.get(f, a), void 0 !== c) return c;
                    if (c = M.get(f, d), void 0 !== c) return c;
                    if (c = P(f, d, void 0), void 0 !== c) return c
                } else this.each(function() {
                    var c = M.get(this, d);
                    M.set(this, d, b), -1 !== a.indexOf("-") && void 0 !== c && M.set(this, a, b)
                })
            }, null, b, arguments.length > 1, null, !0)
        },
        removeData: function(a) {
            return this.each(function() {
                M.remove(this, a)
            })
        }
    }), o.extend({
        queue: function(a, b, c) {
            var d;
            return a ? (b = (b || "fx") + "queue", d = L.get(a, b), c && (!d || o.isArray(c) ? d = L.access(a, b, o.makeArray(c)) : d.push(c)), d || []) : void 0
        },
        dequeue: function(a, b) {
            b = b || "fx";
            var c = o.queue(a, b),
                d = c.length,
                e = c.shift(),
                f = o._queueHooks(a, b),
                g = function() {
                    o.dequeue(a, b)
                };
            "inprogress" === e && (e = c.shift(), d--), e && ("fx" === b && c.unshift("inprogress"), delete f.stop, e.call(a, g, f)), !d && f && f.empty.fire()
        },
        _queueHooks: function(a, b) {
            var c = b + "queueHooks";
            return L.get(a, c) || L.access(a, c, {
                empty: o.Callbacks("once memory").add(function() {
                    L.remove(a, [b + "queue", c])
                })
            })
        }
    }), o.fn.extend({
        queue: function(a, b) {
            var c = 2;
            return "string" != typeof a && (b = a, a = "fx", c--), arguments.length < c ? o.queue(this[0], a) : void 0 === b ? this : this.each(function() {
                var c = o.queue(this, a, b);
                o._queueHooks(this, a), "fx" === a && "inprogress" !== c[0] && o.dequeue(this, a)
            })
        },
        dequeue: function(a) {
            return this.each(function() {
                o.dequeue(this, a)
            })
        },
        clearQueue: function(a) {
            return this.queue(a || "fx", [])
        },
        promise: function(a, b) {
            var c, d = 1,
                e = o.Deferred(),
                f = this,
                g = this.length,
                h = function() {
                    --d || e.resolveWith(f, [f])
                };
            "string" != typeof a && (b = a, a = void 0), a = a || "fx";
            while (g--) c = L.get(f[g], a + "queueHooks"), c && c.empty && (d++, c.empty.add(h));
            return h(), e.promise(b)
        }
    });
    var Q = /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source,
        R = ["Top", "Right", "Bottom", "Left"],
        S = function(a, b) {
            return a = b || a, "none" === o.css(a, "display") || !o.contains(a.ownerDocument, a)
        },
        T = /^(?:checkbox|radio)$/i;
    ! function() {
        var a = m.createDocumentFragment(),
            b = a.appendChild(m.createElement("div"));
        b.innerHTML = "<input type='radio' checked='checked' name='t'/>", l.checkClone = b.cloneNode(!0).cloneNode(!0).lastChild.checked, b.innerHTML = "<textarea>x</textarea>", l.noCloneChecked = !!b.cloneNode(!0).lastChild.defaultValue
    }();
    var U = "undefined";
    l.focusinBubbles = "onfocusin" in a;
    var V = /^key/,
        W = /^(?:mouse|contextmenu)|click/,
        X = /^(?:focusinfocus|focusoutblur)$/,
        Y = /^([^.]*)(?:\.(.+)|)$/;

    function Z() {
        return !0
    }

    function $() {
        return !1
    }

    function _() {
        try {
            return m.activeElement
        } catch (a) {}
    }
    o.event = {
        global: {},
        add: function(a, b, c, d, e) {
            var f, g, h, i, j, k, l, m, n, p, q, r = L.get(a);
            if (r) {
                c.handler && (f = c, c = f.handler, e = f.selector), c.guid || (c.guid = o.guid++), (i = r.events) || (i = r.events = {}), (g = r.handle) || (g = r.handle = function(b) {
                    return typeof o !== U && o.event.triggered !== b.type ? o.event.dispatch.apply(a, arguments) : void 0
                }), b = (b || "").match(E) || [""], j = b.length;
                while (j--) h = Y.exec(b[j]) || [], n = q = h[1], p = (h[2] || "").split(".").sort(), n && (l = o.event.special[n] || {}, n = (e ? l.delegateType : l.bindType) || n, l = o.event.special[n] || {}, k = o.extend({
                    type: n,
                    origType: q,
                    data: d,
                    handler: c,
                    guid: c.guid,
                    selector: e,
                    needsContext: e && o.expr.match.needsContext.test(e),
                    namespace: p.join(".")
                }, f), (m = i[n]) || (m = i[n] = [], m.delegateCount = 0, l.setup && l.setup.call(a, d, p, g) !== !1 || a.addEventListener && a.addEventListener(n, g, !1)), l.add && (l.add.call(a, k), k.handler.guid || (k.handler.guid = c.guid)), e ? m.splice(m.delegateCount++, 0, k) : m.push(k), o.event.global[n] = !0)
            }
        },
        remove: function(a, b, c, d, e) {
            var f, g, h, i, j, k, l, m, n, p, q, r = L.hasData(a) && L.get(a);
            if (r && (i = r.events)) {
                b = (b || "").match(E) || [""], j = b.length;
                while (j--)
                    if (h = Y.exec(b[j]) || [], n = q = h[1], p = (h[2] || "").split(".").sort(), n) {
                        l = o.event.special[n] || {}, n = (d ? l.delegateType : l.bindType) || n, m = i[n] || [], h = h[2] && new RegExp("(^|\\.)" + p.join("\\.(?:.*\\.|)") + "(\\.|$)"), g = f = m.length;
                        while (f--) k = m[f], !e && q !== k.origType || c && c.guid !== k.guid || h && !h.test(k.namespace) || d && d !== k.selector && ("**" !== d || !k.selector) || (m.splice(f, 1), k.selector && m.delegateCount--, l.remove && l.remove.call(a, k));
                        g && !m.length && (l.teardown && l.teardown.call(a, p, r.handle) !== !1 || o.removeEvent(a, n, r.handle), delete i[n])
                    } else
                        for (n in i) o.event.remove(a, n + b[j], c, d, !0);
                o.isEmptyObject(i) && (delete r.handle, L.remove(a, "events"))
            }
        },
        trigger: function(b, c, d, e) {
            var f, g, h, i, k, l, n, p = [d || m],
                q = j.call(b, "type") ? b.type : b,
                r = j.call(b, "namespace") ? b.namespace.split(".") : [];
            if (g = h = d = d || m, 3 !== d.nodeType && 8 !== d.nodeType && !X.test(q + o.event.triggered) && (q.indexOf(".") >= 0 && (r = q.split("."), q = r.shift(), r.sort()), k = q.indexOf(":") < 0 && "on" + q, b = b[o.expando] ? b : new o.Event(q, "object" == typeof b && b), b.isTrigger = e ? 2 : 3, b.namespace = r.join("."), b.namespace_re = b.namespace ? new RegExp("(^|\\.)" + r.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, b.result = void 0, b.target || (b.target = d), c = null == c ? [b] : o.makeArray(c, [b]), n = o.event.special[q] || {}, e || !n.trigger || n.trigger.apply(d, c) !== !1)) {
                if (!e && !n.noBubble && !o.isWindow(d)) {
                    for (i = n.delegateType || q, X.test(i + q) || (g = g.parentNode); g; g = g.parentNode) p.push(g), h = g;
                    h === (d.ownerDocument || m) && p.push(h.defaultView || h.parentWindow || a)
                }
                f = 0;
                while ((g = p[f++]) && !b.isPropagationStopped()) b.type = f > 1 ? i : n.bindType || q, l = (L.get(g, "events") || {})[b.type] && L.get(g, "handle"), l && l.apply(g, c), l = k && g[k], l && l.apply && o.acceptData(g) && (b.result = l.apply(g, c), b.result === !1 && b.preventDefault());
                return b.type = q, e || b.isDefaultPrevented() || n._default && n._default.apply(p.pop(), c) !== !1 || !o.acceptData(d) || k && o.isFunction(d[q]) && !o.isWindow(d) && (h = d[k], h && (d[k] = null), o.event.triggered = q, d[q](), o.event.triggered = void 0, h && (d[k] = h)), b.result
            }
        },
        dispatch: function(a) {
            a = o.event.fix(a);
            var b, c, e, f, g, h = [],
                i = d.call(arguments),
                j = (L.get(this, "events") || {})[a.type] || [],
                k = o.event.special[a.type] || {};
            if (i[0] = a, a.delegateTarget = this, !k.preDispatch || k.preDispatch.call(this, a) !== !1) {
                h = o.event.handlers.call(this, a, j), b = 0;
                while ((f = h[b++]) && !a.isPropagationStopped()) {
                    a.currentTarget = f.elem, c = 0;
                    while ((g = f.handlers[c++]) && !a.isImmediatePropagationStopped())(!a.namespace_re || a.namespace_re.test(g.namespace)) && (a.handleObj = g, a.data = g.data, e = ((o.event.special[g.origType] || {}).handle || g.handler).apply(f.elem, i), void 0 !== e && (a.result = e) === !1 && (a.preventDefault(), a.stopPropagation()))
                }
                return k.postDispatch && k.postDispatch.call(this, a), a.result
            }
        },
        handlers: function(a, b) {
            var c, d, e, f, g = [],
                h = b.delegateCount,
                i = a.target;
            if (h && i.nodeType && (!a.button || "click" !== a.type))
                for (; i !== this; i = i.parentNode || this)
                    if (i.disabled !== !0 || "click" !== a.type) {
                        for (d = [], c = 0; h > c; c++) f = b[c], e = f.selector + " ", void 0 === d[e] && (d[e] = f.needsContext ? o(e, this).index(i) >= 0 : o.find(e, this, null, [i]).length), d[e] && d.push(f);
                        d.length && g.push({
                            elem: i,
                            handlers: d
                        })
                    }
            return h < b.length && g.push({
                elem: this,
                handlers: b.slice(h)
            }), g
        },
        props: "altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),
        fixHooks: {},
        keyHooks: {
            props: "char charCode key keyCode".split(" "),
            filter: function(a, b) {
                return null == a.which && (a.which = null != b.charCode ? b.charCode : b.keyCode), a
            }
        },
        mouseHooks: {
            props: "button buttons clientX clientY offsetX offsetY pageX pageY screenX screenY toElement".split(" "),
            filter: function(a, b) {
                var c, d, e, f = b.button;
                return null == a.pageX && null != b.clientX && (c = a.target.ownerDocument || m, d = c.documentElement, e = c.body, a.pageX = b.clientX + (d && d.scrollLeft || e && e.scrollLeft || 0) - (d && d.clientLeft || e && e.clientLeft || 0), a.pageY = b.clientY + (d && d.scrollTop || e && e.scrollTop || 0) - (d && d.clientTop || e && e.clientTop || 0)), a.which || void 0 === f || (a.which = 1 & f ? 1 : 2 & f ? 3 : 4 & f ? 2 : 0), a
            }
        },
        fix: function(a) {
            if (a[o.expando]) return a;
            var b, c, d, e = a.type,
                f = a,
                g = this.fixHooks[e];
            g || (this.fixHooks[e] = g = W.test(e) ? this.mouseHooks : V.test(e) ? this.keyHooks : {}), d = g.props ? this.props.concat(g.props) : this.props, a = new o.Event(f), b = d.length;
            while (b--) c = d[b], a[c] = f[c];
            return a.target || (a.target = m), 3 === a.target.nodeType && (a.target = a.target.parentNode), g.filter ? g.filter(a, f) : a
        },
        special: {
            load: {
                noBubble: !0
            },
            focus: {
                trigger: function() {
                    return this !== _() && this.focus ? (this.focus(), !1) : void 0
                },
                delegateType: "focusin"
            },
            blur: {
                trigger: function() {
                    return this === _() && this.blur ? (this.blur(), !1) : void 0
                },
                delegateType: "focusout"
            },
            click: {
                trigger: function() {
                    return "checkbox" === this.type && this.click && o.nodeName(this, "input") ? (this.click(), !1) : void 0
                },
                _default: function(a) {
                    return o.nodeName(a.target, "a")
                }
            },
            beforeunload: {
                postDispatch: function(a) {
                    void 0 !== a.result && (a.originalEvent.returnValue = a.result)
                }
            }
        },
        simulate: function(a, b, c, d) {
            var e = o.extend(new o.Event, c, {
                type: a,
                isSimulated: !0,
                originalEvent: {}
            });
            d ? o.event.trigger(e, null, b) : o.event.dispatch.call(b, e), e.isDefaultPrevented() && c.preventDefault()
        }
    }, o.removeEvent = function(a, b, c) {
        a.removeEventListener && a.removeEventListener(b, c, !1)
    }, o.Event = function(a, b) {
        return this instanceof o.Event ? (a && a.type ? (this.originalEvent = a, this.type = a.type, this.isDefaultPrevented = a.defaultPrevented || void 0 === a.defaultPrevented && a.getPreventDefault && a.getPreventDefault() ? Z : $) : this.type = a, b && o.extend(this, b), this.timeStamp = a && a.timeStamp || o.now(), void(this[o.expando] = !0)) : new o.Event(a, b)
    }, o.Event.prototype = {
        isDefaultPrevented: $,
        isPropagationStopped: $,
        isImmediatePropagationStopped: $,
        preventDefault: function() {
            var a = this.originalEvent;
            this.isDefaultPrevented = Z, a && a.preventDefault && a.preventDefault()
        },
        stopPropagation: function() {
            var a = this.originalEvent;
            this.isPropagationStopped = Z, a && a.stopPropagation && a.stopPropagation()
        },
        stopImmediatePropagation: function() {
            this.isImmediatePropagationStopped = Z, this.stopPropagation()
        }
    }, o.each({
        mouseenter: "mouseover",
        mouseleave: "mouseout"
    }, function(a, b) {
        o.event.special[a] = {
            delegateType: b,
            bindType: b,
            handle: function(a) {
                var c, d = this,
                    e = a.relatedTarget,
                    f = a.handleObj;
                return (!e || e !== d && !o.contains(d, e)) && (a.type = f.origType, c = f.handler.apply(this, arguments), a.type = b), c
            }
        }
    }), l.focusinBubbles || o.each({
        focus: "focusin",
        blur: "focusout"
    }, function(a, b) {
        var c = function(a) {
            o.event.simulate(b, a.target, o.event.fix(a), !0)
        };
        o.event.special[b] = {
            setup: function() {
                var d = this.ownerDocument || this,
                    e = L.access(d, b);
                e || d.addEventListener(a, c, !0), L.access(d, b, (e || 0) + 1)
            },
            teardown: function() {
                var d = this.ownerDocument || this,
                    e = L.access(d, b) - 1;
                e ? L.access(d, b, e) : (d.removeEventListener(a, c, !0), L.remove(d, b))
            }
        }
    }), o.fn.extend({
        on: function(a, b, c, d, e) {
            var f, g;
            if ("object" == typeof a) {
                "string" != typeof b && (c = c || b, b = void 0);
                for (g in a) this.on(g, b, c, a[g], e);
                return this
            }
            if (null == c && null == d ? (d = b, c = b = void 0) : null == d && ("string" == typeof b ? (d = c, c = void 0) : (d = c, c = b, b = void 0)), d === !1) d = $;
            else if (!d) return this;
            return 1 === e && (f = d, d = function(a) {
                return o().off(a), f.apply(this, arguments)
            }, d.guid = f.guid || (f.guid = o.guid++)), this.each(function() {
                o.event.add(this, a, d, c, b)
            })
        },
        one: function(a, b, c, d) {
            return this.on(a, b, c, d, 1)
        },
        off: function(a, b, c) {
            var d, e;
            if (a && a.preventDefault && a.handleObj) return d = a.handleObj, o(a.delegateTarget).off(d.namespace ? d.origType + "." + d.namespace : d.origType, d.selector, d.handler), this;
            if ("object" == typeof a) {
                for (e in a) this.off(e, b, a[e]);
                return this
            }
            return (b === !1 || "function" == typeof b) && (c = b, b = void 0), c === !1 && (c = $), this.each(function() {
                o.event.remove(this, a, c, b)
            })
        },
        trigger: function(a, b) {
            return this.each(function() {
                o.event.trigger(a, b, this)
            })
        },
        triggerHandler: function(a, b) {
            var c = this[0];
            return c ? o.event.trigger(a, b, c, !0) : void 0
        }
    });
    var ab = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,
        bb = /<([\w:]+)/,
        cb = /<|&#?\w+;/,
        db = /<(?:script|style|link)/i,
        eb = /checked\s*(?:[^=]|=\s*.checked.)/i,
        fb = /^$|\/(?:java|ecma)script/i,
        gb = /^true\/(.*)/,
        hb = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,
        ib = {
            option: [1, "<select multiple='multiple'>", "</select>"],
            thead: [1, "<table>", "</table>"],
            col: [2, "<table><colgroup>", "</colgroup></table>"],
            tr: [2, "<table><tbody>", "</tbody></table>"],
            td: [3, "<table><tbody><tr>", "</tr></tbody></table>"],
            _default: [0, "", ""]
        };
    ib.optgroup = ib.option, ib.tbody = ib.tfoot = ib.colgroup = ib.caption = ib.thead, ib.th = ib.td;

    function jb(a, b) {
        return o.nodeName(a, "table") && o.nodeName(11 !== b.nodeType ? b : b.firstChild, "tr") ? a.getElementsByTagName("tbody")[0] || a.appendChild(a.ownerDocument.createElement("tbody")) : a
    }

    function kb(a) {
        return a.type = (null !== a.getAttribute("type")) + "/" + a.type, a
    }

    function lb(a) {
        var b = gb.exec(a.type);
        return b ? a.type = b[1] : a.removeAttribute("type"), a
    }

    function mb(a, b) {
        for (var c = 0, d = a.length; d > c; c++) L.set(a[c], "globalEval", !b || L.get(b[c], "globalEval"))
    }

    function nb(a, b) {
        var c, d, e, f, g, h, i, j;
        if (1 === b.nodeType) {
            if (L.hasData(a) && (f = L.access(a), g = L.set(b, f), j = f.events)) {
                delete g.handle, g.events = {};
                for (e in j)
                    for (c = 0, d = j[e].length; d > c; c++) o.event.add(b, e, j[e][c])
            }
            M.hasData(a) && (h = M.access(a), i = o.extend({}, h), M.set(b, i))
        }
    }

    function ob(a, b) {
        var c = a.getElementsByTagName ? a.getElementsByTagName(b || "*") : a.querySelectorAll ? a.querySelectorAll(b || "*") : [];
        return void 0 === b || b && o.nodeName(a, b) ? o.merge([a], c) : c
    }

    function pb(a, b) {
        var c = b.nodeName.toLowerCase();
        "input" === c && T.test(a.type) ? b.checked = a.checked : ("input" === c || "textarea" === c) && (b.defaultValue = a.defaultValue)
    }
    o.extend({
        clone: function(a, b, c) {
            var d, e, f, g, h = a.cloneNode(!0),
                i = o.contains(a.ownerDocument, a);
            if (!(l.noCloneChecked || 1 !== a.nodeType && 11 !== a.nodeType || o.isXMLDoc(a)))
                for (g = ob(h), f = ob(a), d = 0, e = f.length; e > d; d++) pb(f[d], g[d]);
            if (b)
                if (c)
                    for (f = f || ob(a), g = g || ob(h), d = 0, e = f.length; e > d; d++) nb(f[d], g[d]);
                else nb(a, h);
            return g = ob(h, "script"), g.length > 0 && mb(g, !i && ob(a, "script")), h
        },
        buildFragment: function(a, b, c, d) {
            for (var e, f, g, h, i, j, k = b.createDocumentFragment(), l = [], m = 0, n = a.length; n > m; m++)
                if (e = a[m], e || 0 === e)
                    if ("object" === o.type(e)) o.merge(l, e.nodeType ? [e] : e);
                    else if (cb.test(e)) {
                f = f || k.appendChild(b.createElement("div")), g = (bb.exec(e) || ["", ""])[1].toLowerCase(), h = ib[g] || ib._default, f.innerHTML = h[1] + e.replace(ab, "<$1></$2>") + h[2], j = h[0];
                while (j--) f = f.lastChild;
                o.merge(l, f.childNodes), f = k.firstChild, f.textContent = ""
            } else l.push(b.createTextNode(e));
            k.textContent = "", m = 0;
            while (e = l[m++])
                if ((!d || -1 === o.inArray(e, d)) && (i = o.contains(e.ownerDocument, e), f = ob(k.appendChild(e), "script"), i && mb(f), c)) {
                    j = 0;
                    while (e = f[j++]) fb.test(e.type || "") && c.push(e)
                }
            return k
        },
        cleanData: function(a) {
            for (var b, c, d, e, f, g, h = o.event.special, i = 0; void 0 !== (c = a[i]); i++) {
                if (o.acceptData(c) && (f = c[L.expando], f && (b = L.cache[f]))) {
                    if (d = Object.keys(b.events || {}), d.length)
                        for (g = 0; void 0 !== (e = d[g]); g++) h[e] ? o.event.remove(c, e) : o.removeEvent(c, e, b.handle);
                    L.cache[f] && delete L.cache[f]
                }
                delete M.cache[c[M.expando]]
            }
        }
    }), o.fn.extend({
        text: function(a) {
            return J(this, function(a) {
                return void 0 === a ? o.text(this) : this.empty().each(function() {
                    (1 === this.nodeType || 11 === this.nodeType || 9 === this.nodeType) && (this.textContent = a)
                })
            }, null, a, arguments.length)
        },
        append: function() {
            return this.domManip(arguments, function(a) {
                if (1 === this.nodeType || 11 === this.nodeType || 9 === this.nodeType) {
                    var b = jb(this, a);
                    b.appendChild(a)
                }
            })
        },
        prepend: function() {
            return this.domManip(arguments, function(a) {
                if (1 === this.nodeType || 11 === this.nodeType || 9 === this.nodeType) {
                    var b = jb(this, a);
                    b.insertBefore(a, b.firstChild)
                }
            })
        },
        before: function() {
            return this.domManip(arguments, function(a) {
                this.parentNode && this.parentNode.insertBefore(a, this)
            })
        },
        after: function() {
            return this.domManip(arguments, function(a) {
                this.parentNode && this.parentNode.insertBefore(a, this.nextSibling)
            })
        },
        remove: function(a, b) {
            for (var c, d = a ? o.filter(a, this) : this, e = 0; null != (c = d[e]); e++) b || 1 !== c.nodeType || o.cleanData(ob(c)), c.parentNode && (b && o.contains(c.ownerDocument, c) && mb(ob(c, "script")), c.parentNode.removeChild(c));
            return this
        },
        empty: function() {
            for (var a, b = 0; null != (a = this[b]); b++) 1 === a.nodeType && (o.cleanData(ob(a, !1)), a.textContent = "");
            return this
        },
        clone: function(a, b) {
            return a = null == a ? !1 : a, b = null == b ? a : b, this.map(function() {
                return o.clone(this, a, b)
            })
        },
        html: function(a) {
            return J(this, function(a) {
                var b = this[0] || {},
                    c = 0,
                    d = this.length;
                if (void 0 === a && 1 === b.nodeType) return b.innerHTML;
                if ("string" == typeof a && !db.test(a) && !ib[(bb.exec(a) || ["", ""])[1].toLowerCase()]) {
                    a = a.replace(ab, "<$1></$2>");
                    try {
                        for (; d > c; c++) b = this[c] || {}, 1 === b.nodeType && (o.cleanData(ob(b, !1)), b.innerHTML = a);
                        b = 0
                    } catch (e) {}
                }
                b && this.empty().append(a)
            }, null, a, arguments.length)
        },
        replaceWith: function() {
            var a = arguments[0];
            return this.domManip(arguments, function(b) {
                a = this.parentNode, o.cleanData(ob(this)), a && a.replaceChild(b, this)
            }), a && (a.length || a.nodeType) ? this : this.remove()
        },
        detach: function(a) {
            return this.remove(a, !0)
        },
        domManip: function(a, b) {
            a = e.apply([], a);
            var c, d, f, g, h, i, j = 0,
                k = this.length,
                m = this,
                n = k - 1,
                p = a[0],
                q = o.isFunction(p);
            if (q || k > 1 && "string" == typeof p && !l.checkClone && eb.test(p)) return this.each(function(c) {
                var d = m.eq(c);
                q && (a[0] = p.call(this, c, d.html())), d.domManip(a, b)
            });
            if (k && (c = o.buildFragment(a, this[0].ownerDocument, !1, this), d = c.firstChild, 1 === c.childNodes.length && (c = d), d)) {
                for (f = o.map(ob(c, "script"), kb), g = f.length; k > j; j++) h = c, j !== n && (h = o.clone(h, !0, !0), g && o.merge(f, ob(h, "script"))), b.call(this[j], h, j);
                if (g)
                    for (i = f[f.length - 1].ownerDocument, o.map(f, lb), j = 0; g > j; j++) h = f[j], fb.test(h.type || "") && !L.access(h, "globalEval") && o.contains(i, h) && (h.src ? o._evalUrl && o._evalUrl(h.src) : o.globalEval(h.textContent.replace(hb, "")))
            }
            return this
        }
    }), o.each({
        appendTo: "append",
        prependTo: "prepend",
        insertBefore: "before",
        insertAfter: "after",
        replaceAll: "replaceWith"
    }, function(a, b) {
        o.fn[a] = function(a) {
            for (var c, d = [], e = o(a), g = e.length - 1, h = 0; g >= h; h++) c = h === g ? this : this.clone(!0), o(e[h])[b](c), f.apply(d, c.get());
            return this.pushStack(d)
        }
    });
    var qb, rb = {};

    function sb(b, c) {
        var d = o(c.createElement(b)).appendTo(c.body),
            e = a.getDefaultComputedStyle ? a.getDefaultComputedStyle(d[0]).display : o.css(d[0], "display");
        return d.detach(), e
    }

    function tb(a) {
        var b = m,
            c = rb[a];
        return c || (c = sb(a, b), "none" !== c && c || (qb = (qb || o("<iframe frameborder='0' width='0' height='0'/>")).appendTo(b.documentElement), b = qb[0].contentDocument, b.write(), b.close(), c = sb(a, b), qb.detach()), rb[a] = c), c
    }
    var ub = /^margin/,
        vb = new RegExp("^(" + Q + ")(?!px)[a-z%]+$", "i"),
        wb = function(a) {
            return a.ownerDocument.defaultView.getComputedStyle(a, null)
        };

    function xb(a, b, c) {
        var d, e, f, g, h = a.style;
        return c = c || wb(a), c && (g = c.getPropertyValue(b) || c[b]), c && ("" !== g || o.contains(a.ownerDocument, a) || (g = o.style(a, b)), vb.test(g) && ub.test(b) && (d = h.width, e = h.minWidth, f = h.maxWidth, h.minWidth = h.maxWidth = h.width = g, g = c.width, h.width = d, h.minWidth = e, h.maxWidth = f)), void 0 !== g ? g + "" : g
    }

    function yb(a, b) {
        return {
            get: function() {
                return a() ? void delete this.get : (this.get = b).apply(this, arguments)
            }
        }
    }! function() {
        var b, c, d = "padding:0;margin:0;border:0;display:block;-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box",
            e = m.documentElement,
            f = m.createElement("div"),
            g = m.createElement("div");
        g.style.backgroundClip = "content-box", g.cloneNode(!0).style.backgroundClip = "", l.clearCloneStyle = "content-box" === g.style.backgroundClip, f.style.cssText = "border:0;width:0;height:0;position:absolute;top:0;left:-9999px;margin-top:1px", f.appendChild(g);

        function h() {
            g.style.cssText = "-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;padding:1px;border:1px;display:block;width:4px;margin-top:1%;position:absolute;top:1%", e.appendChild(f);
            var d = a.getComputedStyle(g, null);
            b = "1%" !== d.top, c = "4px" === d.width, e.removeChild(f)
        }
        a.getComputedStyle && o.extend(l, {
            pixelPosition: function() {
                return h(), b
            },
            boxSizingReliable: function() {
                return null == c && h(), c
            },
            reliableMarginRight: function() {
                var b, c = g.appendChild(m.createElement("div"));
                return c.style.cssText = g.style.cssText = d, c.style.marginRight = c.style.width = "0", g.style.width = "1px", e.appendChild(f), b = !parseFloat(a.getComputedStyle(c, null).marginRight), e.removeChild(f), g.innerHTML = "", b
            }
        })
    }(), o.swap = function(a, b, c, d) {
        var e, f, g = {};
        for (f in b) g[f] = a.style[f], a.style[f] = b[f];
        e = c.apply(a, d || []);
        for (f in b) a.style[f] = g[f];
        return e
    };
    var zb = /^(none|table(?!-c[ea]).+)/,
        Ab = new RegExp("^(" + Q + ")(.*)$", "i"),
        Bb = new RegExp("^([+-])=(" + Q + ")", "i"),
        Cb = {
            position: "absolute",
            visibility: "hidden",
            display: "block"
        },
        Db = {
            letterSpacing: 0,
            fontWeight: 400
        },
        Eb = ["Webkit", "O", "Moz", "ms"];

    function Fb(a, b) {
        if (b in a) return b;
        var c = b[0].toUpperCase() + b.slice(1),
            d = b,
            e = Eb.length;
        while (e--)
            if (b = Eb[e] + c, b in a) return b;
        return d
    }

    function Gb(a, b, c) {
        var d = Ab.exec(b);
        return d ? Math.max(0, d[1] - (c || 0)) + (d[2] || "px") : b
    }

    function Hb(a, b, c, d, e) {
        for (var f = c === (d ? "border" : "content") ? 4 : "width" === b ? 1 : 0, g = 0; 4 > f; f += 2) "margin" === c && (g += o.css(a, c + R[f], !0, e)), d ? ("content" === c && (g -= o.css(a, "padding" + R[f], !0, e)), "margin" !== c && (g -= o.css(a, "border" + R[f] + "Width", !0, e))) : (g += o.css(a, "padding" + R[f], !0, e), "padding" !== c && (g += o.css(a, "border" + R[f] + "Width", !0, e)));
        return g
    }

    function Ib(a, b, c) {
        var d = !0,
            e = "width" === b ? a.offsetWidth : a.offsetHeight,
            f = wb(a),
            g = "border-box" === o.css(a, "boxSizing", !1, f);
        if (0 >= e || null == e) {
            if (e = xb(a, b, f), (0 > e || null == e) && (e = a.style[b]), vb.test(e)) return e;
            d = g && (l.boxSizingReliable() || e === a.style[b]), e = parseFloat(e) || 0
        }
        return e + Hb(a, b, c || (g ? "border" : "content"), d, f) + "px"
    }

    function Jb(a, b) {
        for (var c, d, e, f = [], g = 0, h = a.length; h > g; g++) d = a[g], d.style && (f[g] = L.get(d, "olddisplay"), c = d.style.display, b ? (f[g] || "none" !== c || (d.style.display = ""), "" === d.style.display && S(d) && (f[g] = L.access(d, "olddisplay", tb(d.nodeName)))) : f[g] || (e = S(d), (c && "none" !== c || !e) && L.set(d, "olddisplay", e ? c : o.css(d, "display"))));
        for (g = 0; h > g; g++) d = a[g], d.style && (b && "none" !== d.style.display && "" !== d.style.display || (d.style.display = b ? f[g] || "" : "none"));
        return a
    }
    o.extend({
        cssHooks: {
            opacity: {
                get: function(a, b) {
                    if (b) {
                        var c = xb(a, "opacity");
                        return "" === c ? "1" : c
                    }
                }
            }
        },
        cssNumber: {
            columnCount: !0,
            fillOpacity: !0,
            fontWeight: !0,
            lineHeight: !0,
            opacity: !0,
            order: !0,
            orphans: !0,
            widows: !0,
            zIndex: !0,
            zoom: !0
        },
        cssProps: {
            "float": "cssFloat"
        },
        style: function(a, b, c, d) {
            if (a && 3 !== a.nodeType && 8 !== a.nodeType && a.style) {
                var e, f, g, h = o.camelCase(b),
                    i = a.style;
                return b = o.cssProps[h] || (o.cssProps[h] = Fb(i, h)), g = o.cssHooks[b] || o.cssHooks[h], void 0 === c ? g && "get" in g && void 0 !== (e = g.get(a, !1, d)) ? e : i[b] : (f = typeof c, "string" === f && (e = Bb.exec(c)) && (c = (e[1] + 1) * e[2] + parseFloat(o.css(a, b)), f = "number"), null != c && c === c && ("number" !== f || o.cssNumber[h] || (c += "px"), l.clearCloneStyle || "" !== c || 0 !== b.indexOf("background") || (i[b] = "inherit"), g && "set" in g && void 0 === (c = g.set(a, c, d)) || (i[b] = "", i[b] = c)), void 0)
            }
        },
        css: function(a, b, c, d) {
            var e, f, g, h = o.camelCase(b);
            return b = o.cssProps[h] || (o.cssProps[h] = Fb(a.style, h)), g = o.cssHooks[b] || o.cssHooks[h], g && "get" in g && (e = g.get(a, !0, c)), void 0 === e && (e = xb(a, b, d)), "normal" === e && b in Db && (e = Db[b]), "" === c || c ? (f = parseFloat(e), c === !0 || o.isNumeric(f) ? f || 0 : e) : e
        }
    }), o.each(["height", "width"], function(a, b) {
        o.cssHooks[b] = {
            get: function(a, c, d) {
                return c ? 0 === a.offsetWidth && zb.test(o.css(a, "display")) ? o.swap(a, Cb, function() {
                    return Ib(a, b, d)
                }) : Ib(a, b, d) : void 0
            },
            set: function(a, c, d) {
                var e = d && wb(a);
                return Gb(a, c, d ? Hb(a, b, d, "border-box" === o.css(a, "boxSizing", !1, e), e) : 0)
            }
        }
    }), o.cssHooks.marginRight = yb(l.reliableMarginRight, function(a, b) {
        return b ? o.swap(a, {
            display: "inline-block"
        }, xb, [a, "marginRight"]) : void 0
    }), o.each({
        margin: "",
        padding: "",
        border: "Width"
    }, function(a, b) {
        o.cssHooks[a + b] = {
            expand: function(c) {
                for (var d = 0, e = {}, f = "string" == typeof c ? c.split(" ") : [c]; 4 > d; d++) e[a + R[d] + b] = f[d] || f[d - 2] || f[0];
                return e
            }
        }, ub.test(a) || (o.cssHooks[a + b].set = Gb)
    }), o.fn.extend({
        css: function(a, b) {
            return J(this, function(a, b, c) {
                var d, e, f = {},
                    g = 0;
                if (o.isArray(b)) {
                    for (d = wb(a), e = b.length; e > g; g++) f[b[g]] = o.css(a, b[g], !1, d);
                    return f
                }
                return void 0 !== c ? o.style(a, b, c) : o.css(a, b)
            }, a, b, arguments.length > 1)
        },
        show: function() {
            return Jb(this, !0)
        },
        hide: function() {
            return Jb(this)
        },
        toggle: function(a) {
            return "boolean" == typeof a ? a ? this.show() : this.hide() : this.each(function() {
                S(this) ? o(this).show() : o(this).hide()
            })
        }
    });

    function Kb(a, b, c, d, e) {
        return new Kb.prototype.init(a, b, c, d, e)
    }
    o.Tween = Kb, Kb.prototype = {
        constructor: Kb,
        init: function(a, b, c, d, e, f) {
            this.elem = a, this.prop = c, this.easing = e || "swing", this.options = b, this.start = this.now = this.cur(), this.end = d, this.unit = f || (o.cssNumber[c] ? "" : "px")
        },
        cur: function() {
            var a = Kb.propHooks[this.prop];
            return a && a.get ? a.get(this) : Kb.propHooks._default.get(this)
        },
        run: function(a) {
            var b, c = Kb.propHooks[this.prop];
            return this.pos = b = this.options.duration ? o.easing[this.easing](a, this.options.duration * a, 0, 1, this.options.duration) : a, this.now = (this.end - this.start) * b + this.start, this.options.step && this.options.step.call(this.elem, this.now, this), c && c.set ? c.set(this) : Kb.propHooks._default.set(this), this
        }
    }, Kb.prototype.init.prototype = Kb.prototype, Kb.propHooks = {
        _default: {
            get: function(a) {
                var b;
                return null == a.elem[a.prop] || a.elem.style && null != a.elem.style[a.prop] ? (b = o.css(a.elem, a.prop, ""), b && "auto" !== b ? b : 0) : a.elem[a.prop]
            },
            set: function(a) {
                o.fx.step[a.prop] ? o.fx.step[a.prop](a) : a.elem.style && (null != a.elem.style[o.cssProps[a.prop]] || o.cssHooks[a.prop]) ? o.style(a.elem, a.prop, a.now + a.unit) : a.elem[a.prop] = a.now
            }
        }
    }, Kb.propHooks.scrollTop = Kb.propHooks.scrollLeft = {
        set: function(a) {
            a.elem.nodeType && a.elem.parentNode && (a.elem[a.prop] = a.now)
        }
    }, o.easing = {
        linear: function(a) {
            return a
        },
        swing: function(a) {
            return .5 - Math.cos(a * Math.PI) / 2
        }
    }, o.fx = Kb.prototype.init, o.fx.step = {};
    var Lb, Mb, Nb = /^(?:toggle|show|hide)$/,
        Ob = new RegExp("^(?:([+-])=|)(" + Q + ")([a-z%]*)$", "i"),
        Pb = /queueHooks$/,
        Qb = [Vb],
        Rb = {
            "*": [function(a, b) {
                var c = this.createTween(a, b),
                    d = c.cur(),
                    e = Ob.exec(b),
                    f = e && e[3] || (o.cssNumber[a] ? "" : "px"),
                    g = (o.cssNumber[a] || "px" !== f && +d) && Ob.exec(o.css(c.elem, a)),
                    h = 1,
                    i = 20;
                if (g && g[3] !== f) {
                    f = f || g[3], e = e || [], g = +d || 1;
                    do h = h || ".5", g /= h, o.style(c.elem, a, g + f); while (h !== (h = c.cur() / d) && 1 !== h && --i)
                }
                return e && (g = c.start = +g || +d || 0, c.unit = f, c.end = e[1] ? g + (e[1] + 1) * e[2] : +e[2]), c
            }]
        };

    function Sb() {
        return setTimeout(function() {
            Lb = void 0
        }), Lb = o.now()
    }

    function Tb(a, b) {
        var c, d = 0,
            e = {
                height: a
            };
        for (b = b ? 1 : 0; 4 > d; d += 2 - b) c = R[d], e["margin" + c] = e["padding" + c] = a;
        return b && (e.opacity = e.width = a), e
    }

    function Ub(a, b, c) {
        for (var d, e = (Rb[b] || []).concat(Rb["*"]), f = 0, g = e.length; g > f; f++)
            if (d = e[f].call(c, b, a)) return d
    }

    function Vb(a, b, c) {
        var d, e, f, g, h, i, j, k = this,
            l = {},
            m = a.style,
            n = a.nodeType && S(a),
            p = L.get(a, "fxshow");
        c.queue || (h = o._queueHooks(a, "fx"), null == h.unqueued && (h.unqueued = 0, i = h.empty.fire, h.empty.fire = function() {
            h.unqueued || i()
        }), h.unqueued++, k.always(function() {
            k.always(function() {
                h.unqueued--, o.queue(a, "fx").length || h.empty.fire()
            })
        })), 1 === a.nodeType && ("height" in b || "width" in b) && (c.overflow = [m.overflow, m.overflowX, m.overflowY], j = o.css(a, "display"), "none" === j && (j = tb(a.nodeName)), "inline" === j && "none" === o.css(a, "float") && (m.display = "inline-block")), c.overflow && (m.overflow = "hidden", k.always(function() {
            m.overflow = c.overflow[0], m.overflowX = c.overflow[1], m.overflowY = c.overflow[2]
        }));
        for (d in b)
            if (e = b[d], Nb.exec(e)) {
                if (delete b[d], f = f || "toggle" === e, e === (n ? "hide" : "show")) {
                    if ("show" !== e || !p || void 0 === p[d]) continue;
                    n = !0
                }
                l[d] = p && p[d] || o.style(a, d)
            }
        if (!o.isEmptyObject(l)) {
            p ? "hidden" in p && (n = p.hidden) : p = L.access(a, "fxshow", {}), f && (p.hidden = !n), n ? o(a).show() : k.done(function() {
                o(a).hide()
            }), k.done(function() {
                var b;
                L.remove(a, "fxshow");
                for (b in l) o.style(a, b, l[b])
            });
            for (d in l) g = Ub(n ? p[d] : 0, d, k), d in p || (p[d] = g.start, n && (g.end = g.start, g.start = "width" === d || "height" === d ? 1 : 0))
        }
    }

    function Wb(a, b) {
        var c, d, e, f, g;
        for (c in a)
            if (d = o.camelCase(c), e = b[d], f = a[c], o.isArray(f) && (e = f[1], f = a[c] = f[0]), c !== d && (a[d] = f, delete a[c]), g = o.cssHooks[d], g && "expand" in g) {
                f = g.expand(f), delete a[d];
                for (c in f) c in a || (a[c] = f[c], b[c] = e)
            } else b[d] = e
    }

    function Xb(a, b, c) {
        var d, e, f = 0,
            g = Qb.length,
            h = o.Deferred().always(function() {
                delete i.elem
            }),
            i = function() {
                if (e) return !1;
                for (var b = Lb || Sb(), c = Math.max(0, j.startTime + j.duration - b), d = c / j.duration || 0, f = 1 - d, g = 0, i = j.tweens.length; i > g; g++) j.tweens[g].run(f);
                return h.notifyWith(a, [j, f, c]), 1 > f && i ? c : (h.resolveWith(a, [j]), !1)
            },
            j = h.promise({
                elem: a,
                props: o.extend({}, b),
                opts: o.extend(!0, {
                    specialEasing: {}
                }, c),
                originalProperties: b,
                originalOptions: c,
                startTime: Lb || Sb(),
                duration: c.duration,
                tweens: [],
                createTween: function(b, c) {
                    var d = o.Tween(a, j.opts, b, c, j.opts.specialEasing[b] || j.opts.easing);
                    return j.tweens.push(d), d
                },
                stop: function(b) {
                    var c = 0,
                        d = b ? j.tweens.length : 0;
                    if (e) return this;
                    for (e = !0; d > c; c++) j.tweens[c].run(1);
                    return b ? h.resolveWith(a, [j, b]) : h.rejectWith(a, [j, b]), this
                }
            }),
            k = j.props;
        for (Wb(k, j.opts.specialEasing); g > f; f++)
            if (d = Qb[f].call(j, a, k, j.opts)) return d;
        return o.map(k, Ub, j), o.isFunction(j.opts.start) && j.opts.start.call(a, j), o.fx.timer(o.extend(i, {
            elem: a,
            anim: j,
            queue: j.opts.queue
        })), j.progress(j.opts.progress).done(j.opts.done, j.opts.complete).fail(j.opts.fail).always(j.opts.always)
    }
    o.Animation = o.extend(Xb, {
            tweener: function(a, b) {
                o.isFunction(a) ? (b = a, a = ["*"]) : a = a.split(" ");
                for (var c, d = 0, e = a.length; e > d; d++) c = a[d], Rb[c] = Rb[c] || [], Rb[c].unshift(b)
            },
            prefilter: function(a, b) {
                b ? Qb.unshift(a) : Qb.push(a)
            }
        }), o.speed = function(a, b, c) {
            var d = a && "object" == typeof a ? o.extend({}, a) : {
                complete: c || !c && b || o.isFunction(a) && a,
                duration: a,
                easing: c && b || b && !o.isFunction(b) && b
            };
            return d.duration = o.fx.off ? 0 : "number" == typeof d.duration ? d.duration : d.duration in o.fx.speeds ? o.fx.speeds[d.duration] : o.fx.speeds._default, (null == d.queue || d.queue === !0) && (d.queue = "fx"), d.old = d.complete, d.complete = function() {
                o.isFunction(d.old) && d.old.call(this), d.queue && o.dequeue(this, d.queue)
            }, d
        }, o.fn.extend({
            fadeTo: function(a, b, c, d) {
                return this.filter(S).css("opacity", 0).show().end().animate({
                    opacity: b
                }, a, c, d)
            },
            animate: function(a, b, c, d) {
                var e = o.isEmptyObject(a),
                    f = o.speed(b, c, d),
                    g = function() {
                        var b = Xb(this, o.extend({}, a), f);
                        (e || L.get(this, "finish")) && b.stop(!0)
                    };
                return g.finish = g, e || f.queue === !1 ? this.each(g) : this.queue(f.queue, g)
            },
            stop: function(a, b, c) {
                var d = function(a) {
                    var b = a.stop;
                    delete a.stop, b(c)
                };
                return "string" != typeof a && (c = b, b = a, a = void 0), b && a !== !1 && this.queue(a || "fx", []), this.each(function() {
                    var b = !0,
                        e = null != a && a + "queueHooks",
                        f = o.timers,
                        g = L.get(this);
                    if (e) g[e] && g[e].stop && d(g[e]);
                    else
                        for (e in g) g[e] && g[e].stop && Pb.test(e) && d(g[e]);
                    for (e = f.length; e--;) f[e].elem !== this || null != a && f[e].queue !== a || (f[e].anim.stop(c), b = !1, f.splice(e, 1));
                    (b || !c) && o.dequeue(this, a)
                })
            },
            finish: function(a) {
                return a !== !1 && (a = a || "fx"), this.each(function() {
                    var b, c = L.get(this),
                        d = c[a + "queue"],
                        e = c[a + "queueHooks"],
                        f = o.timers,
                        g = d ? d.length : 0;
                    for (c.finish = !0, o.queue(this, a, []), e && e.stop && e.stop.call(this, !0), b = f.length; b--;) f[b].elem === this && f[b].queue === a && (f[b].anim.stop(!0), f.splice(b, 1));
                    for (b = 0; g > b; b++) d[b] && d[b].finish && d[b].finish.call(this);
                    delete c.finish
                })
            }
        }), o.each(["toggle", "show", "hide"], function(a, b) {
            var c = o.fn[b];
            o.fn[b] = function(a, d, e) {
                return null == a || "boolean" == typeof a ? c.apply(this, arguments) : this.animate(Tb(b, !0), a, d, e)
            }
        }), o.each({
            slideDown: Tb("show"),
            slideUp: Tb("hide"),
            slideToggle: Tb("toggle"),
            fadeIn: {
                opacity: "show"
            },
            fadeOut: {
                opacity: "hide"
            },
            fadeToggle: {
                opacity: "toggle"
            }
        }, function(a, b) {
            o.fn[a] = function(a, c, d) {
                return this.animate(b, a, c, d)
            }
        }), o.timers = [], o.fx.tick = function() {
            var a, b = 0,
                c = o.timers;
            for (Lb = o.now(); b < c.length; b++) a = c[b], a() || c[b] !== a || c.splice(b--, 1);
            c.length || o.fx.stop(), Lb = void 0
        }, o.fx.timer = function(a) {
            o.timers.push(a), a() ? o.fx.start() : o.timers.pop()
        }, o.fx.interval = 13, o.fx.start = function() {
            Mb || (Mb = setInterval(o.fx.tick, o.fx.interval))
        }, o.fx.stop = function() {
            clearInterval(Mb), Mb = null
        }, o.fx.speeds = {
            slow: 600,
            fast: 200,
            _default: 400
        }, o.fn.delay = function(a, b) {
            return a = o.fx ? o.fx.speeds[a] || a : a, b = b || "fx", this.queue(b, function(b, c) {
                var d = setTimeout(b, a);
                c.stop = function() {
                    clearTimeout(d)
                }
            })
        },
        function() {
            var a = m.createElement("input"),
                b = m.createElement("select"),
                c = b.appendChild(m.createElement("option"));
            a.type = "checkbox", l.checkOn = "" !== a.value, l.optSelected = c.selected, b.disabled = !0, l.optDisabled = !c.disabled, a = m.createElement("input"), a.value = "t", a.type = "radio", l.radioValue = "t" === a.value
        }();
    var Yb, Zb, $b = o.expr.attrHandle;
    o.fn.extend({
        attr: function(a, b) {
            return J(this, o.attr, a, b, arguments.length > 1)
        },
        removeAttr: function(a) {
            return this.each(function() {
                o.removeAttr(this, a)
            })
        }
    }), o.extend({
        attr: function(a, b, c) {
            var d, e, f = a.nodeType;
            if (a && 3 !== f && 8 !== f && 2 !== f) return typeof a.getAttribute === U ? o.prop(a, b, c) : (1 === f && o.isXMLDoc(a) || (b = b.toLowerCase(), d = o.attrHooks[b] || (o.expr.match.bool.test(b) ? Zb : Yb)), void 0 === c ? d && "get" in d && null !== (e = d.get(a, b)) ? e : (e = o.find.attr(a, b), null == e ? void 0 : e) : null !== c ? d && "set" in d && void 0 !== (e = d.set(a, c, b)) ? e : (a.setAttribute(b, c + ""), c) : void o.removeAttr(a, b))
        },
        removeAttr: function(a, b) {
            var c, d, e = 0,
                f = b && b.match(E);
            if (f && 1 === a.nodeType)
                while (c = f[e++]) d = o.propFix[c] || c, o.expr.match.bool.test(c) && (a[d] = !1), a.removeAttribute(c)
        },
        attrHooks: {
            type: {
                set: function(a, b) {
                    if (!l.radioValue && "radio" === b && o.nodeName(a, "input")) {
                        var c = a.value;
                        return a.setAttribute("type", b), c && (a.value = c), b
                    }
                }
            }
        }
    }), Zb = {
        set: function(a, b, c) {
            return b === !1 ? o.removeAttr(a, c) : a.setAttribute(c, c), c
        }
    }, o.each(o.expr.match.bool.source.match(/\w+/g), function(a, b) {
        var c = $b[b] || o.find.attr;
        $b[b] = function(a, b, d) {
            var e, f;
            return d || (f = $b[b], $b[b] = e, e = null != c(a, b, d) ? b.toLowerCase() : null, $b[b] = f), e
        }
    });
    var _b = /^(?:input|select|textarea|button)$/i;
    o.fn.extend({
        prop: function(a, b) {
            return J(this, o.prop, a, b, arguments.length > 1)
        },
        removeProp: function(a) {
            return this.each(function() {
                delete this[o.propFix[a] || a]
            })
        }
    }), o.extend({
        propFix: {
            "for": "htmlFor",
            "class": "className"
        },
        prop: function(a, b, c) {
            var d, e, f, g = a.nodeType;
            if (a && 3 !== g && 8 !== g && 2 !== g) return f = 1 !== g || !o.isXMLDoc(a), f && (b = o.propFix[b] || b, e = o.propHooks[b]), void 0 !== c ? e && "set" in e && void 0 !== (d = e.set(a, c, b)) ? d : a[b] = c : e && "get" in e && null !== (d = e.get(a, b)) ? d : a[b]
        },
        propHooks: {
            tabIndex: {
                get: function(a) {
                    return a.hasAttribute("tabindex") || _b.test(a.nodeName) || a.href ? a.tabIndex : -1
                }
            }
        }
    }), l.optSelected || (o.propHooks.selected = {
        get: function(a) {
            var b = a.parentNode;
            return b && b.parentNode && b.parentNode.selectedIndex, null
        }
    }), o.each(["tabIndex", "readOnly", "maxLength", "cellSpacing", "cellPadding", "rowSpan", "colSpan", "useMap", "frameBorder", "contentEditable"], function() {
        o.propFix[this.toLowerCase()] = this
    });
    var ac = /[\t\r\n\f]/g;
    o.fn.extend({
        addClass: function(a) {
            var b, c, d, e, f, g, h = "string" == typeof a && a,
                i = 0,
                j = this.length;
            if (o.isFunction(a)) return this.each(function(b) {
                o(this).addClass(a.call(this, b, this.className))
            });
            if (h)
                for (b = (a || "").match(E) || []; j > i; i++)
                    if (c = this[i], d = 1 === c.nodeType && (c.className ? (" " + c.className + " ").replace(ac, " ") : " ")) {
                        f = 0;
                        while (e = b[f++]) d.indexOf(" " + e + " ") < 0 && (d += e + " ");
                        g = o.trim(d), c.className !== g && (c.className = g)
                    }
            return this
        },
        removeClass: function(a) {
            var b, c, d, e, f, g, h = 0 === arguments.length || "string" == typeof a && a,
                i = 0,
                j = this.length;
            if (o.isFunction(a)) return this.each(function(b) {
                o(this).removeClass(a.call(this, b, this.className))
            });
            if (h)
                for (b = (a || "").match(E) || []; j > i; i++)
                    if (c = this[i], d = 1 === c.nodeType && (c.className ? (" " + c.className + " ").replace(ac, " ") : "")) {
                        f = 0;
                        while (e = b[f++])
                            while (d.indexOf(" " + e + " ") >= 0) d = d.replace(" " + e + " ", " ");
                        g = a ? o.trim(d) : "", c.className !== g && (c.className = g)
                    }
            return this
        },
        toggleClass: function(a, b) {
            var c = typeof a;
            return "boolean" == typeof b && "string" === c ? b ? this.addClass(a) : this.removeClass(a) : this.each(o.isFunction(a) ? function(c) {
                o(this).toggleClass(a.call(this, c, this.className, b), b)
            } : function() {
                if ("string" === c) {
                    var b, d = 0,
                        e = o(this),
                        f = a.match(E) || [];
                    while (b = f[d++]) e.hasClass(b) ? e.removeClass(b) : e.addClass(b)
                } else(c === U || "boolean" === c) && (this.className && L.set(this, "__className__", this.className), this.className = this.className || a === !1 ? "" : L.get(this, "__className__") || "")
            })
        },
        hasClass: function(a) {
            for (var b = " " + a + " ", c = 0, d = this.length; d > c; c++)
                if (1 === this[c].nodeType && (" " + this[c].className + " ").replace(ac, " ").indexOf(b) >= 0) return !0;
            return !1
        }
    });
    var bc = /\r/g;
    o.fn.extend({
        val: function(a) {
            var b, c, d, e = this[0]; {
                if (arguments.length) return d = o.isFunction(a), this.each(function(c) {
                    var e;
                    1 === this.nodeType && (e = d ? a.call(this, c, o(this).val()) : a, null == e ? e = "" : "number" == typeof e ? e += "" : o.isArray(e) && (e = o.map(e, function(a) {
                        return null == a ? "" : a + ""
                    })), b = o.valHooks[this.type] || o.valHooks[this.nodeName.toLowerCase()], b && "set" in b && void 0 !== b.set(this, e, "value") || (this.value = e))
                });
                if (e) return b = o.valHooks[e.type] || o.valHooks[e.nodeName.toLowerCase()], b && "get" in b && void 0 !== (c = b.get(e, "value")) ? c : (c = e.value, "string" == typeof c ? c.replace(bc, "") : null == c ? "" : c)
            }
        }
    }), o.extend({
        valHooks: {
            select: {
                get: function(a) {
                    for (var b, c, d = a.options, e = a.selectedIndex, f = "select-one" === a.type || 0 > e, g = f ? null : [], h = f ? e + 1 : d.length, i = 0 > e ? h : f ? e : 0; h > i; i++)
                        if (c = d[i], !(!c.selected && i !== e || (l.optDisabled ? c.disabled : null !== c.getAttribute("disabled")) || c.parentNode.disabled && o.nodeName(c.parentNode, "optgroup"))) {
                            if (b = o(c).val(), f) return b;
                            g.push(b)
                        }
                    return g
                },
                set: function(a, b) {
                    var c, d, e = a.options,
                        f = o.makeArray(b),
                        g = e.length;
                    while (g--) d = e[g], (d.selected = o.inArray(o(d).val(), f) >= 0) && (c = !0);
                    return c || (a.selectedIndex = -1), f
                }
            }
        }
    }), o.each(["radio", "checkbox"], function() {
        o.valHooks[this] = {
            set: function(a, b) {
                return o.isArray(b) ? a.checked = o.inArray(o(a).val(), b) >= 0 : void 0
            }
        }, l.checkOn || (o.valHooks[this].get = function(a) {
            return null === a.getAttribute("value") ? "on" : a.value
        })
    }), o.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "), function(a, b) {
        o.fn[b] = function(a, c) {
            return arguments.length > 0 ? this.on(b, null, a, c) : this.trigger(b)
        }
    }), o.fn.extend({
        hover: function(a, b) {
            return this.mouseenter(a).mouseleave(b || a)
        },
        bind: function(a, b, c) {
            return this.on(a, null, b, c)
        },
        unbind: function(a, b) {
            return this.off(a, null, b)
        },
        delegate: function(a, b, c, d) {
            return this.on(b, a, c, d)
        },
        undelegate: function(a, b, c) {
            return 1 === arguments.length ? this.off(a, "**") : this.off(b, a || "**", c)
        }
    });
    var cc = o.now(),
        dc = /\?/;
    o.parseJSON = function(a) {
        return JSON.parse(a + "")
    }, o.parseXML = function(a) {
        var b, c;
        if (!a || "string" != typeof a) return null;
        try {
            c = new DOMParser, b = c.parseFromString(a, "text/xml")
        } catch (d) {
            b = void 0
        }
        return (!b || b.getElementsByTagName("parsererror").length) && o.error("Invalid XML: " + a), b
    };
    var ec, fc, gc = /#.*$/,
        hc = /([?&])_=[^&]*/,
        ic = /^(.*?):[ \t]*([^\r\n]*)$/gm,
        jc = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
        kc = /^(?:GET|HEAD)$/,
        lc = /^\/\//,
        mc = /^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/,
        nc = {},
        oc = {},
        pc = "*/".concat("*");
    try {
        fc = location.href
    } catch (qc) {
        fc = m.createElement("a"), fc.href = "", fc = fc.href
    }
    ec = mc.exec(fc.toLowerCase()) || [];

    function rc(a) {
        return function(b, c) {
            "string" != typeof b && (c = b, b = "*");
            var d, e = 0,
                f = b.toLowerCase().match(E) || [];
            if (o.isFunction(c))
                while (d = f[e++]) "+" === d[0] ? (d = d.slice(1) || "*", (a[d] = a[d] || []).unshift(c)) : (a[d] = a[d] || []).push(c)
        }
    }

    function sc(a, b, c, d) {
        var e = {},
            f = a === oc;

        function g(h) {
            var i;
            return e[h] = !0, o.each(a[h] || [], function(a, h) {
                var j = h(b, c, d);
                return "string" != typeof j || f || e[j] ? f ? !(i = j) : void 0 : (b.dataTypes.unshift(j), g(j), !1)
            }), i
        }
        return g(b.dataTypes[0]) || !e["*"] && g("*")
    }

    function tc(a, b) {
        var c, d, e = o.ajaxSettings.flatOptions || {};
        for (c in b) void 0 !== b[c] && ((e[c] ? a : d || (d = {}))[c] = b[c]);
        return d && o.extend(!0, a, d), a
    }

    function uc(a, b, c) {
        var d, e, f, g, h = a.contents,
            i = a.dataTypes;
        while ("*" === i[0]) i.shift(), void 0 === d && (d = a.mimeType || b.getResponseHeader("Content-Type"));
        if (d)
            for (e in h)
                if (h[e] && h[e].test(d)) {
                    i.unshift(e);
                    break
                }
        if (i[0] in c) f = i[0];
        else {
            for (e in c) {
                if (!i[0] || a.converters[e + " " + i[0]]) {
                    f = e;
                    break
                }
                g || (g = e)
            }
            f = f || g
        }
        return f ? (f !== i[0] && i.unshift(f), c[f]) : void 0
    }

    function vc(a, b, c, d) {
        var e, f, g, h, i, j = {},
            k = a.dataTypes.slice();
        if (k[1])
            for (g in a.converters) j[g.toLowerCase()] = a.converters[g];
        f = k.shift();
        while (f)
            if (a.responseFields[f] && (c[a.responseFields[f]] = b), !i && d && a.dataFilter && (b = a.dataFilter(b, a.dataType)), i = f, f = k.shift())
                if ("*" === f) f = i;
                else if ("*" !== i && i !== f) {
            if (g = j[i + " " + f] || j["* " + f], !g)
                for (e in j)
                    if (h = e.split(" "), h[1] === f && (g = j[i + " " + h[0]] || j["* " + h[0]])) {
                        g === !0 ? g = j[e] : j[e] !== !0 && (f = h[0], k.unshift(h[1]));
                        break
                    }
            if (g !== !0)
                if (g && a["throws"]) b = g(b);
                else try {
                    b = g(b)
                } catch (l) {
                    return {
                        state: "parsererror",
                        error: g ? l : "No conversion from " + i + " to " + f
                    }
                }
        }
        return {
            state: "success",
            data: b
        }
    }
    o.extend({
        active: 0,
        lastModified: {},
        etag: {},
        ajaxSettings: {
            url: fc,
            type: "GET",
            isLocal: jc.test(ec[1]),
            global: !0,
            processData: !0,
            async: !0,
            contentType: "application/x-www-form-urlencoded; charset=UTF-8",
            accepts: {
                "*": pc,
                text: "text/plain",
                html: "text/html",
                xml: "application/xml, text/xml",
                json: "application/json, text/javascript"
            },
            contents: {
                xml: /xml/,
                html: /html/,
                json: /json/
            },
            responseFields: {
                xml: "responseXML",
                text: "responseText",
                json: "responseJSON"
            },
            converters: {
                "* text": String,
                "text html": !0,
                "text json": o.parseJSON,
                "text xml": o.parseXML
            },
            flatOptions: {
                url: !0,
                context: !0
            }
        },
        ajaxSetup: function(a, b) {
            return b ? tc(tc(a, o.ajaxSettings), b) : tc(o.ajaxSettings, a)
        },
        ajaxPrefilter: rc(nc),
        ajaxTransport: rc(oc),
        ajax: function(a, b) {
            "object" == typeof a && (b = a, a = void 0), b = b || {};
            var c, d, e, f, g, h, i, j, k = o.ajaxSetup({}, b),
                l = k.context || k,
                m = k.context && (l.nodeType || l.jquery) ? o(l) : o.event,
                n = o.Deferred(),
                p = o.Callbacks("once memory"),
                q = k.statusCode || {},
                r = {},
                s = {},
                t = 0,
                u = "canceled",
                v = {
                    readyState: 0,
                    getResponseHeader: function(a) {
                        var b;
                        if (2 === t) {
                            if (!f) {
                                f = {};
                                while (b = ic.exec(e)) f[b[1].toLowerCase()] = b[2]
                            }
                            b = f[a.toLowerCase()]
                        }
                        return null == b ? null : b
                    },
                    getAllResponseHeaders: function() {
                        return 2 === t ? e : null
                    },
                    setRequestHeader: function(a, b) {
                        var c = a.toLowerCase();
                        return t || (a = s[c] = s[c] || a, r[a] = b), this
                    },
                    overrideMimeType: function(a) {
                        return t || (k.mimeType = a), this
                    },
                    statusCode: function(a) {
                        var b;
                        if (a)
                            if (2 > t)
                                for (b in a) q[b] = [q[b], a[b]];
                            else v.always(a[v.status]);
                        return this
                    },
                    abort: function(a) {
                        var b = a || u;
                        return c && c.abort(b), x(0, b), this
                    }
                };
            if (n.promise(v).complete = p.add, v.success = v.done, v.error = v.fail, k.url = ((a || k.url || fc) + "").replace(gc, "").replace(lc, ec[1] + "//"), k.type = b.method || b.type || k.method || k.type, k.dataTypes = o.trim(k.dataType || "*").toLowerCase().match(E) || [""], null == k.crossDomain && (h = mc.exec(k.url.toLowerCase()), k.crossDomain = !(!h || h[1] === ec[1] && h[2] === ec[2] && (h[3] || ("http:" === h[1] ? "80" : "443")) === (ec[3] || ("http:" === ec[1] ? "80" : "443")))), k.data && k.processData && "string" != typeof k.data && (k.data = o.param(k.data, k.traditional)), sc(nc, k, b, v), 2 === t) return v;
            i = k.global, i && 0 === o.active++ && o.event.trigger("ajaxStart"), k.type = k.type.toUpperCase(), k.hasContent = !kc.test(k.type), d = k.url, k.hasContent || (k.data && (d = k.url += (dc.test(d) ? "&" : "?") + k.data, delete k.data), k.cache === !1 && (k.url = hc.test(d) ? d.replace(hc, "$1_=" + cc++) : d + (dc.test(d) ? "&" : "?") + "_=" + cc++)), k.ifModified && (o.lastModified[d] && v.setRequestHeader("If-Modified-Since", o.lastModified[d]), o.etag[d] && v.setRequestHeader("If-None-Match", o.etag[d])), (k.data && k.hasContent && k.contentType !== !1 || b.contentType) && v.setRequestHeader("Content-Type", k.contentType), v.setRequestHeader("Accept", k.dataTypes[0] && k.accepts[k.dataTypes[0]] ? k.accepts[k.dataTypes[0]] + ("*" !== k.dataTypes[0] ? ", " + pc + "; q=0.01" : "") : k.accepts["*"]);
            for (j in k.headers) v.setRequestHeader(j, k.headers[j]);
            if (k.beforeSend && (k.beforeSend.call(l, v, k) === !1 || 2 === t)) return v.abort();
            u = "abort";
            for (j in {
                    success: 1,
                    error: 1,
                    complete: 1
                }) v[j](k[j]);
            if (c = sc(oc, k, b, v)) {
                v.readyState = 1, i && m.trigger("ajaxSend", [v, k]), k.async && k.timeout > 0 && (g = setTimeout(function() {
                    v.abort("timeout")
                }, k.timeout));
                try {
                    t = 1, c.send(r, x)
                } catch (w) {
                    if (!(2 > t)) throw w;
                    x(-1, w)
                }
            } else x(-1, "No Transport");

            function x(a, b, f, h) {
                var j, r, s, u, w, x = b;
                2 !== t && (t = 2, g && clearTimeout(g), c = void 0, e = h || "", v.readyState = a > 0 ? 4 : 0, j = a >= 200 && 300 > a || 304 === a, f && (u = uc(k, v, f)), u = vc(k, u, v, j), j ? (k.ifModified && (w = v.getResponseHeader("Last-Modified"), w && (o.lastModified[d] = w), w = v.getResponseHeader("etag"), w && (o.etag[d] = w)), 204 === a || "HEAD" === k.type ? x = "nocontent" : 304 === a ? x = "notmodified" : (x = u.state, r = u.data, s = u.error, j = !s)) : (s = x, (a || !x) && (x = "error", 0 > a && (a = 0))), v.status = a, v.statusText = (b || x) + "", j ? n.resolveWith(l, [r, x, v]) : n.rejectWith(l, [v, x, s]), v.statusCode(q), q = void 0, i && m.trigger(j ? "ajaxSuccess" : "ajaxError", [v, k, j ? r : s]), p.fireWith(l, [v, x]), i && (m.trigger("ajaxComplete", [v, k]), --o.active || o.event.trigger("ajaxStop")))
            }
            return v
        },
        getJSON: function(a, b, c) {
            return o.get(a, b, c, "json")
        },
        getScript: function(a, b) {
            return o.get(a, void 0, b, "script")
        }
    }), o.each(["get", "post"], function(a, b) {
        o[b] = function(a, c, d, e) {
            return o.isFunction(c) && (e = e || d, d = c, c = void 0), o.ajax({
                url: a,
                type: b,
                dataType: e,
                data: c,
                success: d
            })
        }
    }), o.each(["ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend"], function(a, b) {
        o.fn[b] = function(a) {
            return this.on(b, a)
        }
    }), o._evalUrl = function(a) {
        return o.ajax({
            url: a,
            type: "GET",
            dataType: "script",
            async: !1,
            global: !1,
            "throws": !0
        })
    }, o.fn.extend({
        wrapAll: function(a) {
            var b;
            return o.isFunction(a) ? this.each(function(b) {
                o(this).wrapAll(a.call(this, b))
            }) : (this[0] && (b = o(a, this[0].ownerDocument).eq(0).clone(!0), this[0].parentNode && b.insertBefore(this[0]), b.map(function() {
                var a = this;
                while (a.firstElementChild) a = a.firstElementChild;
                return a
            }).append(this)), this)
        },
        wrapInner: function(a) {
            return this.each(o.isFunction(a) ? function(b) {
                o(this).wrapInner(a.call(this, b))
            } : function() {
                var b = o(this),
                    c = b.contents();
                c.length ? c.wrapAll(a) : b.append(a)
            })
        },
        wrap: function(a) {
            var b = o.isFunction(a);
            return this.each(function(c) {
                o(this).wrapAll(b ? a.call(this, c) : a)
            })
        },
        unwrap: function() {
            return this.parent().each(function() {
                o.nodeName(this, "body") || o(this).replaceWith(this.childNodes)
            }).end()
        }
    }), o.expr.filters.hidden = function(a) {
        return a.offsetWidth <= 0 && a.offsetHeight <= 0
    }, o.expr.filters.visible = function(a) {
        return !o.expr.filters.hidden(a)
    };
    var wc = /%20/g,
        xc = /\[\]$/,
        yc = /\r?\n/g,
        zc = /^(?:submit|button|image|reset|file)$/i,
        Ac = /^(?:input|select|textarea|keygen)/i;

    function Bc(a, b, c, d) {
        var e;
        if (o.isArray(b)) o.each(b, function(b, e) {
            c || xc.test(a) ? d(a, e) : Bc(a + "[" + ("object" == typeof e ? b : "") + "]", e, c, d)
        });
        else if (c || "object" !== o.type(b)) d(a, b);
        else
            for (e in b) Bc(a + "[" + e + "]", b[e], c, d)
    }
    o.param = function(a, b) {
        var c, d = [],
            e = function(a, b) {
                b = o.isFunction(b) ? b() : null == b ? "" : b, d[d.length] = encodeURIComponent(a) + "=" + encodeURIComponent(b)
            };
        if (void 0 === b && (b = o.ajaxSettings && o.ajaxSettings.traditional), o.isArray(a) || a.jquery && !o.isPlainObject(a)) o.each(a, function() {
            e(this.name, this.value)
        });
        else
            for (c in a) Bc(c, a[c], b, e);
        return d.join("&").replace(wc, "+")
    }, o.fn.extend({
        serialize: function() {
            return o.param(this.serializeArray())
        },
        serializeArray: function() {
            return this.map(function() {
                var a = o.prop(this, "elements");
                return a ? o.makeArray(a) : this
            }).filter(function() {
                var a = this.type;
                return this.name && !o(this).is(":disabled") && Ac.test(this.nodeName) && !zc.test(a) && (this.checked || !T.test(a))
            }).map(function(a, b) {
                var c = o(this).val();
                return null == c ? null : o.isArray(c) ? o.map(c, function(a) {
                    return {
                        name: b.name,
                        value: a.replace(yc, "\r\n")
                    }
                }) : {
                    name: b.name,
                    value: c.replace(yc, "\r\n")
                }
            }).get()
        }
    }), o.ajaxSettings.xhr = function() {
        try {
            return new XMLHttpRequest
        } catch (a) {}
    };
    var Cc = 0,
        Dc = {},
        Ec = {
            0: 200,
            1223: 204
        },
        Fc = o.ajaxSettings.xhr();
    a.ActiveXObject && o(a).on("unload", function() {
        for (var a in Dc) Dc[a]()
    }), l.cors = !!Fc && "withCredentials" in Fc, l.ajax = Fc = !!Fc, o.ajaxTransport(function(a) {
        var b;
        return l.cors || Fc && !a.crossDomain ? {
            send: function(c, d) {
                var e, f = a.xhr(),
                    g = ++Cc;
                if (f.open(a.type, a.url, a.async, a.username, a.password), a.xhrFields)
                    for (e in a.xhrFields) f[e] = a.xhrFields[e];
                a.mimeType && f.overrideMimeType && f.overrideMimeType(a.mimeType), a.crossDomain || c["X-Requested-With"] || (c["X-Requested-With"] = "XMLHttpRequest");
                for (e in c) f.setRequestHeader(e, c[e]);
                b = function(a) {
                    return function() {
                        b && (delete Dc[g], b = f.onload = f.onerror = null, "abort" === a ? f.abort() : "error" === a ? d(f.status, f.statusText) : d(Ec[f.status] || f.status, f.statusText, "string" == typeof f.responseText ? {
                            text: f.responseText
                        } : void 0, f.getAllResponseHeaders()))
                    }
                }, f.onload = b(), f.onerror = b("error"), b = Dc[g] = b("abort"), f.send(a.hasContent && a.data || null)
            },
            abort: function() {
                b && b()
            }
        } : void 0
    }), o.ajaxSetup({
        accepts: {
            script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
        },
        contents: {
            script: /(?:java|ecma)script/
        },
        converters: {
            "text script": function(a) {
                return o.globalEval(a), a
            }
        }
    }), o.ajaxPrefilter("script", function(a) {
        void 0 === a.cache && (a.cache = !1), a.crossDomain && (a.type = "GET")
    }), o.ajaxTransport("script", function(a) {
        if (a.crossDomain) {
            var b, c;
            return {
                send: function(d, e) {
                    b = o("<script>").prop({
                        async: !0,
                        charset: a.scriptCharset,
                        src: a.url
                    }).on("load error", c = function(a) {
                        b.remove(), c = null, a && e("error" === a.type ? 404 : 200, a.type)
                    }), m.head.appendChild(b[0])
                },
                abort: function() {
                    c && c()
                }
            }
        }
    });
    var Gc = [],
        Hc = /(=)\?(?=&|$)|\?\?/;
    o.ajaxSetup({
        jsonp: "callback",
        jsonpCallback: function() {
            var a = Gc.pop() || o.expando + "_" + cc++;
            return this[a] = !0, a
        }
    }), o.ajaxPrefilter("json jsonp", function(b, c, d) {
        var e, f, g, h = b.jsonp !== !1 && (Hc.test(b.url) ? "url" : "string" == typeof b.data && !(b.contentType || "").indexOf("application/x-www-form-urlencoded") && Hc.test(b.data) && "data");
        return h || "jsonp" === b.dataTypes[0] ? (e = b.jsonpCallback = o.isFunction(b.jsonpCallback) ? b.jsonpCallback() : b.jsonpCallback, h ? b[h] = b[h].replace(Hc, "$1" + e) : b.jsonp !== !1 && (b.url += (dc.test(b.url) ? "&" : "?") + b.jsonp + "=" + e), b.converters["script json"] = function() {
            return g || o.error(e + " was not called"), g[0]
        }, b.dataTypes[0] = "json", f = a[e], a[e] = function() {
            g = arguments
        }, d.always(function() {
            a[e] = f, b[e] && (b.jsonpCallback = c.jsonpCallback, Gc.push(e)), g && o.isFunction(f) && f(g[0]), g = f = void 0
        }), "script") : void 0
    }), o.parseHTML = function(a, b, c) {
        if (!a || "string" != typeof a) return null;
        "boolean" == typeof b && (c = b, b = !1), b = b || m;
        var d = v.exec(a),
            e = !c && [];
        return d ? [b.createElement(d[1])] : (d = o.buildFragment([a], b, e), e && e.length && o(e).remove(), o.merge([], d.childNodes))
    };
    var Ic = o.fn.load;
    o.fn.load = function(a, b, c) {
        if ("string" != typeof a && Ic) return Ic.apply(this, arguments);
        var d, e, f, g = this,
            h = a.indexOf(" ");
        return h >= 0 && (d = a.slice(h), a = a.slice(0, h)), o.isFunction(b) ? (c = b, b = void 0) : b && "object" == typeof b && (e = "POST"), g.length > 0 && o.ajax({
            url: a,
            type: e,
            dataType: "html",
            data: b
        }).done(function(a) {
            f = arguments, g.html(d ? o("<div>").append(o.parseHTML(a)).find(d) : a)
        }).complete(c && function(a, b) {
            g.each(c, f || [a.responseText, b, a])
        }), this
    }, o.expr.filters.animated = function(a) {
        return o.grep(o.timers, function(b) {
            return a === b.elem
        }).length
    };
    var Jc = a.document.documentElement;

    function Kc(a) {
        return o.isWindow(a) ? a : 9 === a.nodeType && a.defaultView
    }
    o.offset = {
        setOffset: function(a, b, c) {
            var d, e, f, g, h, i, j, k = o.css(a, "position"),
                l = o(a),
                m = {};
            "static" === k && (a.style.position = "relative"), h = l.offset(), f = o.css(a, "top"), i = o.css(a, "left"), j = ("absolute" === k || "fixed" === k) && (f + i).indexOf("auto") > -1, j ? (d = l.position(), g = d.top, e = d.left) : (g = parseFloat(f) || 0, e = parseFloat(i) || 0), o.isFunction(b) && (b = b.call(a, c, h)), null != b.top && (m.top = b.top - h.top + g), null != b.left && (m.left = b.left - h.left + e), "using" in b ? b.using.call(a, m) : l.css(m)
        }
    }, o.fn.extend({
        offset: function(a) {
            if (arguments.length) return void 0 === a ? this : this.each(function(b) {
                o.offset.setOffset(this, a, b)
            });
            var b, c, d = this[0],
                e = {
                    top: 0,
                    left: 0
                },
                f = d && d.ownerDocument;
            if (f) return b = f.documentElement, o.contains(b, d) ? (typeof d.getBoundingClientRect !== U && (e = d.getBoundingClientRect()), c = Kc(f), {
                top: e.top + c.pageYOffset - b.clientTop,
                left: e.left + c.pageXOffset - b.clientLeft
            }) : e
        },
        position: function() {
            if (this[0]) {
                var a, b, c = this[0],
                    d = {
                        top: 0,
                        left: 0
                    };
                return "fixed" === o.css(c, "position") ? b = c.getBoundingClientRect() : (a = this.offsetParent(), b = this.offset(), o.nodeName(a[0], "html") || (d = a.offset()), d.top += o.css(a[0], "borderTopWidth", !0), d.left += o.css(a[0], "borderLeftWidth", !0)), {
                    top: b.top - d.top - o.css(c, "marginTop", !0),
                    left: b.left - d.left - o.css(c, "marginLeft", !0)
                }
            }
        },
        offsetParent: function() {
            return this.map(function() {
                var a = this.offsetParent || Jc;
                while (a && !o.nodeName(a, "html") && "static" === o.css(a, "position")) a = a.offsetParent;
                return a || Jc
            })
        }
    }), o.each({
        scrollLeft: "pageXOffset",
        scrollTop: "pageYOffset"
    }, function(b, c) {
        var d = "pageYOffset" === c;
        o.fn[b] = function(e) {
            return J(this, function(b, e, f) {
                var g = Kc(b);
                return void 0 === f ? g ? g[c] : b[e] : void(g ? g.scrollTo(d ? a.pageXOffset : f, d ? f : a.pageYOffset) : b[e] = f)
            }, b, e, arguments.length, null)
        }
    }), o.each(["top", "left"], function(a, b) {
        o.cssHooks[b] = yb(l.pixelPosition, function(a, c) {
            return c ? (c = xb(a, b), vb.test(c) ? o(a).position()[b] + "px" : c) : void 0
        })
    }), o.each({
        Height: "height",
        Width: "width"
    }, function(a, b) {
        o.each({
            padding: "inner" + a,
            content: b,
            "": "outer" + a
        }, function(c, d) {
            o.fn[d] = function(d, e) {
                var f = arguments.length && (c || "boolean" != typeof d),
                    g = c || (d === !0 || e === !0 ? "margin" : "border");
                return J(this, function(b, c, d) {
                    var e;
                    return o.isWindow(b) ? b.document.documentElement["client" + a] : 9 === b.nodeType ? (e = b.documentElement, Math.max(b.body["scroll" + a], e["scroll" + a], b.body["offset" + a], e["offset" + a], e["client" + a])) : void 0 === d ? o.css(b, c, g) : o.style(b, c, d, g)
                }, b, f ? d : void 0, f, null)
            }
        })
    }), o.fn.size = function() {
        return this.length
    }, o.fn.andSelf = o.fn.addBack, "function" == typeof define && define.amd && define("jquery", [], function() {
        return o
    });
    var Lc = a.jQuery,
        Mc = a.$;
    return o.noConflict = function(b) {
        return a.$ === o && (a.$ = Mc), b && a.jQuery === o && (a.jQuery = Lc), o
    }, typeof b === U && (a.jQuery = a.$ = o), o
});
"use strict";
String.prototype.shorten = function(maxLength) {
    return this.length > maxLength ? (this.substr(0, maxLength - 2) + '\u2026') : this.valueOf();
};
String.prototype.shortenMid = function(maxLength) {
    return this.length > maxLength ? (this.substr(0, maxLength * 0.33) + '\u2026' + this.substr(-maxLength * 0.66)) : this.valueOf();
};
String.prototype.escape = function() {
    return this.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};
String.prototype.possessive = function() {
    return this.match(/s$/i) ? this.valueOf() + "'" : this.valueOf() + "'s";
};
String.prototype.inflect = function(count, p, s) {
    var name = this;
    if (count != 1 && count != -1) {
        return count + ' ' + name + (p || 'e');
    }
    return count + ' ' + name + (s || '');
};
String.prototype.inflectNoCount = function(count, p) {
    var name = this;
    if (count != 1 && count != -1) {
        return name + (p || 'e');
    }
    return name;
};
String.prototype.hostName = function() {
    var m = this.match(/\/\/(www\.)?(.*?)\//);
    return m && m[2] ? m[2] : 'unknown';
};
String.prototype.newlineToHTML = function() {
    return this.replace(/\n\s+\n/g, '<br/><br/>').replace(/\n/g, '<br/>');
};
String.prototype.urlsToHTML = function(maxLength) {
    return this.replace(/\b(https?:\/\/(?:www\.)?|www\.)([^\s()<>]+(?:\([\w\d]+\)|([^,\.\(\)<>!?\s]|\/)))/g, function(url, httpwww, hostandpath) {
        if (httpwww === 'www.') {
            url = 'http://' + url;
        }
        url = url.replace(/@/g, '&#64;');
        hostandpath = hostandpath.replace(/@/g, '&#64;');
        var path = null;
        if (path = hostandpath.match(new RegExp('^' + CONFIG.HOST + '(/.*?)$'))) {
            return '<a href="' + path[1] + '">' + path[1] + '</a>';
        } else {
            return '<a href="' + url + '">' + hostandpath.shortenMid(maxLength) + '</a>';
        }
    });
};
String.prototype.userAtToHTML = function(maxLength) {
    return this.replace(/(?!\b)(@([a-zA-Z0-9]{2,}))/g, '<a href="/user/$2">$1</a>');
};
String.prototype.format = function() {
    return this.escape().newlineToHTML().urlsToHTML(80).userAtToHTML();
};
"use strict";
Date.RELATIVE_TIME_PERIODS = {
    Jahr: 31536000,
    Monat: 2628000,
    Woche: 604800,
    Tag: 86400,
    Stunde: 3600,
    Minute: 60,
    Moment: -1
};
Date.now = Date.now || function() {
    return (new Date()).getTime();
};
Date.secondsToString = function(rawSeconds) {
    var days = Math.floor(rawSeconds / (60 * 60 * 24));
    var hours = Math.floor((rawSeconds % (60 * 60 * 24)) / (60 * 60));
    var minutes = Math.floor((rawSeconds % (60 * 60)) / 60);
    var seconds = rawSeconds % 60;
    return days + " Tag(e), " + hours + " Stunde(n), " + minutes + " Minute(n), " + seconds + " Sekunde(n)";
};
Date.prototype.unix = function() {
    return Math.floor(this.getTime() / 1000);
};
Date.prototype.relativeTime = function(forcePast, noprefix) {
    var diff = (new Date()).getTime() / 1000 - this.getTime() / 1000;
    if (forcePast && diff < 0) {
        diff = 0;
    }
    var prefix = noprefix ? '' : (diff >= 0) ? "vor " : "in ";
    diff = Math.abs(diff);
    for (var period in Date.RELATIVE_TIME_PERIODS) {
        var length = Date.RELATIVE_TIME_PERIODS[period];
        if (diff > length) {
            if (length > 0) {
                diff = Math.round(diff / length);
                var plural = diff > 1 ? (period.substr(-1) == 'e' ? 'n' : 'en') : '';
                return prefix + diff + " " + period + plural;
            } else {
                return prefix + "einem Moment";
            }
        }
    }
    return false;
};
Date.MONTH_NAMES = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
Date.prototype.readableTime = function() {
    var h = this.getHours();
    var m = this.getMinutes();
    return this.getDate() + ". " +
        Date.MONTH_NAMES[this.getMonth()] + " " +
        this.getFullYear() + " - " +
        (h > 9 ? h : '0' + h) + ":" + (m > 9 ? m : '0' + m);
};
Date.prototype.readableDate = function() {
    return this.getDate() + ". " +
        Date.MONTH_NAMES[this.getMonth()] + " " +
        this.getFullYear();
};
"use strict"
Number.prototype.map = function(istart, istop, ostart, ostop) {
    return ostart + (ostop - ostart) * ((this - istart) / (istop - istart));
};
Number.prototype.limit = function(min, max) {
    return Math.min(max, Math.max(min, this));
};
Number.prototype.round = function(precision) {
    precision = Math.pow(10, precision || 0);
    return Math.round(this * precision) / precision;
};
Number.prototype.floor = function() {
    return Math.floor(this);
};
Number.prototype.ceil = function() {
    return Math.ceil(this);
};
Number.prototype.toInt = function() {
    return (this | 0);
};
Number.zeroes = '000000000000';
Number.prototype.zeroFill = function(d) {
    var s = this.toString();
    return Number.zeroes.substr(0, d - s.length) + s;
};
"use strict";
Array.prototype.erase = function(item) {
    for (var i = this.length; i--;) {
        if (this[i] === item) {
            this.splice(i, 1);
        }
    }
    return this;
};
Array.prototype.random = function() {
    return this[Math.floor(Math.random() * this.length)];
};
Array.prototype.shuffle = function() {
    for (var j, x, i = this.length; i; j = Math.floor(Math.random() * i), x = this[--i], this[i] = this[j], this[j] = x);
    return this;
};
[].indexOf || (Array.prototype.indexOf = function(a, b, c) {
    for (c = this.length, b = (c + ~~b) % c; b < c && (!(b in this) || this[b] !== a); b++);
    return b ^ c ? b : -1;
});
Array.prototype.first = function() {
    return this.length ? this[0] : null;
};
Array.prototype.last = function() {
    return this.length ? this[this.length - 1] : null;
};
"use strict";
Function.prototype.bind = Function.prototype.bind || function(bind) {
    if (typeof this !== "function") {
        throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
    }
    var aArgs = Array.prototype.slice.call(arguments, 1),
        fToBind = this,
        fNOP = function() {},
        fBound = function() {
            return fToBind.apply((this instanceof fNOP && oThis ? this : oThis), aArgs.concat(Array.prototype.slice.call(arguments)));
        };
    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();
    return fBound;
};
"use strict";
p.isNormalClick = function(ev) {
    return (ev.type != 'click' || !(ev.which != 1 || ev.shiftKey || ev.altKey || ev.metaKey || ev.ctrlKey));
};
p.KEY = {
    'BACKSPACE': 8,
    'TAB': 9,
    'ENTER': 13,
    'PAUSE': 19,
    'CAPS': 20,
    'ESC': 27,
    'SPACE': 32,
    'PAGE_UP': 33,
    'PAGE_DOWN': 34,
    'END': 35,
    'HOME': 36,
    'LEFT_ARROW': 37,
    'UP_ARROW': 38,
    'RIGHT_ARROW': 39,
    'DOWN_ARROW': 40,
    'INSERT': 45,
    'DELETE': 46,
    '0': 48,
    '1': 49,
    '2': 50,
    '3': 51,
    '4': 52,
    '5': 53,
    '6': 54,
    '7': 55,
    '8': 56,
    '9': 57,
    'A': 65,
    'B': 66,
    'C': 67,
    'D': 68,
    'E': 69,
    'F': 70,
    'G': 71,
    'H': 72,
    'I': 73,
    'J': 74,
    'K': 75,
    'L': 76,
    'M': 77,
    'N': 78,
    'O': 79,
    'P': 80,
    'Q': 81,
    'R': 82,
    'S': 83,
    'T': 84,
    'U': 85,
    'V': 86,
    'W': 87,
    'X': 88,
    'Y': 89,
    'Z': 90,
    'NUMPAD_0': 96,
    'NUMPAD_1': 97,
    'NUMPAD_2': 98,
    'NUMPAD_3': 99,
    'NUMPAD_4': 100,
    'NUMPAD_5': 101,
    'NUMPAD_6': 102,
    'NUMPAD_7': 103,
    'NUMPAD_8': 104,
    'NUMPAD_9': 105,
    'MULTIPLY': 106,
    'ADD': 107,
    'SUBTRACT': 109,
    'DECIMAL': 110,
    'DIVIDE': 111,
    'F1': 112,
    'F2': 113,
    'F3': 114,
    'F4': 115,
    'F5': 116,
    'F6': 117,
    'F7': 118,
    'F8': 119,
    'F9': 120,
    'F10': 121,
    'F11': 122,
    'F12': 123,
    'SHIFT': 16,
    'CTRL': 17,
    'ALT': 18,
    'PLUS': 187,
    'COMMA': 188,
    'MINUS': 189,
    'PERIOD': 190
};
(function($) {
    var FastClick = function(el, callback) {
        this.element = el;
        this.callback = callback;
        this.sx = this.sy = 0;
        this.scroll = 0;
        this.element.addEventListener('touchstart', this, false);
    };
    var noClickUntil = 0;
    FastClick.prototype = {
        handleEvent: function(e) {
            switch (e.type) {
                case 'touchstart':
                    this.onTouchStart(e);
                    break;
                case 'touchend':
                    this.onTouchEnd(e);
                    break;
            }
        },
        onTouchStart: function(e) {
            this.start = Date.now();
            this.sx = e.touches[0].pageX - document.body.scrollTop;
            this.sy = e.touches[0].pageY - document.body.scrollLeft;
            this.scroll = document.body.scrollTop;
            this.element.addEventListener('touchend', this, false);
            noClickUntil = 0;
        },
        onTouchEnd: function(e) {
            this.element.removeEventListener('touchend', this, false);
            var cx = e.changedTouches[0].pageX - document.body.scrollTop,
                cy = e.changedTouches[0].pageY - document.body.scrollLeft;
            var dx = this.sx - cx,
                dy = this.sy - cy,
                scrolled = (this.scroll != document.body.scrollTop),
                maxMove = 32,
                maxTime = 300;
            if (!scrolled && Math.abs(dx) < maxMove && Math.abs(dy) < maxMove && (Date.now() - this.start) < maxTime) {
                e.preventDefault();
                e.stopPropagation();
                noClickUntil = Date.now() + 1000;
                return this.callback(e);
            }
        }
    };
    $.fn.fastclick = function(callback) {
        if (p.mobile && window.Touch) {
            for (var i = 0; i < this.length; i++) {
                new FastClick(this[i], callback);
            }
            this.click(function(e) {
                if (noClickUntil < Date.now()) {
                    return callback(e);
                } else {
                    return false;
                }
            });
        } else {
            this.click(callback);
        }
        return this;
    };
})(jQuery);
(function(window) {
    var host = 'pr0gramm.com';
    var useSubdomains = true;
    window.CONFIG = {
        HOST: host,
        ABSOLUTE_PATH: '/',
        HEADER_HEIGHT: 52,
        COOKIE: {
            NAME: 'me',
            EXPIRE: 3650
        },
        PATH: {
            IMAGES: (useSubdomains ? '//img.' + host + '/' : '/data/images/'),
            FULLSIZE: (useSubdomains ? '//full.' + host + '/' : '/data/fullsize/'),
            THUMBS: (useSubdomains ? '//thumb.' + host + '/' : '/data/thumbs/')
        },
        LAYOUT: {
            THUMBS_PER_ROW: {
                MIN: 3,
                MAX: 8
            },
            THUMB: {
                WIDTH: 128,
                HEIGHT: 128,
                PADDING: 4
            },
            WIDTH_CLASS: {
                TWO_SIDEBARS: {
                    MAX_WIDTH: Infinity,
                    SIDEBARS_WIDTH: 400,
                    MARGIN: 24,
                    CLASS_NAME: 'two-sidebars'
                },
                ONE_SIDEBAR: {
                    MAX_WIDTH: 1440,
                    SIDEBARS_WIDTH: 200,
                    MARGIN: 20,
                    CLASS_NAME: 'one-sidebar'
                },
                NO_SIDEBAR: {
                    MAX_WIDTH: 780,
                    SIDEBARS_WIDTH: 0,
                    MARGIN: 0,
                    CLASS_NAME: 'no-sidebar'
                }
            },
            WIDTH_CLASS_FORCE_NO_SIDEBAR: {
                MAX_WIDTH: Infinity,
                SIDEBARS_WIDTH: 0,
                MARGIN: 24,
                CLASS_NAME: 'wide-no-sidebar'
            }
        },
        ANALYTICS: {
            ENABLED: true,
            ACCOUNT: 'UA-66268030-1'
        },
        COMMENTS_MAX_LEVELS: 15,
        ITEM_SHOW_SCORE_AGE: 3600,
        AUTO_SYNC: {
            ENABLED: true,
            INTERVAL: 60
        },
        SFW_FLAG: {
            SFW: {
                flag: 1,
                name: 'sfw'
            },
            NSFW: {
                flag: 2,
                name: 'nsfw'
            },
            NSFL: {
                flag: 4,
                name: 'nsfl'
            }
        },
        INBOX_EXPANDED_COUNT: 5,
        TAGS_MIN_CONFIDENCE: 0.2,
        TAGS_MAX_DISPLAY: 4,
        LAST_LINEAR_COMMENTS_ITEM: 128926,
        API: {
            ENDPOINT: '/api/',
            ALLOWED_UPLOAD_TYPES: ['image/png', 'image/jpeg', 'image/gif', 'video/webm']
        },
        TAGS_INPUT_SETTINGS: {
            'defaultText': 'Tags hinzufügen, mit Komma trennen',
            'removeWithBackspace': true,
            'minChars': 2,
            'maxChars': 32
        },
        BOOKMARKLET: "javascript:" + "void((function(){" + "var%20e=document.createElement('script');" + "e.src='https://" + host + "/media/bookmarklet.min.js';" + "document.body.appendChild(e);" + "})());",
        ADS: {
            ACCOUNT: '61585078',
            REFRESH_INTERVAL: (120 * 1000)
        }
    };
})(window);
p.ads = {
    UNIT: {},
    _gptLoaded: false,
    _definedSlots: {},
    _refreshInterval: 0,
    requireGPT: function() {
        if (p.ads._gptLoaded) {
            return;
        }
        window.googletag = window.googletag || {};
        googletag.cmd = googletag.cmd || [];
        var gads = document.createElement('script');
        gads.async = true;
        gads.type = 'text/javascript';
        gads.src = '//www.googletagservices.com/tag/js/gpt.js';
        document.getElementsByTagName('head')[0].appendChild(gads);
        googletag.cmd.push(function() {
            googletag.pubads().enableSingleRequest();
            googletag.pubads().disableInitialLoad();
            googletag.enableServices();
        });
        p.ads._refreshInterval = setInterval(p.ads.refresh.bind(p.ads), CONFIG.ADS.REFRESH_INTERVAL);
        p.ads._gptLoaded = true;
    },
    refresh: function() {
        if (!p.ads._gptLoaded) {
            return;
        }
        googletag.pubads().refresh();
    },
    fill: function(elements) {
        if (!elements.length) {
            return;
        }
        p.ads.requireGPT();
        elements.each(function() {
            var $div = $(this);
            var id = $div.attr('id');
            var slotName = '/' + CONFIG.ADS.ACCOUNT + '/' +
                $div.data('slot') +
                (p.user.flags == CONFIG.SFW_FLAG.SFW.flag ? '' : '-nsfw');
            if (!p.ads._definedSlots[slotName]) {
                p.ads._definedSlots[slotName] = true;
                var dims = $div.data('size').split('x');
                var width = parseInt(dims[0]) || 0;
                var height = parseInt(dims[1]) || 0;
                googletag.cmd.push(function() {
                    var slot = googletag.defineSlot(slotName, [width, height], id).addService(googletag.pubads());
                    googletag.display(id);
                    googletag.pubads().refresh([slot]);
                });
            } else {
                googletag.cmd.push(function() {
                    googletag.display(id);
                });
            }
        });
    }
};
(function(factory) {
    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else {
        factory(jQuery);
    }
}(function($) {
    var pluses = /\+/g;

    function raw(s) {
        return s;
    }

    function decoded(s) {
        return decodeURIComponent(s.replace(pluses, ' '));
    }

    function converted(s) {
        if (s.indexOf('"') === 0) {
            s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        try {
            return config.json ? JSON.parse(s) : s;
        } catch (er) {}
    }
    var config = $.cookie = function(key, value, options) {
        if (value !== undefined) {
            options = $.extend({}, config.defaults, options);
            if (typeof options.expires === 'number') {
                var days = options.expires,
                    t = options.expires = new Date();
                t.setDate(t.getDate() + days);
            }
            value = config.json ? JSON.stringify(value) : String(value);
            return (document.cookie = [config.raw ? key : encodeURIComponent(key), '=', config.raw ? value : encodeURIComponent(value), options.expires ? '; expires=' + options.expires.toUTCString() : '', options.path ? '; path=' + options.path : '', options.domain ? '; domain=' + options.domain : '', options.secure ? '; secure' : ''].join(''));
        }
        var decode = config.raw ? raw : decoded;
        var cookies = document.cookie.split('; ');
        var result = key ? undefined : {};
        for (var i = 0, l = cookies.length; i < l; i++) {
            var parts = cookies[i].split('=');
            var name = decode(parts.shift());
            var cookie = decode(parts.join('='));
            if (key && key === name) {
                result = converted(cookie);
                break;
            }
            if (!key) {
                result[name] = converted(cookie);
            }
        }
        return result;
    };
    config.defaults = {};
    $.removeCookie = function(key, options) {
        if ($.cookie(key) !== undefined) {
            $.cookie(key, '', $.extend(options, {
                expires: -1
            }));
            return true;
        }
        return false;
    };
}));
p.LocalStore = p.Class.extend({
    storeName: 'keyvalues',
    prefix: 'default_',
    status: 0,
    _db: null,
    _queue: [],
    init: function(name) {
        this.prefix = name ? (name + '_') : this.prefix;
        var that = this;
        var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        if (!indexedDB) {
            that.status = p.LocalStore.STATUS.FAILED;
            that._execQueue();
            return;
        }
        try {
            var request = indexedDB.open('LocalStore', 2);
            request.onupgradeneeded = function() {
                try {
                    request.result.deleteObjectStore(name);
                } catch (e) {}
                try {
                    request.result.createObjectStore('keyvalues');
                } catch (e) {}
            };
            request.onsuccess = function() {
                that.status = p.LocalStore.STATUS.OPEN;
                that._db = request.result;
                that._execQueue();
            };
            request.onerror = function() {
                that.status = p.LocalStore.STATUS.FAILED;
                that._execQueue();
            };
        } catch (err) {
            that.status = p.LocalStore.STATUS.FAILED;
            that._execQueue();
        }
    },
    _execQueue: function() {
        var queue = this._queue;
        this._queue = [];
        for (var i = 0; i < queue.length; i++) {
            var q = queue[i];
            this._execRequest(q.mode, q.action, q.callback, q.params);
        }
    },
    _execRequest: function(mode, action, callback, params) {
        if (this.status === p.LocalStore.STATUS.OPEN) {
            try {
                var store = this._db.transaction(this.storeName, mode).objectStore(this.storeName);
                var req = store[action].apply(store, params);
                if (callback) {
                    req.onsuccess = function() {
                        callback(null, req.result);
                    };
                    req.onerror = function() {
                        callback(req.error, null);
                    };
                }
            } catch (err) {}
        } else if (this.status === p.LocalStore.STATUS.NOT_OPEN) {
            this._queue.push({
                mode: mode,
                action: action,
                callback: callback,
                params: params
            });
        } else if (this.status === p.LocalStore.STATUS.FAILED && callback) {
            callback(this.status);
        }
    },
    getItem: function(key, callback) {
        this._execRequest('readonly', 'get', callback, [this.prefix + key]);
    },
    setItem: function(key, value, callback) {
        this._execRequest('readwrite', 'put', callback, [value, this.prefix + key]);
    },
    removeItem: function(key, callback) {
        this._execRequest('readwrite', 'delete', callback, [this.prefix + key]);
    },
    clear: function(callback) {
        this._execRequest('readwrite', 'clear', callback, []);
    }
});
p.LocalStore.deleteDatabase = function(name) {
    name = name || 'LocalStore';
    var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    if (indexedDB) {
        try {
            indexedDB.deleteDatabase(name);
        } catch (err) {}
    }
};
p.LocalStore.STATUS = {
    NOT_OPEN: 0,
    FAILED: 1,
    OPEN: 2
};
p.VoteCache = p.Class.extend({
    votes: {
        items: {},
        tags: {},
        comments: {}
    },
    localStore: null,
    _storageRequestsRunning: 0,
    _updateFromLogWaiting: null,
    _cachedLastSyncId: -1,
    setDatabaseName: function(name) {
        name = (typeof name === 'string') ? name.replace(/[^\w]/, '') : 'default';
        this.localStore = new p.LocalStore(name);
        p.LocalStore.deleteDatabase('localforage');
    },
    clear: function() {
        this.votes.items = {};
        this.votes.tags = {};
        this.votes.comments = {};
        this.localStore.clear();
    },
    getLastSyncData: function(callback) {
        if (!this.localStore) {
            return;
        }
        var that = this;
        this.localStore.getItem('last_sync_id', function(error, id) {
            if (error) {
                return;
            }
            var lastSyncId = (parseInt(id) || 0);
            that.localStore.getItem('sync_token', function(error, token) {
                if (that._cachedLastSyncId !== -1 && that._cachedLastSyncId != lastSyncId) {
                    that.restoreFromLocal(function() {
                        callback(lastSyncId, token);
                    });
                } else {
                    callback(lastSyncId, token);
                }
                that._cachedLastSyncId = lastSyncId;
            });
        });
    },
    createNewSyncToken: function() {
        var token = Math.random().toString(36).substr(2);
        this.localStore.setItem('sync_token', token);
        return token;
    },
    restoreFromLocal: function(callback) {
        if (!this.localStore) {
            return;
        }
        this._restoreFromLocalCallback = callback;
        var that = this;
        for (var thing in this.votes) {
            this._storageRequestsRunning += 3;
            this.localStore.getItem(thing + '_up', this.combineVotes.bind(this, thing, 1));
            this.localStore.getItem(thing + '_down', this.combineVotes.bind(this, thing, -1));
            this.localStore.getItem(thing + '_fav', this.combineVotes.bind(this, thing, 2));
        }
    },
    combineVotes: function(thing, dir, error, compacted) {
        this._storageRequestsRunning--;
        var votes = this.votes[thing];
        if (compacted) {
            for (var i = 0; i < compacted.length; i++) {
                votes[compacted[i]] = dir;
            }
        }
        if (this._storageRequestsRunning == 0) {
            if (this._restoreFromLocalCallback) {
                this._restoreFromLocalCallback();
            }
            if (this._updateFromLogWaiting) {
                var r = this._updateFromLogWaiting;
                this._updateFromLogInternal(r.log, r.lastId, r.callback);
                this._updateFromLogWaiting = null;
            }
        }
    },
    saveToLocal: function() {
        if (!this.localStore) {
            return;
        }
        for (var thing in this.votes) {
            var splitted = this.splitVotes(this.votes[thing]);
            for (var action in splitted) {
                var ids = splitted[action];
                if (ids.length) {
                    this.localStore.setItem(thing + '_' + action, ids);
                }
            }
        }
    },
    splitVotes: function(votes) {
        var up = [],
            fav = [],
            down = [];
        for (var i in votes) {
            var v = votes[i];
            var n = i | 0;
            if (v === 1) {
                up.push(n);
            } else if (v === 2) {
                fav.push(n);
            } else {
                down.push(n);
            }
        }
        return {
            up: up,
            fav: fav,
            down: down
        };
    },
    updateFromLog: function(log, lastId, callback) {
        if (!this.localStore || !log.length) {
            return;
        }
        this._cachedLastSyncId = lastId;
        if (this._storageRequestsRunning != 0) {
            this._updateFromLogWaiting = {
                log: log,
                lastId: lastId,
                callback: callback
            };
        } else {
            this._updateFromLogInternal(log, lastId, callback);
        }
    },
    _updateFromLogInternal: function(log, lastId, callback) {
        this.localStore.setItem('last_sync_id', lastId);
        var VA = p.VoteCache.VOTE_ACTION;
        for (var i = 0; i < log.length; i += 2) {
            var thingId = log[i];
            var action = VA[log[i + 1]];
            if (action && action.vote === 0) {
                delete this.votes[action.thing][thingId];
            } else if (action) {
                this.votes[action.thing][thingId] = action.vote;
            }
        }
        this.saveToLocal();
        callback();
    }
});
p.VoteCache.VOTE_ACTION = [{
    thing: 'none',
    vote: 0
}, {
    thing: 'items',
    vote: -1
}, {
    thing: 'items',
    vote: 0
}, {
    thing: 'items',
    vote: +1
}, {
    thing: 'comments',
    vote: -1
}, {
    thing: 'comments',
    vote: 0
}, {
    thing: 'comments',
    vote: +1
}, {
    thing: 'tags',
    vote: -1
}, {
    thing: 'tags',
    vote: 0
}, {
    thing: 'tags',
    vote: +1
}, {
    thing: 'items',
    vote: +2
}];
p.User = p.Class.extend({
    id: null,
    paid: false,
    cookie: {},
    flags: 1,
    flagsName: 'sfw',
    name: '',
    admin: false,
    syncTimeout: null,
    showAds: true,
    inboxCount: 0,
    syncToken: null,
    init: function() {
        this.voteCache = new p.VoteCache();
        this.loadCookie();
        if (this.id) {
            this.voteCache.setDatabaseName(this.name);
            this.voteCache.restoreFromLocal(this.syncVotesOnCurrentView.bind(this));
            this.sync();
        } else {
            p.merge(p.User.MARK, p.User.MARK_SFW_OVERRIDES);
        }
    },
    login: function(data, callback) {
        this.externalCallback = callback;
        p.api.post('user.login', data, this.loginCallback.bind(this));
    },
    logout: function() {
        p.api.post('user.logout', {
            id: this.id
        });
        this.softLogout();
    },
    softLogout: function() {
        this.flags = CONFIG.SFW_FLAG.SFW.flag;
        this.cookie = {};
        this.saveCookie();
        this.id = null;
        this.paid = 0;
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }
    },
    setFlags: function(flags) {
        if (flags < 1 || flags > 7) {
            flags = CONFIG.SFW_FLAG.SFW.flag;
        }
        this.flags = flags;
        this.cookie.fl = flags;
        this.saveCookie();
        this.reloadFlagsName();
        return true;
    },
    setShowAds: function(forceOn) {
        if (this.paid && forceOn) {
            this.set('ads', 1);
            this.showAds = true;
        } else {
            this.unset('ads');
            if (this.paid) {
                this.showAds = false;
            }
        }
    },
    loginCallback: function(response) {
        if (response.success) {
            this.loadCookie();
            this.voteCache.setDatabaseName(this.name);
            this.voteCache.restoreFromLocal(this.syncVotesOnCurrentView.bind(this));
            this.sync();
        }
        if (this.externalCallback) {
            this.externalCallback(response);
        }
    },
    get: function(key) {
        return this.cookie[key] || null;
    },
    set: function(key, value) {
        this.cookie[key] = value;
        this.saveCookie();
    },
    unset: function(key) {
        delete this.cookie[key];
        this.saveCookie();
    },
    loadCookie: function() {
        var restored = JSON.parse($.cookie(CONFIG.COOKIE.NAME) || '{}');
        if (restored) {
            this.cookie = p.merge(this.cookie, restored);
            this.id = this.cookie.id;
            this.flags = parseInt(this.cookie.fl) || 1;
            if (this.flags < 1 || this.flags > 7) {
                this.flags = CONFIG.SFW_FLAG.SFW.flag;
            }
            if (this.id) {
                this.name = this.cookie.n;
                this.admin = !!this.cookie.a;
                this.paid = !!this.cookie.paid;
            }
        } else {
            this.id = null;
        }
        if (!this.id) {
            this.flags = CONFIG.SFW_FLAG.SFW.flag;
            this.admin = false;
            this.paid = false;
        }
        this.showAds = !!(!this.paid || this.cookie.ads);
        this.reloadFlagsName();
    },
    reloadFlagsName: function() {
        if (this.flags == (CONFIG.SFW_FLAG.SFW.flag | CONFIG.SFW_FLAG.NSFW.flag | CONFIG.SFW_FLAG.NSFL.flag)) {
            this.flagsName = 'all';
        } else {
            var names = [];
            for (var f in CONFIG.SFW_FLAG) {
                if (this.flags & CONFIG.SFW_FLAG[f].flag) {
                    names.push(CONFIG.SFW_FLAG[f].name);
                }
            }
            this.flagsName = names.length ? names.join('+') : CONFIG.SFW_FLAG.SFW.name;
        }
    },
    saveCookie: function() {
        var cs = JSON.stringify(this.cookie);
        $.cookie(CONFIG.COOKIE.NAME, cs, {
            expires: CONFIG.COOKIE.EXPIRE,
            path: '/'
        });
    },
    sync: function() {
        this.voteCache.getLastSyncData((function(lastSyncId, globalSyncToken) {
            if (!globalSyncToken || !this.syncToken || this.syncToken === globalSyncToken) {
                this.syncToken = this.voteCache.createNewSyncToken();
                p.api.get('user.sync', {
                    lastId: lastSyncId
                }, this.syncCallback.bind(this), p.ServerAPI.SILENT);
            } else {
                this.syncToken = globalSyncToken;
                this.voteCache.localStore.getItem('inbox_count', (function(error, count) {
                    this.setInboxLink(count || 0);
                    this.scheduleSync();
                }).bind(this));
            }
        }).bind(this));
    },
    syncCallback: function(response) {
        this.voteCache.localStore.setItem('inbox_count', response.inboxCount);
        this.setInboxLink(response.inboxCount);
        this.loadCookie();
        this.voteCache.updateFromLog(response.log, response.lastId, this.syncVotesOnCurrentView.bind(this));
        this.scheduleSync();
    },
    scheduleSync: function() {
        if (this.id && CONFIG.AUTO_SYNC.ENABLED) {
            this.syncTimeout = setTimeout(this.sync.bind(this), CONFIG.AUTO_SYNC.INTERVAL * 1000);
        }
    },
    restoreVotes: function() {
        this.voteCache.clear();
        p.api.get('user.sync', {
            lastId: 0
        }, this.syncCallback.bind(this), p.ServerAPI.SILENT);
    },
    setInboxLink: function(count) {
        this.inboxCount = count;
        var empty = (this.inboxCount == 0);
        document.title = (empty ? '' : '[' + count + '] ') + document.title.replace(/^\[\d+\]\s*/, '');
        $('#inboxLink').toggleClass('empty', empty);
        $('#inboxLink').attr('href', empty ? '/inbox/all' : '/inbox/unread');
        $('#inboxCount').text(this.inboxCount);
    },
    syncVotesOnCurrentView: function() {
        if (p.currentView && p.currentView.syncVotes) {
            p.currentView.syncVotes(this.voteCache.votes);
        }
    }
});
p.User.MARK = {
    '0': 'Schwuchtel',
    '1': 'Neuschwuchtel',
    '2': 'Altschwuchtel',
    '3': 'Admin',
    '4': 'Gesperrt',
    '5': 'Moderator',
    '6': 'Fliesentischbesitzer',
    '7': 'Lebende Legende',
    '8': 'pr0wichtler',
    '9': 'Edler Spender',
};
p.User.MARK_SFW_OVERRIDES = {
    '1': 'Neu',
    '2': 'Alt'
};
p.ServerAPI = p.Class.extend({
    path: '/',
    init: function(path) {
        this.path = path || '/';
    },
    post: function(endpoint, data, callback, errback) {
        this._ajax('POST', endpoint, data, callback, errback);
    },
    get: function(endpoint, data, callback, errback) {
        this._ajax('GET', endpoint, data, callback, errback);
    },
    _ajax: function(method, endpoint, data, callback, errback) {
        if (data instanceof HTMLFormElement || ((data instanceof $) && data.is('form'))) {
            data = $(data).serialize();
            if (data.length > 0 && p.user.id && method == 'POST') {
                data = data + '&_nonce=' + p.user.id.substr(0, 16);
            }
        } else if (p.user.id && method == 'POST') {
            if (typeof(data) == 'object') {
                data._nonce = p.user.id.substr(0, 16);
            } else if (typeof(data) == 'string') {
                data = data + '&_nonce=' + p.user.id.substr(0, 16);
            }
        }
        var url = this.path + endpoint.replace(/\./g, '/');
        if (this.onerror && errback !== p.ServerAPI.SILENT) {
            if (errback) {
                var onerror = this.onerror;
                var paramErrback = errback;
                errback = function(response) {
                    onerror(response);
                    paramErrback(response);
                }
            } else {
                errback = this.onerror;
            }
        }
        $.ajax({
            type: method,
            url: url,
            success: callback,
            error: errback,
            dataType: 'json',
            data: data
        });
    }
});
p.ServerAPI.SILENT = function() {};
p.Hotkeys = p.Class.extend({
    $indicator: null,
    init: function(element) {
        $(element).keydown(this.keydown.bind(this));
    },
    keydown: function(ev) {
        if (ev.altKey || ev.ctrlKey || ev.metaKey) {
            return;
        }
        if (ev.target.type == 'text' || ev.target.type == 'textarea' || ev.target.type == 'email' || ev.target.type == 'password' || ev.target.className == 'button') {
            if (ev.keyCode == p.KEY.ESC) {
                ev.target.blur();
            }
            return;
        }
        if (this.handleKey(ev.keyCode)) {
            ev.preventDefault();
            return false;
        }
        return true;
    },
    handleKey: function(code) {
        switch (code) {
            case p.KEY.LEFT_ARROW:
            case p.KEY.A:
                $('.stream-prev:visible').click();
                return true;
            case p.KEY.RIGHT_ARROW:
            case p.KEY.D:
                $('.stream-next:visible').click();
                return true;
            case p.KEY.ESC:
                $('.item-image:visible').click();
                return true;
            case p.KEY.K:
                $('#search-form-inline:visible input.q').focus();
                return true;
            case p.KEY.C:
                $('.comment:visible').focus();
                return true;
            case p.KEY.T:
                $('.add-tags-link:visible').click();
                return true;
            case p.KEY.F:
            case p.KEY.MULTIPLY:
                if ($('.vote-fav').click().length) {
                    this.showKeyIndicator($('.vote-fav.faved').length ? '*' : '+', true);
                }
                return true;
            case p.KEY.W:
            case p.KEY.PLUS:
            case p.KEY.ADD:
            case p.KEY.G:
                if (!$('.item-vote').hasClass('voted-up') && $('.item-vote .vote-up:visible').click().length) {
                    this.showKeyIndicator('+', true);
                }
                return true;
            case p.KEY.S:
            case p.KEY.MINUS:
            case p.KEY.SUBTRACT:
            case p.KEY.B:
                if (!$('.item-vote').hasClass('voted-down') && $('.item-vote .vote-down:visible').click().length) {
                    this.showKeyIndicator('-', true);
                }
                return true;
            case p.KEY.N:
                if (p.user.admin) {
                    var itemId = $('.tag-form input[name=itemId]').val();
                    if (itemId) {
                        this.showKeyIndicator('nsfw', false);
                        p.api.post('tags.add', {
                            tags: 'nsfw',
                            itemId: itemId
                        });
                    }
                }
                return true;
        }
        return false;
    },
    showKeyIndicator: function(text, isPict) {
        if (!this.$indicator) {
            this.$indicator = $('<div/>').attr('id', 'key-indicator');
            $('body').append(this.$indicator);
        }
        this.$indicator.stop().css('opacity', 1).toggleClass('pict', isPict).text(text).show().delay(500).fadeOut('fast');
    }
});
"use strict";
p.voteClass = function(vote) {
    return vote ? (vote > 0 ? ' voted-up' : ' voted-down') : '';
};
p.favClass = function(vote) {
    return vote == 2 ? ' faved' : '';
};
p.adjustVote = function(thing, vote, cached) {
    if (!thing) {
        return;
    }
    if (thing.vote < 0) {
        thing.down--;
    } else if (thing.vote > 0) {
        thing.up--;
    }
    if (vote > 0) {
        thing.up++;
    } else if (vote < 0) {
        thing.down++;
    }
    thing.vote = vote;
    if (cached && thing.id) {
        cached[thing.id] = vote;
    }
};
p.View = {};
p.View.Base = p.Class.extend({
    visible: false,
    needsRendering: false,
    aborted: false,
    compiledTemplate: null,
    template: null,
    children: [],
    data: {},
    dataReady: true,
    parentView: null,
    requiresLogin: false,
    loginUrl: 'overlay',
    $container: null,
    init: function(container, parent) {
        if (this.requiresLogin && !p.user.id) {
            this.aborted = true;
            if (this.loginUrl == 'overlay') {
                p.mainView.showLogin();
            } else {
                p.navigateToPushStack(this.loginUrl);
            }
            return;
        }
        this.$container = container ? $(container) : null;
        if (parent) {
            this.parentView = parent;
            this.parentView.children.push(this);
        }
        this.compiledTemplate = p._compiledTemplates[this.classId];
        if (!this.compiledTemplate) {
            this.compiledTemplate = p.compileTemplate(this.template);
            p._compiledTemplates[this.classId] = this.compiledTemplate;
        }
    },
    remove: function() {
        this.visible = false;
        if (!this.parentView) {
            return;
        }
        this.parentView.children.erase(this);
    },
    resize: function() {
        for (var i = 0; i < this.children.length; i++) {
            this.children[i].resize();
        }
    },
    load: function() {
        return true;
    },
    render: function() {
        if (!this.visible) {
            return;
        }
        if (!this.$container) {
            this.$container = $(this.compiledTemplate(this.data));
        } else {
            this.$container.html(this.compiledTemplate(this.data));
        }
        var anchors = this.$container.find('a[href^="#"]');
        if (p._hasPushState) {
            anchors.each(function() {
                this.href = '/' + $(this).attr('href').substr(1);
            });
        }
        anchors.fastclick(this.handleHashLink.bind(this));
        this.needsRendering = false;
    },
    handleHashLink: function(ev) {
        if (!p.isNormalClick(ev)) {
            return true;
        }
        var target = $(ev.currentTarget);
        if (target.hasClass('action')) {
            return false;
        }
        var mode = target.hasClass('silent') ? p.NAVIGATE.SILENT : p.NAVIGATE.DEFAULT;
        p.navigateTo(target.attr('href').substr(1), mode);
        return false;
    },
    renderLoading: function(selector) {
        var element = selector ? this.$container.find(selector) : this.$container;
        element.html(p.View.Base.LoadingAnimHTML);
    },
    show: function(params) {
        if (this.aborted) {
            return;
        }
        this.needsRendering = true;
        this.data.params = params || {};
        this.visible = true;
        var loaded = this.load();
        if (this.needsRendering) {
            if (loaded) {
                this.render();
            } else {
                this.renderLoading();
            }
        }
        for (var i = 0; i < this.children.length; i++) {
            this.children[i].show(params);
        }
    },
    hide: function() {
        this.visible = false;
        for (var i = 0; i < this.children.length; i++) {
            this.children[i].hide();
        }
    },
    focus: function(selector) {
        var f = this.$container.find(selector);
        setTimeout(function() {
            f.focus();
        }, 1);
    }
});
p.View.Base.LoadingAnimHTML = $('<div class="loader"><div></div></div>');
p._compiledTemplates = {};
p.View.Error404 = p.View.Base.extend({
    template: '<h2 class="main-message">ZOMFG, 404 &#175;\\_(&#12484;)_/&#175;</h2>',
    init: function(container, parent) {
        this.parent(container, parent);
        p.mainView.setTab(null);
    }
});
p.View.Overlay = p.View.Overlay || {};
p.View.Overlay.Login = p.View.Base.extend({
    name: 'overlay-login',
    template: '<div class="overlay-content divide-2-1"> <h2>Anmelden</h2> <?js if(loginFailed) {?> <?js if(ban && ban.banned) { ?> <p class="warn"> Dein Account ist gesperrt. <?js if(ban.till) {?> Die Sperrung wird am {ban.till.readableTime()} ({ban.till.relativeTime()}) aufgehoben. <?js } else { ?> Die Sperrung ist dauerhaft. <?js } ?> <?js if(ban.reason) {?> <strong>Grund:</strong> {{ban.reason}} <?js } ?> </p> <?js } else { ?> <p class="warn">Falscher Benutzername oder Passwort</p> <?js } ?> <?js } ?> <form> <div class="form-row"> <p></p> <label>Name oder E-Mail Adresse:</label> <input type="text" name="name" placeholder="Name" tabindex="201" value="{{name}}"/> </div> <div class="form-row"> <label>Passwort:</label> <input type="password" name="password" placeholder="Passwort" tabindex="202"/> </div> <div class="form-row"> <input type="submit" value="Anmelden" id="login-button" tabindex="203"/> </div> <p> <span class="link" id="reset-password-link">Passwort vergessen?</span> </p> </form> </div> <div class="overlay-content divide-2-2"> <h2>Neu Registrieren</h2> <p> Wenn du noch keinen Account hast, kannst du dir jetzt einen pr0mium Account erstellen. </p> <div class="call-to-action"> <a href="#pr0mium" class="confirm-button">Jetzt pr0mium User werden</a> </div> </div> ',
    data: {
        ban: null,
        name: '',
        loginFailed: false
    },
    render: function() {
        this.parent();
        this.$container.find('form').submit(this.submit.bind(this));
        if (!p.mobile) {
            this.focus('input[name=name]');
        }
        $('#reset-password-link').click(p.mainView.showResetPassword.bind(p.mainView));
    },
    submit: function(ev) {
        p.user.login(ev.target, this.posted.bind(this));
        this.data.name = $(ev.target).find('input[name=name]').val();
        this.renderLoading();
        return false;
    },
    posted: function(response) {
        if (response.success) {
            p.reload();
        } else {
            this.data.loginFailed = true;
            this.data.ban = response.ban;
            if (this.data.ban && this.data.ban.till) {
                this.data.ban.till = new Date(this.data.ban.till * 1000);
            }
            this.render();
        }
    }
});
p.View.Overlay = p.View.Overlay || {};
p.View.Overlay.ResetPassword = p.View.Base.extend({
    name: 'overlay-reset-password',
    template: '<div class="overlay-content"> <h2>Passwort zurücksetzen</h2> </div> <div class="overlay-content"> <?js if(resetSuccess) { ?> <div class="notice"> Die E-Mail mit dem Link zum Zurücksetzen wurde versendet. </div> <?js } else { ?> <form method="post"> <div class="form-row"> <input type="email" name="email" placeholder="E-Mail Adresse" value=""/> </div> <?js if(resetFailed) {?> <p class="warn">E-Mail Adresse nicht bekannt, oder der Account ist gesperrt</p> <?js } ?> <div class="form-row"> <input type="submit" value="Abschicken"/> </div> </form> <?js } ?> </div> ',
    data: {
        resetFailed: false,
        resetSuccess: false
    },
    render: function() {
        this.parent();
        this.$container.find('form').submit(this.submit.bind(this));
        this.focus('input[name=email]');
    },
    submit: function(ev) {
        p.api.post('user.sendpasswordresetmail', ev.currentTarget, this.posted.bind(this));
        this.renderLoading();
        return false;
    },
    posted: function(response) {
        this.data.resetFailed = !response.success;
        this.data.resetSuccess = response.success;
        this.render();
    }
});
p.View.Overlay = p.View.Overlay || {};
p.View.Overlay.Error = p.View.Base.extend({
    name: 'overlay-error',
    template: '<div class="overlay-content"> <h2>ZOMG, Fehler!</h2> </div> <div class="overlay-content"> <?js if(error) {?> <h2 class="warn">{error.code} &ndash; {{error.msg}}</h2> <?js if(error.error == \'limitReached\' ) { ?> <p>Was immer du getan hast, es war zu viel. Probier\'s später nochmal.</p> <?js } ?> <?js } else {?> <h2 class="warn">Irgendwas Doofes ist passiert. Probier\'s später nochmal :/</h2> <?js } ?> </div> ',
    data: {
        error: null
    },
    init: function(container, parent, error) {
        this.data.error = error;
        this.parent(container, parent);
    },
    show: function(params) {
        if (params) {
            this.data.error = params;
        }
        this.parent();
    }
});
p.View.Layout = p.View.Base.extend({
    template: '<?js if(p.user.showAds) {?> <div class="side-wide-skyscraper gpt fixed-sidebar-left" id="gpt-skyscraper-left" data-size="160x600" data-slot="pr0gramm-skyscraper"> </div> <div class="side-wide-skyscraper gpt fixed-sidebar-right" id="gpt-skyscraper-right" data-size="160x600" data-slot="pr0gramm-skyscraper-widescreen"> </div> <?js } ?> <div id="page"> <div id="head"> <div id="head-content"> <div class="user-info guest-only"> <span class="head-link" id="login-link">anmelden</span> </div> <div class="user-info user-only"> <a href="#user/{user.name}" id="user-profile-name" class="head-link">{user.name}</a> <a href="#user/{user.name}" id="user-profile-icon" class="head-link pict">~</a> <a href="#inbox/unread" id="inboxLink" class="empty head-link" title="Nachrichten"> <span class="pict">m</span> <span id="inboxCount">0</span> </a> <a href="#settings/site" class="head-link pict" id="settings-link" title="Einstellungen">#</a> </div> <a href="#" id="pr0gramm-logo-link"> <img id="pr0gramm-logo" src="/media/pr0gramm.png"/> </a> <div id="head-menu"> <a id="tab-new" class="head-tab" href="#new">neu</a> <a id="tab-top" class="head-tab" href="#top">beliebt</a> <?js if(p.user.paid) {?> <a id="tab-stalk" class="head-tab" href="#stalk">stelz</a> <?js } else { ?> <a id="tab-stalk" class="head-tab" href="#pr0mium">stelz</a> <?js } ?> <?js if(user.admin) {?> <a id="tab-admin" class="head-tab" href="/backend/admin/">admin</a> <?js } ?> <span id="filter-link" class="user-only head-link"> <span id="filter-link-flag" class="pict">f</span> <span id="filter-link-name">{currentFilterName}</span> </span> <span class="guest-only" id="search-form-spacer"></span> <form action="" id="search-form-inline" class="search-form"> <input type="text" name="q" class="q" value="" title="Suche [k]"/> <input type="submit" id="search-submit-inline" class="pict" title="Suche [k]" value="q"/> </form> <span id="search-button" class="head-link pict">q</span> <a href="#upload" class="head-link pict user-only" id="upload-link" title="Bilder hochladen">u</a> </div> <div id="filter-menu"> <span class="filter-setting" data-flag="{CONFIG.SFW_FLAG.SFW.flag}"> <div class="filter-name"> <span class="filter-check"></span> sfw </div> <div class="filter-desc"> <em>Safe for work</em> </div> </span> <span class="filter-setting" data-flag="{CONFIG.SFW_FLAG.NSFW.flag}"> <div class="filter-name"> <span class="filter-check"></span> nsfw </div> <div class="filter-desc"> Beinhaltet Titten, Pornos und leicht offensiven Kram. </div> </span> <span class="filter-setting" data-flag="{CONFIG.SFW_FLAG.NSFL.flag}"> <div class="filter-name"> <span class="filter-check"></span> nsfl </div> <div class="filter-desc"> Alles. Gewalt, zerplatzte Menschen, ekligen Scheiß. </div> </span> <span id="filter-save">Speichern</span> </div> <form action="" id="search-form-bar" class="search-form"> <input type="text" name="q" class="q" value="" title="Suche [k]"/> <input type="submit" class="search-submit" value="Suchen"/> </form> </div> </div> <div id="main-view"></div> </div> <div id="overlay"> <div id="overlay-box"></div> </div> <div id="footer-links" class="fixed-sidebar-left"> <div> <a href="#faq">FAQ</a> <a href="#contact">Kontakt</a> </div> <div> <a href="http://blezter.com/" target="_blank"><span class="small">hosted by</span> BlezTer.com</a> </div> </div> ',
    widthClass: null,
    pagePadding: 0,
    currentAdPosision: 52,
    thumbsPerRow: -1,
    data: {
        currentFilterName: 'sfw'
    },
    init: function(container, parent) {
        this.parent(container, parent);
        this.data.user = p.user;
        p.onsetview = this.onSetView.bind(this);
        p.api.onerror = this.onError.bind(this);
        if (p.mobile) {
            $.fx.off = true;
        }
        this.resize();
        $(window).resize(this.resize.bind(this)).scroll(this.scroll.bind(this));
    },
    resize: function() {
        var L = CONFIG.LAYOUT;
        var windowWidth = $(window).width();
        var forceSetCSS = false;
        var resizedWidthClass = this.widthClass;
        for (var NAME in L.WIDTH_CLASS) {
            var C = L.WIDTH_CLASS[NAME];
            if (windowWidth < C.MAX_WIDTH) {
                resizedWidthClass = C;
            }
        }
        if (!p.user.showAds && resizedWidthClass != L.WIDTH_CLASS.NO_SIDEBAR) {
            resizedWidthClass = L.WIDTH_CLASS_FORCE_NO_SIDEBAR;
        }
        var availableWidth = windowWidth - resizedWidthClass.SIDEBARS_WIDTH - resizedWidthClass.MARGIN;
        var resizedThumbsPerRow = ((availableWidth + L.THUMB.PADDING) / (L.THUMB.WIDTH + L.THUMB.PADDING) | 0).limit(L.THUMBS_PER_ROW.MIN, L.THUMBS_PER_ROW.MAX);
        if (this.thumbsPerRow === resizedThumbsPerRow && this.widthClass === resizedWidthClass) {
            return;
        }
        this.widthClass = resizedWidthClass;
        this.setPageCSS(resizedThumbsPerRow);
        if (p.currentView) {
            p.currentView.resize();
        }
        p.ads.fill(this.$container.find('.gpt:visible'));
        this.scroll();
    },
    scroll: function() {
        var L = CONFIG.LAYOUT;
        if (this.widthClass === L.WIDTH_CLASS.NO_SIDEBAR || this.widthClass === L.WIDTH_CLASS_FORCE_NO_SIDEBAR) {
            return;
        }
        var scroll = $(document).scrollTop();
        var windowHeight = Math.max(window.innerHeight, 800);
        var thumbHeight = L.THUMB.HEIGHT + L.THUMB.PADDING;
        var np = Math.ceil((Math.floor((scroll + windowHeight) / (windowHeight * 2)) * windowHeight * 2) / thumbHeight) * thumbHeight + 52;
        if (np !== this.currentAdPosision) {
            this.currentAdPosision = np;
            $('.side-wide-skyscraper').css('top', this.currentAdPosision);
        }
    },
    setPageCSS: function(thumbsPerRow) {
        var L = CONFIG.LAYOUT;
        this.thumbsPerRow = thumbsPerRow;
        var pageWidth = this.thumbsPerRow * (L.THUMB.WIDTH + L.THUMB.PADDING) - L.THUMB.PADDING + this.widthClass.SIDEBARS_WIDTH;
        $('body').removeClass().addClass(this.widthClass.CLASS_NAME);
        $('#head').css('width', pageWidth);
        $('#page').css('width', pageWidth).toggleClass('desktop', !p.mobile).toggleClass('lt7', thumbsPerRow < 7).toggleClass('lt6', thumbsPerRow < 6).toggleClass('lt5', thumbsPerRow < 5).toggleClass('lt4', thumbsPerRow < 4).toggleClass('noAds', !p.user.showAds);
        $('meta[name=viewport]').attr('content', 'minimal-ui, width=' + pageWidth);
        var sidebarOffset = (this.widthClass === L.WIDTH_CLASS.NO_SIDEBAR || this.widthClass === L.WIDTH_CLASS_FORCE_NO_SIDEBAR) ? 0 : -(pageWidth - 160);
        $('.fixed-sidebar-left').css('left', sidebarOffset);
        $('.fixed-sidebar-right').css('right', sidebarOffset);
        $('#search-form-bar').hide();
    },
    onSetView: function() {
        this.closeOverlay();
        $('#filter-menu').hide();
    },
    onError: function(response) {
        if (response.responseJSON && response.responseJSON.code == 404) {
            return p.setView(p.View.Error404);
        } else {
            if (response.responseJSON && response.responseJSON.code == 403 && response.responseJSON.error == 'forbidden') {
                p.user.softLogout();
                this.setUserStatus(false);
                return false;
            }
            return this.showOverlay(p.View.Overlay.Error, response.responseJSON);
        }
    },
    setUserStatus: function(isUser) {
        $('#page').toggleClass('status-user', isUser).toggleClass('status-guest', !isUser);
    },
    search: function(q) {
        var m = null;
        if (m = q.match(/(\w+):(likes|uploads)/)) {
            p.navigateTo('user/' + m[1] + '/' + m[2]);
        } else {
            var tab = $('#tab-top').hasClass('active') ? 'top' : 'new';
            var path = q ? ('/' + encodeURIComponent(q)) : '';
            path = path.match(/^\/\d+$/) ? path.replace('/', '/+') : path;
            p.navigateTo(tab + path);
        }
        $('#search-form-bar').hide();
    },
    show: function(params) {
        this.data.currentFilterName = p.user.flagsName;
        this.parent(params);
        this.setPageCSS(this.thumbsPerRow);
        this.setUserStatus(!!p.user.id);
        $('#login-link').click(this.showLogin.bind(this));
        this.overlay = $('#overlay');
        this.overlay.click(this.hideOverlay.bind(this));
        $('#filter-link').fastclick(function() {
            $('.filter-setting').each(function() {
                var el = $(this);
                el.toggleClass('active', !!(p.user.flags & parseInt(el.data('flag'))));
            });
            $('#filter-menu').fadeToggle(100);
            return false;
        });
        $('.filter-setting').fastclick(function(ev) {
            $(ev.currentTarget).toggleClass('active').blur();
            return false;
        });
        $('#filter-save').fastclick(function() {
            var flags = 0;
            $('.filter-setting.active').each(function() {
                flags += parseInt($(this).data('flag'));
            });
            p.user.setFlags(flags);
            p.reload();
            $('#filter-menu').fadeOut(100);
            return false;
        });
        var that = this;
        $('form.search-form').submit(function(ev) {
            that.search($(ev.target).find('input.q').val());
            ev.preventDefault();
            return false;
        });
        $('#search-button').fastclick(function() {
            var searchBar = $('#search-form-bar');
            if (searchBar.is(':visible')) {
                searchBar.find('input.q').blur();
                searchBar.hide();
            } else {
                searchBar.show();
                searchBar.find('input.q').focus();
            }
        });
        p.ads.fill(this.$container.find('.gpt:visible'));
    },
    setTab: function(tab) {
        if (tab == 'new') {
            $('#tab-new').addClass('active');
            $('#tab-top').removeClass('active');
            $('input.q').attr('placeholder', 'Alles durchsuchen');
            $('#search-form-bar .search-submit').val('Alles durchsuchen');
        } else if (tab == 'top') {
            $('#tab-top').addClass('active');
            $('#tab-new').removeClass('active');
            $('input.q').attr('placeholder', 'Beliebt durchsuchen');
            $('#search-form-bar .search-submit').val('Beliebt durchsuchen');
        } else {
            $('#tab-new, #tab-top').removeClass('active');
        }
        $('.head-tab').removeClass('active');
        $('#tab-' + tab).addClass('active');
        var qs = tab == 'new' ? 'Alles durchsuchen' : 'Beliebt durchsuchen';
        $('input.q').attr('placeholder', qs);
        $('#search-form-bar .search-submit').val(qs);
    },
    requireLogin: function() {
        if (!p.user.id) {
            this.showOverlay(p.View.Overlay.Login);
            return false;
        }
        return true;
    },
    showResetPassword: function() {
        return this.showOverlay(p.View.Overlay.ResetPassword);
    },
    showLogin: function() {
        return this.showOverlay(p.View.Overlay.Login);
    },
    showOverlay: function(overlayClass, param) {
        if (this.overlayView) {
            this.overlayView.remove();
            this.overlayView = null;
        }
        var overlayBox = $('#overlay-box');
        overlayBox.attr('class', overlayClass.prototype.name || 'overlay-generic');
        this.overlayView = new(overlayClass)(overlayBox, this, param);
        this.overlayView.show();
        if (p.mobile) {
            $(document).scrollTop(0);
            this.overlay.addClass('mobile');
            this.overlay.css('height', $('#main-view').height());
        }
        this.overlay.fadeIn('fast');
        return false;
    },
    hideOverlay: function(ev) {
        if (ev.target != this.overlay[0]) {
            return;
        }
        return this.closeOverlay();
    },
    closeOverlay: function() {
        if (!this.overlayView) {
            return false;
        }
        $('#page').removeClass('in-background');
        this.overlay.fadeOut('fast');
        this.overlayView.remove();
        this.overlayView = null;
        return false;
    }
});
"use strict";
p.Stream = p.Class.extend({
    reached: {
        start: false,
        end: false
    },
    _oldestId: Number.POSITIVE_INFINITY,
    _newestId: 0,
    items: {},
    init: function(options) {
        this.options = options || {};
    },
    loadInfo: function(id, callback) {
        var item = this.items[id];
        if (!item) {
            return;
        }
        if (item.infoTime) {
            if (callback) {
                callback(item);
            }
            return;
        }
        if (item.loadQueue) {
            if (callback) {
                item.loadQueue.push(callback);
            }
            return;
        }
        item.loadQueue = callback ? [callback] : [];
        var that = this;
        p.api.get('items.info', {
            itemId: id
        }, function(response) {
            that._processInfo(item, response);
        });
    },
    getLoadedItems: function() {
        var itemsArray = [];
        for (var id in this.items) {
            itemsArray.push(this.items[id]);
        }
        if (this.options.promoted) {
            itemsArray.sort(p.Stream.sortByPromoted);
        } else {
            itemsArray.sort(p.Stream.sortById);
        }
        return itemsArray;
    },
    _processInfo: function(item, response) {
        if (!item.infoTime || item.infoTime < response.ts) {
            item.comments = response.comments;
            item.tags = response.tags;
            item.infoTime = response.ts;
        }
        for (var i = 0; i < item.loadQueue.length; i++) {
            item.loadQueue[i](item);
        }
        item.loadQueue = null;
    },
    loadNewest: function(callback) {
        this._load({}, callback);
    },
    loadAround: function(id, callback) {
        this._load({
            id: id
        }, callback);
    },
    loadNewer: function(callback) {
        var id = this._newestId;
        if (id >= this._newestId && this.reached.start) {
            callback(null, p.Stream.POSITION.NONE);
            return;
        }
        this._load({
            newer: id
        }, callback);
    },
    loadOlder: function(callback) {
        var id = this._oldestId;
        if (id <= this._oldestId && this.reached.end) {
            callback(null, p.Stream.POSITION.NONE);
            return;
        }
        this._load({
            older: id
        }, callback);
    },
    syncVotes: function(votes) {
        var itemVotes = votes.items;
        for (var id in this.items) {
            if (itemVotes[id]) {
                this.items[id].vote = itemVotes[id];
            }
        }
    },
    _load: function(options, callback) {
        var stream = this;
        options.flags = p.user.flags;
        p.api.get('items.get', p.merge(options, this.options), function(data) {
            var position = stream._processResponse(data);
            callback(data.items, position, data.error);
        });
    },
    _processResponse: function(data) {
        if (!data.items || !data.items.length) {
            return null;
        }
        this.reached.start = data.atStart || this.reached.start;
        this.reached.end = data.atEnd || this.reached.end;
        var oldestId, newestId;
        if (this.options.promoted) {
            data.items.sort(p.Stream.sortByPromoted);
            oldestId = data.items[data.items.length - 1].promoted;
            newestId = data.items[0].promoted;
        } else {
            data.items.sort(p.Stream.sortById);
            oldestId = data.items[data.items.length - 1].id;
            newestId = data.items[0].id;
        }
        var position = (oldestId < this._oldestId) ? p.Stream.POSITION.APPEND : p.Stream.POSITION.PREPEND;
        this._oldestId = Math.min(this._oldestId, oldestId);
        this._newestId = Math.max(this._newestId, newestId);
        var prev = null;
        var itemVotes = p.user.voteCache.votes.items;
        for (var i = 0; i < data.items.length; i++) {
            var item = data.items[i];
            item.thumb = CONFIG.PATH.THUMBS + item.thumb;
            item.image = CONFIG.PATH.IMAGES + item.image;
            item.fullsize = item.fullsize ? CONFIG.PATH.FULLSIZE + item.fullsize : null;
            item.vote = itemVotes[item.id] || 0;
            this.items[item.id] = item;
        }
        return position;
    }
});
p.Stream.POSITION = {
    NONE: 0,
    APPEND: 1,
    PREPEND: 2
};
p.Stream.FLAG_NAME = {
    1: 'SFW',
    2: 'NSFW',
    4: 'NSFL'
};
p.Stream.sortById = function(a, b) {
    return (b.id - a.id);
};
p.Stream.sortByPromoted = function(a, b) {
    return (b.promoted - a.promoted);
};
(function($) {
    var rgba = function(r, g, b, a) {
        return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    };
    $.fn.highlight = function(r, g, b, a, wait, cb) {
        var that = this;
        if (that.data('_highlightTimeout')) {
            return;
        }
        r = r || 255;
        g = g || 255;
        b = b || 255;
        a = a || 1;
        that.css('background-color', rgba(r, g, b, a));
        var step = function() {
            a -= 0.05;
            if (a <= 0) {
                that.data('_highlightTimeout', null);
                that.css('background-color', 'transparent');
                if (cb) {
                    cb(that);
                }
            } else {
                that.css('background-color', rgba(r, g, b, a));
                that.data('_highlightTimeout', setTimeout(step, 50));
            }
        }
        that.data('_highlightTimeout', setTimeout(step, wait || 200));
    };
})(jQuery);
p.View.Overlay = p.View.Overlay || {};
p.View.Overlay.DeleteComment = p.View.Base.extend({
    name: 'overlay-delete-comment',
    template: '<div class="overlay-content"> <h2>Kommentar löschen</h2> </div> <div class="overlay-content"> <form id="comment-delete-form"> <div class="form-row"> <input type="text" class="wide" name="reason" placeholder="Grund"/> </div> <div class="form-row"> <input type="hidden" name="id" value="{commentId}"/> <input type="submit" value="Durch [gelöscht] ersetzen" id="comment-delete-soft"/> <input type="submit" value="Hart Löschen (inkl. aller antworten)" id="comment-delete-hard"/> </div> </form> </div> ',
    data: {
        commentId: 0
    },
    init: function(container, parent, $div) {
        var $comment = $div.parent();
        this.data.commentId = $comment.find('.permalink').attr('href').split(':comment')[1];
        this.parent(container, parent);
    },
    render: function() {
        this.parent();
        this.$container.find('form').submit(this.submit.bind(this));
        this.focus('input[name=reason]');
    },
    submit: function(ev) {
        var $button = this.$container.find('input[type=submit]:focus');
        var action = ($button.attr('id') == 'comment-delete-hard') ? 'comments.delete' : 'comments.softDelete';
        p.api.post(action, ev.target, this.posted.bind(this));
        this.renderLoading();
        return false;
    },
    posted: function(response) {
        p.mainView.closeOverlay();
    }
});
p.View.Stream = p.View.Stream || {};
p.View.Stream.Comments = p.View.Base.extend({
    template: ' <div class="comments-head"> <span class="pict">c</span> {"Kommentar".inflect(commentCount)} </div> <?js if(p.user.showAds) {?> <div class="comments-large-rectangle gpt" id="gpt-rectangle-comments" data-size="336x280" data-slot="pr0gramm-rectangle"> </div> <?js } ?> <form class="comment-form" method="post"> <textarea class="comment" name="comment" required placeholder="Kommentar schreiben…"></textarea> <input type="hidden" name="parentId" value="0"/> <input type="hidden" name="itemId" value="{params.id}"/> <div> <input type="submit" value="Abschicken"/> <input type="button" value="Abbrechen" class="cancel"/> </div> </form> <form class="comment-edit-form" method="post"> <textarea class="comment" required name="comment"></textarea> <input type="hidden" name="commentId" value="0"/> <div> <input type="submit" value="Abschicken"/> <input type="button" value="Abbrechen" class="cancel"/> </div> </form> <div class="comments"> <?js var recurseComments = function( comments, level ) { ?> <div class="comment-box"> <?js for( var i = 0; i < comments.length; i++ ) { var c = comments[i]; ?> <div class="comment{p.voteClass(c.vote)}<?js if(c.name == op){?> comment-op<?js}?>" id="comment{c.id}"> <div class="comment-vote"> <span class="pict vote-up">+</span> <span class="pict vote-down">-</span> </div> <div class="comment-content"> {c.content.format()} </div> <div class="comment-foot"> <a href="#user/{c.name}" class="user um{c.mark}">{c.name}</a> <span class="score" title="{c.up} up, {c.down} down">{"Punkt".inflect(c.score)}</span> <a href="#{tab}/{itemId}:comment{c.id}" class="time permalink" title="{c.createdReadable}">{c.createdRelative}</a> <?js if( level < CONFIG.COMMENTS_MAX_LEVELS && !linearComments ) {?> <a href="#{tab}/{itemId}:comment{c.id}" class="comment-reply-link action"><span class="pict">r</span> antworten</a> <?js } ?> <?js if( /*c.user == p.user.name ||*/ p.user.admin ) {?> [ <span class="comment-delete action">del</span> / <a href="#{tab}/{itemId}:comment{c.id}" class="comment-edit-link action">edit</a> ] <?js } ?> </div> </div> <?js if( c.children.length ) { recurseComments(c.children, level+1); } ?> <?js } ?> </div> <?js }; ?> <?js recurseComments(comments, 1); ?> </div> ',
    init: function(container, parent) {
        this.stream = parent.stream;
        this.parent(container, parent);
    },
    load: function() {
        this.stream.loadInfo(this.data.params.id, this.loaded.bind(this));
        return false;
    },
    syncVotes: function(votes) {
        if (!this.data.comments) {
            return;
        }
        var commentVotes = votes.comments;
        for (var id in this.commentMap) {
            var newVote = commentVotes[id];
            var prevVote = this.commentMap[id].vote;
            if (newVote != prevVote) {
                var node = $('#comment' + id);
                this.commentMap[id].vote = newVote || 0;
                node.removeClass('voted-up voted-down');
                if (newVote) {
                    node.addClass(newVote === 1 ? 'voted-up' : 'voted-down');
                }
            }
        }
    },
    loaded: function(item) {
        item.id = (item.id || this.data.itemId);
        this.data.linearComments = (item.id <= CONFIG.LAST_LINEAR_COMMENTS_ITEM);
        if (item.commentId) {
            p.user.voteCache.votes.comments[item.commentId] = 1;
            this.data.params.comment = 'comment' + item.commentId;
        }
        this.data.comments = this.prepareComments(item.comments);
        this.stream.items[this.data.params.id].comments = item.comments;
        this.data.commentCount = item.comments.length;
        this.data.tab = this.parentView.parentView.tab || 'new';
        this.data.itemId = item.id;
        this.data.op = item.user;
        this.render();
    },
    prepareComments: function(comments) {
        if (this.data.linearComments) {
            comments.sort(p.View.Stream.Comments.SortTime);
        } else {
            comments.sort(p.View.Stream.Comments.SortConfidenceTime);
        }
        var commentMap = {
            '0': {
                children: []
            }
        };
        var commentVotes = p.user.voteCache.votes.comments;
        for (var i = 0; i < comments.length; i++) {
            var comment = comments[i];
            var created = new Date(comment.created * 1000);
            comment.children = [];
            comment.vote = commentVotes[comment.id] || 0;
            comment.createdRelative = created.relativeTime(true);
            comment.createdReadable = created.readableTime();
            comment.score = comment.up - comment.down;
            commentMap[comment.id] = comment;
        }
        for (var i = 0; i < comments.length; i++) {
            var comment = comments[i];
            var parent = commentMap[comment.parent];
            if (parent) {
                parent.children.push(comment);
            }
        }
        this.commentMap = commentMap;
        return commentMap['0'].children;
    },
    render: function() {
        this.parent();
        this.$commentForm = this.$container.find('.comment-form');
        this.$commentForm.submit(this.submitComment.bind(this));
        this.$commentForm.find('input.cancel').hide().click(this.cancelReply.bind(this));
        this.$commentEditForm = this.$container.find('.comment-edit-form');
        this.$commentEditForm.submit(this.submitCommentEdit.bind(this));
        this.$commentEditForm.find('input.cancel').click(this.cancelEdit.bind(this));
        this.$container.find('.comment-reply-link').fastclick(this.showReplyForm.bind(this));
        this.$container.find('.comment-edit-link').fastclick(this.showEditForm.bind(this));
        var that = this;
        this.$container.find('.vote-up').fastclick(function(ev) {
            return that.vote(ev, 1);
        });
        this.$container.find('.vote-down').fastclick(function(ev) {
            return that.vote(ev, -1);
        });
        this.$container.find('.comment-delete').fastclick(function() {
            p.mainView.showOverlay(p.View.Overlay.DeleteComment, $(this));
        });
        if (this.data.params.comment) {
            if (this.parentView.heightKnown) {
                this.focusComment(that.data.params.comment);
            }
            this.data.params.comment = null;
        }
        p.ads.fill(this.$container.find('.gpt:visible'));
    },
    focusComment: function(comment) {
        var target = this.$container.find('#' + comment);
        if (target.length) {
            var jumpPos = target.offset().top - CONFIG.HEADER_HEIGHT - 80;
            target.highlight(180, 180, 180, 1);
            $(document).scrollTop(jumpPos);
        }
    },
    vote: function(ev, vote) {
        if (!p.mainView.requireLogin()) {
            return false;
        }
        var $comment = $(ev.currentTarget).parent().parent();
        var commentId = $comment.find('.permalink').attr('href').split(':comment')[1];
        var absoluteVote = vote;
        if (($comment.hasClass('voted-up') && vote === 1) || ($comment.hasClass('voted-down') && vote === -1)) {
            absoluteVote = 0;
            $comment.removeClass('voted-up voted-down');
        } else {
            $comment.removeClass('voted-up voted-down');
            $comment.addClass(vote === 1 ? 'voted-up' : 'voted-down');
        }
        var c = this.commentMap[commentId];
        p.adjustVote(c, absoluteVote, p.user.voteCache.votes.comments);
        p.api.post('comments.vote', {
            id: commentId,
            vote: absoluteVote
        });
        c.score = (c.up - c.down);
        var score = $comment.find('.score');
        score.text("Punkt".inflect(c.score));
        return false;
    },
    showReplyForm: function(ev) {
        if (!p.mainView.requireLogin()) {
            return false;
        }
        var $foot = $(ev.currentTarget.parentNode);
        if ($foot.has('.comment-form').length) {
            return;
        }
        var parentId = ev.currentTarget.href.split(':comment')[1];
        var $form = this.$commentForm.clone(true);
        $form.find('input.cancel').show();
        $form.find('input[name=parentId]').val(parentId);
        $foot.append($form);
        $form.find('textarea').val('').addClass('reply').focus();
        return false;
    },
    cancelReply: function(ev) {
        $(ev.currentTarget).parents('form').remove();
    },
    submitComment: function(ev) {
        if (!p.mainView.requireLogin()) {
            return false;
        }
        var $form = $(ev.currentTarget);
        var data = $form.serialize();
        $form.find('input,textarea,button,select').attr('disabled', 'disabled');
        p.api.post('comments.post', data, this.loaded.bind(this), function() {
            $form.find('input,textarea,button,select').removeAttr('disabled');
        });
        return false;
    },
    showEditForm: function(ev) {
        var id = ev.currentTarget.href.split(':comment')[1];
        var $comment = $('#comment' + id);
        var $content = $('#comment' + id + ' .comment-content');
        if ($comment.has('.comment-edit-form').length) {
            return;
        }
        var $form = this.$commentEditForm.clone(true);
        $form.find('textarea').val(this.commentMap[id].content);
        $form.find('input[name=commentId]').val(id);
        $form.show();
        $content.after($form);
        $content.hide();
        $form.find('textarea').focus();
        return false;
    },
    cancelEdit: function(ev) {
        var id = $(ev.currentTarget).parents('form').find('input[name=commentId]').val();
        var $comment = $('#comment' + id);
        $comment.find('.comment-edit-form').remove();
        $comment.find('.comment-content').show();
    },
    submitCommentEdit: function(ev) {
        var $form = $(ev.currentTarget);
        var data = $form.serialize();
        $form.find('input,textarea,button,select').attr('disabled', 'disabled');
        p.api.post('comments.edit', data, this.loaded.bind(this), function() {
            $form.find('input,textarea,button,select').removeAttr('disabled');
        });
        return false;
    }
});
p.View.Stream.Comments.SortConfidenceTime = function(a, b) {
    return (b.confidence === a.confidence ? a.created - b.created : b.confidence - a.confidence);
};
p.View.Stream.Comments.SortTime = function(a, b) {
    return (a.created - b.created);
};
p.View.Overlay = p.View.Overlay || {};
p.View.Overlay.EditTags = p.View.Base.extend({
    name: 'overlay-edit-tags',
    template: '<div class="overlay-content"> <h2>Tags Bearbeiten</h2> </div> <div class="overlay-content"> <form id="edit-tag-form"> <?js for( var i = 0; i < tags.length; i++ ) { var t = tags[i]; ?> <div class="form-row"> <label> <input class="tag-select" type="checkbox" name="tags[]" value="{t.id}"/> {{t.tag}} ~ <a href="/user/{t.user}">{t.user}</a>, score [<?js print(t.up-t.down);?>]: <?js for( var j = 0; j < t.votes.length; j++ ) { var v = t.votes[j]; ?> <?js print(v.vote > 0 ? \'+\' : \'-\'); ?><a href="/user/{v.user}">{v.user}</a>&nbsp; <?js } ?> </label> </div> <?js } ?> <p> <span class="action" id="edit-tags-invert">Auswahl invertieren<span/> </p> <div class="form-row"> <input type="hidden" name="itemId" value="{itemId}"/> <input type="checkbox" name="banUsers" id="delete-ban-user"/> <label class="checkbox-label" for="delete-ban-user">Benutzer Sperren für</label> <input type="text" name="days" class="number" value="1"/> Tage <span class="field-details">(Permaban (0) hier nicht erlaubt; bestehende Bans werden nicht überschrieben)</span> </div> <div class="form-row"> <input type="submit" value="Ausgewählte Tags Löschen"/> </div> </form> </div> ',
    data: {
        itemId: 0
    },
    init: function(container, parent, $el) {
        this.data.itemId = $el.data('id');
        this.parent(container, parent);
    },
    load: function() {
        p.api.get('tags.details', {
            itemId: this.data.itemId
        }, this.loaded.bind(this));
        return false;
    },
    loaded: function(response) {
        response.tags.sort(p.View.Stream.Tags.SortConfidence);
        this.data.tags = response.tags;
        this.render();
    },
    render: function() {
        this.parent();
        this.$container.find('#edit-tags-invert').fastclick(this.invertSelection.bind(this));
        this.$container.find('#edit-tag-form').submit(this.submit.bind(this));
    },
    invertSelection: function() {
        this.$container.find('input.tag-select').each(function() {
            this.checked = !this.checked;
        });
    },
    submit: function(ev) {
        p.api.post('tags.delete', ev.target, this.posted.bind(this));
        this.renderLoading();
        return false;
    },
    posted: function(response) {
        p.mainView.closeOverlay();
    }
});
p.View.Overlay.EditTags.SortConfidence = function(a, b) {
    return b.confidence - a.confidence;
};
p.View.Stream = p.View.Stream || {};
p.View.Stream.Tags = p.View.Base.extend({
    template: '<div class="tags"> <?js for( var i = 0; i < tags.length; i++ ) { var t = tags[i]; ?> <span id="tag-{t.id}" class="tag{p.voteClass(t.vote)} {t.qualityClass}"> <a href="#{tab}/{{t.link}}" class="tag-link">{{t.tag}}</a> <span href="" class="vote-up">+</span> <span href="" class="vote-down">&#8722;</span> </span> <?js } ?> <?js if( p.user.admin ) { ?> [<span class="action" id="item-edit-tags" data-id="{params.id}">edit</span>] <?js } ?> <?js if( badTagsCount > 0 ) {?> <span class="action tags-expand">{"weiter".inflect(badTagsCount,"e","en")} anzeigen&hellip;</span> <?js } ?> <a href="" class="add-tags-link action">Tags&nbsp;hinzufügen&hellip;</a> </div> <form class="tag-form" method="post"> <input type="text" class="item-tagsinput" name="tags"/> <input type="hidden" name="itemId" value="{params.id}"/> <input type="submit" value="Tags speichern"/> <input type="button" value="Abbrechen" class="cancel"/> </form>',
    addedTagInput: false,
    init: function(container, parent) {
        this.stream = parent.stream;
        this.parent(container, parent);
        this.data.tab = (this.parentView.parentView.tab == 'top') ? 'top' : 'new';
    },
    syncVotes: function(votes) {
        if (!this.data.tags) {
            return;
        }
        var tagVotes = votes.tags;
        for (var i = 0; i < this.data.tags.length; i++) {
            var tag = this.data.tags[i];
            var newVote = tagVotes[tag.id];
            var oldVote = tag.vote;
            if (newVote != oldVote) {
                tag.vote = newVote || 0;
                var node = $('#tag-' + tag.id);
                node.removeClass('voted-up voted-down');
                if (newVote) {
                    node.addClass(newVote === 1 ? 'voted-up' : 'voted-down');
                }
            }
        }
    },
    load: function() {
        this.stream.loadInfo(this.data.params.id, this.loaded.bind(this));
        return false;
    },
    loaded: function(item) {
        this.data.goodTagsCount = 0;
        this.data.badTagsCount = 0;
        if (item.tagIds && item.tagIds.length) {
            for (var i = 0; i < item.tagIds.length; i++) {
                p.user.voteCache.votes.tags[item.tagIds[i]] = 1;
            }
        }
        item.tags.sort(p.View.Stream.Tags.SortConfidence);
        var tagVotes = p.user.voteCache.votes.tags;
        var goodTagsCount = 0,
            badTagsCount = 0;
        for (var i = 0; i < item.tags.length; i++) {
            var tag = item.tags[i];
            var linkPrefix = tag.tag.match(/^\d+$/) ? '+' : '';
            tag.link = linkPrefix + encodeURIComponent(tag.tag);
            tag.vote = tagVotes[tag.id] || 0;
            if (tag.confidence > CONFIG.TAGS_MIN_CONFIDENCE && (goodTagsCount < CONFIG.TAGS_MAX_DISPLAY || tag.tag === 'nsfw' || tag.tag === 'nsfl')) {
                tag.qualityClass = 'tag-good';
                goodTagsCount++;
            } else {
                tag.qualityClass = 'tag-bad';
                badTagsCount++;
            }
        }
        this.data.goodTagsCount = goodTagsCount;
        this.data.badTagsCount = badTagsCount;
        this.stream.items[this.data.params.id].tags = item.tags;
        this.data.tags = item.tags;
        this.render();
    },
    render: function() {
        this.parent();
        this.addedTagInput = false;
        this.$container.find('.tag-form').submit(this.saveTags.bind(this));
        this.$container.find('.add-tags-link').fastclick(this.showTagForm.bind(this));
        this.$container.find('.tag-form .cancel').fastclick(this.hideTagForm.bind(this));
        var that = this;
        this.$container.find('span.vote-up').fastclick(function(ev) {
            return that.vote(ev, 1);
        });
        this.$container.find('span.vote-down').fastclick(function(ev) {
            return that.vote(ev, -1);
        });
        this.$container.find('.tags-expand').fastclick(function(ev) {
            $(ev.currentTarget).hide();
            $('.tag-bad').css('display', 'inline-block');
        })
        this.$container.find('#item-edit-tags').fastclick(function() {
            p.mainView.showOverlay(p.View.Overlay.EditTags, $(this));
        });
    },
    saveTags: function(ev) {
        if (!p.mainView.requireLogin()) {
            return false;
        }
        var $form = $(ev.currentTarget);
        var data = $form.serialize();
        $form.find('input,textarea,button,select').attr('disabled', 'disabled');
        p.api.post('tags.add', data, this.loaded.bind(this), function() {
            $form.find('input,textarea,button,select').removeAttr('disabled');
        });
        return false;
    },
    showTagForm: function(ev) {
        if (!p.mainView.requireLogin()) {
            return false;
        }
        this.$container.find('.add-tags-link').hide();
        this.$container.find('.tag-form').show();
        var input = this.$container.find('input.item-tagsinput');
        if (!this.addedTagInput) {
            input.tagsInput(CONFIG.TAGS_INPUT_SETTINGS);
            this.addedTagInput = true;
            this.focus('.tagsinput input');
        }
        return false;
    },
    hideTagForm: function(ev) {
        this.$container.find('.add-tags-link').show();
        this.$container.find('.tag-form').hide();
        return false;
    },
    vote: function(ev, vote) {
        if (!p.mainView.requireLogin()) {
            return false;
        }
        var $tag = $(ev.currentTarget).parent();
        var tagId = $tag.attr('id').split('-')[1];
        var absoluteVote = vote;
        if (($tag.hasClass('voted-up') && vote === 1) || ($tag.hasClass('voted-down') && vote === -1)) {
            absoluteVote = 0;
            $tag.removeClass('voted-up voted-down');
        } else {
            $tag.removeClass('voted-up voted-down');
            $tag.addClass(vote === 1 ? 'voted-up' : 'voted-down');
        }
        for (var i = 0; i < this.data.tags.length; i++) {
            if (this.data.tags[i].id == tagId) {
                p.adjustVote(this.data.tags[i], absoluteVote, p.user.voteCache.votes.tags);
                break;
            }
        }
        p.api.post('tags.vote', {
            id: tagId,
            vote: absoluteVote
        });
        return false;
    }
});
p.View.Stream.Tags.SortConfidence = function(a, b) {
    return b.confidence - a.confidence;
};
p.View.Overlay = p.View.Overlay || {};
p.View.Overlay.DeleteItem = p.View.Base.extend({
    name: 'overlay-delete-item',
    template: '<div class="overlay-content"> <h2>Bild löschen</h2> </div> <div class="overlay-content"> <form id="image-delete-form"> <div class="form-row"> <label class="checkbox-label"> <input name="reason" type="radio" value="custom" checked id="custom"/> </label> <input type="text" class="text-line" name="customReason" placeholder="Grund"/> <label> <input name="reason" type="radio" value="Regel #1 - Bild unzureichend getagged (nsfw/nsfl)"/> Regel #1 - Bild unzureichend getagged (nsfw/nsfl) </label> <label> <input name="reason" type="radio" value="Regel #2 - Gore/Porn/Suggestive Bilder mit Minderjährigen"/> Regel #2 - Gore/Porn/Suggestive Bilder mit Minderjährigen </label> <label> <input name="reason" type="radio" value="Regel #3 - Tierporn"/> Regel #3 - Tierporn </label> <label> <input name="reason" type="radio" value="Regel #4 - Stumpfer Rassismus/Nazi-Nostalgie"/> Regel #4 - Stumpfer Rassismus/Nazi-Nostalgie </label> <label> <input name="reason" type="radio" value="Regel #5 - Werbung/Spam"/> Regel #5 - Werbung/Spam </label> <label> <input name="reason" type="radio" value="Regel #6 - Infos zu Privatpersonen"/> Regel #6 - Infos zu Privatpersonen </label> <label> <input name="reason" type="radio" value="Regel #7 - Bildqualität"/> Regel #7 - Bildqualität </label> <label> <input name="reason" type="radio" value="Regel #8 - Ähnliche Bilder in Reihe"/> Regel #8 - Ähnliche Bilder in Reihe </label> <label> <input name="reason" type="radio" value="Regel #12 - Warez/Logins zu Pay Sites"/> Regel #12 - Warez/Logins zu Pay Sites </label> <label> <input name="reason" type="radio" value="Repost"/> Repost </label> <label> <input name="reason" type="radio" value="Auf Anfrage"/> Auf Anfrage </label> </div> <div class="form-row divider"> <input type="checkbox" name="notifyUser" checked="checked" id="delete-comment-notify"/> <label class="checkbox-label" for="delete-comment-notify">Benutzer benachrichtigen</label> </div> <div class="form-row"> <input type="checkbox" name="banUser" id="delete-ban-user"/> <label class="checkbox-label" for="delete-ban-user">Benutzer Sperren für</label> <input type="text" name="days" class="number" value="1"/> Tage (0 = für immer) </div> <div class="form-row"> </div> <div class="form-row"> <input type="hidden" name="id" value="{itemId}"/> <input type="submit" value="Löschen" id="image-delete"/> </div> </form> </div> ',
    data: {
        itemId: 0
    },
    init: function(container, parent, $el) {
        this.data.itemId = $el.data('id');
        this.parent(container, parent);
    },
    render: function() {
        this.parent();
        this.$container.find('form').submit(this.submit.bind(this));
        var customRadionButton = this.$container.find('input[name=reason][value=custom]');
        this.$container.find('input[name=customReason]').bind('focus onchange', function() {
            customRadionButton.prop('checked', true);
        });
        this.focus('input[name=customReason]');
    },
    submit: function(ev) {
        p.api.post('items.delete', ev.target, this.posted.bind(this));
        this.renderLoading();
        return false;
    },
    posted: function(response) {
        p.mainView.closeOverlay();
    }
});
p.Video = {
    canPlayWebM: true,
    ready: false,
    onready: null
};
try {
    var probe = document.createElement('video');
    if (p.mobile || !probe || !probe.canPlayType || !probe.canPlayType('video/webm; codecs="vp8"')) {
        p.Video.canPlayWebM = false;
        $.getScript('/frontend/lib/jsmpeg.min.js', function(data, textStatus, jqxhr) {
            p.Video.ready = true;
            if (p.Video.onready) {
                var func = p.Video.onready;
                p.Video.onready = null;
                func();
            }
        });
    }
} catch (error) {};
p.View.Stream = p.View.Stream || {};
p.View.Stream.Item = p.View.Base.extend({
    template: '<div class="item-pointer"> </div> <div class="item-container-content"> <div class="item-image-wrapper"> <?js if( item.video ) { ?> <?js if( canPlayWebM ) { ?> <video class="item-image" src="{item.image}" type="video/webm" autoplay loop></video> <div class="video-position-bar"> <div class="video-position-bar-background"> <div class="video-position"></div> </div> </div> <?js } else { ?> <canvas class="item-image"></canvas> <?js } ?> <?js } else { ?> <img class="item-image" src="{item.image}"/> <?js if(item.fullsize) { ?> <a href="{item.fullsize}" target="_blank" class="item-fullsize-link">+</a> <?js } ?> <?js } ?> <?js if( p.user.showAds ) { ?> <div class="stream-prev" title="Vorwärts"><span class="stream-prev-icon"></span></div> <div class="stream-next" title="Zurück"><span class="stream-next-icon"></span></div> <?js } else { ?> <div class="stream-prev arrow pict" title="Vorwärts">&lt;</div> <div class="stream-next arrow pict" title="Zurück">&gt;</div> <?js } ?> </div> <div class="item-info"> <div class="item-vote{p.voteClass(item.vote)}"> <span class="pict vote-up">+</span> <span class="pict vote-down">-</span> <?js if( item.showScore || p.user.admin ) {?> <span class="score<?js if(!item.showScore){?> score-young<?js}?>" title="{item.up} up, {item.down} down"><?js print(item.up - item.down)?></span> <?js } else { ?> <span class="score-hidden" title="Score noch unsichtbar">●●●</span> <?js } ?> </div> <?js if( item.user != p.user.name ) {?> <span class="pict vote-fav{p.favClass(item.vote)}">*</span> <?js } ?> <div class="item-details"> <a class="time" title="{item.time.readableTime()}" href="/new/{item.id}">{item.time.relativeTime(true)}</a> <span class="time">von</span> <a href="#user/{item.user}" class="user um{item.mark}">{item.user}</a> <span class="item-source"> <?js if( item.source ) {?> <span class="pict">s</span>&nbsp;<a href="{{item.source}}" target="_blank">{{item.source.hostName()}}</a> <?js } else { ?> <span class="pict">s</span>upload</span> <?js } ?> </span> <?js if( !item.video ) {?> <span class="item-google-search"> <span class="pict">g</span>&nbsp;<a href="https://www.google.com/searchbyimage?hl=en&amp;safe=off&amp;site=search&amp;image_url=http:{item.image}" target="_blank"> Bild googeln </a> </span> <?js } ?> <?js if( p.user.admin ) { ?> [<span class="action" id="item-delete" data-id="{item.id}">del</span>] [<a href="/new/phash.{item.id}.12">phash</a>] <span class="flags flags-{item.flags}">{p.Stream.FLAG_NAME[item.flags]}</span> <?js } ?> </div> <div class="item-tags"></div> </div> <?js if(p.user.showAds) {?> <div class="divider-full-banner gpt" id="gpt-divider-banner" data-size="468x60" data-slot="pr0gramm-banner"> </div> <div class="divider-large-rectangle gpt" id="gpt-divider-rectangle" data-size="336x280" data-slot="pr0gramm-rectangle"> </div> <?js } ?> <div class="item-comments"></div> </div> ',
    swipeDistance: 96,
    navTop: -1,
    heightKnown: false,
    init: function(container, parent) {
        this.stream = parent.stream;
        this.parent(container, parent);
    },
    show: function(rowIndex, itemData, defaultHeight, jumpToComment) {
        if (this.removed) {
            return;
        }
        this.data.canPlayWebM = p.Video.canPlayWebM;
        this.data.item = itemData;
        this.data.item.video = !!this.data.item.image.match(/\.webm$/);
        this.data.item.time = new Date(itemData.created * 1000);
        this.data.item.showScore = (itemData.created + CONFIG.ITEM_SHOW_SCORE_AGE < Date.now() / 1000);
        this.parent();
        this.$image = this.$container.find('.item-image');
        if (this.data.item.video && !p.Video.canPlayWebM) {
            if (!p.Video.ready) {
                p.Video.onready = this.show.bind(this, rowIndex, itemData, defaultHeight, jumpToComment);
                return;
            }
            var mpeg = this.data.item.image.replace(/\.webm$/, '.mpg');
            this.jsmpeg = new jsmpeg(mpeg, {
                canvas: this.$image[0],
                autoplay: true,
                loop: true
            });
        }
        var T = CONFIG.LAYOUT.THUMB;
        var offset = rowIndex * (T.WIDTH + T.PADDING) + T.WIDTH / 2 - T.PADDING - 4;
        this.$container.find('.item-pointer').css('left', offset);
        this.$image.fastclick(this.parentView.hideItem.bind(this.parentView));
        if (!this.$image.height() || (this.data.item.video && p.Video.canPlayWebM)) {
            if (defaultHeight) {
                this.$container.find('.item-image-wrapper').css('height', defaultHeight);
            }
            var imageLoadedBound = this.imageLoaded.bind(this);
            if (this.data.item.video) {
                this.video = this.$image[0];
                this.video.addEventListener('loadedmetadata', imageLoadedBound, false);
            } else {
                this.$image.load(imageLoadedBound);
                this.pollForHeightInterval = setInterval(imageLoadedBound, 10);
            }
        } else {
            this.heightKnown = true;
        }
        var that = this;
        this.$itemVote = this.$container.find('.item-vote');
        this.$itemVote.find('.vote-up').fastclick(function(ev) {
            return that.vote(ev, 1);
        });
        this.$itemVote.find('.vote-down').fastclick(function(ev) {
            return that.vote(ev, -1);
        });
        this.$itemFav = this.$container.find('.vote-fav')
        this.$itemFav.fastclick(function(ev) {
            return that.fav(ev);
        });
        this.tagView = new p.View.Stream.Tags(this.$container.find('.item-tags'), this);
        this.tagView.show({
            id: itemData.id
        });
        this.commentView = new p.View.Stream.Comments(this.$container.find('.item-comments'), this);
        this.commentView.show({
            id: itemData.id,
            comment: jumpToComment
        });
        this.jumpToComment = jumpToComment;
        if (p.mobile) {
            this.setupSwipe();
        } else {
            this.$streamPrev = this.$container.find('.stream-prev');
            this.$streamNext = this.$container.find('.stream-next');
            this.$streamPrev.show().fastclick(this.parentView.prev.bind(this.parentView));
            this.$streamNext.show().fastclick(this.parentView.next.bind(this.parentView));
            this.onScrollBound = this.onScroll.bind(this);
            $(window).bind('scroll', this.onScrollBound);
            this.onScroll();
        }
        this.$container.find('#item-delete').fastclick(function() {
            p.mainView.showOverlay(p.View.Overlay.DeleteItem, $(this));
        });
        p.ads.fill(this.$container.find('.gpt:visible'));
    },
    onScroll: function() {
        if (!this.heightKnown) {
            return;
        }
        var ih = this.$image.height();
        var h = ih / 2 - 32;
        var p = ($(window).scrollTop() - this.$container.offset().top).limit(32, ih - 32 - 96) + 96;
        if (p == this.navTop) {
            return;
        }
        this.navTop = p;
        this.$streamPrev.css('padding-top', p);
        this.$streamNext.css('padding-top', p);
    },
    updateVideoPosition: function() {
        if (this.video && this.video.duration) {
            var through = (this.video.currentTime / this.video.duration);
            if (through < this.videoThrough) {
                this.videoThrough = through;
            }
            this.videoThrough = 0.9 * this.videoThrough + 0.1 * through;
            this.$videoPosition.css('width', (this.videoThrough * 100).round(3) + '%')
        }
    },
    jumpToPosition: function(ev) {
        if (this.video && this.video.duration) {
            this.videoThrough = (ev.pageX - this.$videoPositionBar.offset().left) / this.$videoPositionBar.width();
            this.video.currentTime = this.video.duration * this.videoThrough;
        }
    },
    remove: function() {
        this.parent();
        this.removed = true;
        if (this.jsmpeg) {
            this.jsmpeg.stop();
            this.jsmpeg = null;
        }
        if (this.updateVideoPositionInterval) {
            clearInterval(this.updateVideoPositionInterval);
        }
        if (this.onScrollBound) {
            $(window).unbind('scroll', this.onScrollBound);
        }
    },
    syncVotes: function(votes) {
        if (!this.data.item) {
            return;
        }
        var vote = votes.items[this.data.item.id];
        if (vote && this.$itemVote) {
            this.$itemVote.removeClass('voted-up voted-down');
            this.$itemVote.addClass(vote > 0 ? 'voted-up' : 'voted-down');
            this.$itemFav.toggleClass('faved', (vote == 2));
        }
        if (this.commentView) {
            this.commentView.syncVotes(votes);
        }
        if (this.tagView) {
            this.tagView.syncVotes(votes);
        }
    },
    imageLoaded: function(ev) {
        if (!ev && !this.$image[0].height || this.heightKnown) {
            return;
        }
        this.heightKnown = true;
        this.$container.find('.item-image-wrapper').css('height', 'auto');
        if (this.pollForHeightInterval) {
            clearInterval(this.pollForHeightInterval);
            this.pollForHeightInterval = 0;
        }
        if (this.video) {
            var width = Math.min(this.$image[0].videoWidth, this.$container.width());
            this.$container.find('.video-position-bar').css({
                width: width
            }).show();
            this.$videoPositionBar = this.$container.find('.video-position-bar');
            this.$videoPosition = this.$container.find('.video-position');
            this.videoThrough = 0;
            this.updateVideoPositionInterval = setInterval(this.updateVideoPosition.bind(this), 16);
            this.$videoPositionBar.fastclick(this.jumpToPosition.bind(this));
        }
        if (this.commentView && this.jumpToComment) {
            this.commentView.focusComment(this.jumpToComment);
            this.jumpToComment = null;
        }
        if (this.onScrollBound) {
            this.onScroll();
        }
    },
    fav: function(ev) {
        if (!p.mainView.requireLogin()) {
            return false;
        }
        var addFav = !this.$itemFav.hasClass('faved');
        var absoluteVote = addFav ? 2 : 1;
        this.$itemFav.toggleClass('faved', addFav);
        this.$itemVote.addClass('voted-up');
        this.$itemVote.removeClass('voted-down');
        var cachedItem = this.stream.items[this.data.item.id];
        p.adjustVote(cachedItem, absoluteVote, p.user.voteCache.votes.items);
        var $score = this.$itemVote.find('.score');
        $score.text(cachedItem.up - cachedItem.down);
        p.api.post('items.vote', {
            id: this.data.item.id,
            vote: absoluteVote
        });
        return false;
    },
    vote: function(ev, vote) {
        if (!p.mainView.requireLogin()) {
            return false;
        }
        var absoluteVote = vote;
        if ((this.$itemVote.hasClass('voted-up') && vote === 1) || (this.$itemVote.hasClass('voted-down') && vote === -1)) {
            absoluteVote = 0;
            this.$itemVote.removeClass('voted-up voted-down');
        } else {
            this.$itemVote.removeClass('voted-up voted-down');
            this.$itemVote.addClass(vote === 1 ? 'voted-up' : 'voted-down');
        }
        this.$itemFav.removeClass('faved');
        var cachedItem = this.stream.items[this.data.item.id];
        p.adjustVote(cachedItem, absoluteVote, p.user.voteCache.votes.items);
        var $score = this.$itemVote.find('.score');
        $score.text(cachedItem.up - cachedItem.down);
        p.api.post('items.vote', {
            id: this.data.item.id,
            vote: absoluteVote
        });
        return false;
    },
    lastTouch: {
        x: 0,
        y: 0
    },
    avgTouchDelta: {
        x: 0,
        y: 0
    },
    touchOffset: {
        x: 0,
        y: 0
    },
    setupSwipe: function() {
        this.$image.bind('touchstart', this.initSwipeImage.bind(this));
        this.$image.bind('touchmove', this.swipeImage.bind(this));
        this.$image.bind('touchend', this.endSwipeImage.bind(this));
    },
    initSwipeImage: function(ev) {
        var touch = ev.originalEvent.touches[0];
        this.lastTouch.x = touch.clientX;
        this.lastTouch.y = touch.clientY;
        this.avgTouchDelta.x = 0;
        this.avgTouchDelta.y = 0;
        this.touchOffset.x = 0;
        this.touchOffset.y = 0;
    },
    endSwipeImage: function(ev) {
        if (this.touchOffset.x > this.swipeDistance) {
            this.parentView.prev();
        } else if (this.touchOffset.x < -this.swipeDistance) {
            this.parentView.next();
        } else {
            this.touchOffset.x = 0;
            this.touchOffset.y = 0;
            this.$image.css('margin-left', this.touchOffset.x);
        }
    },
    swipeImage: function(ev) {
        if (ev.originalEvent.touches.length > 1) {
            return;
        }
        var touch = ev.originalEvent.touches[0];
        var deltaX = this.lastTouch.x - touch.clientX;
        var deltaY = this.lastTouch.y - touch.clientY;
        this.lastTouch.x = touch.clientX;
        this.lastTouch.y = touch.clientY;
        this.avgTouchDelta.x = Math.abs(this.avgTouchDelta.x) * 0.8 + Math.abs(deltaX) * 0.2;
        this.avgTouchDelta.y = Math.abs(this.avgTouchDelta.y) * 0.8 + Math.abs(deltaY) * 0.2;
        if (Math.abs(this.avgTouchDelta.x) > Math.abs(this.avgTouchDelta.y)) {
            ev.preventDefault();
            this.touchOffset.x -= deltaX;
            this.touchOffset.y -= deltaY;
        } else {
            this.touchOffset.x = 0;
            this.touchOffset.y = 0;
        }
        this.$image.css('margin-left', this.touchOffset.x);
    }
});
p.View.Stream = p.View.Stream || {};
p.View.Stream.Main = p.View.Base.extend({
    baseURL: '',
    template: ' <div id="stream"></div> <div class="clear"></div> ',
    SCROLL: {
        NONE: 1,
        THUMB: 2,
        FULL: 4
    },
    scrollPosition: 0,
    loadInProgress: false,
    loadingTargetDistance: 2048,
    hasItems: false,
    prependNextSection: false,
    jumpToItem: null,
    jumpToComment: null,
    currentItemId: null,
    _scrolledToFullView: false,
    itemsPerRow: 6,
    rowMargin: 4,
    prefetched: [],
    init: function(container, parent) {
        this.handleThumbLinkBound = this.handleThumbLink.bind(this);
        this.parent(container, parent);
        this.loadedBound = this.loaded.bind(this);
        this.scrollBound = this.onscroll.bind(this);
        $(window).scroll(this.scrollBound);
        this.$itemContainerTemplate = $('<div class="item-container"/>');
    },
    fragmentChange: function(fragment) {
        if (this.currentItemSubview && this.currentItemSubview.commentView && fragment) {
            this.currentItemSubview.commentView.focusComment(fragment);
        }
    },
    show: function(params) {
        if (!params.userName) {
            this.tab = params.tab || 'top';
        } else {
            this.tab = null;
        }
        if (params.tab === 'stalk' && !p.user.paid) {
            p.navigateTo('pr0mium');
            return;
        }
        p.mainView.setTab(this.tab);
        var q = params.userName ? params.userName + ':' + params.userTab : params.tags || '';
        $('input[name=q]').val(q.replace('+', ''));
        var newBaseURL = (p._hasPushState ? '/' : '#') +
            (params.userName ? ('user/' + params.userName + '/' + params.userTab + '/') : (this.tab + '/' + (params.tags ? encodeURIComponent(params.tags) + '/' : '')));
        if (newBaseURL == this.baseURL) {
            this.data.params = params;
            if (this.data.params.itemId) {
                var $target = $('#item-' + this.data.params.itemId);
                if ($target.length) {
                    $(document).scrollTop($target.offset().top - CONFIG.HEADER_HEIGHT);
                    this.showItem($target, this.SCROLL.THUMB);
                    return;
                }
            } else if (p.dispatchFromHistory) {
                if (this.$currentItem) {
                    this.$itemContainer.remove();
                    this.currentItemSubview.remove();
                    this.$itemContainer = null;
                    this.$currentItem = null;
                    this.currentItemId = null;
                    $(document).scrollTop(this.scrollPosition);
                }
                return;
            }
        }
        this.children = [];
        var options = {};
        if (params.tab === 'top' || (!params.tab && !params.userName)) {
            options.promoted = 1;
        } else if (params.tab === 'stalk') {
            options.following = 1;
        }
        if (params.tags) {
            options.tags = params.tags;
        }
        if (params.userName && params.userTab === 'uploads') {
            options.user = params.userName;
        } else if (params.userName && params.userTab === 'likes') {
            options.likes = params.userName;
            if (params.userName === p.user.name) {
                options.self = true;
            }
        }
        this.stream = new p.Stream(options);
        this.baseURL = newBaseURL;
        this.hasItems = false;
        this.parent(params);
        this.$streamContainer = this.$container.find('#stream');
        this.$streamContainer.append(p.View.Base.LoadingAnimHTML);
        this.$itemContainer = null;
    },
    resize: function() {
        this.jumpToItem = this.currentItemId;
        this.jumpToComment = p.getFragment();
        this.$streamContainer.html('');
        this.loaded(this.stream.getLoadedItems(), p.Stream.POSITION.APPEND);
        this.parent();
    },
    hide: function() {
        $(window).unbind('scroll', this.scrollBound);
        this.parent();
    },
    syncVotes: function(votes) {
        if (this.stream) {
            this.stream.syncVotes(votes);
        }
        if (this.currentItemSubview) {
            this.currentItemSubview.syncVotes(votes);
        }
    },
    load: function() {
        this.loadInProgress = true;
        if (this.data.params.itemId) {
            this.jumpToItem = this.data.params.itemId;
            this.jumpToComment = p.getFragment();
            this.stream.loadAround(this.data.params.itemId, this.loadedBound);
        } else {
            this.stream.loadNewest(this.loadedBound);
        }
        return true;
    },
    prepareThumbsForInsertion: function(html) {
        var thumbs = $(html);
        thumbs.find('a').fastclick(this.handleThumbLinkBound);
        return thumbs;
    },
    handleThumbLink: function(ev) {
        if (!p.isNormalClick(ev)) {
            return true;
        }
        ev.preventDefault();
        this.showItem($(ev.currentTarget), this.SCROLL.NONE);
        if (!this._wasHidden) {
            this.handleHashLink(ev);
        }
        this._wasHidden = false;
        return false;
    },
    loaded: function(items, position, error) {
        this.itemsPerRow = p.mainView.thumbsPerRow;
        this.$container.find('.loader').remove();
        if (!items || !items.length) {
            var msg = null;
            var fm = null;
            if (error && (fm = error.match(/^(nsfw|nsfl|sfw)Required$/))) {
                msg = 'Das Bild wurde als <em>' + fm[1].toUpperCase() + '</em> markiert.<br/>' +
                    (p.user.id ? 'Ändere deine Filter-Einstellung,' : 'Melde dich an,') + ' wenn du es sehen willst.'
            } else if (!this.hasItems) {
                msg = this.tab === 'stalk' ? 'Du stelzt noch keine anderen Accounts &#175;\\_(&#12484;)_/&#175;' : 'Nichts gefunden &#175;\\_(&#12484;)_/&#175;';
            }
            if (msg) {
                this.$container.html('<h2 class="main-message">' + msg + '</h2>');
            }
            return;
        }
        if (position == p.Stream.POSITION.PREPEND) {
            var prevHeight = $('#main-view').height();
            var firstRow = this.$streamContainer.find('.stream-row:first');
            var placeholders = firstRow.find('.thumb-placeholder');
            var numPlaceholders = placeholders.length
            if (numPlaceholders) {
                var html = '';
                for (var i = 0; i < numPlaceholders; i++) {
                    html += this.buildItem(items[items.length - numPlaceholders - 1 + i]);
                }
                placeholders.remove();
                firstRow.prepend(this.prepareThumbsForInsertion(html));
            }
            var html = this.buildItemRows(items, 0, items.length - numPlaceholders, position);
            this.$streamContainer.prepend(this.prepareThumbsForInsertion(html));
            var newHeight = $('#main-view').height() - (117 - 52);
            $(document).scrollTop($(document).scrollTop() + (newHeight - prevHeight));
        } else if (position == p.Stream.POSITION.APPEND) {
            var lastRow = this.$streamContainer.find('.stream-row:last');
            var itemCount = lastRow.find('.thumb').length;
            var fill = 0;
            if (itemCount % this.itemsPerRow != 0) {
                var html = '';
                fill = this.itemsPerRow - itemCount;
                for (var i = 0; i < fill; i++) {
                    html += this.buildItem(items[i]);
                }
                lastRow.append(this.prepareThumbsForInsertion(html));
            }
            var html = this.buildItemRows(items, fill, items.length, position);
            this.$streamContainer.append(this.prepareThumbsForInsertion(html));
        }
        if (this.jumpToItem) {
            var target = $('#item-' + this.jumpToItem);
            if (target.length) {
                $(document).scrollTop(target.offset().top - CONFIG.HEADER_HEIGHT);
                this.showItem(target, this.SCROLL.THUMB);
            }
            this.jumpToItem = null;
        }
        this.loadInProgress = false;
        this.hasItems = true;
    },
    buildItemRows: function(items, start, end, position) {
        var html = '';
        if (position == p.Stream.POSITION.PREPEND && (end - start) % this.itemsPerRow != 0) {
            html += '<div class="stream-row">';
            var fillItems = (end - start) % this.itemsPerRow;
            var fillPlaceholders = this.itemsPerRow - fillItems;
            for (var i = 0; i < fillPlaceholders; i++) {
                html += '<div class="thumb-placeholder"></div>';
            }
            for (var i = start; i < start + fillItems; i++) {
                html += this.buildItem(items[i]);
            }
            start += fillItems;
            html += '</div>'
        }
        var fullRows = ((end - start) / this.itemsPerRow) | 0;
        var itemIndex = start;
        for (var r = 0; r < fullRows; r++) {
            html += '<div class="stream-row">';
            for (var i = 0; i < this.itemsPerRow; i++, itemIndex++) {
                html += this.buildItem(items[itemIndex]);
            }
            html += '</div>'
        }
        if (position == p.Stream.POSITION.APPEND && itemIndex != end) {
            html += '<div class="stream-row">';
            for (itemIndex; itemIndex < end; itemIndex++) {
                html += this.buildItem(items[itemIndex]);
            }
            html += '</div>'
        }
        return html;
    },
    buildItem: function(item) {
        return ('<a class="silent thumb" id="item-' + item.id + '" href="' + this.baseURL + item.id + '">' + '<img src="' + item.thumb + '"/>' + '</a>');
    },
    onscroll: function(ev) {
        this.scrollPosition = $(document).scrollTop();
        if (this.loadInProgress || !this.hasItems) {
            return;
        }
        var loadingTargetNewer = this.loadingTargetDistance / 2,
            loadingTargetOlder = $('#main-view').height() - this.loadingTargetDistance + 400;
        if (this.scrollPosition > loadingTargetOlder && !this.stream.reached.end) {
            this.loadInProgress = true;
            this.stream.loadOlder(this.loadedBound);
            this.$streamContainer.append(p.View.Base.LoadingAnimHTML);
        } else if (this.scrollPosition < loadingTargetNewer && !this.stream.reached.start) {
            this.loadInProgress = true;
            this.stream.loadNewer(this.loadedBound);
            this.$container.prepend(p.View.Base.LoadingAnimHTML);
            $(document).scrollTop(this.scrollPosition + (117 - 52));
        }
    },
    showItem: function($item, scrollTo) {
        if (this.$currentItem && $item.is(this.$currentItem)) {
            this.hideItem();
            this._wasHidden = true;
            this.currentItemId = null;
            return;
        }
        this.$currentItem = $item;
        var $row = $item.parent();
        var scrollTarget = 0;
        if (scrollTo == this.SCROLL.FULL) {
            scrollTarget = $row.offset().top - CONFIG.HEADER_HEIGHT + $item.height();
        } else if (scrollTo == this.SCROLL.THUMB) {
            scrollTarget = $row.offset().top - CONFIG.HEADER_HEIGHT - this.rowMargin;
        } else {
            scrollTarget = $(document).scrollTop();
        }
        var animate = !(scrollTo == this.SCROLL.FULL && this._scrolledToFullView);
        this._scrolledToFullView = (scrollTo == this.SCROLL.FULL);
        if (this.$itemContainer) {
            var previousItemHeight = this.$itemContainer.find('.item-image').height() || 0;
        }
        if (!$row.next().hasClass('item-container')) {
            if (this.$itemContainer) {
                if (this.$itemContainer.offset().top < $item.offset().top) {
                    scrollTarget -= this.$itemContainer.innerHeight() + this.rowMargin * 2;
                }
                if (animate) {
                    this.$itemContainer.find('.gpt').remove();
                    this.$itemContainer.slideUp('fast', function() {
                        $(this).remove();
                    });
                } else {
                    this.$itemContainer.remove();
                }
            }
            this.$itemContainer = this.$itemContainerTemplate.clone(true);
            this.$itemContainer.insertAfter($row);
            if (animate && !this.jumpToItem) {
                this.$itemContainer.slideDown('fast');
            } else {
                this.$itemContainer.show();
            }
        }
        var id = $item[0].id.replace('item-', '');
        var itemData = this.stream.items[id];
        var rowIndex = $item.prevAll().length;
        if (this.currentItemSubview) {
            this.currentItemSubview.remove();
        }
        this.currentItemSubview = new p.View.Stream.Item(this.$itemContainer, this);
        this.currentItemSubview.show(rowIndex, itemData, previousItemHeight, this.jumpToComment);
        this.jumpToComment = null;
        this.stream.loadInfo(itemData.id, this.prefetch.bind(this, $item));
        if (!this.jumpToItem) {
            if (animate) {
                $('body, html').stop(true, true).animate({
                    scrollTop: scrollTarget
                }, 'fast');
            } else {
                $('body, html').stop(true, true).scrollTop(scrollTarget);
            }
        }
        this.currentItemId = id;
    },
    hideItem: function(ev) {
        var c = this.$itemContainer;
        c.slideUp('fast', function() {
            c.remove();
        });
        p.navigateTo(this.baseURL.substr(1, this.baseURL.length - 2), p.NAVIGATE.SILENT);
        this.$itemContainer = null;
        this.$currentItem = null;
        this.currentItemSubview.remove();
    },
    prefetch: function($centerItem) {
        var $prev = this.getPrevItem($centerItem);
        var $next = this.getNextItem($centerItem);
        var queue = [];
        if ($prev.length) {
            queue.push($prev[0].id.replace('item-', ''));
        }
        if ($next.length) {
            queue.push($next[0].id.replace('item-', ''));
        }
        for (var i = 0; i < this.prefetched.length; i++) {
            this.prefetched[i].src = "";
        }
        this.prefetched = [];
        for (var i = 0; i < queue.length; i++) {
            this.stream.loadInfo(queue[i]);
            var source = this.stream.items[queue[i]].image;
            if (source.match(/\.webm$/)) {
                if (p.Video.canPlayWebM) {
                    var vid = $('<video autobuffer/>')[0];
                    vid.src = source;
                    this.prefetched.push(vid);
                } else {}
            } else {
                var img = new Image();
                img.src = source;
                this.prefetched.push(img);
            }
        }
    },
    getNextItem: function($item) {
        var $next = $item.next();
        if (!$next.length) {
            $next = $item.parent().nextAll('.stream-row:first').find('.thumb:first');
        }
        return $next.hasClass('thumb') ? $next : $();
    },
    getPrevItem: function($item) {
        var $prev = $item.prev();
        if (!$prev.length) {
            $prev = $item.parent().prevAll('.stream-row:first').find('.thumb:last');
        }
        return $prev.hasClass('thumb') ? $prev : $();
    },
    next: function(ev) {
        var $next = this.getNextItem(this.$currentItem);
        if (!$next.length) {
            return false;
        }
        this.showItem($next, this.SCROLL.FULL);
        p.navigateTo($next.attr('href').substr(1), p.NAVIGATE.SILENT);
        return false;
    },
    prev: function(ev) {
        var $prev = this.getPrevItem(this.$currentItem);
        if (!$prev.length) {
            return false;
        }
        this.showItem($prev, this.SCROLL.FULL);
        p.navigateTo($prev.attr('href').substr(1), p.NAVIGATE.SILENT);
        return false;
    }
});
p.View.FollowList = p.View.Base.extend({
    template: '<h1 class="pane-head user-head">Stelzliste</h1> <div class="tab-bar"> <a href="#stalk/list/stalk-date" <?js if(params.sort==\'stalk-date\') {?>class="active"<?js}?>>Nach Stelz-Datum</a> <a href="#stalk/list/post-date" <?js if(params.sort==\'post-date\') {?>class="active"<?js}?>>Nach letzdem Post</a> </div> <div class="pane"> <?js for( var i = 0; i < list.length; i++ ) { var followed = list[i]; ?> <div class="followed-user"> <?js if( followed.itemId ) { ?> <a class="thumb" href="#user/{followed.name}/uploads/{followed.itemId}"><img src="{followed.thumb}"/></a> <?js } else { ?> <div class="thumb-placeholder"></div> <?js } ?> <div class="follow-details following"> <div> <a href="#user/{followed.name}" class="user um{followed.mark}">{followed.name}</a> </div> <div class="follow-times"> <div> Letzter Post <?js if( followed.lastPost ) {?> <span class="time" title="{followed.lastPost.readableTime()}"> {followed.lastPost.relativeTime()} </span> <?js } else { ?> <span class="time">–</span> <?js } ?> </div> <div> Gestelzt <span class="time" title="{followed.followCreated.readableTime()}"> {followed.followCreated.relativeTime()} </span> </div> </div> <span class="action user-unfollow" data-name="{followed.name}"> <span class="pict">@</span> unstelzen </span> <span class="action user-follow" data-name="{followed.name}"> <span class="pict">@</span> stelzen </span> </div> </div> <?js } ?> </div>',
    load: function() {
        p.api.get('user.followlist', {
            flags: p.user.flags
        }, this.loaded.bind(this));
        return false;
    },
    loaded: function(response) {
        if (this.data.params.sort == 'post-date') {
            response.list.sort(p.View.FollowList.SortFollowLastPost);
        } else {
            response.list.sort(p.View.FollowList.SortFollowCreated);
        }
        for (var i = 0; i < response.list.length; i++) {
            var l = response.list[i];
            l.followCreated = new Date(l.followCreated * 1000);
            l.lastPost = l.itemId ? new Date(l.lastPost * 1000) : null;
            l.thumb = CONFIG.PATH.THUMBS + l.thumb;
        }
        this.data.list = response.list;
        this.render();
    },
    render: function() {
        this.parent();
        this.$container.find('.user-follow').click(this.follow.bind(this));
        this.$container.find('.user-unfollow').click(this.unfollow.bind(this));
    },
    follow: function(ev) {
        var $button = $(ev.currentTarget);
        $button.closest('.follow-details').removeClass('not-following').addClass('following');
        p.api.post('profile.follow', {
            name: $button.data('name')
        });
    },
    unfollow: function(ev) {
        var $button = $(ev.currentTarget);
        $button.closest('.follow-details').removeClass('following').addClass('not-following');
        p.api.post('profile.unfollow', {
            name: $button.data('name')
        });
    }
});
p.View.FollowList.SortFollowCreated = function(a, b) {
    return (b.followCreated - a.followCreated);
};
p.View.FollowList.SortFollowLastPost = function(a, b) {
    return (b.lastPost - a.lastPost);
};
p.View.Overlay = p.View.Overlay || {};
p.View.Overlay.Ban = p.View.Base.extend({
    name: 'overlay-ban',
    template: '<div class="overlay-content"> <h2>Benutzer {user} sperren</h2> </div> <div class="overlay-content"> <form id="ban-form"> <div class="form-row"> <input type="text" class="wide" name="reason" placeholder="Grund (Nachricht an den Benutzer)"/> </div> <div class="form-row"> <input type="text" name="days" value="0"/> Tage (0 = für immer) </div> <div class="form-row"> <input type="hidden" name="name" value="{user}"/> <input type="submit" value="Sperren"/> </div> </form> </div> ',
    data: {
        user: ''
    },
    init: function(container, parent, user) {
        this.data.user = user;
        this.parent(container, parent);
    },
    render: function() {
        this.parent();
        this.$container.find('form').submit(this.submit.bind(this));
        this.focus('input[name=reason]');
    },
    submit: function(ev) {
        p.api.post('user.ban', ev.target, this.posted.bind(this));
        this.renderLoading();
        return false;
    },
    posted: function(response) {
        p.mainView.closeOverlay();
    }
});
p.View.User = p.View.Base.extend({
    template: '<h1 class="pane-head user-head"> {user.name} <?js if(p.user.admin) {?> <a href="/backend/admin/?view=users&amp;action=show&amp;id={user.id}" id="user-admin">admin</a> <span class="action" id="user-ban">ban</span> <?js } ?> <?js if( p.user.name !== user.name ) { ?> <?js if(following) { ?> <span class="action user-unfollow"> <span class="pict">@</span> unstelzen </span> <?js } else { ?> <span class="action user-follow"> <span class="pict">@</span> stelzen </span> <?js } ?> <?js } ?> </h1> <p class="follow-non-paid warn"> Gespeichert. Um die Posts von Benutzern zu sehen die Du stelzt, benötigst Du einen <a href="#pr0mium">pr0mium-Account</a> </p> <div class="user-stats"> <div class="badges"> <?js for( var i = 0; i < dynamicBadges.length; i++ ) { var b = dynamicBadges[i]; ?> <a class="badge" href="{{b.link}}" title="{{b.description}}"> <img src="/media/badges/{b.image}" class="badge" alt=""/> <span class="badge-extra badge-{b.name}">{{b.extra}}</span> </a> <?js } ?> <?js for( var i = 0; i < badges.length; i++ ) { var b = badges[i]; ?> <a class="badge" href="{{b.link}}" title="{{b.description}} - {b.created.readableDate()}"> <img src="/media/badges/{b.image}" class="badge" alt=""/> </a> <?js } ?> </div> <div class="user-score-pane">BENIS <span class="user-score">{user.score}</span></div> <div> <?js if(user.score < 0 ) {?>Geschrumpft<?js } else {?>Gewachsen<?js } ?> seit {user.registered.readableDate()} ({user.registered.relativeTime(true,true)})<?js if(user.banned) { ?>, <?js if( user.bannedUntil ) { ?> gesperrt bis {user.bannedUntil.relativeTime()} <?js } else { ?> dauerhaft gesperrt <?js } ?> <?js } ?> </div> </div> <div class="tab-bar"> <span>Bilder</span> <em>{uploadCount}</em> <span>Favoriten</span> <em>{likeCount}</em> <span>Kommentare</span> <em>{commentCount}</em> <span>Tags</span> <em>{tagCount}</em> <?js if( user.name === p.user.name && p.user.paid ) { ?> <span>Stelzend</span> <em class="follow-count">{followCount}</em> <a href="#stalk/list/stalk-date" class="follow-list">Stelzliste anzeigen&hellip;</a> <?js } ?> <em class="user-mark user um{user.mark}">{p.User.MARK[user.mark]}</em> </div> <?js if( p.user.name !== user.name ) { ?> <div class="pane"> <h3><span>{user.name}</span> eine private Nachricht senden</h3> <form class="message-form" method="post"> <textarea class="comment" name="comment"></textarea> <input type="hidden" name="recipientId" value="{user.id}"/> <div> <input type="submit" value="Nachricht senden"/> </div> </form> </div> <?js } ?> <div class="pane"> <h2 class="section"> Neuste Bilder <?js if( uploads.length ) { ?> <a href="#user/{user.name}/uploads" class="user-show-all">Alle Bilder&hellip;</a> <?js } ?> </h2> <?js if( !uploads.length) {?> <span class="disabled">Bisher keine Bilder</span> <?js } ?> </div> <?js if( uploads.length) {?> <div class="stream-row in-pane"> <?js for( var i = 0; i < displayUploads; i++ ) { var u = uploads[i]; ?> <a class="thumb" href="#user/{user.name}/uploads/{u.id}"><img src="{u.thumb}"/></a> <?js } ?> <div class="clear"></div> </div> <?js } ?> <div class="pane"> <h2 class="section"> Neuste Favoriten <?js if( likesArePublic && likes.length ) { ?> <a href="#user/{user.name}/likes" class="user-show-all">Alle Favoriten&hellip;</a> <?js } ?> </h2> <?js if(!likesArePublic) { ?> <span class="disabled">Nicht öffentlich</span> <?js } else if( !likes.length) { ?> <span class="disabled">Bisher keine Favoriten</span> <?js } ?> </div> <?js if(likesArePublic && likes.length) {?> <div class="stream-row in-pane"> <?js for( var i = 0; i < displayLikes; i++ ) { var l = likes[i]; ?> <a class="thumb" href="#user/{user.name}/likes/{l.id}"><img src="{l.thumb}"/></a> <?js } ?> <div class="clear"></div> </div> <?js } ?> <div class="pane"> <h2 class="section"> Neuste Kommentare <?js if( comments.length ) { ?> <a href="#user/{user.name}/comments/before/{newestCommentTime}" class="user-show-all"> Alle Kommentare&hellip; </a> <?js } ?> </h2> <?js for( var i = 0; i < comments.length; i++ ) { var c = comments[i]; ?> <div class="comment"> <a href="#new/{c.itemId}:comment{c.id}"> <img src="{c.thumb}" class="comment-thumb"/> </a> <div class="comment-content with-thumb"> {c.content.format()} </div> <div class="comment-foot with-thumb"> <a href="#user/{user.name}" class="user um{user.mark}">{user.name}</a> <span class="score">{"Punkt".inflect(c.score)}</span> <a href="#new/{c.itemId}:comment{c.id}" class="time permalink" title="{c.created.readableTime()}">{c.created.relativeTime(true)}</a> </div> </div> <?js } ?> <?js if( !comments.length) {?> <span class="disabled">Bisher keine Kommentare</span> <?js } ?> </div>',
    init: function(container, parent) {
        this.parent(container, parent);
        p.mainView.setTab(null);
    },
    load: function() {
        var opts = {
            name: this.data.params.name,
            flags: p.user.flags
        };
        p.api.get('profile.info', opts, this.loaded.bind(this));
        return false;
    },
    render: function() {
        var thumbsPerRow = p.mainView.thumbsPerRow;
        var rows = thumbsPerRow < 5 ? 3 : 2;
        var maxThumbs = (thumbsPerRow * rows).limit(9, 16);
        this.data.displayUploads = Math.min(this.data.uploads.length, maxThumbs);
        this.data.displayLikes = this.data.likesArePublic ? Math.min(this.data.likes.length, maxThumbs) : 0;
        this.parent();
        this.$container.find('.message-form').submit(this.submitPrivateMessage.bind(this));
        var name = this.data.user.name;
        this.$container.find('#user-ban').fastclick(function() {
            p.mainView.showOverlay(p.View.Overlay.Ban, name);
        });
        this.$container.find('.user-follow').fastclick(this.follow.bind(this));
        this.$container.find('.user-unfollow').fastclick(this.unfollow.bind(this));
    },
    resize: function() {
        if (this.data.user) {
            this.render();
        }
        this.parent()
    },
    follow: function() {
        if (!p.mainView.requireLogin()) {
            return false;
        }
        p.api.post('profile.follow', {
            name: this.data.user.name
        });
        this.data.following = true;
        this.render();
        if (!p.user.paid) {
            $('.follow-non-paid').show();
        }
    },
    unfollow: function() {
        if (!p.mainView.requireLogin()) {
            return false;
        }
        p.api.post('profile.unfollow', {
            name: this.data.user.name
        });
        this.data.following = false;
        this.render();
    },
    submitPrivateMessage: function() {
        if (!p.mainView.requireLogin()) {
            return false;
        }
        var $form = this.$container.find('.message-form');
        var data = $form.serialize();
        $form.find('input,textarea,button,select').attr('disabled', 'disabled');
        p.api.post('inbox.post', data, function() {
            $form.html('<span>Gesendet!</span>');
        }, function(response) {
            $form.find('input,textarea,button,select').removeAttr('disabled');
        });
        return false;
    },
    loaded: function(response) {
        this.data.user = response.user;
        this.data.user.registered = new Date(this.data.user.registered * 1000);
        if (this.data.user.bannedUntil) {
            this.data.user.bannedUntil = new Date(this.data.user.bannedUntil * 1000);
        }
        this.data.comments = response.comments;
        for (var i = 0; i < this.data.comments.length; i++) {
            var c = this.data.comments[i];
            c.created = new Date(c.created * 1000);
            c.thumb = CONFIG.PATH.THUMBS + c.thumb;
            c.score = c.up - c.down;
        }
        this.data.newestCommentTime = this.data.comments.length ? this.data.comments.first().created.unix() + 1 : 0;
        this.data.uploads = response.uploads;
        for (var i = 0; i < this.data.uploads.length; i++) {
            this.data.uploads[i].thumb = CONFIG.PATH.THUMBS + this.data.uploads[i].thumb;
        }
        this.data.likes = response.likes;
        for (var i = 0; i < this.data.likes.length; i++) {
            this.data.likes[i].thumb = CONFIG.PATH.THUMBS + this.data.likes[i].thumb;
        }
        this.data.badges = response.badges;
        for (var i = 0; i < this.data.badges.length; i++) {
            this.data.badges[i].created = new Date(this.data.badges[i].created * 1000);
        }
        this.data.followCount = response.followCount;
        this.data.dynamicBadges = [];
        for (var i = 0; i < p.View.User.BADGE.COMMENTS.COUNTS.length; i++) {
            var c = p.View.User.BADGE.COMMENTS.COUNTS[i];
            if (response.commentCount > c.count) {
                var badge = p.copy(p.View.User.BADGE.COMMENTS.TEMPLATE);
                badge.description = badge.description.replace(/%c/g, c.count);
                badge.link = '#user/' + response.user.name + '/comments/before/' + this.data.newestCommentTime;
                badge.extra = c.name;
                this.data.dynamicBadges.push(badge);
                break;
            }
        }
        var years = Math.floor((Date.now() - this.data.user.registered.getTime()) / (365 * 24 * 60 * 60 * 1000));
        if (years > 0) {
            var badge = p.copy(p.View.User.BADGE.YEARS.TEMPLATE);
            badge.description = badge.description.replace(/%y/g, 'Jahr'.inflect(years));
            badge.link = '#user/' + response.user.name;
            badge.extra = years.toString();
            this.data.dynamicBadges.push(badge);
        }
        this.data.commentCount = response.commentCount;
        this.data.tagCount = response.tagCount;
        this.data.uploadCount = response.uploadCount;
        this.data.likesArePublic = response.likesArePublic;
        this.data.likeCount = response.likeCount;
        this.data.following = response.following;
        this.render();
    }
});
p.View.User.BADGE = {
    COMMENTS: {
        TEMPLATE: {
            name: 'comments',
            image: 'comments.png',
            link: '',
            description: 'Hat mehr als %c Kommentare verfasst',
            extra: '0'
        },
        COUNTS: [{
            count: 10000,
            name: '10k'
        }, {
            count: 5000,
            name: '5k'
        }, {
            count: 1000,
            name: '1k'
        }]
    },
    YEARS: {
        TEMPLATE: {
            name: 'years',
            image: 'years.png',
            link: '',
            description: 'Hat %y auf pr0gramm verschwendet',
            extra: '1'
        },
    }
};
p.View.User.Comments = p.View.Base.extend({
    template: '<h1 class="pane-head user-head"> Kommentare von <a href="#user/{user.name}">{user.name}</a> </h1> <div class="pane"> <?js for( var i = 0; i < comments.length; i++ ) { var c = comments[i]; ?> <div class="comment"> <a href="#new/{c.itemId}:comment{c.id}"> <img src="{c.thumb}" class="comment-thumb"/> </a> <div class="comment-content with-thumb"> {c.content.format()} </div> <div class="comment-foot with-thumb"> <a href="#user/{user.name}" class="user um{user.mark}">{user.name}</a> <span class="score">{"Punkt".inflect(c.score)}</span> <a href="#new/{c.itemId}:comment{c.id}" class="time permalink" title="{c.created.readableTime()}">{c.created.relativeTime(true)}</a> </div> </div> <?js } ?> <div class="inbox-nav-bar"> <?js if( after ) { ?> <a href="#user/{user.name}/comments/after/{after}" class="inbox-nav newer">&laquo; Neuer</a> <?js } ?> <?js if( before ) { ?> <a href="#user/{user.name}/comments/before/{before}" class="inbox-nav older">Älter &raquo;</a> <?js } ?> </div> <?js if( !comments.length) {?> <span class="disabled">Keine Kommentare gefunden</span> <?js } ?> </div>',
    init: function(container, parent) {
        this.parent(container, parent);
        p.mainView.setTab(null);
    },
    load: function() {
        var opts = {
            name: this.data.params.name,
            flags: p.user.flags
        };
        opts[this.data.params.search] = this.data.params.timestamp;
        p.api.get('profile.comments', opts, this.loaded.bind(this));
        return false;
    },
    loaded: function(response) {
        this.data.user = response.user;
        this.data.comments = response.comments;
        this.data.comments.sort(function(a, b) {
            return (b.created - a.created);
        })
        this.data.after = response.hasNewer ? this.data.comments.first().created : null;
        this.data.before = response.hasOlder ? this.data.comments.last().created : null;
        for (var i = 0; i < this.data.comments.length; i++) {
            var c = this.data.comments[i];
            c.created = new Date(c.created * 1000);
            c.thumb = CONFIG.PATH.THUMBS + c.thumb;
            c.score = c.up - c.down;
        }
        this.render();
    }
});
p.View.Inbox = p.View.Base.extend({
    template: '<h1 class="pane-head">Nachrichten</h1> <div class="tab-bar"> <a href="#inbox/unread" <?js if(tab==\'unread\') {?>class="active"<?js}?>>Ungelesen</a> <a href="#inbox/all" <?js if(tab==\'all\') {?>class="active"<?js}?>>Alle</a> <a href="#inbox/messages" <?js if(tab==\'messages\') {?>class="active"<?js}?>>Private Nachrichten</a> </div> <div class="pane"> <form class="comment-form" method="post"> <textarea class="comment" name="comment"></textarea> <input type="hidden" name="parentId" value=""/> <input type="hidden" name="itemId" value=""/> <input type="hidden" name="recipientId" value=""/> <div> <input type="submit" value="Abschicken"/> <input type="button" value="Abbrechen" class="cancel"/> </div> </form> <?js if( messages.length === 0 ) { ?> <?js if( tab === \'unread\') { ?> <em>Keine ungelesenen Nachrichten</em> <?js } else { ?> <em>Keine Nachrichten :(</em> <?js } ?> <?js } else { ?> <?js if(tab==\'messages\') {?> <?js for( var i = 0; i < threads.length; i++ ) { var t = threads[i]; ?> <h3 class="section"> <a href="#user/{t.partner.name}" class="user user-thread-head um{t.partner.mark}"> {t.partner.name} </a> &ndash; Private Nachrichten </h3> <?js for( var j = 0; j < t.messages.length; j++ ) { var m = t.messages[j]; var more = t.messages.length-CONFIG.INBOX_EXPANDED_COUNT; ?> <?js if( j == CONFIG.INBOX_EXPANDED_COUNT ) { ?> <span class="action expand-thread" data-id="{i}"> {"weiter".inflect(more,"e","en")} Nachrichten anzeigen&hellip; </span> <div class="thread-more" id="thread-{i}"> <?js } ?> <div class="comment<?js print(m.sent?\' voted-down\':\'\');?>" id="message{m.id}"> <div class="comment-content with-thumb"> {m.message.format()} </div> <div class="comment-foot private-message with-thumb" data-senderid="{m.senderId}"> <a href="#user/{m.senderName}" class="user um{m.senderMark}">{m.senderName}</a> <span class="time permalink" title="{m.createdReadable}">{m.createdRelative}</span> <?js if( !m.sent ) {?> <a href="#inbox:message{m.id}" class="comment-reply-link action"><span class="pict">r</span> antworten</a> <?js } ?> </div> </div> <?js } ?> <?js if( j > CONFIG.INBOX_EXPANDED_COUNT ) { /* close expanded box again? */ ?> </div> <?js } ?> <?js } ?> <?js } else { ?> <?js for( var i = 0; i < messages.length; i++ ) { var m = messages[i]; ?> <?js if( m.itemId ) { /* comment reply */ ?> <h3 class="section">Kommentar</h3> <div class="comment with-thumb" id="comment{m.id}"> <a href="#new/{m.itemId}:comment{m.id}"> <img src="{m.thumb}" class="comment-thumb"/> </a> <div class="comment-content with-thumb"> {m.message.format()} </div> <div class="comment-foot with-thumb" data-itemid="{m.itemId}"> <a href="#user/{m.name}" class="user um{m.mark}">{m.name}</a> <span class="score">{"Punkt".inflect(m.score)}</span> <a href="#new/{m.itemId}:comment{m.id}" class="time permalink" title="{m.createdReadable}">{m.createdRelative}</a> <a href="#new/{m.itemId}:comment{m.id}" class="comment-reply-link action"><span class="pict">r</span> antworten</a> </div> </div> <?js } else { /* private message */ ?> <h3 class="section">Private Nachricht</h3> <div class="comment" id="message{m.id}"> <div class="comment-content with-thumb"> {m.message.format()} </div> <div class="comment-foot private-message with-thumb" data-senderid="{m.senderId}"> <a href="#user/{m.name}" class="user um{m.mark}">{m.name}</a> <span class="time permalink" title="{m.createdReadable}">{m.createdRelative}</span> <a href="#inbox:message{m.id}" class="comment-reply-link action"><span class="pict">r</span> antworten</a> </div> </div> <?js } ?> <?js } ?> <?js } ?> <div class="inbox-nav-bar"> <?js if( after ) { ?> <a href="#inbox/{tab}/after/{after}" class="inbox-nav newer">&laquo; Neuer</a> <?js } ?> <?js if( before ) { ?> <a href="#inbox/{tab}/before/{before}" class="inbox-nav older">Älter &raquo;</a> <?js } ?> </div> <?js } ?> </div>',
    data: {
        tab: 'unread',
        messages: []
    },
    init: function(container, parent) {
        this.parent(container, parent);
        p.mainView.setTab(null);
    },
    show: function(params) {
        if (!p.user.id) {
            p.navigateTo('');
            return false;
        }
        this.data.tab = params.tab || 'unread';
        return this.parent(params);
    },
    load: function() {
        var opts = {};
        if (this.data.params.search) {
            opts[this.data.params.search] = this.data.params.timestamp;
        }
        p.api.get('inbox.' + this.data.tab, opts, this.loaded.bind(this));
        return false;
    },
    render: function() {
        this.parent();
        this.$commentForm = this.$container.find('.comment-form');
        this.$commentForm.hide();
        this.$commentForm.submit(this.submitComment.bind(this));
        this.$commentForm.find('input.cancel').hide().click(this.cancelReply.bind(this));
        this.$container.find('.comment-reply-link').fastclick(this.showReplyForm.bind(this));
        this.$container.find('.expand-thread').fastclick(function() {
            $(this).hide();
            $('#thread-' + $(this).data('id')).show();
        })
    },
    loaded: function(response) {
        this.data.messages = response.messages;
        this.data.messages.sort(p.View.Inbox.sortByCreated);
        for (var i = 0; i < this.data.messages.length; i++) {
            var m = this.data.messages[i];
            var time = new Date(m.created * 1000);
            m.createdReadable = time.readableTime();
            m.createdRelative = time.relativeTime(true);
            if (m.itemId) {
                m.thumb = CONFIG.PATH.THUMBS + m.thumb;
            }
        }
        this.data.after = response.hasNewer ? this.data.messages.first().created : null;
        this.data.before = response.hasOlder ? this.data.messages.last().created : null;
        if (this.data.tab == 'unread') {
            p.user.setInboxLink(0);
        }
        if (this.data.tab == 'messages') {
            var threads = [];
            var partners = {};
            for (var i = 0; i < this.data.messages.length; i++) {
                var m = this.data.messages[i];
                var partnerId = m.sent ? m.recipientId : m.senderId;
                if (!partners[partnerId]) {
                    partners[partnerId] = {
                        partner: {
                            name: m.sent ? m.recipientName : m.senderName,
                            mark: m.sent ? m.recipientMark : m.senderMark
                        },
                        messages: []
                    };
                }
                partners[partnerId].messages.push(m);
            }
            for (var partner in partners) {
                threads.push(partners[partner]);
            }
            threads.sort(function(a, b) {
                return (b.messages[0].created - a.messages[0].created);
            });
            this.data.threads = threads;
        }
        this.render();
    },
    showReplyForm: function(ev) {
        if (!p.mainView.requireLogin()) {
            return false;
        }
        var $foot = $(ev.currentTarget.parentNode);
        if ($foot.has('.comment-form').length) {
            return false;
        }
        var $form = this.$commentForm.clone(true).show();
        if ($foot.hasClass('private-message')) {
            var senderId = $foot.data('senderid');
            $form.find('input[name=recipientId]').val(senderId);
        } else {
            var parentId = ev.currentTarget.href.split(':comment')[1];
            var itemId = $foot.data('itemid');
            $form.find('input[name=parentId]').val(parentId);
            $form.find('input[name=itemId]').val(itemId);
        }
        $form.find('input.cancel').show();
        $foot.append($form);
        this.focus('textarea');
        return false;
    },
    cancelReply: function(ev) {
        $(ev.currentTarget).parents('form').remove();
    },
    submitComment: function(ev) {
        if (!p.mainView.requireLogin()) {
            return false;
        }
        var $form = $(ev.currentTarget);
        var data = $form.serialize();
        $form.find('input,textarea,button,select').attr('disabled', 'disabled');
        var onerror = function(response) {
            $form.find('input,textarea,button,select').removeAttr('disabled');
        };
        if ($form.find('input[name=recipientId]').val()) {
            p.api.post('inbox.post', data, function() {
                $form.html('<span>Gesendet!</span>');
            }, onerror);
        } else {
            p.api.post('comments.post', data, function(item) {
                if (item.commentId) {
                    p.user.voteCache.votes.comments[item.commentId] = 1;
                }
                $form.html('<span>Gesendet!</span>')
            }, onerror);
        }
        return false;
    }
});
p.View.Inbox.sortByCreated = function(a, b) {
    return (b.created - a.created);
};
p.View.Validate = p.View.Base.extend({
    template: '<h2 class="main-message">Ungültiges Token</h2>',
    load: function() {
        p.api.post('user.validate', {
            token: this.data.params.token
        }, this.loaded.bind(this));
        return false;
    },
    loaded: function(response) {
        if (response.success) {
            p.navigateTo('');
            p.reload();
        } else {
            this.render();
        }
    }
});
p.View.ResetPassword = p.View.Base.extend({
    template: ' <?js if(submitted && !error ) {?> <h2 class="main-message">Passwort gespeichert!</h2> <?js } else { ?> <h1 class="pane-head">Passwort für {{params.name}} setzen</h1> <div class="pane"> <form id="reset-password"> <div class="form-row"> <input type="password" value="" placeholder="Neues Passwort" name="password"/> <?js if( error === \'invalidToken\' ) {?> <p class="warn">Ungültiger oder veralteter Token.</p> <?js } else if( error === \'passwordTooShort\' ) { ?> <p class="warn">Passwort zu kurz</p> <?js } ?> <p class="field-details">Mindestens 6 Zeichen</p> </div> <div class="form-row"> <input type="submit" value="Speichern"/> </div> <input type="hidden" name="token" value="{{params.token}}"/> <input type="hidden" name="name" value="{{params.name}}"/> </form> </div> <?js } ?>',
    data: {
        submitted: false,
        error: null
    },
    render: function() {
        this.parent();
        this.$container.find('#reset-password').submit(this.setPassword.bind(this));
    },
    setPassword: function(ev) {
        p.api.post('user.resetpassword', ev.target, this.posted.bind(this));
        this.renderLoading();
        return false;
    },
    posted: function(response) {
        this.data.submitted = true;
        this.data.error = response.error;
        this.render();
    }
});
p.View.RegisterInvite = p.View.Base.extend({
    template: '<h1 class="pane-head">Registrieren</h1> <?js if( inviter ) {?> <p> Eingeladen durch: <a class="user um{inviter.mark}" href="/user/{inviter.name}">{inviter.name}</a> </p> <?js } ?> <div class="pane form-page"> <?js if( error === \'invalidInvite\' ) { ?> <h3 class="warn">Das Invite Token ist ungültig</h3> <p> Das Token <em>"{{params.token}}"</em> ist ungültig. Vielleicht wurde es bereits benutzt? </p> <?js } else if( registered ) { ?> <h3>Danke!</h3> <p> Du solltest gleich eine E-Mail mit dem Aktivierungslink bekommen. <span class="warn">Bitte schau auch in den Spam-Ordner!</span> </p> <p> Solltest du deinen Account nicht innerhalb von 24 Stunden aktivieren, wird er gelöscht und der Name und E-Mail Adresse wieder freigegeben. </p> <?js } else { ?> <form method="post" id="register-form"> <div class="form-row"> <label>Name <span class="field-details">(Mindestens 2 Zeichen, nur Buchstaben und Zahlen)</span>:</label> <input type="text" name="name" value="{{name}}" class="text-line" placeholder="Name"/> <?js if( error === \'nameInvalid\' ) { ?> <p class="warn">Ungültiger Name</p> <?js } ?> <?js if( error === \'nameInUse\' ) { ?> <p class="warn">Dieser Name wird bereits verwendet</p> <?js } ?> </div> <div class="form-row"> <label>E-Mail Adresse:</label> <input type="email" name="email" value="{{email}}" class="text-line" placeholder="E-Mail Adresse"/> <?js if( error === \'emailInUse\' ) { ?> <p class="warn">Diese E-Mail Adresse wird bereits verwendet</p> <?js } else if( error === \'emailInvalid\' ) { ?> <p class="warn">Die E-Mail Adresse ist ungültig</p> <?js } ?> <p class="field-details"> Der Aktivierungslink wird an diese Adresse gesendet. Bei einigen Mail-Hostern landet die Mail im Spam-Ordner. Wir empfehlen <a href="https://mail.google.com/" target="_blank">Google Mail</a>. </p> </div> <div class="form-row"> <label>Passwort <span class="field-details">(Mindestens 6 Zeichen)</span>:</label> <input type="password" name="password" class="text-line" placeholder="Passwort"/> <?js if( error === \'passwordTooShort\' ) { ?> <p class="warn">Passwort zu kurz</p> <?js } ?> </div> <div class="form-row"> <input type="hidden" name="token" value="{{params.token}}"/> <input type="submit" class="confirm" value="Registrieren"/> </div> </form> <?js } ?> </div>',
    data: {
        error: null,
        name: '',
        email: '',
        registered: false,
        inviter: null
    },
    load: function() {
        p.api.get('user.loadinvite', {
            token: this.data.params.token
        }, this.loaded.bind(this));
        return false;
    },
    loaded: function(response) {
        this.data.error = response.error;
        this.data.inviter = response.inviter;
        this.data.email = response.email;
        this.render();
    },
    render: function() {
        this.parent();
        this.$container.find('#register-form').submit(this.submit.bind(this));
        this.focus('input[name=name]');
    },
    submit: function(ev) {
        this.data.name = this.$container.find('input[name=name]').val();
        this.data.email = this.$container.find('input[name=email]').val();
        this.data.error = null;
        p.api.post('user.joinwithinvite', ev.target, this.posted.bind(this));
        this.renderLoading();
        return false;
    },
    posted: function(response) {
        this.data.error = response.error;
        this.data.registered = !response.error;
        this.render();
    }
});
p.View.RedeemCode = p.View.Base.extend({
    template: '<h1 class="pane-head">pr0mium Code Einlösen</h1> <?js if( tokenError ) { ?> <p class="warn"> <?js if( tokenError === \'invalid\' ) {?> Ungültiger Code. Überprüfe bitte, dass Du den vollständigen Link aus der E-Mail kopiert hast. <?js } else if( tokenError === \'used\' ) { ?> Dieser Code wurde bereits eingelöst. <?js } ?> </p> <?js } else if( p.user.id ) { ?> <form method="post" id="redeem-form"> <h2><span class="force-case">pr0mium</span> Code ({token.product.days} Tage) einlösen</h2> <p> Die pr0mium-Zeit wird deinem Account ({{p.user.name}}) gutgeschrieben. </p> <div class="form-row"> <input type="hidden" name="token" value="{{params.token}}"/> <input type="submit" class="confirm" value="Code jetzt einlösen"/> </div> </form> <?js } else { ?> <h2> Neuen <span class="force-case">pr0mium</span> Account ({token.product.days} Tage) registrieren </h2> <p class="field-details"> (Falls Du bereits einen pr0gramm Account besitzt und die pr0mium-Zeit diesem gutschreiben willst, logge Dich ein und besuche diese Seite erneut) </p> <form method="post" id="register-form"> <div class="form-row"> <label>Name <span class="field-details">(Mindestens 2 Zeichen, nur Buchstaben und Zahlen)</span>:</label> <input type="text" name="name" value="{{name}}" class="text-line" placeholder="Name"/> <?js if( error === \'nameInvalid\' ) { ?> <p class="warn">Ungültiger Name</p> <?js } ?> <?js if( error === \'nameInUse\' ) { ?> <p class="warn">Dieser Name wird bereits verwendet</p> <?js } ?> </div> <div class="form-row"> <label>E-Mail Adresse:</label> <input type="email" name="email" value="{{email}}" class="text-line" placeholder="E-Mail Adresse"/> <?js if( error === \'emailInUse\' ) { ?> <p class="warn">Diese E-Mail Adresse wird bereits verwendet</p> <?js } else if( error === \'emailInvalid\' ) { ?> <p class="warn">Die E-Mail Adresse ist ungültig</p> <?js } ?> </div> <div class="form-row"> <label>Passwort <span class="field-details">(Mindestens 6 Zeichen)</span>:</label> <input type="password" name="password" class="text-line" placeholder="Passwort"/> <?js if( error === \'passwordTooShort\' ) { ?> <p class="warn">Passwort zu kurz</p> <?js } ?> </div> <div class="form-row"> <input type="hidden" name="token" value="{{params.token}}"/> <input type="submit" class="confirm" value="Code einlösen und registrieren"/> </div> </form> <?js } ?> ',
    data: {
        tokenError: null,
        error: null,
        name: '',
        email: '',
        registered: false,
        inviter: null
    },
    load: function() {
        p.api.post('user.loadpaymenttoken', {
            token: this.data.params.token
        }, this.loaded.bind(this));
        return false;
    },
    loaded: function(response) {
        this.data.tokenError = response.tokenError;
        this.data.token = response.token;
        this.render();
    },
    render: function() {
        this.parent();
        this.$container.find('#redeem-form').submit(this.redeem.bind(this));
        this.$container.find('#register-form').submit(this.register.bind(this));
        this.focus('input[name=name]');
    },
    redeem: function(ev) {
        this.data.error = null;
        p.api.post('user.redeemtoken', ev.target, this.posted.bind(this));
        this.renderLoading();
        return false;
    },
    register: function(ev) {
        this.data.name = this.$container.find('input[name=name]').val();
        this.data.email = this.$container.find('input[name=email]').val();
        this.data.error = null;
        p.api.post('user.joinwithtoken', ev.target, this.posted.bind(this));
        this.renderLoading();
        return false;
    },
    posted: function(response) {
        if (response.error || response.tokenError) {
            this.data.tokenError = response.tokenError;
            this.data.error = response.error;
            this.render();
            return;
        }
        p.user.loadCookie();
        p.user.set('paid', true);
        window.location = '/redeem/thanks';
    }
});
p.View.RedeemThanks = p.View.Base.extend({
    template: '<h1 class="pane-head">Danke <span class="pict">*</span></h1> <div class="pane form-page"> <p> Vielen Dank fürs Einlösen Deines pr0mium-Codes! </p> <p> In den <a href="#settings/site">Einstellungen</a> kannst Du Deinen Benutzerstatus auswählen. </div>'
});
p.View.Settings = p.View.Base.extend({
    template: '<h1 class="pane-head">Einstellungen</h1> <div class="tab-bar"> <a href="#settings/site" <?js if(tab==\'site\') {?>class="active"<?js}?>>Seite</a> <a href="#settings/account" <?js if(tab==\'account\') {?>class="active"<?js}?>>Account</a> <a href="#settings/invites" <?js if(tab==\'invites\') {?>class="active"<?js}?>>Invites</a> <a href="#settings/bookmarklet" <?js if(tab==\'bookmarklet\') {?>class="active"<?js}?>>Bookmarklet</a> <span class="action" id="settings-logout-link">abmelden</span> </div> <div class="pane form-page"> <?js if( saved ) {?> <h2>Gespeichert!</h2> <?js if( emailChanged ) {?> <p>Du bekommst gleich eine E-Mail zur Bestätigung der neuen Adresse</p> <?js } ?> <?js } else { ?> <?js if(tab == \'bookmarklet\') { ?> <div class="bookmarklet-frame"> <p> Mit dem <em>+pr0g</em> Bookmarklet kannst du direkt von jeder Website Bilder auf pr0gramm hochladen. </p> <p> <a class="bookmarklet" title="Ziehe diesen Link in deine Bookmarks!" href="{CONFIG.BOOKMARKLET}"> <img src="/media/pr0gramm-favicon.png" class="bookmarklet-icon"/> +pr0g </a> &nbsp;&laquo; Ziehe diesen Link in deine Bookmarks! </p> <img src="/media/bookmarklet-instruction.gif" class="bookmarklet-instruction"/> </div> <?js } else if( tab == \'site\') { ?> <form method="post" id="settings-site-form"> <div class="form-section"> <h2>Allgemeine Einstellungen</h2> <h3>Meine Favoriten sind sichtbar für</h3> <input type="radio" class="box-from-label" name="likesArePublic" value="1" id="likesArePublicAll" <?js if(account.likesArePublic) {?>checked="checked"<?js } ?> /><label class="radio" for="likesArePublicAll">Jeden</label> <input type="radio" class="box-from-label" name="likesArePublic" value="0" id="likesArePublicMe" <?js if(!account.likesArePublic) {?>checked="checked"<?js } ?> /><label class="radio" for="likesArePublicMe">Nur für mich</label> </div> <div class="form-section"> <h2><span class="force-case">pr0mium</span> Funktionen</h2> <?js if( !p.user.paid) {?> <p class="field-details"> Für diese Einstellungen ist ein <a href="#pr0mium">pr0mium Account</a> erforderlich. </p> <?js } else { ?> <p> Dein pr0mium Account-läuft am <strong> {account.paidUntil.readableDate()} ({account.paidUntil.relativeTime()}) </strong> ab. <a href="#pr0mium">Jetzt verlängern.</a> </p> <?js } ?> <div class="disabled-wrap"> <?js if( !p.user.paid ) { ?> <div class="disabled-overlay"></div> <?js } ?> <h3>Werbung</h3> <input type="radio" class="box-from-label" name="showAds" value="1" id="showAdsOn" <?js if(p.user.showAds) {?>checked="checked"<?js } ?> /><label class="radio" for="showAdsOn">Werbung anzeigen</label> <input type="radio" class="box-from-label" name="showAds" value="0" id="showAdsOff" <?js if(!p.user.showAds) {?>checked="checked"<?js } ?> /><label class="radio" for="showAdsOff">Alle Werbebanner ausblenden</label> <p class="field-details">(Änderung wird nach einem Reload der Seite wirksam)</p> <h3>Mein Benutzer-Status</h3> <input type="radio" class="box-from-label" name="userStatus" value="paid" id="userStatusPaid" <?js if(account.mark == 9) {?>checked="checked"<?js } ?> /><label class="radio" for="userStatusPaid"> {{p.User.MARK[9]}}: <span class="user um9">{{p.user.name}}</span> </label> <input type="radio" class="box-from-label" name="userStatus" value="default" id="userStatusDefault" <?js if(account.mark == account.markDefault) {?>checked="checked"<?js } ?> /><label class="radio" for="userStatusDefault"> {{p.User.MARK[account.markDefault]}}: <span class="user um{account.markDefault}">{{p.user.name}}</span> </label> </div> </div> <div class="form-row"> <input type="submit" value="Einstellungen speichern" class="confirm settings-save"/> </div> </form> <?js } else if( tab == \'account\') { ?> <form method="post" id="settings-email-form" class="form-section"> <h2>E-Mail Adresse ändern</h2> <div class="form-row"> <label>Derzeitiges Passwort:</label> <input type="password" name="currentPassword" class="text-line" placeholder="Passwort"/> <?js if( error === \'passwordInvalid\' && emailChanged ) { ?> <p class="warn">Passwort ungültig. Änderungen wurden nicht gespeichert.</p> <?js } ?> </div> <div class="form-row"> <label>E-Mail Adresse:</label> <input type="email" name="email" value="{{account.email}}" class="text-line" placeholder="E-Mail Adresse"/> <?js if( error === \'emailInUse\' ) { ?> <p class="warn">Diese E-Mail Adresse ist schon in Verwendung</p> <?js } else if( error === \'emailInvalid\' ) { ?> <p class="warn">Ungültige E-Mail Adresse</p> <?js } ?> </div> <div class="form-row"> <input type="submit" value="E-Mail Adresse ändern" class="confirm settings-save"/> </div> </form> <form method="post" id="settings-password-form" class="form-section"> <h2>Passwort ändern</h2> <div class="form-row"> <label>Derzeitiges Passwort:</label> <input type="password" name="currentPassword" class="text-line" placeholder="Passwort"/> <?js if( error === \'passwordInvalid\' && passwordChanged ) { ?> <p class="warn">Passwort ungültig. Änderungen wurden nicht gespeichert.</p> <?js } ?> </div> <div class="form-row"> <label>Neues Passwort <span class="field-details">(Mindestens 6 Zeichen)</span>:</label> <input type="password" name="password" class="text-line" placeholder="Neues Passwort"/> <?js if( error === \'passwordTooShort\' ) { ?> <p class="warn">Passwort zu kurz</p> <?js } ?> </div> <div class="form-row"> <input type="submit" value="Passwort ändern" class="confirm settings-save"/> </div> </form> <?js } else if( tab == \'invites\') { ?> <p> Wenn Du keine Neuschwuchtel oder Fliesentischbesitzer bist und ein paar Invites übrig hast, kannst du hier Deine Freunde zu pr0gramm einladen. Genauere Informationen findest Du in den FAQ: <a href="#faq:invites">Wie funktioniert das mit den Invites?</a> </p> <p class="warn"> Beachte, dass Du für jeden eingeladenen Benutzer bürgst und automatisch bei jedem Ban für die halbe Zeit mit gebannt wirst! </p> <?js if( account.invites == 0) {?> <p><em>Derzeit keine Invites vorhanden</em></p> <?js } else { ?> <h3>Vorhandene Invites: {account.invites}</h3> <form method="post" id="settings-invite-form"> <div class="form-row"> <input type="email" name="email" value="" placeholder="E-Mail Adresse" class="text-line"/> <input type="submit" value="Einladung verschicken" class="settings-save"/> <?js if( error === \'emailInUse\' ) { ?> <p class="warn">Diese E-Mail Adresse ist schon in Verwendung</p> <?js } else if( error === \'emailInvalid\' ) { ?> <p class="warn">Ungültige E-Mail Adresse</p> <?js } ?> </div> </form> <?js } ?> <?js if( inviteSent ) { ?> <p class="success"> Der Invite wurde verschickt. Wird der Invite innerhalb von 7 Tagen nicht eingelöst, wird er deaktiviert und Dir wieder gut geschrieben. </p> <?js } ?> <?js if( invited.length ) { ?> <div class="pane"> <h2>Bisher versendete Invites</h2> <?js for( var i =0; i < invited.length; i++ ) { var inv = invited[i]; ?> <div> <?js if(inv.name) {?> <a href="#user/{inv.name}" class="user um{inv.mark}">{inv.name}</a> <?js } else { ?> <span class="unimportant">{inv.email} (noch nicht eingelöst)</span> <?js } ?> <span class="time" title="{inv.created.readableTime()}">{inv.created.relativeTime()}</span> </div> <?js } ?> </div> <?js } ?> <?js } ?> <?js } ?> </div> ',
    data: {
        error: null,
        saved: false,
        tab: 'bookmarklet',
        emailChanged: false,
        passwordChanged: false,
        account: {
            email: '',
            likesArePublic: false,
            invites: 0
        },
        inviteSent: false,
    },
    init: function(container, parent) {
        this.parent(container, parent);
        p.mainView.setTab(null);
    },
    show: function(params) {
        if (!p.user.id) {
            p.navigateTo('');
            return false;
        }
        if (params.token) {
            this.renderLoading();
            this.data.tab = 'account';
            p.api.post('user.changeemail', {
                token: params.token
            }, this.changedEmail.bind(this));
            return;
        }
        this.data.tab = params.tab || 'site';
        return this.parent(params);
    },
    load: function() {
        p.api.get('user.info', {}, this.loaded.bind(this));
        return false;
    },
    loaded: function(response) {
        this.data.account = response.account;
        this.data.invited = response.invited;
        if (this.data.account.paidUntil) {
            this.data.account.paidUntil = new Date(this.data.account.paidUntil * 1000);
        }
        for (var i = 0; i < this.data.invited.length; i++) {
            this.data.invited[i].created = new Date(this.data.invited[i].created * 1000);
        }
        this.render();
    },
    render: function() {
        this.parent();
        $('#settings-logout-link').fastclick(this.logout.bind(this));
        this.$container.find('.bookmarklet').fastclick(this.bookmarkClick.bind(this));
        var that = this;
        this.$container.find('#settings-site-form').submit(function(ev) {
            p.user.setShowAds($('#showAdsOn').prop('checked'));
            p.api.post('user.sitesettings', ev.currentTarget, that.posted.bind(that));
            that.renderLoading('#settings-site-form');
            return false;
        });
        this.$container.find('#settings-email-form').submit(function(ev) {
            that.data.emailChanged = true;
            p.api.post('user.requestemailchange', ev.currentTarget, that.posted.bind(that));
            that.renderLoading('#settings-email-form');
            return false;
        });
        this.$container.find('#settings-password-form').submit(function(ev) {
            that.data.passwordChanged = true;
            p.api.post('user.changepassword', ev.currentTarget, that.posted.bind(that));
            that.renderLoading('#settings-password-form');
            return false;
        });
        this.$container.find('#settings-invite-form').submit(function(ev) {
            p.api.post('user.invite', ev.currentTarget, that.invited.bind(that));
            that.renderLoading('#settings-invite-form');
            return false;
        });
        this.data.saved = false;
    },
    posted: function(response) {
        if (!response.error) {
            this.data.account = response.account;
            this.data.saved = true;
        }
        this.data.error = response.error;
        this.render();
        this.data.passwordChanged = false;
        this.data.emailChanged = false;
    },
    changedEmail: function(response) {
        if (!response.error) {
            this.data.account = response.account;
            this.data.saved = true;
        }
        this.data.error = response.error;
        this.show({
            tab: 'account'
        });
    },
    invited: function(response) {
        if (!response.error) {
            this.data.account = response.account;
        }
        this.data.error = response.error;
        this.data.inviteSent = !response.error;
        this.render();
        this.data.inviteSent = false;
    },
    bookmarkClick: function(ev) {
        alert('Ziehe den Link in deine Lesezeichenleiste!');
        return false;
    },
    logout: function(ev) {
        p.user.logout();
        p.mainView.setUserStatus(false);
        p.navigateTo('', p.NAVIGATE.FORCE);
        return false;
    }
});
p.View.Rules = p.View.Base.extend({
    template: '<h3>DAS KLEINGEDRUCKTE &ndash; LIES ES!</h3> <ol class="fine-print"> <li>nsfw/nsfl Bilder müssen vor dem Upload entsprechend markiert werden!</li> <li>Keine suggestiven Bilder oder Gore von/mit Minderjährigen/Babys/Föten.</li> <li>Keine Tierpornos.</li> <li>Kein stumpfer Rassismus, kein rechtes Gedankengut, keine Nazi-Nostalgie.</li> <li>Keine Werbung; keine Affiliate Links in den Bildern; kein Spam.</li> <li>Keine Informationen oder Bilder von Privatpersonen; Keine Klarnamen in den Uploads, Tags oder Kommentaren.</li> <li>Ein Mindestmaß an Bildqualität wird erwartet. Bildmaterial mit starken Kompressionsartefakten, übermäßig großen Watermarks oder unsinnig beschnittene/skalierte Bilder werden gelöscht.</li> <li>Keine Bilder mit ähnlichem Inhalt in Reihe. Zugehöriger Content kann in den Kommentaren verlinkt werden.</li> <li> Kommentare wie <em>“Tag deinen Scheiß”</em> und ähnliches gehören nicht in die Tags. Genaueres im FAQ: <a href="#faq:tags">Was gehört in die Tags?</a> </li> <li>Downvote-Spam, Vote-Manipulation und Tag-Vandalismus werden nicht geduldet.</li> <li>Pro Benutzer ist nur ein Account erlaubt. Indizien für Multiaccounts sind gegenseitige Upvotes oder Spamaktionen.</li> <li>Keine Warez, gestohlene Logins zu Pay Sites o.ä</li> </ol> <p class="warn"> Unfähigkeit, diese Regeln zu befolgen, wird mit einer Sperrung Deines Accounts honoriert. Diskussionen um die Sperrung werden die Sperrung verlängern. </p> '
});
p.View.UploadSimilar = p.View.Base.extend({
    template: '<p class="warn"> Wir haben ein paar Bilder mit ähnlichem Fingerprint gefunden. Bist Du sicher, dass es sich nicht um einen Repost handelt? </p> <div class="upload-similar-images"> <?js for( var i = 0; i < similar.length; i++ ) { var item = similar[i]; ?> <a href="/new/{item.id}" target="_blank" class="similar-thumb"><img src="{item.thumb}"/></a> <?js } ?> </div> ',
    show: function(similar) {
        for (var i = 0; i < similar.length; i++) {
            var item = similar[i];
            item.thumb = CONFIG.PATH.THUMBS + item.thumb;
            item.image = CONFIG.PATH.IMAGES + item.image;
            item.fullsize = item.fullsize ? CONFIG.PATH.FULLSIZE + item.fullsize : null;
        }
        this.data.similar = similar;
        this.parent();
    }
});
p.View.Upload = p.View.Base.extend({
    template: '<h1 class="pane-head">Bild hochladen</h1> <div class="pane form-page"> <?js if( !supportsFileUpload ) { ?> <h2 class="warn"> Datei-Upload wird nicht unterstüzt. Vielleicht solltest du mal überlegen nicht so einen Unterschichten-Brauser zu benutzen. </h2> <?js } else { ?> <?js if( error ) {?> <p class="warn"> <?js if( error === \'invalidType\' ) {?> Ungültiger Dateityp. Nur JPEG, PNG, GIF oder WebM erlaubt. <?js } else if( error === \'invalid\' ) {?> Bild ist ungültig oder zu groß. <?js } else if( error === \'blacklisted\' ) {?> Bild oder Domain gesperrt. <?js } else if( error === \'internal\' ) {?> Interner Fehler bei der Verarbeitung. <?js } else if( error === \'download\' ) {?> Download fehlgeschlagen (4MB/8MB max). <?js } else if( error === \'missingData\' ) {?> Kein Bild oder URL angegeben. <?js } ?> </p> <?js } ?> <form id="upload-form"> <div id="upload-source"> <div id="upload-droparea"> Bild auswählen <?js if( supportsDragDrop ) { ?> oder per Drag &amp; Drop reinziehen <?js } ?> </div> <div> <h3 class="upload-enter-url">oder URL angeben</h3> <input type="text" name="imageUrl" id="upload-url" placeholder="http://" class="wide"/> <input type="file" name="image" id="upload-file"/> </div> </div> <p> JPEG, PNG, GIF mit min. 0,09 Megapixel (z.B. 300×300), max. 16,7 Megapixel (z.B. 4096×4096). WebM nur mit VP8 Codec, max. 120sek, keine Audiospur. Max Dateigröße ist 4MB bzw. 8MB für <a href="#pr0mium">pr0mium-Accounts</a>. </p> <div id="upload-progress"> <div id="upload-preview"></div> <div class="progress-bar"> <div class="progress"></div> </div> </div> <div class="upload-tag-container"> <div class="sfw-status"> <input type="radio" class="box-from-label" name="sfwstatus" value="sfw" id="ratingSfw"> <label title="Safe for Work" for="ratingSfw">sfw</label> <input type="radio" class="box-from-label" name="sfwstatus" value="nsfw" id="ratingNsfw"> <label title="Not Safe for Work" for="ratingNsfw">nsfw</label> <input type="radio" class="box-from-label" name="sfwstatus" value="nsfl" id="ratingNsfl"> <label title="Not Safe for Life" for="ratingNsfl">nsfl</label> </div> <h3>SFW-Status und Tags</h3> <input type="text" class="upload-tagsinput" name="tags"/> </div> <div class="upload-similar"></div> <div> <input type="hidden" name="checkSimilar" value="1"/> <input type="submit" class="button" value="Bild Hochladen" disabled="disabled"/> </div> <input type="hidden" name="key" value=""/> </form> <?js } ?> <div class="post-rules"></div> </div> ',
    data: {
        error: null
    },
    uploadInProgress: false,
    postInProgess: false,
    hasUpload: false,
    init: function(container, parent) {
        this.parent(container, parent);
        p.mainView.setTab(null);
    },
    show: function(params) {
        if (!p.user.id) {
            p.navigateTo('');
            return false;
        }
        this.data.tab = params.tab || 'bookmarklet';
        return this.parent(params);
    },
    load: function() {
        p.api.post('items.ratelimited');
        return true;
    },
    render: function() {
        this.data.supportsFileUpload = this.supportsFileUpload();
        this.data.supportsDragDrop = this.supportsDragDrop();
        this.parent();
        var that = this;
        var tags = this.$container.find('.upload-tagsinput');
        tags.tagsInput(CONFIG.TAGS_INPUT_SETTINGS);
        this.$container.find('input[name=sfwstatus]').change(function() {
            that.setSFWTags($(this));
        });
        var $dropTargets = this.$container.find('#upload-droparea').add('body');
        var $dropArea = this.$container.find('#upload-droparea');
        $dropTargets.on('dragover', function() {
            $dropArea.addClass('active');
            return false;
        });
        $dropTargets.on('dragend dragout dragleave', function() {
            $dropArea.removeClass('active');
            return false;
        });
        $dropTargets.on('drop', function(ev) {
            $dropArea.removeClass('active');
            ev.preventDefault();
            that.readFiles(ev.originalEvent.dataTransfer.files);
            return false;
        });
        var $fileSelect = this.$container.find('#upload-file');
        $dropArea.on('click', function() {
            $fileSelect.click();
        });
        var fileUpload = this.$container.find('#upload-file');
        fileUpload.on('change', function(ev) {
            that.readFiles(this.files);
        });
        this.$container.find('#upload-url').on('change keypress paste', function(ev) {
            setTimeout(that.validateUrl.bind(that, ev), 1);
        });
        this.$container.find('#upload-form').submit(this.submit.bind(this));
        this.rulesView = new p.View.Rules(this.$container.find('.post-rules'), this);
        this.rulesView.show();
    },
    setSFWTags: function($radio) {
        var tags = this.$container.find('.upload-tagsinput');
        var status = $radio.val();
        tags.removeTag('nsfw');
        tags.removeTag('nsfl');
        if (status != 'sfw') {
            tags.addTag(status);
        }
    },
    validateUrl: function(ev) {
        var url = $(ev.target).val();
        if (this.hasUpload || url.match(/^https?:\/\/[^\s\/$.?#].[^\s]*$/i)) {
            this.$container.find('input[type=submit]').removeAttr('disabled');
        } else {
            this.$container.find('input[type=submit]').attr('disabled', 'disabled');
        }
    },
    remove: function() {
        $('body').off('dragover dragend dragout dragleave drop');
    },
    submit: function(ev) {
        var imageUrl = this.$container.find('input[name=imageUrl]').val();
        if (this.uploadInProgress || this.postInProgess || (!imageUrl && !this.hasUpload)) {
            return false;
        }
        if (!this.$container.find('input[name=sfwstatus]:checked').length) {
            this.$container.find('.sfw-status').highlight(252, 136, 52, 1);
            return false;
        }
        this.postInProgress = true;
        this.$container.find('input[type=submit]').attr('disabled', 'disabled');
        p.api.post('items.post', ev.target, this.posted.bind(this));
        return false;
    },
    posted: function(response) {
        if (response.error) {
            if (response.error == 'similar') {
                this.similarView = new p.View.UploadSimilar(this.$container.find('.upload-similar'), this);
                this.similarView.show(response.similar);
                this.$container.find('input[type=submit]').removeAttr('disabled');
                this.$container.find('input[name=checkSimilar]').val(0);
            } else {
                this.data.error = response.error;
                this.render();
            }
        } else {
            p.mainView.closeOverlay();
            p.user.voteCache.votes.items[response.item.id] = 1;
            p.navigateTo('new/' + response.item.id);
        }
    },
    readFiles: function(files) {
        this.data.error = null;
        this.$container.find('.warn').remove();
        var file = files[0];
        if (!file || CONFIG.API.ALLOWED_UPLOAD_TYPES.indexOf(file.type) === -1) {
            this.data.error = 'invalidType';
            this.render();
            return;
        }
        this.currentFileType = file.type;
        this.uploadInProgress = true;
        this.$container.find('input[type=submit]').attr('disabled', 'disabled');
        var reader = new FileReader();
        reader.onload = this.previewLoaded.bind(this);
        reader.readAsDataURL(file);
        var that = this;
        var formData = new FormData();
        formData.append('image', file);
        var req = new XMLHttpRequest();
        req.onload = function(ev) {
            that.uploadComplete(req);
        };
        req.onerror = function(ev) {
            that.uploadError(req);
        };
        if (req.upload) {
            req.upload.onprogress = this.uploadProgress.bind(this);
        }
        req.open('POST', CONFIG.API.ENDPOINT + 'items/upload');
        req.send(formData);
    },
    previewLoaded: function(ev) {
        this.$container.find('#upload-source').remove();
        this.$container.find('#upload-preview').show();
        if (this.currentFileType.match(/^video/)) {
            var video = $('<video autoplay loop/>').attr('src', ev.target.result);
            this.$container.find('#upload-preview').append(video);
        } else if (this.currentFileType.match(/^image/)) {
            var image = $('<img/>');
            image.attr('src', ev.target.result);
            this.$container.find('#upload-preview').append(image);
        }
    },
    uploadError: function(req) {
        this.data.error = 'invalid';
        this.render();
    },
    uploadComplete: function(req) {
        if (req.status !== 200) {
            this.uploadError(req);
            return;
        }
        this.uploadInProgress = false;
        this.hasUpload = true;
        this.setProgress(1.0);
        var response = JSON.parse(req.responseText);
        this.$container.find('input[type=submit]').removeAttr('disabled');
        this.$container.find('input[name=key]').val(response.key);
    },
    uploadProgress: function(ev) {
        if (!ev.lengthComputable) {
            return;
        }
        var progress = (ev.loaded / ev.total);
        this.setProgress(progress);
    },
    setProgress: function(progress) {
        var progress = Math.round(progress * 100);
        this.$container.find('.progress').css('width', progress + '%');
    },
    supportsFileUpload: function() {
        return (typeof FileReader != 'undefined' && !!window.FormData && 'upload' in new XMLHttpRequest);
    },
    supportsDragDrop: function() {
        return ('draggable' in document.createElement('span'));
    }
});
p.View.Contact = p.View.Base.extend({
    template: '<h1 class="pane-head">Kontakt</h1> <div class="pane form-page"> <?js if(sent) { ?> <p>Deine Nachricht wurde verschickt!</p> <?js } else { ?> <form class="contact-form" method="post"> <p> Bevor Du uns schreibst, schau bitte ob deine Frage nicht bereits im <a href="#faq">FAQ</a> beantwortet wurde. </p> <div class="form-row"> <input type="text" class="text-line" name="subject" required placeholder="Betreff"/> </div> <div class="form-row"> <input type="email" name="email" required placeholder="E-Mail Adresse"/> </div> <textarea name="message" required placeholder="Nachricht"></textarea> <p> Für <span class="warn">Löschanfragen</span> bitte die <span class="warn">exakte Adresse (URL)</span>, sowie ausreichende Beweise angeben, dass Du der Urheber des Bildes bist oder in seinem Auftrag handelst. </p> <p> Anfragen nach Invites werden nicht beantwortet. </p> <div> <input type="submit" value="Abschicken"/> </div> </form> <?js } ?> </div> <div class="pane form-page"> <h2>Advertisers</h2> <p> For advertisment inqueries contact us at <a href="mailto:affiliates@pr0gramm.com">affiliates@pr0gramm.com</a>. Please note that we respect our users and therefore refuse to show overly obtrusive or annoying ads (popups, popunders, layers, audio ads etc.). </p> <p class="faint-footer"> <a href="#tos">AGB und Widerrufsbelehrung</a> / <a href="#imprint">Impressum</a> </p> </div>',
    data: {
        sent: false
    },
    render: function() {
        this.parent();
        this.$container.find('form').submit(this.submit.bind(this));
        this.focus('input[name=subject]');
    },
    submit: function(ev) {
        if ($('input[name=subject]').val().match(/^\s*$/)) {
            $('input[name=subject]').highlight(252, 136, 52, 1, 200, function(el) {
                el.css('background-color', '#1B1E1F');
            });
            return false;
        }
        if (!$('input[name=email]').val().match(/.+@.+\..+/)) {
            $('input[name=subject]').highlight(252, 136, 52, 1, 200, function(el) {
                el.css('background-color', '#1B1E1F');
            });
            return false;
        }
        p.api.post('contact.send', ev.target, this.posted.bind(this));
        this.renderLoading();
        return false;
    },
    posted: function(response) {
        this.data.sent = true;
        this.render();
    }
});
p.View.FAQ = p.View.Base.extend({
    template: '<h1 class="pane-head">FAQ - Häufig gestellte Fragen</h1> <div class="pane form-page"> <h2>Inhalt</h2> <ul> <li><a href="#faq:rules">Gibt es hier Regeln?</a></li> <li><a href="#faq:benis">Wieso ist mein Benis so kurz?</a></li> <li><a href="#faq:rate-limit">Was ist <em>403 – Limit Reached</em>?</a></li> <li><a href="#faq:tags">Was gehört in die Tags?</a></li> <li><a href="#faq:score">Warum sehe ich bei manchen Bildern keine Punktzahl?</a></li> <li><a href="#faq:pr0mium">Kann ich mit einem pr0mium-Account gebannt werden?</a></li> <li><a href="#faq:invites">Wie kann ich mich registrieren? Wie funktioniert das mit den Invites?</a></li> <li><a href="#faq:delete">Wie kann ich ein Bild von mir löschen?</a></li> <li><a href="#faq:account-delete">Wie kann ich meinen Account löschen?</a></li> <li><a href="#faq:rename">Wie kann ich meinen Benutzernamen ändern?</a></li> <li><a href="#faq:ban">Warum bin ich gebannt?</a></li> <li><a href="#faq:registration-mail">Wieso bekomme ich keine Registrierungsmail?</a></li> <li><a href="#faq:user-status">Was bedeuten die farbigen Punkte hinter den Benutzernamen?</a></li> <li><a href="#faq:shortcuts">Welche Keyboard-Shortcuts gibt es?</a></li> </ul> <h2 class="section" id="section-rules">Gibt es hier Regeln?</h2> <p>Ja.</p> <div class="faq-rules"></div> <h2 class="section" id="section-benis">Wieso ist mein Benis so kurz?</h2> <p> Der Benis ist Summe aller Votes die Du erhalten hast. Dein Benis verlängert oder verkürzt sich mit jedem positiven oder negativen Vote, den Deine Kommentare, Tags oder Bilder erhalten. </p> <p> Wenn Dein Benis zu kurz ist, solltest Du aufhören so viel Scheiße zu posten. </p> <h2 class="section" id="section-rate-limit">Was ist <em>403 – Limit Reached</em>?</h2> <p> Alle Aktionen (Kommentare oder Tags schreiben, Bilder hochladen etc.) haben ein bestimmtes Limit. Wenn dieses Limit erreicht ist, musst Du eine Weile warten, bis Du die Aktion nochmal ausführen darfst. </p> <p> Kommentare, Private Nachrichten, Tags und Votes sind stündlich limitiert. </p> <p> Das Limit für Bilder gilt für ca. einen Tag und ist von der Benislänge abhängig: Bei Microbenis 1 Bild, ab 100 Benis 3 Bilder, ab 1000 Benis 5 Bilder. </p> <h2 class="section" id="section-tags">Was gehört in die Tags?</h2> <p> Die Tags sind primär dazu gedacht, Bilder über die Suchfunktion wieder finden zu können. Sie sollten hauptsächlich den Bildinhalt beschreiben. Stellt euch die Frage <em>"Wenn ich dieses Bild in 3 Monaten suche, wonach würde ich suchen?"</em> </p> <p> Generell bedeutet das, dass auch Tags die nicht direkt den Inhalt des Bildes beschreiben sondern das Bild anderweitig klassifizieren, bei der Suche hilfreich sein können. Beispiele für solche Tags sind <a href="#top/verdient">verdient</a>, <a href="#top/guter loop">guter loop</a>, <a href="#top/unerwartet">unerwartet</a> oder <a href="#top/kreiselficker">kreiselficker</a>. </p> <p> Kommentare haben in den Tags nichts verloren. Besonders unerwünscht sind Tags wie <em>"Tag deinen Scheiß"</em> (wenn ihr ein ungetaggtes Bild seht, tagt es selbst und kassiert den Benis dafür), <em>"Da drückste plus/minus"</em> (erzähl mir nicht was ich zu drücken hab) oder <em>"für mehr XYZ auf pro"</em>. Alles was aus mehr als 3 oder 4 Wörtern besteht, ist da generell verdächtig. </p> Da es für die Moderatoren und Admins unmöglich ist, alle Tags zu überwachen, bitten wir Euch darum unnötige Tags und Sprüche downzuvoten. Falls Euch Spam auffällt (z.B. der gleiche, unnütze Tag bei vielen neuen Bildern), wendet Euch bitte an einen der Moderatoren. </p> <h2 class="section" id="section-score">Warum sehe ich bei manchen Bildern keine Punktzahl?</h2> <p> Die aktuelle Punktzahl wird bei neuen Posts für die ersten 60 Minuten versteckt. Das dient dazu "Vote-Bias" und blinde Mitläufer-Votes zu verhindern. </p> <h2 class="section" id="section-pr0mium">Kann ich mit einem pr0mium-Account gebannt werden?</h2> <p> Ja. An den Regeln ändert sich auch für pr0mium User nichts. Falls Du gebannt wirst, wird Dir allerdings die gebannte Zeit auf Deinem pr0mium-Account gutgeschrieben. Du zahlst nur für die Zeit, die Dein pr0mium-Account tatsächlich nutzbar ist. </p> <h2 class="section" id="section-invites">Wie kann ich mich registrieren? Wie funktioniert das mit den Invites?</h2> <p> Um einen Account zu erstellen, kannst Du entweder einen <a href="#pr0mium">pr0mium-Code kaufen</a> oder Dich von einem anderen Benutzer einladen lassen. </p> <p> An jedem 1. eines Monats verteilt unser System 3 Invites an alle Benutzer die weder Neuschwuchtel noch Fliesentischbesitzer sind. Diese Invites können bei <em>Einstellungen » Invites</em> per E-Mail verschickt werden. Nicht verwendete Invites verfallen nach einem Monat. </p> <p> Ihr bürgt für jeden von euch eingeladenen Benutzer mit der halben Ban-Zeit. D.h. wenn ein Benutzer, den Du eingeladen hast, für 10 Tage gebannt wird, wird dein Account automatisch auch für 5 Tage gebannt. Bei einem Permaban von einem von dir eingeladenen Benutzer, wird dein Account für 30 Tage gebannt. </p> <p> Die Bürgschaft läuft über alle Ebenen: Wenn Du <em>Hans</em> einlädst, der wiederum <em>Peter</em> einlädt, wird bei einem 10 tägigen Ban von <em>Peter</em> auch <em>Hans</em> für 5 Tage gebannt und Du selbst für 2.5 Tage. </p> <p> Der Verkauf von Invites, in welcher Form auch immer, führt zum sofortigen Ban aller beteiligten Accounts. </p> <h2 class="section" id="section-delete">Wie kann ich ein Bild von mir löschen?</h2> <p> Wenn es Deine Schulfreunde nicht so lustig fanden, auf pr0gramm gelandet zu sein wie Du dachtest, oder es sonstige triftige Gründe für eine Löschung gibt, kannst Du uns über das <a href="#contact">Kontaktformular</a> eine Löschanfrage schicken. </p> <p> Wenn Du ein Bild gelöscht haben möchtest, nur weil es viele Downvotes erhält, hast Du Pech gehabt. Vielleicht solltest Du aufhören so viel Scheiße zu posten. </p> <h2 class="section" id="section-account-delete">Wie kann ich meinen Account löschen?</h2> <p> Wir löschen keine Accounts, da dadurch auch zwangsläufig Likes und Votes anderer Benutzer mit gerissen werden würden. In Extremfällen (stalking etc.) können wir Accounts umbenennen oder spezifische private Uploads löschen. Benutze das <a href="#contact">Kontaktformular</a> um Deinen Fall zu schildern. </p> <h2 class="section" id="section-rename">Wie kann ich meinen Benutzernamen ändern?</h2> <p> Den Benutzernamen ändern wir auf Anfrage nur unter besonderen Umständen. Ändern einzelner Buchstaben oder der Wechsel von einem Fantasienamen zu einem anderen gehören beispielsweise nicht dazu. Siehe auch <a href="#faq:account-delete">Wie kann ich meinen Account löschen?</a> </p> <h2 class="section" id="section-ban">Warum bin ich gebannt?</h2> <p> Den Bangrund und die Dauer bekommst Du angezeigt, wenn Du versuchst Dich erneut einzuloggen. </p> <h2 class="section" id="section-registration-mail">Wieso bekomme ich keine Registrierungsmail?</h2> <p> Generell machen <strong>Yahoo</strong>, <strong>Freenet</strong> und <strong>GMX</strong> viele Mucken bei unseren Mails. Schau dort auf jeden Fall mal ob die Mail nicht in Spam-Filter hängen geblieben ist. Wenn Du keine Mail bekommen hast, probier <a href="https://mail.google.com">GMail</a>. </p> <h2 class="section" id="section-user-status">Was bedeuten die farbigen Punkte hinter den Benutzernamen?</h2> <p> Die farbigen Punkte geben den Status an. Welcher das genau ist, steht auf der Profilseite des jeweiligen Benutzers. </p> <p> Neuschwuchteln, die eine Mindest-Benislänge von 500 haben und seit mehr als einem Monat dabei sind, wird der Neuschwuchtelstatus abgenommen. </p> <h2 class="section" id="section-shortcuts">Welche Keyboard-Shortcuts gibt es?</h2> <ul> <li><strong>Pfeiltasten</strong> – Nächstes/vorheriges Bild</li> <li><strong>K</strong> – Zur Suche springen</li> <li><strong>T</strong> – Zu den Tags springen</li> <li><strong>C</strong> – Zu den Kommentaren springen</li> <li><strong>W/S</strong> – Bild hoch-/runter-voten</li> <li><strong>F</strong> – Bild favorisieren</li> </ul> <h2 class="section">Warum ist das neue Design so scheiße, Du Sohn einer blutenden Hafenhure?</h2> <p> Deine Mutter hat mir dabei geholfen :/ </p> </div> ',
    rulesView: null,
    render: function() {
        this.parent();
        this.rulesView = new p.View.Rules(this.$container.find('.faq-rules'), this);
        this.rulesView.show();
        this.fragmentChange(p.getFragment());
    },
    fragmentChange: function(fragment) {
        var target = fragment ? $('#section-' + fragment) : null;
        if (target && target.length) {
            var jumpPos = target.offset().top - CONFIG.HEADER_HEIGHT - 80;
            target.highlight(180, 180, 180, 1);
            $(document).scrollTop(jumpPos);
        }
    }
});
p.View.BuyCode = p.View.BuyCode || {};
p.View.BuyCode.BitcoinInfo = p.View.Base.extend({
    template: '<h1 class="pane-head">Bitcoin Zahlung</h1> <div class="pane form-page"> <p> Eine neue Bezahladresse wurde für Dich generiert: </p> <h2>Betrag: {params.amount} BTC</h2> <h2> Adresse: <a class="force-case" target="_blank" href="https://blockchain.info/address/{{params.address}}"> {{params.address}} </a> </h2> <p> Sobald wir auf diese Adresse Deine Zahlung erhalten haben, bekommst Du eine <?js if(p.user.id){?>Private Nachricht und eine<?js }?> E-Mail mit Deinem pr0mium-code von uns. <?js if( !p.user.id ){?> <span class="warn"> Schau bitte auch unbedingt in den Spam-Ordner deines Mail-Anbieters! </span> Hotmail und Yahoo verschlucken sowas gern. <?js } ?> </p> <p> Wenn Du Fragen hast, wende dich bitte über das <a href="#contact">Kontakt-Formular</a> an uns. </p> </div>'
});
p.View.BuyCode = p.View.BuyCode || {};
p.View.BuyCode.Products = p.View.Base.extend({
    data: {
        error: null,
        account: {
            email: '',
            paidUntil: null
        }
    },
    template: '<h1 class="pane-head">pr0mium Account</h1> <div class="pane form-page"> <div class="divide-3-1"> <h2 class="feature-head">Werbefrei</h2> <div class="feature-icon"> <img src="/media/pr0mium/star.png" alt=""/> </div> <p class="feature-description"> Das pr0gramm wie es sein sollte: ohne Werbebanner und drölf Prozent Schneller. </p> </div> <div class="divide-3-2"> <h2 class="feature-head">Stelzen</h2> <div class="feature-icon"> <img src="/media/pr0mium/binoculars.png" alt=""/> </div> <p class="feature-description"> Folge Deinen Lieblings-Usern und verpasse nie wieder einen Upload. </p> </div> <div class="divide-3-3"> <h2 class="feature-head">admins füttern</h2> <div class="feature-icon"> <img src="/media/pr0mium/burger.png" alt=""/> </div> <p class="feature-description"> Unterstütze die Weiterentwicklung von pr0gramm. </p> </div> <div class="clear spacing"></div> <p> Als pr0mium-User darfst Du außerdem Dateien mit bis zu 8MB hochladen (statt nur 4MB). Zudem hast Du die Wahl, ob Du als “Edler Spender” oder mit Deinem normalen Status angezeigt wirst. </p> <p> Viele weitere Features werden folgen! </p> <div class="clear spacing"></div> <div class="divide-2-1"> <div class="product-description" id="product-pr0mium90"> <div class="product-text"> <h2><?js if( !p.user.id ) {?>Account +<br/><?js } ?>3 Monate pr0mium</h2> <p> <?js if( !p.user.id ) {?>Dein neuer pr0gramm-Account und<?js } ?> 3 Monate lang alle pr0mium Features. </p> <p> Nach Ablauf der 3 Monate ist dein Account weiterhin ohne die pr0mium Features nutzbar. </p> </div> <h1 class="price"><span class="price-detail">einmalig</span> 9<span class="price-symbol">€</span></h1> <span class="confirm-button product-select" data-name="pr0mium90">3 Monate auswählen</span> </div> </div> <div class="divide-2-2"> <div class="product-description" id="product-pr0mium365"> <div class="product-text"> <h2><?js if( !p.user.id ) {?>Account +<br/><?js } ?>12 Monate pr0mium</h2> <p> <?js if( !p.user.id ) {?>Dein neuer pr0gramm-Account und<?js } ?> 12 Monate lang alle pr0mium Features. </p> <p> Nach Ablauf der 12 Monate ist dein Account weiterhin ohne die pr0mium Features nutzbar. </p> </div> <h1 class="price"><span class="price-detail">einmalig</span> 29<span class="price-symbol">€</span></h1> <span class="confirm-button product-select" data-name="pr0mium365">12 Monate auswählen</span> </div> </div> <div class="clear" id="step-2"></div> <form method="post" id="payment-form"> <h2 id="head-pr0mium90"> <?js if( !p.user.id ) {?>Account + <?js } ?> 3 Monate pr0mium für 9€ kaufen </h2> <h2 id="head-pr0mium365"> <?js if( !p.user.id ) {?>Account + <?js } ?> 12 Monate pr0mium für 29€ kaufen </h2> <p> Sofort nach Bestätigung Deiner Zahlung bekommst Du von uns eine E-Mail mit deinem pr0mium-Code. </p> <div class="form-row"> <h3>Deine E-Mail Adresse:</h3> <input type="email" name="email" value="{{account.email}}" required class="text-line important" placeholder="E-Mail Adresse"/> <p class="warn" id="email-invalid">Ungültige E-Mail Adresse</p> </div> <div class="form-row" id="tos-row"> <input type="checkbox" class="box-from-label" id="tos" name="tos"/> <label for="tos">Ich habe die <a target="_blank" href="/tos">AGB und Widerrufsbelehrung</a> gelesen.</label> </div> <div class="form-row"> <input type="hidden" name="product" value="invalid"/> <div id="submit-loader"></div> <input type="button" class="pay-with-paypal checkout confirm" value="Zahlen mit"/> <input type="button" class="pay-with-bitcoin checkout confirm" value="Zahlen mit Bitcoin"/> </div> </form> <p class="faint-footer"> <a target="_blank" href="/tos">AGB und Widerrufsbelehrung</a> / <a target="_blank" href="/imprint">Impressum</a> </p> </div> ',
    load: function() {
        if (!p.user.id) {
            return true;
        }
        p.api.get('user.info', {}, this.loaded.bind(this));
        return false
    },
    loaded: function(response) {
        this.data.account = response.account;
        if (this.data.account.paidUntil) {
            this.data.account.paidUntil = new Date(this.data.account.paidUntil * 1000);
        }
        this.render();
    },
    render: function() {
        this.parent();
        this.$paymentForm = this.$container.find('#payment-form');
        this.$container.find('.confirm-button.product-select').click(this.selectProduct.bind(this));
        this.$container.find('.checkout').click(this.submit.bind(this));
    },
    selectProduct: function(ev) {
        var name = $(ev.currentTarget).data('name');
        var $selected = this.$container.find('#product-' + name);
        var $deselected = this.$container.find('.product-description').not($selected);
        $selected.removeClass('deselected').addClass('selected');
        $deselected.removeClass('selected').addClass('deselected');
        this.$container.find('#head-pr0mium90, #head-pr0mium365').hide();
        this.$container.find('#head-' + name).show();
        this.$paymentForm.find('#email-invalid').hide();
        this.$paymentForm.find('input[name=product]').val(name);
        if (!p.mobile && !this.$paymentForm.is(':visible')) {
            $('html, body').animate({
                scrollTop: this.$container.find('#step-2').offset().top
            });
            this.$paymentForm.slideDown(function() {
                $('input[name=email]').focus();
            });
        } else if (p.mobile) {
            this.$paymentForm.show();
            $('html, body').scrollTop(this.$container.find('#step-2').offset().top);
        }
    },
    submit: function(ev) {
        var email = $('input[name=email]').val()
        if (!email.match(/.+@.+\..+/)) {
            $('#email-invalid').show();
            return false;
        }
        if (!this.$container.find('input[name=tos]:checked').length) {
            this.$container.find('#tos-row').highlight(252, 136, 52, 1);
            return false;
        }
        $('#email-invalid').hide();
        this.$paymentForm.find('.checkout').hide();
        this.renderLoading('#submit-loader');
        if ($(ev.currentTarget).hasClass('pay-with-paypal')) {
            p.api.post('paypal.getcheckouturl', this.$paymentForm, this.paypalCheckoutResponse.bind(this));
        } else if ($(ev.currentTarget).hasClass('pay-with-bitcoin')) {
            p.api.post('bitcoin.getpaymentaddress', this.$paymentForm, this.bitcoinCheckoutResponse.bind(this));
        }
        return false;
    },
    paypalCheckoutResponse: function(response) {
        if (response.error) {
            this.$paymentForm.find('.checkout').show();
        } else {
            window.location = response.checkoutUrl;
        }
    },
    bitcoinCheckoutResponse: function(response) {
        if (response.error) {
            this.$paymentForm.find('.checkout').show();
        } else {
            p.setView(p.View.BuyCode.BitcoinInfo, response);
        }
    }
});
p.View.BuyCode = p.View.BuyCode || {};
p.View.BuyCode.PaypalThanks = p.View.Base.extend({
    template: '<h1 class="pane-head">Danke <span class="pict">*</span></h1> <div class="pane form-page"> <p> Vielen Dank für den Kauf Deines pr0mium-Codes. Sobald PayPal Deine Zahlung bestätigt, bekommst Du eine <?js if(p.user.id){?>Private Nachricht und eine<?js }?> E-Mail mit Deinem pr0mium-code von uns. </p> <p> In den meisten Fällen kann PayPal die Zahlung sofort bestätigen. Bei neuen, nicht verifizierten PayPal-Accounts kann die Bestätigung 1-2 Tage dauern. Den Status deiner Zahlung siehst Du in deinem PayPal-Account. </p> <?js if( !p.user.id ){ ?> <p> <span class="warn"> Schau bitte auch unbedingt in den Spam-Ordner deines Mail-Anbieters! </span> Hotmail und Yahoo verschlucken sowas gern. </p> <?js } ?> <p> Wenn Du Fragen hast, wende dich bitte über das <a href="#contact">Kontakt-Formular</a> an uns. </p> </div> '
});
p.View.Imprint = p.View.Base.extend({
    template: '<h1 class="pane-head">Impressum</h1> <div class="pane form-page"> <p> Bei Fragen oder sonstigen Anliegen wenden Sie sich bitte über das <a href="#contact">Kontakformular</a> an uns. </p> <p> Suntainment S.L.<br/> Apartado de Correos, 6241<br/> 07157 Port de Andratx<br/> </p> </div> '
});
p.View.TOS = p.View.Base.extend({
    template: '<h1 class="pane-head">AGB / Widerrufsbelehrung</h1> <div class="pane form-page"> <h2>Widerrufsbelehrung</h2> <h3>Widerrufsrecht</h3> <p>Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.</p> <p>Um Ihr Widerrufsrecht auszuüben, müssen Sie uns über das <a href="#contact">Kontaktformular</a> mittels einer eindeutigen Erklärung über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.</p> <h3>Folgen des Widerrufs</h3> <p>Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.</p> <h2 class="section">Allgemeine Nutzungsbedingungen für pr0gramm.com</h2> <h3>1. Definitionen und Geltungsbereich</h3> <p>1.1 Für die Nutzung der kostenpflichtigen Zusatzfunktionen von pr0gramm.com (nachfolgend: „Website“) und für die damit zusammenhängenden Leistungen des Betreibers gelten die nachfolgenden Allgemeinen Geschäftsbedingungen (nachfolgend: „AGB“).</p> <p>1.2 Im Sinne dieser AGB bezeichnet der Begriff „Kunde“ den Nutzer der kostenpflichtigen Version der Website.</p> <h3>2. Leistungen des Betreibers</h3> <p>2.1 Der Betreiber bietet eine kostenfreie Version der Website an. Diese kostenfreie Version der Website erfordert keine Anmeldung und ist für jedermann frei im Internet abrufbar. Sie finanziert sich im Wesentlichen über Werbeeinblendungen.</h3> <p>2.2 Daneben bietet der Betreiber dem Kunden aber auch die Nutzung einer kostenpflichtigen Version der Website an. Die Höhe des Entgelts hängt von der Laufzeit des Produkts ab. Diese kostenpflichtige Version der Website ist im Gegenzug – vorbehaltlich Ziff. 2.3 – frei von Werbung.</p> <p>2.3 Der Betreiber behält sich vor, auch in der kostenpflichtigen Version der Website (Ziff. 2.2) eine Fläche für bezahltes Sponsoring vorzusehen.</p> <p>2.4 Voraussetzung für die Nutzung der kostenpflichtigen Version der Website ist die Einrichtung eines Benutzeraccounts durch den Kunden und der Abschluss eines Vertrags zwischen dem Kunden und dem Betreiber.</p> <h3>3. Leistungen des Kunden und Vertragsschluss</h3> <p>3.1 Der Kunde, der die bezahlte, aber werbefreie Version der Website (Ziff. 2.2) in Anspruch nehmen möchte, muss einen Benutzeraccount einrichten und ein kostenpflichtiges Produkt buchen. Die Produkte mit Laufzeiten und Preisen können in ihrer jeweils aktuellen Fassung der auf der Website abrufbaren Preisliste entnommen werden.</p> <p>3.2 Der Vertrag kommt durch die Annahme des vom Kunden unterbreiteten Angebots durch den Betreiber zustande. Der Kunde gibt sein auf den Vertragsschluss gerichtetes Angebot an den Betreiber dadurch ab, dass er sich als Nutzer von pr0gramm.com registriert, das jeweilige Produkt auf pr0gramm.com auswählt, seine Anmeldedaten und Zahlungsinformationen eingibt und den Button mit der Beschriftung „Zahlen mit PayPal“ oder „Zahlen mit Bitcoin“ betätigt. Das Angebot wird von dem Betreiber dadurch angenommen, dass der Zugang des Kunden zur kostenpflichtigen Version von pr0gramm.com freigeschaltet wird. Über die Freischaltung erhält der Kunde eine gesonderte Nachricht per Email. <h3>4. Preise und Zahlungsbedingungen</h3> <p>4.1 Die angegebenen Preise verstehen sich sämtlich einschließlich der jeweils geltenden deutschen gesetzlichen Umsatzsteuer. Soweit nicht anders angegeben, handelt es sich bei den angegebenen Preisen um monatliche Beiträge.</p> <p>4.2 Der Preis für das vom Kunden gebuchte Produkt wird stets für die gesamte Laufzeit im Voraus sofort zur Zahlung fällig.</p> <p>4.3 Der Betreiber bietet gegebenenfalls verschiedene Zahlungsmöglichkeiten an (z.B. Kreditkarte oder Paypal), ohne hierzu jedoch verpflichtet zu sein. Der Betreiber ist berechtigt, sich zum Zweck der Zahlungsabwicklung und des Forderungseinzugs Dritter zu bedienen. Für die Zahlungsabwicklung über Zahlungssystemanbieter (z.B. PayPal) gelten die Nutzungs- und Geschäftsbedingungen des betreffenden Zahlungssystemanbieters; gegebenenfalls muss der Kunde zudem über ein Benutzerkonto bei dem Anbieter verfügen.</p> <h3>5. Zugangsdaten</h3> <p>5.1 Die Zugangsdaten (Benutzername/Email-Adresse und Passwort) sind ausschließlich für die Nutzung durch den Kunden persönlich bestimmt. Der Kunde darf die Zugangsdaten nicht an Dritte weitergeben oder sie anderweitig offenlegen. Erhält der Kunde Kenntnis von einem Missbrauch seiner Zugangsdaten oder hat er einen solchen Verdacht, muss er dies dem Betreiber umgehend mitteilen. Der Kunde haftet für alle Folgen der unberechtigten Nutzung seiner Zugangsdaten durch Dritte, sofern der Missbrauch der Zugangsdaten von ihm zu vertreten ist. Die Haftung des Kunden endet erst, wenn er den Betreiber über die unberechtigte Nutzung oder das Abhandenkommen der Zugangsdaten informiert und das Passwort geändert hat.</p> <p>5.2 Der Betreiber ist berechtigt, den Account des Kunden bei Verstößen gegen diese Allgemeinen Geschäftsbedingungen, insbesondere wegen falscher Angaben bei der Registrierung und/oder unbefugter Weitergabe der Zugangsdaten, zu sperren und das Produkt außerordentlich und fristlos zu kündigen. Nach einem solchen Fall darf sich der Kunden ohne die vorherige ausdrückliche Zustimmung des Betreibers nicht erneut registrieren.</p> <h3>6. Haftung</h3> <p>6.1 Die Nutzung der Website erfolgt auf eigenes Risiko der Nutzer. Der Betreiber übernimmt keine Haftung für das unterbrechungsfreie, sichere und fehlerfreie Funktionieren der Website, bzw. für verloren gegangene Daten des Nutzers. Die Haftungsbeschränkung gilt nicht für die Verletzung von Leben, Körper oder Gesundheit infolge eines fahrlässigen oder vorsätzlichen Handelns des Betreibers. Die Haftung nach gesetzlichen Vorschriften, deren Ausschluss verboten ist, bleibt unbenommen. Die Haftung ist begrenzt auf den typischerweise vorhersehbaren Schaden. Dies gilt nicht für die Verletzung vertragswesentlicher Pflichten und die Haftung nach dem Produkthaftungsgesetz.</p> <h3>7. Regeln für die Nutzung der Website</h3> <p>7.1 Der Kunde hat die Möglichkeit Text und Bilder auf der Website zu veröffentlichen. Der Kunde verpflichtet sich die <a href="#faq:rules">Regeln</a> der Website einzuhalten. Bei Verstößen gegen diese Regeln, hat der Betreiber das Recht den Account des Kunden ohne vorherige Warnung für eine begrenzte Zeit oder, in schweren Verstößen gegen die Regeln, auch unbegrenzt zu sperren.</p> <p>7.2 Im Fall von Verstößen gegen die <a href="#faq:rules">Regeln</a> bei pr0gramm.com oder den Allgemeinen Nutzungsbedingungen ist der Betreiber zur außerordentlichen Kündigung des Nutzungsvertrags berechtigt.</p> <h3>8. Anwendbares Recht und Gerichtsstand</h3> <p>8.1 Diese Allgemeinen Nutzungsbedingungen sowie die Nutzung der Dienste bestimmen sich nach deutschem Recht. Für Streitigkeiten außer im Zusammenhang mit der Nutzung der Website und/oder dieser Allgemeinen Nutzungsbedingungen sind die für den Sitz des Betreibers zuständigen Gerichte ausschließlich zuständig, soweit es sich bei dem Nutzer um einen Kaufmann handelt oder der Nutzer keinen dauerhaften Wohnsitz in Deutschland hat.</p> </div>'
});
p.View.Bookmarklet = p.View.Bookmarklet || {};
p.View.Bookmarklet.Layout = p.View.Base.extend({
    template: '<div id="main-view" class="bookmarklet"></div> ',
    init: function(container, parent) {
        $('html,body').css('background-color', 'transparent');
        this.parent(container, parent);
    }
});
p.View.Bookmarklet = p.View.Bookmarklet || {};
p.View.Bookmarklet.Login = p.View.Base.extend({
    template: '<div class="overlay-content"> <div class="bookmarklet-head" style="height:50px;"> <img src="/media/pr0gramm.png" class="bookmarklet-logo"/> </div> <?js if(loginFailed) {?> <?js if(ban && ban.banned) { ?> <p class="warn"> Dein Account ist gesperrt. <?js if(ban.till) {?> Die Sperrung wird am {ban.till.readableTime()} ({ban.till.relativeTime()}) aufgehoben. <?js } else { ?> Die Sperrung ist dauerhaft. <?js } ?> <?js if(ban.reason) {?> <strong>Grund:</strong> {{ban.reason}} <?js } ?> </p> <?js } else { ?> <p class="warn">Falscher Benutzername oder Passwort</p> <?js } ?> <?js } ?> <form> <div class="form-row"> <label>Name oder E-Mail Adresse:</label> <input type="text" class="text-line" name="name" placeholder="Name" tabindex="201" value="{{name}}"/> </div> <div class="form-row"> <label>Passwort:</label> <input type="password" class="text-line" name="password" placeholder="Passwort" tabindex="202"/> </div> <div class="form-row"> <input type="submit" value="Anmelden" id="login-button" tabindex="203"/> </div> </form> </div> ',
    data: {
        ban: null,
        name: '',
        loginFailed: false
    },
    render: function() {
        this.parent();
        this.$container.find('form').submit(this.submit.bind(this));
        this.focus('input[name=name]');
    },
    submit: function(ev) {
        p.user.login(ev.target, this.posted.bind(this));
        this.data.name = $(ev.target).find('input[name=name]').val();
        this.renderLoading();
        return false;
    },
    posted: function(response) {
        if (response.success) {
            p.navigateToPopStack();
        } else {
            this.data.loginFailed = true;
            this.data.ban = response.ban;
            if (this.data.ban && this.data.ban.till) {
                this.data.ban.till = new Date(this.data.ban.till * 1000);
            }
            this.render();
        }
    }
});
(function($) {
    var delimiter = new Array();
    var tags_callbacks = new Array();
    $.fn.doAutosize = function(o) {
        var minWidth = $(this).data('minwidth'),
            maxWidth = $(this).data('maxwidth'),
            val = '',
            input = $(this),
            testSubject = $('#' + $(this).data('tester_id'));
        if (val === (val = input.val())) {
            return;
        }
        var escaped = val.replace(/&/g, '&amp;').replace(/\s/g, ' ').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        testSubject.html(escaped);
        var testerWidth = testSubject.width(),
            newWidth = (testerWidth + o.comfortZone) >= minWidth ? testerWidth + o.comfortZone : minWidth,
            currentWidth = input.width(),
            isValidWidthChange = (newWidth < currentWidth && newWidth >= minWidth) || (newWidth > minWidth && newWidth < maxWidth);
        if (isValidWidthChange) {
            input.width(newWidth);
        }
    };
    $.fn.resetAutosize = function(options) {
        var minWidth = $(this).data('minwidth') || options.minInputWidth || $(this).width(),
            maxWidth = $(this).data('maxwidth') || options.maxInputWidth || ($(this).closest('.tagsinput').width() - options.inputPadding),
            val = '',
            input = $(this),
            testSubject = $('<tester/>').css({
                position: 'absolute',
                top: -9999,
                left: -9999,
                width: 'auto',
                fontSize: input.css('fontSize'),
                fontFamily: input.css('fontFamily'),
                fontWeight: input.css('fontWeight'),
                letterSpacing: input.css('letterSpacing'),
                whiteSpace: 'nowrap'
            }),
            testerId = $(this).attr('id') + '_autosize_tester';
        if (!$('#' + testerId).length > 0) {
            testSubject.attr('id', testerId);
            testSubject.appendTo('body');
        }
        input.data('minwidth', minWidth);
        input.data('maxwidth', maxWidth);
        input.data('tester_id', testerId);
        input.css('width', minWidth);
    };
    $.fn.addTag = function(value, options) {
        options = jQuery.extend({
            focus: false,
            callback: true
        }, options);
        this.each(function() {
            var id = $(this).attr('id');
            var tagslist = $(this).val().split(delimiter[id]);
            if (tagslist[0] == '') {
                tagslist = new Array();
            }
            value = jQuery.trim(value);
            if (options.unique) {
                var skipTag = $(this).tagExist(value);
                if (skipTag == true) {
                    $('#' + id + '_tag').addClass('not_valid');
                }
            } else {
                var skipTag = false;
            }
            if (value != '' && skipTag != true) {
                $('<span>').addClass('tag').append($('<span>').text(value).append('&nbsp;&nbsp;'), $('<a>', {
                    href: '#',
                    title: 'Removing tag',
                    text: 'x'
                }).click(function() {
                    return $('#' + id).removeTag(escape(value));
                })).insertBefore('#' + id + '_addTag');
                tagslist.push(value);
                $('#' + id + '_tag').val('');
                if (options.focus) {
                    $('#' + id + '_tag').focus();
                } else {
                    $('#' + id + '_tag').blur();
                }
                $.fn.tagsInput.updateTagsField(this, tagslist);
                if (options.callback && tags_callbacks[id] && tags_callbacks[id]['onAddTag']) {
                    var f = tags_callbacks[id]['onAddTag'];
                    f.call(this, value);
                }
                if (tags_callbacks[id] && tags_callbacks[id]['onChange']) {
                    var i = tagslist.length;
                    var f = tags_callbacks[id]['onChange'];
                    f.call(this, $(this), tagslist[i - 1]);
                }
            }
        });
        return false;
    };
    $.fn.removeTag = function(value) {
        value = unescape(value);
        this.each(function() {
            var id = $(this).attr('id');
            var old = $(this).val().split(delimiter[id]);
            $('#' + id + '_tagsinput .tag').remove();
            var str = '';
            for (var i = 0; i < old.length; i++) {
                if (old[i] != value) {
                    str = str + delimiter[id] + old[i];
                }
            }
            $.fn.tagsInput.importTags(this, str);
            if (tags_callbacks[id] && tags_callbacks[id]['onRemoveTag']) {
                var f = tags_callbacks[id]['onRemoveTag'];
                f.call(this, value);
            }
        });
        return false;
    };
    $.fn.tagExist = function(val) {
        var id = $(this).attr('id');
        var tagslist = $(this).val().split(delimiter[id]);
        return (jQuery.inArray(val, tagslist) >= 0);
    };
    $.fn.importTags = function(str) {
        id = $(this).attr('id');
        $('#' + id + '_tagsinput .tag').remove();
        $.fn.tagsInput.importTags(this, str);
    }
    $.fn.tagsInput = function(options) {
        var settings = jQuery.extend({
            interactive: true,
            defaultText: 'add a tag',
            minChars: 0,
            maxChars: 32,
            width: '300px',
            height: '100px',
            autocomplete: {
                selectFirst: false
            },
            hide: true,
            delimiter: ',',
            unique: true,
            removeWithBackspace: true,
            placeholderColor: '#666666',
            autosize: true,
            comfortZone: 20,
            inputPadding: 6 * 2
        }, options);
        this.each(function() {
            if (settings.hide) {
                $(this).hide();
            }
            var id = $(this).attr('id');
            if (!id || delimiter[$(this).attr('id')]) {
                id = $(this).attr('id', 'tags' + new Date().getTime()).attr('id');
            }
            var data = jQuery.extend({
                pid: id,
                real_input: '#' + id,
                holder: '#' + id + '_tagsinput',
                input_wrapper: '#' + id + '_addTag',
                fake_input: '#' + id + '_tag'
            }, settings);
            delimiter[id] = data.delimiter;
            if (settings.onAddTag || settings.onRemoveTag || settings.onChange) {
                tags_callbacks[id] = new Array();
                tags_callbacks[id]['onAddTag'] = settings.onAddTag;
                tags_callbacks[id]['onRemoveTag'] = settings.onRemoveTag;
                tags_callbacks[id]['onChange'] = settings.onChange;
            }
            var cc = $(this).attr('class');
            var markup = '<div id="' + id + '_tagsinput" class="tagsinput ' + cc + '"><div id="' + id + '_addTag">';
            if (settings.interactive) {
                markup = markup + '<input id="' + id + '_tag" value="" ' + 'class="tagsinput-writebox" maxlength="' + settings.maxChars + '" ' + 'data-default="' + settings.defaultText + '" />';
            }
            markup = markup + '</div><div class="tags_clear"></div></div>';
            $(markup).insertAfter(this);
            if ($(data.real_input).val() != '') {
                $.fn.tagsInput.importTags($(data.real_input), $(data.real_input).val());
            }
            if (settings.interactive) {
                $(data.fake_input).val($(data.fake_input).attr('data-default'));
                $(data.fake_input).addClass('tagsinput-placeholder');
                $(data.fake_input).resetAutosize(settings);
                $(data.holder).bind('click', data, function(event) {
                    $(event.data.fake_input).focus();
                });
                $(data.fake_input).bind('focus', data, function(event) {
                    if ($(event.data.fake_input).val() == $(event.data.fake_input).attr('data-default')) {
                        $(event.data.fake_input).val('');
                    }
                    $(event.data.fake_input).addClass('active');
                });
                if (settings.autocomplete_url != undefined) {
                    autocomplete_options = {
                        source: settings.autocomplete_url
                    };
                    for (attrname in settings.autocomplete) {
                        autocomplete_options[attrname] = settings.autocomplete[attrname];
                    }
                    if (jQuery.Autocompleter !== undefined) {
                        $(data.fake_input).autocomplete(settings.autocomplete_url, settings.autocomplete);
                        $(data.fake_input).bind('result', data, function(event, data, formatted) {
                            if (data) {
                                $('#' + id).addTag(data[0] + "", {
                                    focus: true,
                                    unique: (settings.unique)
                                });
                            }
                        });
                    } else if (jQuery.ui.autocomplete !== undefined) {
                        $(data.fake_input).autocomplete(autocomplete_options);
                        $(data.fake_input).bind('autocompleteselect', data, function(event, ui) {
                            $(event.data.real_input).addTag(ui.item.value, {
                                focus: true,
                                unique: (settings.unique)
                            });
                            return false;
                        });
                    }
                } else {
                    $(data.fake_input).bind('blur', data, function(event) {
                        var d = $(this).attr('data-default');
                        if ($(event.data.fake_input).val() != '' && $(event.data.fake_input).val() != d) {
                            if ((event.data.minChars <= $(event.data.fake_input).val().length) && (!event.data.maxChars || (event.data.maxChars >= $(event.data.fake_input).val().length)))
                                $(event.data.real_input).addTag($(event.data.fake_input).val(), {
                                    focus: true,
                                    unique: (settings.unique)
                                });
                        } else {
                            $(event.data.fake_input).val($(event.data.fake_input).attr('data-default'));
                            $(event.data.fake_input).removeClass('active');
                        }
                        return false;
                    });
                }
                $(data.fake_input).bind('keypress', data, function(event) {
                    if (event.which == event.data.delimiter.charCodeAt(0) || event.which == 13) {
                        event.preventDefault();
                        if ((event.data.minChars <= $(event.data.fake_input).val().length) && (!event.data.maxChars || (event.data.maxChars >= $(event.data.fake_input).val().length)))
                            $(event.data.real_input).addTag($(event.data.fake_input).val(), {
                                focus: true,
                                unique: (settings.unique)
                            });
                        $(event.data.fake_input).resetAutosize(settings);
                        return false;
                    } else if (event.data.autosize) {
                        $(event.data.fake_input).doAutosize(settings);
                    }
                });
                data.removeWithBackspace && $(data.fake_input).bind('keydown', function(event) {
                    if (event.keyCode == 8 && $(this).val() == '') {
                        event.preventDefault();
                        var last_tag = $(this).closest('.tagsinput').find('.tag:last').text();
                        var id = $(this).attr('id').replace(/_tag$/, '');
                        last_tag = last_tag.replace(/[\s]+x$/, '');
                        $('#' + id).removeTag(escape(last_tag));
                        $(this).trigger('focus');
                    }
                });
                $(data.fake_input).blur();
                if (data.unique) {
                    $(data.fake_input).keydown(function(event) {
                        if (event.keyCode == 8 || String.fromCharCode(event.which).match(/\w+|[áéíóúÁÉÍÓÚñÑ,/]+/)) {
                            $(this).removeClass('not_valid');
                        }
                    });
                }
            }
        });
        return this;
    };
    $.fn.tagsInput.updateTagsField = function(obj, tagslist) {
        var id = $(obj).attr('id');
        $(obj).val(tagslist.join(delimiter[id]));
    };
    $.fn.tagsInput.importTags = function(obj, val) {
        $(obj).val('');
        var id = $(obj).attr('id');
        var tags = val.split(delimiter[id]);
        for (var i = 0; i < tags.length; i++) {
            $(obj).addTag(tags[i], {
                focus: false,
                callback: false
            });
        }
        if (tags_callbacks[id] && tags_callbacks[id]['onChange']) {
            var f = tags_callbacks[id]['onChange'];
            f.call(obj, obj, tags[i]);
        }
    };
})(jQuery);
p.View.Bookmarklet = p.View.Bookmarklet || {};
p.View.Bookmarklet.Post = p.View.Base.extend({
    template: '<div class="overlay-content"> <div class="bookmarklet-head"> <img src="/media/pr0gramm.png" class="bookmarklet-logo"/> &ndash; Bild hochladen </div> <?js if( posted ) {?> <h2 class="main-message"> Fertig!<br/><br/> <a href="http://{CONFIG.HOST}/new/{item.id}" target="_blank">Gehe zum Post</a> </h2> <?js } else { ?> <?js if( error ) {?> <p class="warn"> <?js if( error === \'invalidType\' ) {?> Ungültiger Dateityp. Nur JPEG, PNG, GIF WebM erlaubt. <?js } else if( error === \'invalid\' ) {?> Bild ist ungültig, zu groß oder zu klein (min. 0,04 Megapixel, max. 16 Megapixel, max. 4MB Dateigröße – WebM nur mit VP8 codec, max. 120sek, keine Audiospur) <?js } else if( error === \'blacklisted\' ) {?> Bild oder Domain gesperrt. <?js } else if( error === \'internal\' ) {?> Interner Fehler bei der Verarbeitung. <?js } else if( error === \'download\' ) {?> Download fehlgeschlagen (4MB max). <?js } else if( error === \'missingData\' ) {?> Kein Bild oder URL angegeben. <?js } ?> </p> <?js } ?> <form id="upload-form"> <input type="hidden" name="imageUrl" value="{{imageUrl}}"/> <input type="hidden" name="siteUrl" value="{{siteUrl}}"/> <div id="upload-preview" style="display:block"> <?js if( params.type == \'video\' ) { ?> <video src="{{imageUrl}}" autoplay loop></video> <?js } else { ?> <img src="{{imageUrl}}"/> <?js } ?> </div> <div id="upload-progress"> <div class="progress-bar"> <div class="progress"></div> </div> </div> <div class="upload-tag-container"> <div class="sfw-status"> <label title="Safe for Work"> <input type="radio" name="sfwstatus" value="sfw"> sfw </label> <label title="Not Safe for Work"> <input type="radio" name="sfwstatus" value="nsfw"> nsfw </label> <label title="Not Safe for Life"> <input type="radio" name="sfwstatus" value="nsfl"> nsfl </label> </div> <h3>SFW Status und Tags</h3> <input type="text" class="upload-tagsinput" name="tags"/> </div> <div class="upload-similar"></div> <div> <input type="hidden" name="checkSimilar" value="1"/> <input type="submit" class="button" value="Bild Hochladen"/> </div> </form> <div class="post-rules"></div> <?js } ?> </div> ',
    requiresLogin: true,
    loginUrl: 'bm/login',
    data: {
        error: null,
        posted: false
    },
    load: function() {
        this.data.imageUrl = decodeURIComponent(this.data.params.imageUrl);
        this.data.siteUrl = decodeURIComponent(this.data.params.siteUrl);
        return true;
    },
    render: function() {
        this.parent();
        var that = this;
        var tags = this.$container.find('.upload-tagsinput');
        tags.tagsInput(CONFIG.TAGS_INPUT_SETTINGS);
        this.$container.find('input[name=sfwstatus]').change(function() {
            that.setSFWTags($(this));
        });
        this.$container.find('form').submit(this.submit.bind(this));
        this.rulesView = new p.View.Rules(this.$container.find('.post-rules'), this);
        this.rulesView.show();
    },
    setSFWTags: function($radio) {
        var tags = this.$container.find('.upload-tagsinput');
        var status = $radio.val();
        tags.removeTag('nsfw');
        tags.removeTag('nsfl');
        if (status != 'sfw') {
            tags.addTag(status);
        }
    },
    submit: function(ev) {
        if (!this.$container.find('input[name=sfwstatus]:checked').length) {
            this.$container.find('.sfw-status').highlight(252, 136, 52, 1);
            return false;
        }
        p.api.post('items.post', ev.target, this.posted.bind(this), this.onError.bind(this));
        this.renderLoading();
        return false;
    },
    posted: function(response) {
        this.data.posted = !response.error;
        this.data.error = response.error;
        this.data.selfPosted = !!response.selfPosted;
        this.data.item = response.item;
        this.render();
        if (response.error == 'similar') {
            this.similarView = new p.View.UploadSimilar(this.$container.find('.upload-similar'), this);
            this.similarView.show(response.similar);
            this.$container.find('input[name=checkSimilar]').val(0);
        }
    },
    onError: function(response) {
        return p.setView(p.View.Overlay.Error, response.responseJSON);
    }
});
p.api = new p.ServerAPI(CONFIG.API.ENDPOINT);
p.user = new p.User();
p.hotkeys = new p.Hotkeys($(document));
p.mainView = null;
if (p.getLocation().match(/^newest/)) {
    document.location = '/';
}
if (p.getLocation().match(/^bm\//)) {
    p.mainView = new p.View.Bookmarklet.Layout('body');
    p.addRoute(p.View.Bookmarklet.Login, 'bm/login');
    p.addRoute(p.View.Bookmarklet.Post, 'bm/post/<type>/<siteUrl>/<imageUrl>');
} else {
    p.mainView = new p.View.Layout('body');
    p.addRoute(p.View.Stream.Main, '');
    p.addRoute(p.View.Stream.Main, '<tab:top|new|stalk>');
    p.addRoute(p.View.Stream.Main, '<tab:top|new|stalk>/<itemId:d>');
    p.addRoute(p.View.Stream.Main, '<tab:top|new>/<tags>');
    p.addRoute(p.View.Stream.Main, '<tab:top|new>/<tags>/<itemId:d>');
    p.addRoute(p.View.Stream.Main, 'user/<userName>/<userTab:likes|uploads>');
    p.addRoute(p.View.Stream.Main, 'user/<userName>/<userTab:likes|uploads>/<itemId:d>');
    p.addRoute(p.View.User, 'user/<name>');
    p.addRoute(p.View.User.Comments, 'user/<name>/comments/<search:after|before>/<timestamp:d>');
    p.addRoute(p.View.Inbox, 'inbox/<tab:unread|all|messages>');
    p.addRoute(p.View.Inbox, 'inbox/<tab:unread|all|messages>/<search:after|before>/<timestamp:d>');
    p.addRoute(p.View.Validate, 'user/<name>/validate/<token>');
    p.addRoute(p.View.ResetPassword, 'user/<name>/resetpass/<token>');
    p.addRoute(p.View.FollowList, 'stalk/list/<sort:stalk-date|post-date>');
    p.addRoute(p.View.Settings, 'settings/account/mail/<token>');
    p.addRoute(p.View.Settings, 'settings/<tab:bookmarklet|site|account|invites>');
    p.addRoute(p.View.Upload, 'upload');
    p.addRoute(p.View.Contact, 'contact');
    p.addRoute(p.View.RegisterInvite, 'register/<token>');
    p.addRoute(p.View.RedeemThanks, 'redeem/thanks');
    p.addRoute(p.View.RedeemCode, 'redeem/<token>');
    p.addRoute(p.View.BuyCode.PaypalThanks, 'pr0mium/thanks');
    p.addRoute(p.View.BuyCode.Products, 'pr0mium');
    p.addRoute(p.View.FAQ, 'faq');
    p.addRoute(p.View.Imprint, 'imprint');
    p.addRoute(p.View.TOS, 'tos');
}
p.addRoute(p.View.Error404, '*');
p.mainView.show();
p.start('#main-view');
if (CONFIG.ANALYTICS.ENABLED) {
    (function(i, s, o, g, r, a, m) {
        i['GoogleAnalyticsObject'] = r;
        i[r] = i[r] || function() {
            (i[r].q = i[r].q || []).push(arguments)
        }, i[r].l = 1 * new Date();
        a = s.createElement(o), m = s.getElementsByTagName('head')[0];
        a.async = 1;
        a.src = g;
        m.appendChild(a)
    })(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');
    ga('create', CONFIG.ANALYTICS.ACCOUNT, 'auto');
    ga('set', 'dimension1', (p.user.id ? 'yes' : 'no'));
    ga('set', 'dimension2', p.user.flagsName);
    ga('send', 'pageview', {
        page: p.getLocation()
    });
}
