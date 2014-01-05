module.exports = function(hbs, html_tpl, tpl_data, usr_data) {

  var compiled = '';

  var render = function(block, template_name) {
    var item = block[template_name].trim();
    var item_template = hbs.compile(item);

    var item_html, item_html_template;
    if (html_tpl.hasOwnProperty(template_name)) {
      item_html = html_tpl[template_name];
    } else { // find html tpl or use default
      item_html = html_tpl[html_tpl.__default__];
    }
    if (typeof(item_html) === 'object') {
      item_html_template = hbs.compile(item_html.__content__);
    } else { // get its content if object or itself if string
      item_html_template = hbs.compile(item_html);
    }

    // compile to text and then html
    var compiled_item = item_template(usr_data);
    var compiled_item_lines = compiled_item.replace(/\n{2}/g, '\n').split('\n');
    for (var i = 0; i < compiled_item_lines.length; i++) {
      if (!compiled_item_lines[i]) continue;
      compiled += item_html_template({ content: compiled_item_lines[i] }) + '\n\n';
    }
  };

  for (var block_name in tpl_data) {
    var block = tpl_data[block_name];
    if (block instanceof Array) {
      for (var b = 0; b < block.length; b++) {
        for (var template_name in block[b]) {
          render(block[b], template_name);
        }
      }
    } else if (typeof(block) === 'string') {
      render(tpl_data, block_name);
    } else {
      // this case seems to be useless
      for (var template_name in block) {
        render(block, template_name);
      }
    }
  }

  compiled = compiled.trim();

  return compiled;

};
