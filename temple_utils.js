(function(context){
  var render_children = function(after, template, data, pool, children){
    data = data || [];
    for(var i = children.length - data.length; i > 0; i--) {
      var saved = children.pop();
      pool.release(template, saved);
      saved.remove();
    }
    for(var i = children.length - 1; i >= 0; i--) {
      children[i].update(data[i]);
    }
    if(children.length < data.length) {
      var fragment = document.createDocumentFragment();
      for(var lb = children.length, ub = data.length; lb < ub; lb++) {
        var nested = pool.g(template);
        children.push(nested);
        fragment.appendChild(nested.root());
        nested.update(data[lb]);
      }
      after.parentNode.insertBefore(fragment, after);
    }
  };

  var render_child = function(after, template, data, pool, children){
    render_children(after, template, data ? [data] : [], pool, children);
  };

  var pool = function(templates){
    var busy = {};
    var free = {};
    for(var keys = Object.keys(templates), i = keys.length - 1; i >= 0; i--) {
      free[keys[i]] = [];
    }
    var methods = {
      info: function() {
        var tor = {free: {}}, fkeys = Object.keys(free);
        for(var i = 0, l = fkeys.length; i < l; i++) {
          var k = fkeys[i];
          tor.free[k] = free[k].length;
        }
        return tor;
      },
      release: function(template, instance) {
        free[template].push(instance);
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
      g: function(template) {
        return free[template].pop() || templates[template](methods);
      },
      get: function(template, data) {
        var  tor = free[template].pop() || templates[template](methods);
        if(data) {
          tor.update(data);
        }
        return [tor.root(), tor];
      }
    };
    return methods;
  };

  var container = typeof module !== "undefined" ? module.exports : (window.temple_utils = {});
  container.render_children = render_children;
  container.render_child = render_child;
  container.pool = pool;
}).call(this);
