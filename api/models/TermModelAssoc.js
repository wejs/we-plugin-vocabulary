/**
 * TermModelAssoc
 *
 * @module      :: Model
 * @description :: [Add info about you model here]
 *
 */

module.exports = {
  schema: true,
  attributes: {
    // term creator
    creator: {
      model: 'User',
      required: true
    },
    termId: {
      model: 'Term'
    },
    // ex post, comment ...
    modelName: {
      type: 'string'
    },
    modelId: {
      type: 'string'
    },
    // ex body, description ...
    modelAttribute: {
      type: 'string'
    }
  }
};
