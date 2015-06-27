/**
 * VocabularyModel
 *
 * @module      :: Model
 * @description :: [Add info about you model here]
 *
 */
var async = require('async');

module.exports = function Model(we) {
  // set sequelize model define and options
  var model = {
    definition: {
      creatorId: { type: we.db.Sequelize.BIGINT },

      name: {
        type: we.db.Sequelize.STRING,
        unique: true
      },

      description: {
        type: we.db.Sequelize.TEXT
      }
    },

    options: {
      classMethods: {},
      instanceMethods: {},
      hooks: {
        afterDestroy: function(r, opts, done) {
          async.parallel([
            function destroyRelatedModelsterms(cb) {
              we.db.models.modelsterms.destroy({
                where: { vocabularyName: r.name }
              }).then(function () {
                return cb();
              }).catch(cb);
            },
            function destroyVocabularyTerms(cb) {
              we.db.models.terms.destroy({
                where: { vocabularyName: r.name }
              }).then(function () {
                return cb();
              }).catch(cb);
            }
          ], done);
        }
      }
    }
  }

  return model;
}
