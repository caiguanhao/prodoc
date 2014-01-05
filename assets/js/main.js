require('./vendor/jquery-2.0.3.min.js');

var Handlebars = require('handlebars');
require('../../lib/hbs_config')(Handlebars);

var testing;
$(function(){
  var manifest = null;
  $.getJSON('/manifest', function(m) {
    manifest = m.manifest.manifest;
    testing = m.testing;
    buildInfoForm();
    parse(formToObject());
  });
  function buildInfoForm() {
    var manifest_variables = manifest.__variables__;
    function build(variables, defaults) {
      var output = '';
      $.each(variables, function(var_name, var_content) {
        var defval = defaults && defaults.hasOwnProperty(var_name) ? defaults[var_name] : null;
        var isArray = (var_content instanceof Array && typeof(var_content[0]) === 'object');
        output += '<div class="input" data-is-array="' + isArray + '">';
        output += '<span class="label">' + var_name + '</span>';
        if (typeof(var_content) === 'string') {
          output += '<input name="' + var_name + '" value="' + (defval || '') + '">';
        }
        if (typeof(var_content) === 'object') {
          if (var_content instanceof Array) {
            if (typeof(var_content[0]) === 'object') {
              output += build(var_content[0], defval ? defval[0] : null);
            } else {
              output += '<select name="' + var_name + '">'
              $.each(var_content, function(key, value) {
                output += '<option value="' + value + '">' + value + '</option>';
              });
              output += '</select>';
            }
          } else {
            output += build(var_content, defval);
          }
        }
        output += '</div>'
      });
      return output;
    }
    $('#info').html(build(manifest_variables, testing));
  }
  function formToObject() {
    function get(elements) {
      var output = {};
      elements.children().each(function() {
        if ($(this).children().length === 0) return true;
        var name = $('> .label', this).text();
        if (!name) return true;
        var input = $('.input', this);
        if (input.length === 0) {
          output[name] = $('input, select', this).val()
        } else {
          var newObj = {};
          if ($(this).data('is-array') === true) {
            newObj[name] = [ get($(this)) ];
          } else {
            newObj[name] = get($(this));
          }
          $.extend(output, newObj);
        }
      });
      return output;
    }
    return get($('#info'));
  }
  function parse(what) {
    var editor = $('#editor');
    var editor_content = '';
    var manifest_templates = manifest.__templates__;
    editor.find('.block').each(function() {
      $(this).find('.item').each(function() {
        var template_used = $(this).data('template');
        var template;
        if (manifest_templates.hasOwnProperty(template_used)) {
          template = manifest_templates[template_used];
        } else {
          template = manifest_templates[manifest_templates.__default__];
        }
        if (typeof(template) === 'object') template = template.__content__;
        template = Handlebars.compile(template.trim());
        var content = $(this).text().trim();
        $.each(content.split('\n'), function(k, value) {
          editor_content += template({ content: value }) + '\n';
        });
      });
      editor_content += '\n';
    });
    editor_content = editor_content.trim();
    var template = Handlebars.compile(editor_content);
    $('#preview').html(template(what))
  }
  $(document).on('keyup keydown', 'input, [contenteditable]', function() {
    parse(formToObject());
  });
  $(document).on('change', 'select', function() {
    parse(formToObject());
  });
});
