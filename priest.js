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
        console.log('||nodeType=>' + n.nodeType);
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

    function builder(instructions) {//Single-pass translator
      function esc(s) {
        return s.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      }

      var declarations = ['var root_node = document.createDocumentFragment();'];
      var links = [];//Order is important here
      var accessors = [];
      for(var i = 0, l = instructions.length; i < l; i++) {
        var ins = instructions[i];
        if(ins[0] == 'attr') {
          if(ins[3][0] == 'V') {
            declarations.push('var ' + ins[3][1] + '_attr = document.createAttribute("' + ins[2] + '");');
            links.unshift(ins[1] + '_node.setAttributeNode(' + ins[3][1] + '_attr);');
            accessors.push(ins[3][1] + ': function(value){if(value){' + ins[3][1] + '_attr.value = value; } else {return ' + ins[3][1] + '_attr.value;}}');
          } else if(ins[3][0] == 'C') {
            links.unshift(ins[1] + '_node.setAttribute("' + ins[2] + '", "' + esc(ins[3][1]) + '");');
          }
        } else if(ins[0] == 'text') {
          if(ins[2][0] == 'V') {
            declarations.push('var ' + ins[2][1] + '_text = document.createTextNode("");');
            links.push(ins[1] + '_node.appendChild(' + ins[2][1] + '_text);');
            accessors.push(ins[2][1] + ': function(value){if(value){' + ins[2][1] + '_text.nodeValue = value; } else {return ' + ins[2][1] + '_node.nodeValue;}}');
          } else if(ins[2][0] == 'C') {
            links.push(ins[1] + '_node.appendChild(document.createTextNode("' + esc(ins[2][1]) + '"));');
          }
        } else if(ins[0] == 'node') {
          declarations.push('var ' + ins[2] + '_node = document.createElement("' + ins[1] + '");' );
        } else if(ins[0] == 'link') {
          links.push(ins[1] + '_node.appendChild(' + ins[2] + '_node);');
        } else if(ins[0] == 'forall') {
          declarations.push('var before_' + ins[3] + ' = document.createTextNode("");');
          declarations.push('var after_' + ins[3] + ' = document.createTextNode("");');
          links.push(ins[1] + '_node.appendChild(before_' + ins[3] + ');');
          links.push(ins[1] + '_node.appendChild(after_' + ins[3] + ');');
          accessors.push(ins[2] + ': ' + 'function(value){render_template(before_' + ins[3] + ', after_' + ins[3] + ', "' + ins[3] + '", value, pool);}');
        }
      }
      var accessors_code = '{' + accessors.join(', ')+ '}';
      links.push('return [root_node, ' + accessors_code + '];');
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
    output += 'window.templates_list = temple_utils.pool(templates_list);\n';
    output += '})(window);\n';

    return output;
  };

})(module);
