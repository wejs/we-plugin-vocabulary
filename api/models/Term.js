/**
 * TermModel
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
    term: {
      type: 'string',
      required: true
    },
    description: {
      type: 'text'
    },
    // in vocabulary:
    vocabulary: {
      model: 'vocabulary'
    },
    // ex post, comment ...
    model: {
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
