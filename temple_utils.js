(function(context){
  var render_template = function(before, after, template, data, pool){
    var parent = before.parentNode;
    while(before.nextSibling !== after) {//Loosing memory here
      parent.removeChild(before.nextSibling);
    }
    var fragment = document.createDocumentFragment();
    for(var i = 0, l = data.length; i < l; i++) {
      var nested = pool.get(template);
      nested[1].update(data[i]);
      fragment.appendChild(nested[0]);
    }
    parent.insertBefore(fragment, after);
  };

  var pool = function(templates){
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
      },
      get: function(template, data) {
        if(! busy.hasOwnProperty(template)) {
          busy[template] = [];
        }
        var tor;
        if(free.hasOwnProperty(template) && free[template].length > 0) {
          tor = free[template].pop();
        } else {
          tor = templates[template](methods);
        }
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
  container.render_template = render_template;
  container.pool = pool;
}).call(this);
