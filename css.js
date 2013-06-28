/**	`css` is a requirejs plugin
	that loads a css file and inject it into a page.
	note that this loader will return immediately,
	regardless of whether the browser had finished parsing the stylesheet.
	this css loader is implemented for file optimization and depedency managment
 */

define(function () {
    var init = false;
    var catalog = {};
    var loaded = {};
    var triggers = {};
    var debug = false;

    var initialize = function (config) {
        init = true;

        if (config.config && config.config.css && config.config.css.debug)
            debug = true;

        if (debug)
            console.log("init");

        var shim = config.shim;
        if (!shim)
            return;

        var getDeps = function (alias) {
            if (shim.hasOwnProperty(alias) && (shim[alias] instanceof Object) && (shim[alias].deps instanceof Array))
                return shim[alias].deps;
            else
                return [];
        };

        var cache = {};
        var cssPattern = /^css!(.+)$/;
        var resolve = function (key, deps) {
            if (cache.hasOwnProperty(key))
                return cache[key];
            var stack = [];
            for (var i = 0, l = deps.length; i < l; ++i) {
                var dep = deps[i];
                if (cssPattern.test(dep)) {
                    var name = cssPattern.exec(dep)[1];
                    if (catalog.hasOwnProperty(name))
                        throw new Error("Shim css duplication by '" + name + "'!");
                    catalog[name] = stack.slice(0);
                    stack.push(name);
                }
                else {
                    stack.push.apply(stack, resolve(dep, getDeps(dep)));
                }
            }
            cache[key] = stack;
            return stack;
        };

        for (var alias in shim) {
            resolve(alias, getDeps(alias));
        }

        if (debug)
            console.log("catalog", catalog);
    };

    var waiting = function (name) {
        var deps = catalog[name];
        if (!deps)
            return false;
        for (var i = 0, l = deps.length; i < l; ++i) {
            var dependency = deps[i];
            if (!loaded[dependency])
                return true;
        }
        return false;
    };

    var inject = function (load, name) {
        var filename = requirejs.toUrl(name);
        var head = document.getElementsByTagName('head')[0];
        var link = document.createElement('link');
        link.href = filename;
        link.rel = 'stylesheet';
        link.type = 'text/css';
        head.appendChild(link);
        loaded[name] = true;
        load(true);
        if (debug)
            console.log("load " + name);
        if (triggers[name]) {
            for (var i = 0, l = triggers[name].length; i < l; ++i) {
                var trigger = triggers[name][i];
                trigger();
            }
        }
    };

    return {
        load: function (name, require, load, config) {
            if (!init)
                initialize(config);
            if (waiting(name)) {
                if (debug)
                    console.log("defer " + name, catalog[name]);
                var trigger = function () {
                    if (debug)
                        console.log("trigger " + name);
                    if (!waiting(name))
                        inject(load, name);
                };
                var deps = catalog[name];
                for (var i = 0, l = deps.length; i < l; ++i) {
                    var dep = deps[i];
                    if (!triggers[dep])
                        triggers[dep] = [];
                    triggers[dep].push(trigger);
                }
            }
            else
                inject(load, name);
        },
        pluginBuilder: './css-build'
    };
});
