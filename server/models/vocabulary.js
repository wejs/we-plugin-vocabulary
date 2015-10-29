/**
 * VocabularyModel
 *
 * @module      :: Model
 * @description :: [Add info about you model here]
 *
 */
module.exports = function Model(we) {
  // set sequelize model define and options
  var model = {
    definition: {
      name: {
        type: we.db.Sequelize.STRING,
        unique: true
      },
      description: {
        type: we.db.Sequelize.TEXT
      }
    },
    associations: {
      creator: {
        type: 'belongsTo',
        model: 'user'
      }
    },
    options: {
      titleField: 'name',
      classMethods: {},
      instanceMethods: {},
      hooks: {
        afterDestroy: function(r, opts, done) {
          we.utils.async.parallel([
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
