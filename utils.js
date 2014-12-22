function render_template(before, after, template, data, pool) {
    var parent = before.parentNode;
    while(before.nextSibling != after) {//Loosing memory here
        parent.removeChild(before.nextSibling);
    }
    var fragment = document.createDocumentFragment();
    for(var i = 0, l = data.length; i < l; i++) {
        var nested = pool.get(template);
        fragment.appendChild(nested[0]);
        var d = data[i];
        for(var k in d) {
            if(nested[1].hasOwnProperty(k)) {
                nested[1][k](d[k]);
            }
        }
    }
    parent.insertBefore(fragment, after);
}

function pool(templates) {
    var busy = {};
    var free = {};
    var methods = {
        info: function() {
            var tor = {free: {}, busy: {}}, bkeys = Object.keys(busy), fkeys = Object.keys(free);
            for(var i = 0, l = bkeys.length; i < l; i++) {
                var k = bkeys[i];
                tor.busy[k] = busy[k].length;
            }
            for(var i = 0, l = fkeys.length; i < l; i++) {
                var k = fkeys[i];
                tor.free[k] = free[k].length;
            }
            return tor;
        },
        release: function() {
            var keys = Object.keys(busy);
            for(var i = 0, l = keys.length; i < l; i++) {
                var key = keys[i];
                if(! free.hasOwnProperty(key)) {
                    free[key] = [];
                }
                free[key] = free[key].concat(busy[key]);
                busy[key] = [];
            }
        },
        build_cache: function(to_cache) {
            var keys = Object.keys(to_cache);
            for(var i = 0, l = keys.length; i < l; i++) {
                var key = keys[i];
                var arr;
                if(! free.hasOwnProperty(key)) {
                    arr = [];
                    free[key] =  arr;
                } else {
                    arr = free[key];
                }

                for(var j = 0, k = to_cache[key]; j < k; j++) {
                    arr.push(templates[key](methods));
                }
            }
            console.log(free);
        },
        get: function(template) {
            if(! busy.hasOwnProperty(template)) {
                busy[template] = [];
            }
            var tor;
            if(free.hasOwnProperty(template) && free[template].length > 0) {
                tor = free[template].pop();
            } else {
                tor = templates[template](methods);
            }
            busy[template].push(tor);
            return tor;
        }
    };
    return methods;
}

window.templates_pool = pool(templates_list);
