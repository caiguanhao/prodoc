var path = require('path');

module.exports = {
  make: function(content) {
    var fs = require('fs');
    var header = fs.readFileSync(path.join(__dirname, '0.header.html'));
    var styles = fs.readFileSync(path.join(__dirname, '1.styles.html'));
    var prebody = fs.readFileSync(path.join(__dirname, '2.prebody.html'));
    var footer = fs.readFileSync(path.join(__dirname, '3.footer.html'));
    var output = header + styles + prebody + content + footer;
    return output;
  }
};
