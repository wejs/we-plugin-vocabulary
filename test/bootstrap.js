var projectPath = process.cwd();
var deleteDir = require('rimraf');
var testTools = require('we-test-tools');
var path = require('path');
var we;

before(function(callback) {
  this.slow(100);

  testTools.copyLocalConfigIfNotExitst(projectPath, function() {
    var We = require('we-core');
    we = new We();

    testTools.init({}, we);

    we.bootstrap({
      i18n: {
        directory: path.join(__dirname, 'locales'),
        updateFiles: true
      }
    } , function (err, we) {
      if (err) throw err;

      we.startServer(function(err) {
        if (err) throw err;
        callback();
      });
    });
  });
});

//after all tests
after(function (callback) {
  testTools.helpers.resetDatabase(we, function(err) {
    if(err) return callback(err);

    we.db.defaultConnection.close();

    var tempFolders = [
      projectPath + '/files/sqlite',
      projectPath + '/config/local.js',
    ];

    we.utils.async.each(tempFolders, function(folder, next){
      deleteDir( folder, next);
    }, function(err) {
      if (err) throw new Error(err);
      callback();
    })
  })
});