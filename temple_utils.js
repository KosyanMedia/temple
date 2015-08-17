(function(context) {
  var render_children = function(after, template, data, pool, children) {
    data = data || [];

    for (var i = children.length - data.length; i > 0; i--) {
      pool.release(template, children.pop());
    }

    for (var i = children.length - 1; i >= 0; i--) {
      children[i].update(data[i]);
    }

    if (children.length < data.length) {
      var fragment = document.createDocumentFragment();

      for (var lb = children.length, ub = data.length; lb < ub; lb++) {
        var nested = pool.get(template);

        children.push(nested[1]);
        fragment.appendChild(nested[0]);
        nested[1].update(data[lb]);
      }

      after.parentNode.insertBefore(fragment, after);
    }
  };

  var render_child = function(after, template, data, pool, children) {
    render_children(after, template, data ? [data] : [], pool, children);
  };

  var templates_cache = {};
  var templates = {};
  var templates_creation = {};

  var methods = {
      info: function() {
          var tor = {
                  free: {},
                  templates_creation: templates_creation
              },
              fkeys = Object.keys(templates_cache);

          for (var i = 0, l = fkeys.length; i < l; i++) {
              var k = fkeys[i];
              tor.free[k] = templates_cache[k].length;
          }

          return tor;
      },
      release: function(template, instance) {
          instance.remove();
          templates_cache[template].push(instance);
      },
      build_cache: function(to_cache) {
          var keys = Object.keys(to_cache);

          for (var i = 0, l = keys.length; i < l; i++) {
              var key = keys[i];
              var arr = templates_cache[key];

              for (var j = 0, k = to_cache[key]; j < k; j++) {
                  arr.push(templates[key](methods));
              }
          }
      },
      get: function(template, data) {
          var tor = templates_cache[template].pop();
          if(!tor) {
            tor = templates[template](methods);
            templates_creation[template]++;
          }

          if (data) {
              tor.update(data);
          }

          return [tor.root(), tor];
      }
  };

  var pool = function() {
      for (var i = 0; i < arguments.length; i++) {
        var component = arguments[i];

        for (var template in component) { if (component.hasOwnProperty(template)) {
            templates[template] = component[template];
            templates_creation[template] = 0;
          }
        }
        for (var keys = Object.keys(component), j = keys.length - 1; j >= 0; j--) {
            templates_cache[keys[j]] = [];
        }
      }

      return methods;
  };

  var container = typeof module !== "undefined" ? module.exports : (window.temple_utils = {});

  container.render_children = render_children;
  container.render_child = render_child;
  container.pool = pool;
}).call(this);
