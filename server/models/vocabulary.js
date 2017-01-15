/**
 * VocabularyModel
 *
 * @module      :: Model
 * @description :: [Add info about you model here]
 *
 */
module.exports = function Model(we) {
  // set sequelize model define and options
  return {
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
      instanceMethods: {
        /**
         * Get tag usage count
         *
         * @return {Object} Sequelize query promisse
         */
        getTagUsageCount() {
          const sql = 'SELECT terms.id, terms.text, COUNT(modelsterms.id) AS count '+
            ' FROM terms '+
            ' INNER JOIN modelsterms ON modelsterms.termId=terms.id '+
            ' WHERE terms.vocabularyName=? AND modelsterms.vocabularyName=? '+
            ' GROUP BY terms.text ';
          return we.db.defaultConnection.query(sql, { replacements:
           [this.name, this.name]
          });
        }
      },
      hooks: {
        afterDestroy(r, opts, done) {
          we.utils.async.parallel([
            function destroyRelatedModelsterms (cb) {
              return we.db.models.modelsterms.destroy({
                where: { vocabularyName: r.name }
              })
              .nodeify(cb);
            },
            function destroyVocabularyTerms (cb) {
              return we.db.models.terms.destroy({
                where: { vocabularyName: r.name }
              })
              .nodeify(cb);
            }
          ], done);
        }
      }
    }
  };
};