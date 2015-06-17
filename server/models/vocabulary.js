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
      creatorId: { type: we.db.Sequelize.BIGINT },

      name: {
        type: we.db.Sequelize.STRING
      },

      description: {
        type: we.db.Sequelize.TEXT
      }
    },

    options: {
      classMethods: {},
      instanceMethods: {},
      hooks: {}
    }
  }

  return model;
}
