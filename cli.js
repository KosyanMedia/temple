var temple = require('./priest');
var fs = require('fs');
var template;

if (process.argv.slice(-1)[0] === "-m") {

  template = temple(process.argv.slice(2, -1), true);
} else {
  var templates_files = process.argv.slice(2),
    templates = {};

  templates_files.forEach(function (val, index, array) {
    var _ = val.split('.');
    _.pop();
    _ = _.join('.').split('/');
    var name = _.pop();
    var template_string = fs.readFileSync(val, {encoding: 'utf8'});

    templates[name] = template_string;
  });

  template = temple(templates, false, true);
}
console.log(template);
