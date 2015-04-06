(function(context){
  var render_children = function(after, template, data, pool, children){
    data = data || [];
    for(var i = children.length - data.length; i > 0; i--) {
      children.pop().remove();
    }
    for(var i = children.length - 1; i >= 0; i--) {
      children[i].update(data[i]);
    }
    if(children.length < data.length) {
      var fragment = document.createDocumentFragment();
      for(var lb = children.length, ub = data.length; lb < ub; lb++) {
        var nested = pool.get(template, data[lb]);
        fragment.appendChild(nested[0]);
        children.push(nested[1]);
      }
      after.parentNode.insertBefore(fragment, after);
    }
  };

  var pool = function(templates){
    var busy = {};
    var free = {};
    for(var keys = Object.keys(templates), i = keys.length - 1; i >= 0; i--) {
      free[keys[i]] = [];
      busy[keys[i]] = [];
    }
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
          free[key] = free[key].concat(busy[key]);
          busy[key] = [];
        }
      },
      build_cache: function(to_cache) {
        var keys = Object.keys(to_cache);
        for(var i = 0, l = keys.length; i < l; i++) {
          var key = keys[i];
          var arr = free[key];
          for(var j = 0, k = to_cache[key]; j < k; j++) {
            arr.push(templates[key](methods));
          }
        }
      },
      get: function(template, data) {
        var  tor = free[template].pop() || templates[template](methods);
        //busy[template].push(tor); //Do not loose memory :)
        if(data) {
          tor[1].update(data);
        }
        return tor;
      }
    };
    return methods;
  };

  var container = typeof module !== "undefined" ? module.exports : (window.temple_utils = {});
  container.render_children = render_children;
  container.pool = pool;
}).call(this);
