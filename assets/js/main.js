require('./vendor/jquery-2.0.3.min.js');

var Handlebars = require('handlebars');
require('../../lib/hbs_config')(Handlebars);

var toHTML = require('../../lib/toHTML');

var testing;
$(function(){
  var manifest = null;
  $.getJSON('/manifest', function(m) {
    manifest = m.manifest.manifest;
    testing = m.testing;
    buildBlocks($('#editor'));
    buildInfoForm();
    parse(formToObject());
  });
  function buildBlocks(parent) {
    function buildItemsForBlock(block, block_dom) {
      $.each(block, function(template_name, item) {
        var item_dom = $('<div />').addClass('item');
        item_dom.text(item.trim());
        item_dom.prop('contenteditable', true);
        item_dom.data('template', template_name);
        block_dom.append(item_dom);
      });
    }
    var content = manifest.__content__;
    $.each(content, function(block_name, block) {
      var block_dom = $('<div />').addClass('block');
      block_dom.data('name', block_name);
      if (block instanceof Array) {
        $.each(block, function() {
          buildItemsForBlock(this, block_dom);
        });
      } else {
        buildItemsForBlock(block, block_dom);
      }
      parent.append(block_dom);
    });
  }
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
    function formToTplData(parent) {
      var tpl_data = {};
      parent.find('.block').each(function() {
        var block_name = $(this).data('name');
        tpl_data[block_name] = tpl_data[block_name] || [];
        $(this).find('.item').each(function() {
          var template_name = $(this).data('template');
          var newObj = {};
          newObj[template_name] = $(this).text().trim();
          tpl_data[block_name].push(newObj);
        });
      });
      return tpl_data;
    }
    var editor = $('#editor');
    var html = toHTML(Handlebars, manifest.__templates__, formToTplData(editor), what);
    $('#preview').html(html);
  }
  $(document).on('keyup keydown', 'input, [contenteditable]', function() {
    parse(formToObject());
  });
  $(document).on('change', 'select', function() {
    parse(formToObject());
  });
});
