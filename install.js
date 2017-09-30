module.exports = {
  /**
   * Install function run in we.js install.
   *
   * @param  {Object}   we    we.js object
   * @param  {Function} done  callback
   */
  install(we, done) {
    we.utils.async.series([
      function createTagsVocabulary(done) {
        we.db.models.vocabulary
        .findOrCreate({
          where: { name: 'Tags' },
          defaults: { name: 'Tags' },
        })
        .then( ()=> {
          done();
          return null;
        })
        .catch(done);
      },
      function createCategoryVocabulary(done) {
        we.db.models.vocabulary
        .findOrCreate({
          where: { name: 'Category' },
          defaults: { name: 'Category' }
        })
        .then( ()=> {
          done();
          return null;
        })
        .catch(done);
      }
    ], done);
  },

  /**
   * Return a list of updates
   *
   * @param  {Object} we we.js object
   * @return {Array}    a list of update objects
   */
  updates() {
    return [{
      version: '0.3.15', // your plugin version
      update(we, done) {
        we.utils.async.series([
          function createTagsVocabulary (done) {
            we.db.models.vocabulary.findOrCreate({
              where: { name: 'Tags' },
              defaults: { name: 'Tags' },
            })
            .then( ()=> {
              done();
              return null;
            })
            .catch(done);
          },
          function createCategoryVocabulary(done) {
            we.db.models.vocabulary.findOrCreate({
              where: { name: 'Category' },
              defaults: { name: 'Category' }
            })
            .then( ()=> {
              done();
              return null;
            })
            .catch(done);
          },

          function updateOldTags(done) {
            we.db.models.term.update({ vocabularyName: 'Tags' },{
              where: { vocabularyName: null },
            })
            .then( ()=> {
              done();
              return null;
            })
            .catch(done);
          },
          function updateOldModelAssocTags(done) {
            we.db.models.modelsterms.update({ vocabularyName: 'Tags' },{
              where: { vocabularyName: null },
            })
            .then( ()=> {
              done();
              return null;
            })
            .catch(done);
          }
        ], done);
      }
    }];
  }
};