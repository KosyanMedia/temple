(function (module) {
  var lid = 0;

  function new_id() {
    return lid++;
  }

  function node(template_id, parent_id, n, emit) {
    function attribute(name, value, parent_id) {
      if (value.indexOf('{{') != -1) {
        var chunks = value.split('{{');

        chunks[0].length && emit('attr', template_id, parent_id, name, ['C', chunks[0]]);

        for (var i = 1, l = chunks.length, c = chunks[1]; i < l; i++, c = chunks[i]) {
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
      if (value.indexOf('{{') != -1) {
        var chunks = value.split('{{');

        chunks[0].length && emit('text', template_id, parent_id, ['C', chunks[0]]);

        for (var i = 1, l = chunks.length, c = chunks[1]; i < l; i++, c = chunks[i]) {
          var _ = c.split('}}', 2);
          var key = _[0], text = _[1];
          emit('text', template_id, parent_id, ['V', key]);
          text.length && emit('text', template_id, parent_id, ['C', text]);
        }
      } else {
        emit('text', template_id, parent_id, ['C', value]);
      }
    }

    switch (n.nodeType) {
      case 9: // Document
        node(template_id, parent_id, n.firstChild, emit);
        emit('stop', template_id);

        break;
      case 3: //Text
        string(n.nodeValue);
        break;
      case 1: //Element
        if (n.tagName == 'forall' || n.tagName == 'if') {
          var new_template_id = template_id + '_' + n.tagName + '_' + new_id();

          if (n.hasAttribute('name')) {
            new_template_id = n.getAttribute('name');
          }

          emit(n.tagName, template_id, parent_id, n.getAttribute('key'), new_template_id);

          for (var i = 0, c = n.childNodes, l = n.childNodes.length; i < l; i++) {
            node(new_template_id, 'root', c[i], emit);
          }

          emit('stop', new_template_id);
        } else if(n.tagName == 'include') {
          emit(n.tagName, template_id, parent_id, n.getAttribute('data'), n.getAttribute('name'));
        } else {
          var node_id = 'n' + new_id();

          emit('node', template_id, n.tagName, node_id);

          if (n.attributes) {
            for (var a = n.attributes, i = 0, l = n.attributes.length; i < l; i++) {
              attribute(a[i].name, a[i].value, node_id);
            }
          }

          if (n.childNodes) {
            for (var i = 0, c = n.childNodes, l = n.childNodes.length; i < l; i++) {
              node(template_id, node_id, c[i], emit);
            }
          }

          emit('link', template_id, parent_id, node_id);

          break;
        }
      default:
        //console.log('||nodeType=>' + n.nodeType);
        break;
    }
  }

  module.exports = node;
})(module);
