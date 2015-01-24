/**
 * VocabularyModel
 *
 * @module      :: Model
 * @description :: [Add info about you model here]
 *
 */

module.exports = {
  schema: true,
  attributes: {
    // vocabulary creator
    creator: {
      model: 'User',
      required: true
    },
    name: {
      type: 'string'
    },
    description: {
      type: 'text'
    },
    terms: {
      collection: 'Term',
      via: 'vocabulary'
    }
  }
};
