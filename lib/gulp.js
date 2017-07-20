var through2 = require('through2');
var compile = require('../lib/compile');
var util = require('util');
module.exports = function (options) {
	options = util._extend({

	},options ||{})
  // Mixes in default options.
  return through2.obj(function(file, enc, cb) {
  	var self = this;
    if (file.isNull()) {
      return cb(null, file);
    }
    if (file.isStream()) {
      return cb(new PluginError('ctool-html-compile', 'Streaming not supported'));
    }
    options.content = file.contents.toString();
    options.filePath = file.path;
    new compile(options,function(err,content){
    	 file.contents = new Buffer(content||'');
    	 if(err){
    	  self.emit('error', err);
    	 }else{
    	 	 cb(null, file);
    	}
    });
  });
};




