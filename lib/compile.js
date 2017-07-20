var util = require('util');
var fs = require('fs');
var path = require('path');
var request = require('request');
var iconv = require('iconv-lite');
var Compile = function (opts, cb) {
  this.opts = opts = util._extend({
    src: path.join(process.cwd(), 'src'),
    isTms: true,
    transform: []
  }, opts || {});
  this.content = opts.content || '';
  this.filePath = opts.filePath || '';
  if (!this.content && this.filePath && fs.existsSync(this.filePath)) {
    this.content = fs.readFileSync(this.filePath, 'utf8');
  }
  this.init(cb);
};
Compile.prototype = {
  init: function (cb) {
    var self = this;
    this.includeSupport();
    this.tmsSupport(function () {
      self.abcSupport();
      self.transform(function () {
        cb && cb(null, self.content);
      });
    });
  },
  //支持 inculde // <!--include  xxx-->
  includeSupport: function () {
    var self = this;
    this.content = this.content.replace(/<!--\s*include\s([-.\/_0-9a-zA-Z]+\.html)\s*-->/g, function (all, file) {
      var filePath;
      if (/^\.+[\\/]/g.test(file) && self.filePath) {
        filePath = path.join(path.dirname(self.filePath), file);
      } else {
        filePath = path.join(self.opts.src, file);
      }
      try {
        return '<!--include ' + file + '-->' + fs.readFileSync(filePath, 'utf-8');
      } catch (e) {
        return all;
      }
    });
  },

  // <!--TMS:/market/life/h5/shj-index-slide.php,gbk,1:TMS-->
  tmsSupport: function (cb) {
    if (!this.opts.isTms) return cb && cb();
    var self = this;
    var str = this.content;
    var match = str.match(/\<\!\-\-TMS(.*?)\,1\:TMS\-\-\>/gi) || [];
    match = match.concat(str.match(/\<\!\-\-TMS(.*?)\,561\:TMS\-\-\>/gi) || []);
    if (match && match.length) {
      var count = match.length;
      match.forEach(function (tmstag) {
        var fp,
          temp,
          charset;
        fp = tmstag.split(':')[1];
        temp = fp.split(',');
        fp = temp[0];
        charset = temp[1];
        request({
          url: 'http://www.taobao.com/go' + fp,
          encoding: null
        }, function (error, response, body) {
          var stream;
          if (/gb/gi.test(charset)) {
            stream = iconv.decode(body, 'gbk');
          } else {
            stream = iconv.decode(body, 'utf-8');
          }
          str = str.replace(new RegExp(tmstag, 'gm'), stream);
          self.content = str;
          if (!--count) {
            cb();
          }
        });
      });
    } else {
      cb && cb();
    }
  },

  /* 支持@@ group name version */
  abcSupport: function () {
    var opts = this.opts;
    opts.group && (this.content = this.content.replace('@group@', opts.group));
    opts.name && (this.content = this.content.replace('@name@', opts.name));
    if (!opts.version) {
      opts.version = this.getVersion(opts.version);
      this.content = this.content.replace('@version@', opts.version)
    }
  },

  getVersion: function (v) {
    if (!v || v === '@branch@') {
      var headerFile = path.join(process.cwd(), '.git/HEAD');
      var gitVersion = fs.existsSync(headerFile) && fs.readFileSync(headerFile, {encoding: 'utf8'}) || '';
      var arr = gitVersion.match(/(\d+\.\d+\.\d+)/g);
      v = arr && arr[0] || '0.0.1';
    }
    return v;
  },

  transform: function (cb) {
    cb = cb || function () {
    };
    var transforms = this.opts.transform || []; //[fn,fn]
    var self = this;
    if (util.isFunction(transforms)) {
      var content = transforms.apply(self, [self.content, self]);
      if (content && content.then && util.isFunction(content.then)) {
        content.then(function (res) {
          self.content = res;
          cb();
        })
      } else if (content !== undefined) {
        self.content = content;
        cb()
      }
    } else if (util.isArray(transforms) && transforms.length) {
      transform();
    } else {
      cb();
    }
    function done() {
      if (transforms && transforms.length) {
        transform();
      } else {
        cb();
      }
    }

    function transform() {
      var transform = transforms.shift();
      if (util.isFunction(transform)) {
        var content = transform.apply(self, [self.content, self]);
        if (content && content.then && util.isFunction(content.then)) {
          content.then(function (res) {
            self.content = res;
            done()
          })
        } else if (content !== undefined) {
          self.content = content;
          done()
        } else {
          done();
        }
      } else {
        done();
      }
    }
  }

};
module.exports = Compile;