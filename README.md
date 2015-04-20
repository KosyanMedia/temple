## Temple template engine

### Install dependencies
```bash
npm install
```

### Examples

See [examples](examples/)

Build examples:
```bash
node cli.js examples/*temple # Dump on stdout
node cli.js examples/*temple > templates.js # Dump into templates.js
```

### Use

Load scripts [[temple_utils.js](temple_utils.js), [templates.js](templates.js)]

Or `cat templates.js temple_utils.js > res.js` and paste it into chrome console
```javascript
console.log(JSON.stringify(window.templates_pool.info())); # pool is empty
var t = window.templates_pool.get("ss"); # Load empty ss template
console.log(JSON.stringify(window.templates_pool.info())); # pool has one busy ss item
console.log(t[0]); # Look as dom
t[1].A("FiRsT");
console.log(t[0]);
t[1].B([{C: 1, E: "Yahhhoo!"},{C: 2, E: "MMMM",D: [1,1,1,9]}]);
console.log(JSON.stringify(window.templates_pool.info())); # more busy templates
window.templates_pool.build_cache({"ss": 100}); # build 100 elements cache for ss template
console.log(JSON.stringify(window.templates_pool.info())); # fresh new 100 ss items ready for action
console.log(t[0]);
```
