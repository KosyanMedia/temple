var temple = require('./priest');
var template;
if(process.argv.slice(-1)[0] === "-m"){
  template = temple(process.argv.slice(2, -1), true);
} else {
  template = temple(process.argv.slice(2));
}
console.log(template);
