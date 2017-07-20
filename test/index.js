var compile = require('../lib/compile');
var path = require('path');
var fs = require('fs');
var a = new compile({
  filePath: path.join(__dirname,'assets/test.index.html')
},function(err,content){
  console.log(err,content)
});
console.log('v',a.getVersion());