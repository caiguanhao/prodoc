var express = require('express');

var app = express();

app.set('port', 3000);
app.set('view engine', 'jade');
app.set('views', __dirname + '/views');
app.set('public_dir', __dirname + '/assets');
app.use(express.static(app.get('public_dir')));
app.use(express.bodyParser());
app.use(express.methodOverride());

require('js-yaml');

var manifest = require('./specs/car_accidents/manifest.yml');
var test = require('./test_data.yml');

app.get('/build', function(req, res, next) {
  var spec = require('./specs/car_accidents');
  var Handlebars = require('Handlebars');
  Handlebars.registerHelper('每个', Handlebars.helpers.each);
  var templates = manifest.manifest.__templates__;
  var doc = '';
  for (var c in manifest.manifest.__content__) {
    for (var template in manifest.manifest.__content__[c]) {
      var content = manifest.manifest.__content__[c][template].trim();
      var text_temp = Handlebars.compile(content);

      var temp;
      if (templates.hasOwnProperty(template)) {
        temp = templates[template];
      } else {
        temp = templates[templates.__default__];
      }
      var html_temp = Handlebars.compile(typeof(temp) === 'object' ? temp.__content__ : temp);
      content = text_temp(test);
      var con = content.replace(/\n{2}/g, '\n').split('\n');
      for (var i = 0; i < con.length; i++) {
        if (!con[i]) continue;
        doc += html_temp({ content: con[i] }) + '\n\n';
      }
    }
  }
  doc = doc.trim();
  res.set('Content-Type', 'application/msword');
  res.set('Content-Disposition', 'attachment; filename=' + encodeURIComponent('文档') + '.doc');
  res.end(spec.make(doc));
});

app.get('/manifest', function(req, res, next) {
  res.send({ manifest: manifest, testing: test });
});

app.get('/', function(req, res, next) {
  res.locals.pretty = true;
  res.locals.manifest = manifest;
  res.render('main');
});

app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});
