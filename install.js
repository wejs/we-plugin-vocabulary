module.exports = {
  /**
   * Install function run in we.js install.
   *
   * @param  {Object}   we    we.js object
   * @param  {Function} done  callback
   */
  install: function install(we, done) {
    we.utils.async.series([
      function createTagsVocabulary(done) {
        we.db.models.vocabulary.findOrCreate({
          where: { name: 'Tags' },
          defaults: { name: 'Tags' },
        }).then(function(){
          done();
        }).catch(done);
      },
      function createCategoryVocabulary(done) {
        we.db.models.vocabulary.findOrCreate({
          where: { name: 'Category' },
          defaults: { name: 'Category' }
        }).then(function(){
          done();
        }).catch(done);
      }
    ], done);
  },

  /**
   * Return a list of updates
   *
   * @param  {Object} we we.js object
   * @return {Array}    a list of update objects
   */
  updates: function updates() {
    return [{
      version: '0.3.15', // your plugin version
      update: function (we, done) {
        we.utils.async.series([
          function createTagsVocabulary(done) {
            we.db.models.vocabulary.findOrCreate({
              where: { name: 'Tags' },
              defaults: { name: 'Tags' },
            }).then(function(){
              done();
            }).catch(done);
          },
          function createCategoryVocabulary(done) {
            we.db.models.vocabulary.findOrCreate({
              where: { name: 'Category' },
              defaults: { name: 'Category' }
            }).then(function(){
              done();
            }).catch(done);
          },

          function updateOldTags(done) {
            we.db.models.term.update({ vocabularyName: 'Tags' },{
              where: { vocabularyName: null },
            }).then(function(){
              done();
            }).catch(done);
          },
          function updateOldModelAssocTags(done) {
            we.db.models.modelsterms.update({ vocabularyName: 'Tags' },{
              where: { vocabularyName: null },
            }).then(function(){
              done();
            }).catch(done);
          }
        ], done);
      }
    }];
  }
};