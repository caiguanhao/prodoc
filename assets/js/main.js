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
    startMergedView();
    // buildBlocks($('#editor'));
    // buildInfoForm();
    // parse(formToObject());
  });

  // merged view:
  function startMergedView() {
    buildDocument();
    buildForm();
    parseDocument();
    bindEvents();

    function buildDocument() {
      function buildItemsForBlock(block, block_dom) {
        $.each(block, function(template_name, item) {
          var item_dom = $('<div />').addClass('item');
          item_dom.data('template', item.trim());
          item_dom.data('template-name', template_name);
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
        $('#main').append(block_dom);
      });
    }
    function buildForm() {
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
                    output += build(var_content[0], defval[index]) + '</div>';
                  });
                } else {
                  output += '<div class="item untouched"><span class="label">' + var_name + '</span>';
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
        if (current.hasClass('untouched')) return;
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
    function touchFormBlock(element) {
      var item = $(element).closest('.item');
      var str = item.find('input').map(function() { return $(this).val(); }).toArray().join('');
      if (str) {
        item.removeClass('untouched');
      } else {
        item.addClass('untouched');
      }
    }
    function parseDocument() {
      $('#main').find('.item').each(function() {
        var tpl_data = {};
        tpl_data[$(this).data('template-name')] = $(this).data('template');
        $(this).html(toHTML(Handlebars, manifest.__templates__, tpl_data, formToObject()));
      });
    }
    function bindEvents() {
      $(document).on('keyup keydown', '#info input, #info [contenteditable]', function(e) {
        touchFormBlock(this);
        parseDocument();
      });
      $(document).on('change', '#info select', function(e) {
        touchFormBlock(this);
        parseDocument();
      });
      $(document).on('click', '#main .item', function(e) {
        e.stopPropagation();
        e.preventDefault();
        if (!$(this).hasClass('editing')) {
          var originalHeight = $(this).height();
          var originalTextAlign = $('[style]', this).css('text-align');
          $(this).text($(this).data('template'));
          $(this).addClass('editing');
          $(this).prop('contenteditable', true);
          $(this).height(originalHeight);
          var lines = $(this).data('template').split('\n').length;
          var lineheight = Math.floor(originalHeight/lines);
          if (lineheight > 30) lineheight = 30;
          if (lineheight < 14) lineheight = 14;
          $(this).css({ 'line-height': lineheight + 'px', 'text-align': originalTextAlign });
        }
      });
      $(document).on('click', function(e) {
        var editings = $('#main .item.editing');
        if (editings.length > 0) {
          editings.each(function() {
            $(this).data('template', $(this).text());
            $(this).removeClass('editing');
            $(this).prop('contenteditable', false);
            $(this).height('auto');
            $(this).css({ 'line-height': 'normal' });
          });
          parseDocument();
        }
      });
    }
  }

  // split view:
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
                  output += build(var_content[0], defval[index]) + '</div>';
                });
              } else {
                output += '<div class="item untouched"><span class="label">' + var_name + '</span>';
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
      if (current.hasClass('untouched')) return;
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
  function touch(element) {
    var item = $(element).closest('.item');
    var str = item.find('input').map(function() { return $(this).val(); }).toArray().join('');
    if (str) {
      item.removeClass('untouched');
    } else {
      item.addClass('untouched');
    }
  }
  // $(document).on('keyup keydown', 'input, [contenteditable]', function() {
  //   touch(this);
  //   parse(formToObject());
  // });
  // $(document).on('change', 'select', function() {
  //   touch(this);
  //   parse(formToObject());
  // });
});
