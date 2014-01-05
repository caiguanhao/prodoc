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
    function textInput(name, val) {
      return '<input name="' + name + '" value="' + (val || '') + '">';
    }
    function selectOptions(name, options, selected) {
      var output = '<select name="' + name + '">'
      $.each(options, function(key, value) {
        output += '<option value="' + value + '"' +
          (selected && selected === value ? ' selected' : '') +
            '>' + value + '</option>';
      });
      output += '</select>';
      return output;
    }
    function build(variables, defaults) {
      var output = '';
      $.each(variables, function(var_name, var_content) {
        var defval = defaults && defaults.hasOwnProperty(var_name) ? defaults[var_name] : null;
        var isArray = (var_content instanceof Array && typeof(var_content[0]) === 'object');
        output += '<div class="input" data-name="' + var_name + '" data-is-array="' + isArray + '">';
        if (!isArray) {
          output += '<span class="label">' + var_name + '</span>';
        }
        if (typeof(var_content) === 'string') {
          output += textInput(var_name, defval);
        }
        if (typeof(var_content) === 'object') {
          if (var_content instanceof Array) {
            if (typeof(var_content[0]) === 'object') {
              if (defval instanceof Array) {
                $.each(defval, function(index) {
                  output += '<div class="item"><span class="label">' + var_name + (index+1) + '</span>';
                  output += build(var_content[0], defval ? defval[index] : null) + '</div>';
                });
              } else {
                output += '<div class="item"><span class="label">' + var_name + '</span>';
                output += build(var_content[0], null) + '</div>';
              }
            } else {
              output += selectOptions(var_name, var_content, defval);
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
    var obj = {};
    function modify(object, parents, index, val) {
      var current = parents.eq(index);
      var is_array = current.data('is-array');
      var name = current.data('name');
      if (!name) name = current.index();
      if (index > 0) {
        if (is_array === true) {
          object[name] = object[name] || [];
        } else {
          object[name] = object[name] || {};
        }
        modify(object[name], parents, index - 1, val);
      } else {
        object[name] = val;
      }
    }
    $('#info').find('input, select').each(function() {
      var parents = $(this).parentsUntil('#info');
      modify(obj, parents, parents.length - 1, $(this).val());
    });
    return obj;
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
