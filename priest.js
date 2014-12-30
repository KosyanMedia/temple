(function(module){

  var DOMParser = require('xmldom').DOMParser;
  var fs = require('fs');

  module.exports = function(templates_files){
    var output = "";

    if(!(templates_files instanceof Array)){
      templates_files = [templates_files];
    }

    var lid = 0;
    function new_id() {
      return lid++;
    }

    function node(template_id, parent_id, n, emit) {
      function attribute(name, value, parent_id) {
        if(value.indexOf('{{') != -1) {
          var chunks = value.split('{{');
          chunks[0].length && emit('attr', template_id, parent_id, name, ['C', chunks[0]]);
          for(var i = 1, l = chunks.length, c = chunks[1]; i < l; i++, c = chunks[i]) {
            var _ = c.split('}}', 2);
            var key = _[0], text = _[1];
            emit('attr', template_id, parent_id, name, ['V', key]);
            text.length && emit('attr', template_id, parent_id, name, ['C', text]);
          }
        } else {
          emit('attr', template_id, parent_id, name, ['C', value]);
        }
      }

      function string(value) {
        if(value.indexOf('{{') != -1) {
          var chunks = value.split('{{');
          chunks[0].length && emit('text', template_id, parent_id, ['C', chunks[0]]);
          for(var i = 1, l = chunks.length, c = chunks[1]; i < l; i++, c = chunks[i]) {
            var _ = c.split('}}', 2);
            var key = _[0], text = _[1];
            emit('text', template_id, parent_id, ['V', key]);
            text.length && emit('text', template_id, parent_id, ['C', text]);
          }
        } else {
          emit('text', template_id, parent_id, ['C', value]);
        }
      }

      if(n.nodeType == 9) { //Document
        node(template_id, parent_id, n.firstChild, emit);
      } else if(n.nodeType == 3) { //Text
        string(n.nodeValue);
      } else if(n.nodeType == 1) { //Element
        if(n.tagName == 'forall') {
          var new_template_id = template_id + '_nested' + new_id();
          if(n.hasAttribute('name')) {
            new_template_id = n.getAttribute('name');
          }
          emit('forall', template_id, parent_id, n.getAttribute('key'), new_template_id);
          for(var i = 0, c = n.childNodes, l = n.childNodes.length; i < l; i++) {
            node(new_template_id, 'root', c[i], emit);
          }
        } else {
          var node_id = 'node' + new_id();
          emit('node', template_id, n.tagName, node_id);
          emit('link', template_id, parent_id, node_id);
          if(n.attributes) {
            for(var a = n.attributes, i = 0, l = n.attributes.length; i < l; i++) {
              attribute(a[i].name, a[i].value, node_id);
            }
          }
          if(n.childNodes) {
            for(var i = 0, c = n.childNodes, l = n.childNodes.length; i < l; i++) {
              node(template_id, node_id, c[i], emit);
            }
          }
        }
      } else {
        //console.log('||nodeType=>' + n.nodeType);
      }
    }

    var templates = {};
    function collector(ins, source, arg1, arg2, arg3) {
      if(! templates.hasOwnProperty(source)) {
        templates[source] = [];
      }
      if(ins === 'node') { //Nodes go up
        templates[source].unshift([ins, arg1, arg2]);
      } else { // Other down
        templates[source].push([ins, arg1, arg2, arg3]);
      }
    }

    function split_var(v) {
      var v = v.replace(/^\s+|\s+$/g, '');
      var pipe = v.indexOf('|');
      var dot = v.indexOf('.');
      var bra = v.indexOf('[');
      var tor = [v, '', '', v.replace(/\.|\[|\]/g, '_')];
      if(pipe != -1) {
        tor[2] = 'filters.' + v.substr(pipe + 1).replace(/^\s+|\s+$/g, '');
        v = v.substr(0, pipe).replace(/^\s+|\s+$/g, '');
        tor[3] = v.replace(/\.|\[|\]/g, '_');
      }
      if(dot != -1 || bra != -1) {
        if(dot == - 1)
          dot = 1000;
        if(bra == - 1)
          bra = 1000;
        var ind = Math.min(dot, bra);
        tor[0] = v.substr(0, ind);
        tor[1] = v.substr(ind);
      } else {
        tor[0] = v;
        tor[1] = '';
      }
      return tor;
    }

    function builder(instructions) {//Single-pass translator enchanted with buffered optimizations!
      function esc(s) {
        return s.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      }

      var buff = [];

      var declarations = ['var root_node = document.createDocumentFragment();'],
          links = [], // Order is important here
          accessors = {};

      for(var i = 0, l = instructions.length; i < l; i++) {
        var ins = instructions[i],
            instruction = ins[0],
            parent_id = ins[1];

        if(buff.length > 0 && buff[0][0] == 'attr' && (instruction != 'attr' || buff[0][1] != parent_id || buff[0][2] != ins[2])) {
          if(buff.length == 1) {
            var pid = buff[0][1],
                attr = buff[0][2],
                value_type = buff[0][3][0], // Variable or Constant
                value = buff[0][3][1];
  
            if(value_type == 'V') { // Variable
              var variable = split_var(value);
              declarations.push('var ' + variable[0] + '_attr = document.createAttribute("' + attr + '");');
              links.unshift(pid + '_node.setAttributeNode(' + variable[0] + '_attr);');
              accessors[variable[0]] = accessors[variable[0]] || [];
              accessors[variable[0]].push(variable[3] + '_attr.value = ' + variable[2] + '(value' + variable[1] + ')');
            } else if(value_type == 'C') { // Constant
              links.unshift(pid + '_node.setAttribute("' + attr + '", "' + esc(value) + '");');
            }
          } else {
            var node_var_name = buff[0][1] + '_' + buff[0][2] + '_attr';
            var attr_update_func = buff[0][1] + '_' + buff[0][2] + '_update';
            declarations.push('var ' + node_var_name + ' = document.createAttribute("' + buff[0][2] + '");');
            links.unshift(buff[0][1] + '_node.setAttributeNode(' + node_var_name + ');');
            var parts = [];
            for(var j = 0, k = buff.length; j < k; j++) {
              var pid = buff[j][1],
                  attr = buff[j][2],
                  value_type = buff[j][3][0], // Variable or Constant
                  value = buff[j][3][1];

              if(value_type == 'C') {
                parts.push('"' + esc(value) + '"');
              } else if(value_type == 'V') {
                var variable = split_var(value);
                parts.push(variable[3] + '_var');
                declarations.push('var ' + variable[3] + '_var = "";');
                accessors[variable[0]] = accessors[variable[0]] || [0];
                accessors[variable[0]].pop();
		accessors[variable[0]].push(variable[3] + '_var = ' + variable[2] + '(value' + variable[1] + ')');
                accessors[variable[0]].push(attr_update_func + '()');
              }
            }
            declarations.push('var ' + attr_update_func + ' = function(){' + node_var_name + '.value = ' + parts.join(' + ')+ ';};');
          }
          buff = [];
        }

        if(instruction == 'attr') {
          buff.push(ins);
       } else if(instruction == 'text') {
          var value_type = ins[2][0], // Variable or Constant
              value = ins[2][1];

          if(value_type == 'V') { // Variable
            var variable = split_var(value);
            declarations.push('var ' + variable[3] + '_text = document.createTextNode("");');
            links.push(parent_id + '_node.appendChild(' + variable[3] + '_text);');
            accessors[variable[0]] = accessors[variable[0]] || [];
            accessors[variable[0]].push(variable[3] + '_text.nodeValue = ' + variable[2] + ' (value' + variable[1] + ')');
          } else if(value_type == 'C') { // Constant
            links.push(parent_id + '_node.appendChild(document.createTextNode("' + esc(value) + '"));');
          }
        } else if(instruction == 'node') {
          var node = ins[2];

          declarations.push('var ' + node + '_node = document.createElement("' + parent_id + '");' );
        } else if(instruction == 'link') {
          var node = ins[2];

          links.push(parent_id + '_node.appendChild(' + node + '_node);');
        } else if(instruction == 'forall') {
          var key = ins[2], // Accessor key
              tpl = ins[3]; // Template to loop over

          declarations.push('var before_' + tpl + ' = document.createTextNode("");');
          declarations.push('var after_' + tpl + ' = document.createTextNode("");');
          links.push(parent_id + '_node.appendChild(before_' + tpl + ');');
          links.push(parent_id + '_node.appendChild(after_' + tpl + ');');
          accessors[key] = accessors[key] || [];
          accessors[key].push('temple_utils.render_template(before_' + tpl + ', after_' + tpl + ', "' + tpl + '", value, pool)');
        }
      }
      accessors['update'] = ['temple_utils.set_all(this, value, pool)'];
      //console.log(accessors);
      var accessors_code = [];
      accessors_code.push('{');
      for(var key in accessors) {
        accessors_code.push(key + ': function(value){' )
        accessors_code.push(accessors[key].join(';'));
        accessors_code.push('}');
        accessors_code.push(',');
      }
      accessors_code.pop();
      accessors_code.push('}');
      links.push('return [root_node, ' + accessors_code.join('') + '];');
      return declarations.join('\n') + '\n' + links.join('\n');
    }


    var parser = new DOMParser();
    templates_files.forEach(function(val, index, array) {
      var _ = val.split('.');
      _.pop();
      _ = _.join('.').split('/');
      var name = _.pop();
      var template_string =  fs.readFileSync(val, {encoding: 'utf8'});
      node(name, 'root', parser.parseFromString(template_string), collector);
    });

    var templates_code = [];
    for(var k in templates) {
      templates_code.push(k + ': function(pool){' + builder(templates[k]).replace(/\n/g, "\n        ") + '\n    }');
    }
    output += '(function(window){\n';
    output += 'var templates_list = {\n    ' + templates_code.join(',\n    ') + '\n};';
    output += 'window.templates_list = window.templates_list || {};\n';
    output += 'window.templates_list.' + Object.keys(templates)[0] + ' = temple_utils.pool(templates_list);\n';
    output += '})(window);\n';

    return output;
  };

})(module);
