## Temple template engine

### Install dependencies
```bash
npm install
```

### Examples

See [examples](examples/)

Build examples:
```bash
node ./bin/temple examples/*temple # Dump on stdout
node ./bin/temple examples/*temple > templates.js # Dump into templates.js
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

### Using instruction for browser env
#### 1. Write temple file
For example, your template file `my_template.temple` looks like:
```xml
<div id="{{id}}">
  {{name}}
</div>
```

#### 2. Compile
Build temple functions from template:
```bash
node path/to/temple/bin/temple my_template.temple > templates.js
```

#### 3. Include template
Also don't forget include `temple_utils.js`to your page, head section must look like:
```html
<script src="temple_utils.js"></script>
<script src="templates.js"></script>
```
After that you'll have `templates` variable with all your templates and temple manipulations methods.
Templates named by filename, for example you get `templates.get('my_template')`.

#### 4. Fill template by data
For example, you want render simple information:
```js
data = {
  "id": 1,
  "name": "John"
}
```
Don't forget that json must be valid, you can try [validator](http://jsonlint.com/) first.
And finnaly pass data to your template:
```js
myTemplate = templates.get('my_template', data);
```
or
```js
pool = templates.get('my_template')[1];
myTemplate = pool.update(data);
```
Variable `myTemplate` its array with `[0]` DOM template and `[1]` temple methods for template.

#### 5. Append template to DOM

```js
div = document.getElementById('place-for-append')
div.appendChild(myTemplate[0])
```

### Syntax
Temple templates are valid XML-tree:
```xml
<div id="{{id}}">
  {{name}}
</div>
```

#### Loops:
You can use `forall` instruction for render each item of array:

```xml
<ul>
  <forall key="items">
    <li>{{value}}</li>
  </forall>
</ul>
```

#### Conditional statements:
And use `if` for simple conditions:
```xml
<div>
  <if key="plane">
    Flight number: {{airline}} {{number}}
  </if>
  <if key="train">
    Train number: {{number}}
  </if>
</div>
```

#### Partial templates:
Use `include` to include partial template:

```xml
<include name="foo" key="value"/>
```
where `foo` is template name, and `value` is data for rendering;

### Methods

### .info()

### .get(template_name)
```js
myTemplate = templates.get('my_template');
```

### .get(template_name, data)
```js
myTemplate = templates.get('my_template', {data: data});
```

### .update(data)

### .build_cache({template_name: num_of_copy})
```js
templates.info().free
templates.build_cache({‘my_template’: 1000})
templates.info().free
```

### .remove()
### .root()
Return DOM element

### .child_template_name()
Temple provide setters for child template, for template `my_template`
```xml
<ul>
  <forall key="items">
    <li>{{data}}</li>
  </forall>
</ul>
```
You'll have
```js
myTemplate = templates.get('my_template')[1]
myTemplate.items([{"data": "some data"}, {"data": "some data2"}])
```


