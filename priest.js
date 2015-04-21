(function(module){
  var DOMParser = require('xmldom').DOMParser;
  var fs = require('fs');
  var node = require('./xml2instructions');
  var builder = require('./code_generator');

  module.exports = function(templates_files, as_module, drop_spaces /*> <*/){
    if(!(templates_files instanceof Array)){
      templates_files = [templates_files];
    }

    var parser = new DOMParser();
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

    templates_files.forEach(function(val, index, array) {
      var _ = val.split('.');
      _.pop();
      _ = _.join('.').split('/');
      var name = _.pop();
      var template_string = fs.readFileSync(val, {encoding: 'utf8'});
      if(drop_spaces) {
        template_string = template_string.replace(/>\s+</g, '><');
      }
      node(name, 'root', parser.parseFromString(template_string), collector);
    });

    var templates_code = [];
    for(var k in templates) {
      if(templates[k].length > 1) //Ignore stop instruction
        templates_code.push(k + ': function(pool){' + builder(templates[k]) + '}');
    }

    if(as_module){
      return 'module.exports = {' + templates_code.join(',') + '};';
    } else {
      return '(function(window){' +
        'var templates_list = {' + templates_code.join(',') + '};' +
        'window.templates = temple_utils.pool(templates_list);' +
        '})(window);';
    }
  };
})(module);
