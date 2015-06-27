/**
 * TermModel
 *
 * @module      :: Model
 * @description :: [Add info about you model here]
 *
 */

module.exports = function Model(we) {
  // set sequelize model define and options
  var model = {
    definition: {
      text: {
        type: we.db.Sequelize.STRING,
        allowNull: false
      },
      description: { type: we.db.Sequelize.TEXT },
      vocabularyName: { type: we.db.Sequelize.STRING }
    },
    options: {
      classMethods: {},
      instanceMethods: {},
      hooks: {}
    }
  }
  return model;
}