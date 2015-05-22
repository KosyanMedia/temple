(function(module) {
  var vparse = require('./parsers/variable');

    var lid = 0;
    function new_id() {
      return lid++;
    }

    function getter(a, variable) {
      if (variable.accessor) {
        a = a + variable.accessor;
      }
      var filter;
      while(filter = variable.filters.shift()) {
        a = 'filters.' + filter.name + '(' + a + (filter.params || '') + ')';
      }
      return a;
    }

    module.exports = function(instructions) {//Single-pass translator enchanted with buffered optimizations!
      function esc(s) {
        return s.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      }
      var variables = {};
      var root = 'root';
      var add_variable = function(name, type) {
        if(!(name in variables)) {
          variables[name] = [];
        }
        variables[name].push(type);
      }
      var root_children = [];
      var buff = [];

      var declarations = [],
          links = [], // Order is important here
          accessors = {remove: []};

      for(var i = 0, l = instructions.length; i < l; i++) {
        var ins = instructions[i],
            instruction = ins[0],
            parent_id = ins[1];

        if(buff.length > 0 && buff[0][0] == 'text' && (instruction != 'text' || buff[0][1] != parent_id)) {
          if(buff.length == 1) {
            var value_type = buff[0][2][0], // Variable or Constant
                value = buff[0][2][1],
                pid = buff[0][1];
  
            if(value_type == 'V') { // Variable
              var variable = vparse(value, pid);
              add_variable(variable.name, 'text');
              var var_id = variable.pid + new_id() + '_text';
              declarations.push(var_id + ' = document.createTextNode("")');
              if(buff[0][1] == 'root') {
                accessors.remove.push(var_id + '.parentNode.removeChild(' + var_id + ');'); 
                root_children.push(buff[0][1] + '.appendChild(' + var_id + ');');
              } else {
                links.push(buff[0][1] + '.appendChild(' + var_id + ');');
              }
              accessors[variable.name] = accessors[variable.name] || [];
              accessors[variable.name].push(var_id + '.nodeValue = ' + getter('a', variable));
            } else if(value_type == 'C') { // Constant
              if(buff[0][1] == 'root') {
                var node_var_name = 'root_text' + new_id();
                declarations.push(node_var_name + ' = document.createTextNode("' + esc(value) + '")');
                accessors.remove.push(node_var_name + '.parentNode.removeChild(' + node_var_name + ');'); 
                root_children.push(buff[0][1] + '.appendChild(' + node_var_name + ');');
                root_children.push(' ');
              } else {
                links.push(buff[0][1] + '.appendChild(document.createTextNode("' + esc(value) + '"));');
              }
            }
          } else {
            var tid = new_id();
            var node_var_name = buff[0][1] + '_text' + tid;
            if(buff[0][1] == 'root') {
              accessors.remove.push(node_var_name + '.parentNode.removeChild(' + node_var_name + ');'); 
              root_children.push(buff[0][1] + '.appendChild(' + node_var_name + ');');
              root_children.push(' ');
            } else {
              links.push(buff[0][1] + '.appendChild(' + node_var_name + ');');
            }
            var parts = [];
            var const_parts = [];
            var access_keys = [];
            var vars_count = 0;
            for(var j = 0, k = buff.length; j < k; j++) {
              if(buff[j][2][0] == 'V')
                vars_count++;
            }
            for(var j = 0, k = buff.length; j < k; j++) {
              var pid = buff[j][1],
                  value_type = buff[j][2][0], // Variable or Constant
                  value = buff[j][2][1];

              if(value_type == 'C') {
                parts.push('"' + esc(value) + '"');
                const_parts.push('"' + esc(value) + '"');
              } else if(value_type == 'V') {
                var variable = vparse(value, pid);
                accessors[variable.name] = accessors[variable.name] || [];
                var var_id = variable.name + new_id() + '_var';
                add_variable(variable.name, 'text');
                access_keys.push(variable.name);
                if(vars_count > 1) {
                  parts.push(var_id);
                  declarations.push(var_id + ' = ""');
                  accessors[variable.name].push(var_id + ' = ' + getter('a', variable));
                } else {
                  parts.push(getter('a', variable));
                }
              }
            }
            text_update_code = node_var_name + '.nodeValue = ' + parts.join('+');
            while(access_keys.length) {
              var v = access_keys.pop();
              if(accessors[v].indexOf(text_update_code) >= 0) {
                accessors[v].splice(accessors[v].indexOf(text_update_code), 1);
              }
              accessors[v].push(text_update_code);
            }
            declarations.push(node_var_name + ' = document.createTextNode(' + const_parts.join('+').replace(/"\+"/g, "") + ')');
          }
          buff = [];
        }

        if(buff.length > 0 && buff[0][0] == 'attr' && (instruction != 'attr' || buff[0][1] != parent_id || buff[0][2] != ins[2])) {
          if(buff.length == 1) {
            var pid = buff[0][1],
                attr = buff[0][2],
                value_type = buff[0][3][0], // Variable or Constant
                value = buff[0][3][1];

            if(value_type == 'V') { // Variable
              var variable = vparse(value, pid);
              add_variable(variable.name, 'attr');
              accessors[variable.name] = accessors[variable.name] || [];
              if(attr == 'value' || attr == 'checked' || attr == 'id' || attr == 'selected') {
                accessors[variable.name].push(pid + '.' + attr + ' = ' + getter('a', variable));
              } else if(attr == 'class') {
                accessors[variable.name].push(pid + '.' + attr + 'Name = ' + getter('a', variable));
              } else {
                accessors[variable.name].push(pid + '.setAttribute("' + attr + '", ' + getter('a', variable) + ')');
              }
            } else if(value_type == 'C') { // Constant
              if(attr == 'value' || attr == 'checked' || attr == 'id') {
                links.unshift(pid + '.' + attr + ' = "' + esc(value) + '";');
              } else if(attr == 'class') {
                links.unshift(pid + '.className = "' + esc(value) + '";');
              } else {
                links.unshift(pid + '.setAttribute("' + attr + '", "' + esc(value) + '");');
              }
            }
          } else {
            var const_parts = [];
            var parts = [];
            var node_var_name = buff[0][1];
            var access_keys = [];
            var vars_count = 0;
            for(var j = 0, k = buff.length; j < k; j++) {
              if(buff[j][3][0] == 'V')
                vars_count++;
            }
            for(var j = 0, k = buff.length; j < k; j++) {
              var pid = buff[j][1],
                  attr = buff[j][2],
                  value_type = buff[j][3][0], // Variable or Constant
                  value = buff[j][3][1];

              if(value_type == 'C') {
                parts.push('"' + esc(value) + '"');
                const_parts.push('"' + esc(value) + '"');
              } else if(value_type == 'V') {
                var variable = vparse(value, pid);
                var var_id = variable.name + new_id() + '_var';
                access_keys.push(variable.name);
                add_variable(variable.name, 'attr');
                accessors[variable.name] = accessors[variable.name] || [];
                if(vars_count > 1) {
                  parts.push(var_id);
                  declarations.push(var_id + ' = ""');
                  accessors[variable.name].push(var_id + ' = ' + getter('a', variable));
                } else {
                  parts.push(getter('a', variable));
                }
              }
            }
            var attr_update_code;
            var attr_set_code = false;
            if(buff[0][2] == 'value' || buff[0][2] == 'checked' || buff[0][2] == 'id' || buff[0][2] == 'selected') {
              attr_update_code =  node_var_name + '.' + buff[0][2] + ' = ' + parts.join('+');
              attr_set_code =  node_var_name + '.' + buff[0][2] + ' = ' + const_parts.join(' + ').replace(/"\+"/g, "");
            } else if(buff[0][2] == 'class') {
              attr_update_code =  node_var_name + '.' + buff[0][2] + 'Name = ' + parts.join('+');
              attr_set_code =  node_var_name + '.' + buff[0][2] + 'Name = ' + const_parts.join('+').replace(/"\+"/g, "");
            } else {
              attr_update_code =  node_var_name + '.setAttribute("' + buff[0][2] + '",' + parts.join('+') + ')';
              if(buff[0][2] != 'src' && buff[0][2] != 'href') {
                attr_set_code =  node_var_name + '.setAttribute("' + buff[0][2] + '",' + const_parts.join('+').replace(/"\+"/g, "") + ')';
              }
            }
            while(access_keys.length > 0) {
              var v = access_keys.pop();
              if(accessors[v].indexOf(attr_update_code) >= 0) {
                accessors[v].splice(accessors[v].indexOf(attr_update_code), 1);
              }
              accessors[v].push(attr_update_code);
            }
            if(attr_set_code != false)
              links.push(attr_set_code + ';');
          }
          buff = [];
        }

        if(instruction == 'attr' || instruction == 'text') {
          buff.push(ins);
        } else if(instruction == 'node') {
          var node = ins[2];

          declarations.push(node + ' = document.createElement("' + parent_id + '")' );
        } else if(instruction == 'link') {
          var node = ins[2];
          if(parent_id == 'root') {
            root_children.push(parent_id + '.appendChild(' + node + ');');
            root = node;
            accessors.remove.push(node + '.parentNode.removeChild(' + node + ');'); 
          } else {
            links.push(parent_id + '.appendChild(' + node + ');');
          }
        } else if(instruction == 'if' || instruction == 'forall') {
          var variable = vparse(ins[2], parent_id), // Accessor key
              tpl = ins[3]; // Template to loop over
          var tpl_id = tpl + new_id();
          declarations.push('child_' + tpl_id + ' = []');
          add_variable(variable.name, 'key');
          declarations.push('after_' + tpl_id + ' = document.createTextNode("")');
          if(parent_id == 'root') {
            root_children.push(parent_id + '.appendChild(after_' + tpl_id + ');');
            accessors.remove.push('after_' + tpl_id + '.parentNode.removeChild(after_' + tpl_id + ')');
            accessors.remove.unshift('while(child_' + tpl_id + '.length) pool.release("' + tpl + '", child_' + tpl_id + '.pop());');
          } else {
            links.push(parent_id + '.appendChild(after_' + tpl_id + ');');
          }
          accessors[variable.name] = accessors[variable.name] || [];
          if(instruction == 'if') {
            accessors[variable.name].push('temple_utils.render_child(after_' + tpl_id + ', "' + tpl + '", ' + getter('a', variable) + ', pool, child_' + tpl_id + ')');
          } else if(instruction == 'forall') {
            accessors[variable.name].push('temple_utils.render_children(after_' + tpl_id + ', "' + tpl + '", ' + getter('a', variable) + ', pool, child_' + tpl_id + ')');
          }
        }
      }
      var accessors_code = [];
      if(Object.keys(accessors).length > 0) {
        accessors_code.push('{');
        accessors['update'] = [];
        for(var key in variables) {
          accessors['update'].push('t = a.' + key);
          accessors['update'].push('if(undefined !== t) this.' + key + '(t)');
        }
        if(accessors['update'].length > 0) {
          accessors['update'][0] = 'var ' + accessors['update'][0];
        }
        for(var key in accessors) {
          if(key == 'remove' || key == 'root') {
            accessors_code.push(key + ':function(){' );
          } else {
            accessors_code.push(key + ':function(a){' );
          }
          accessors_code.push(accessors[key].join(';'));
          accessors_code.push('}');
          accessors_code.push(',');
        }
        accessors_code.pop();
	accessors_code.push('}');
      } else {
	accessors_code.push('{}');
      }
      if(root_children.length == 1) {
        accessors_code.pop();
        accessors_code.push(',root: function(){return ' + root + ';}');
	accessors_code.push('}');
      } else {
        root = 'root';
        accessors_code.pop();
        accessors_code.push(',root: function(){var root = document.createDocumentFragment();' + root_children.join('') + 'return root;}');
	accessors_code.push('}');
      }
      links.push('return ' + accessors_code.join('') + ';');
      return 'var ' + declarations.join(',') + ';' + links.join('');
    }
})(module); 
