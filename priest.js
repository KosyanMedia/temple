(function(module){
  var xmldom = require("madlib-xmldom");

  var node = require('./xml2instructions');
  var builder = require('./code_generator');
  function is_object( mixed_var ){
    if(mixed_var instanceof Array) {
      return false;
    } else {
      return (mixed_var !== null) && (typeof( mixed_var ) == 'object');
    }
  }
  module.exports = function(templates_files, as_module, drop_spaces /*> <*/){
    if(!is_object(templates_files)){
      
    }
    //if(!(templates_files instanceof Array)){
    //  templates_files = [templates_files];
    //}


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
    for(var template_name in templates_files){
      var _ = template_name.split('.');
      _.pop();
      _ = _.join('.').split('/');
      var name = _.pop();
      var template_string = templates_files[template_name];
      if(drop_spaces) {
        template_string = template_string.replace(/>\s+</g, '><');
      }
      node(name, 'root', xmldom.parse(template_string, "application/xml"), collector);
    }

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
