module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    browserify: {
      public: {
        files: {
          'public/js/main.js': ['assets/js/main.js']
        }
      }
    },
    less: {
      development: {
        files: {
          'public/css/main.css': 'assets/css/main.less'
        }
      }
    },
    watch: {
      options: {
        livereload: true
      },
      css: {
        files: [ 'assets/css/*.less' ],
        tasks: [ 'less' ]
      },
      client_js: {
        files: [ 'assets/js/*.js', 'lib/*.js' ],
        tasks: [ 'browserify' ]
      },
      server_js: {
        files: [ '<%= pkg.main %>', 'lib/*.js', '**/*.yml' ],
        tasks: [ 'develop' ],
        options: { nospawn: true }
      }
    },
    develop: {
      server: {
        file: '<%= pkg.main %>'
      }
    },
    copy: {
      production: {
        src: [ '<%= pkg.main %>', '*.yml', 'lib/**', 'specs/**', 'views/**', 'public/**' ],
        dest: 'portablizer/node/'
      }
    },
    clean: {
      production: 'portablizer/node/'
    }
  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-develop');

  grunt.registerTask('default', [ 'browserify', 'less', 'develop', 'watch' ]);
  grunt.registerTask('build', [ 'browserify', 'less', 'clean:production',
    '_add_production_modules_', 'copy:production', '_run_portablizer_configure_', 'make' ]);

  grunt.registerTask('_add_production_modules_', function() {
    var src = grunt.config('copy.production.src');
    for (var module in grunt.config('pkg').dependencies) {
      src.push('node_modules/' + module + '/**');
    }
    grunt.config('copy.production.src', src);
  });

  grunt.registerTask('_run_portablizer_configure_', function() {
    var finish = this.async();
    var configure = grunt.util.spawn({
      cmd: './configure',
      opts: {
        cwd: 'portablizer'
      }
    }, function(error, result, code) {
      finish();
    });
    configure.stdout.pipe(process.stdout);
    configure.stderr.pipe(process.stderr);
  });

  grunt.registerTask('make', function() {
    var finish = this.async();
    var configure = grunt.util.spawn({
      cmd: 'make',
      opts: {
        cwd: 'portablizer'
      }
    }, function(error, result, code) {
      finish();
    });
    configure.stdout.pipe(process.stdout);
    configure.stderr.pipe(process.stderr);
  });

  grunt.registerTask('analyze', 'Analyze .mht files', function(file) {
    var finish = this.async();
    var mimelib = require("mimelib");
    var fs = require('fs');
    fs.readFile(file, function(err, content) {
      content = mimelib.decodeQuotedPrintable(content);
      fs.writeFileSync('content.html', content);
      var style_tag = content.match(/<style>[\S\s]+?<\/style>/)[0];
      fs.writeFileSync('styles.html', style_tag);
      var styles = content.match(/<p([^>]+?)style=([^\/!]+?)span([^>]+?)style([^>]+?)>/g);
      var collected = {};
      for (var i = 0; i < styles.length; i++) {
        collected[styles[i]] = collected[styles[i]] || 0;
        collected[styles[i]]++;
      }
      function a(n) {
        return n < 10 ? '0' + n : n;
      }
      var collected2 = { __templates__: { __default__: null } };
      var index = 1, max = 0, _default;
      for (var c in collected) {
        var count = collected[c];
        if (count > max) {
          max = count;
          _default = 't'+a(index);
        }
        c = c.replace(/:[\r\n]+/g, ':').replace(/[\r\n]+/g, ' ').replace(/'/g, '"');
        var tags = c.match(/<([^\r\n\s]+)/g);
        c += '{{content}}';
        for (var i = tags.length - 1; i >= 0; i--) {
          c += tags[i].replace(/^</, '</') + '>';
        }
        collected2.__templates__['t'+a(index)] = {
          __content__: c,
          __count__: count
        };
        index++;
      }
      collected2.__templates__.__default__ = _default;
      var yaml = require('js-yaml');
      fs.writeFileSync('styles.yml', yaml.safeDump(collected2))
      finish();
    });
  });

};
