window.temple_utils = require('../temple_utils');
var temple = require('../priest');
var beautify_js = require('js-beautify');
require('codemirror/mode/htmlmixed/htmlmixed');
require('codemirror/mode/javascript/javascript');
var CodeMirror = require('codemirror');

document.addEventListener('DOMContentLoaded', function () {
  var textarea = document.getElementById('code');
  var as_module = document.getElementById('as_module');
  var drop_spaces = document.getElementById('drop_spaces');
  var eval_code = document.getElementById('eval_code');
  var demo_data = document.getElementById('demo_data');
  var eval_code_results_container = document.getElementById('eval_code_results_container');

  var template_cm = CodeMirror.fromTextArea(textarea, {
    lineNumbers: true,
    mode: "htmlmixed"
  });
  var demo_data_cm = CodeMirror.fromTextArea(demo_data, {
    lineNumbers: true,
    mode: "javascript"
  });
  var result = document.getElementById('result');
  document.getElementById('generate').addEventListener('click', function () {
    var template = temple({'foo.temple': template_cm.getValue()}, as_module.checked, drop_spaces.checked);
    if (eval_code.checked) {
      eval(template);
      var template_obj = window.templates.get('foo', JSON.parse(demo_data_cm.getValue()));
      eval_code_results_container.innerHTML = '';
      eval_code_results_container.appendChild(template_obj[0]);
    }
    //result.innerText = beautify_js(template);
    CodeMirror(result, {
      value: beautify_js(template),
      mode: "javascript"
    });
  });
});
