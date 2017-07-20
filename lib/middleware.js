var path = require('path');
var fs = require('fs');
var util = require('util');
var url = require('url');
var compile = require('./compile');
module.exports = function(srcPath,options) {
  var opts = {
    src: './src',
    grep: /\.html$/, //hell0/as.xx
    addIndex: true,
    transform: []
  };
  if(util.isString(srcPath)){
    opts.src = srcPath;
    options = util._extend(opts,options || {});
  }else if(util.isObject(options)){
    options = util._extend(opts,options || {})
  }else{
    options = opts;
  }
  return function * (next) {
    var req = this.req;
    var res = this.res;
    var self = this;
     yield * next;
    var pathname = url.parse(req.url).pathname;
    var filePath = path.join(srcPath,pathname);
    if (options.grep.test(pathname)) {
        if(!fs.existsSync(filePath) && options.addIndex){
            filePath = filePath.replace(/\.html$/g,function (world) {
                return '/index.html'
            })
        }
      if(fs.existsSync(filePath)){
         if(util.isString(self.body)){
          options.content = self.body;
        }else if(Buffer.isBuffer(self.body)){
          options.content = self.body.toString();
        }else{
          options.content = fs.readFileSync(filePath, {encoding: 'utf8'});
        }
        options.filePath = filePath;
        self.body = yield new Promise(function(resolve){
          new compile(options,function(err,content){ 
            if(err){
              console.log('err',err);
              return;
            }
            resolve(content)
          })
        });
      }  
    }

  }
};