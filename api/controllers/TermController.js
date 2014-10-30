/**
 * TermController
 *
 * @module    :: Controller
 * @description :: Contains logic for handling requests.
 */

// we.js controller utils
var actionUtil = require('we-helpers').actionUtil;
var util = require('util');
var _ = require('lodash');

module.exports = {
  // add your plugin controllers here

  updateModelTerms: function updateModelTerms (req, res, next) {

    var sails = req._sails;
    var Term = sails.models.term;

    var modelName = req.param('modelName');
    var modelId = req.param('modelId');
    var modelAttribute = req.param('modelAttribute');
    var newTerms = req.param('terms');

    var vocabulary = req.param('vocabulary');

    if (_.isEmpty(vocabulary)) {
      vocabulary = null;
    }

    if (_.isEmpty(newTerms)) {
      newTerms = [];
    }

    // skip if dont have one of the required vars
    if (_.isEmpty(modelName) || _.isEmpty(modelId) || _.isEmpty(modelAttribute) ){
      sails.log.verbose('Cant find modelName, modelId, or attribute');
      return next();
    }

    // check if model exists
    if (!sails.models[modelName]) {
      return res.badRequest('Model not found');
    }

    var Model = sails.models[modelName];

    var modelAtribute = Term.getTermAtributesNameFromModel(Model);

    // check if model has the atribute
    if ( modelAtribute.indexOf(modelAttribute) == -1 ) {
      sails.log.verbose('Term.updateModelTerms:Model atribute not found',modelName, modelAttribute);
      return res.badRequest('Invalid model atribute');
    }

    return Model.findOne({ id: modelId })
    .exec(function (err, record) {
      if (err) {
        sails.log.error('Term.updateModelTerms:Error on find model by id', record);
        return res.negotiate(err);
      }

      // record not found
      if (_.isEmpty(record)) {
        sails.log.verbose('Term.updateModelTerms:Error record not found', modelName, modelId);
        return res.notFound();
      }

      return Term.updateModelTermAssoc({
        creator: req.user.id,
        modelId: modelId,
        modelName: modelName,
        modelAttribute: modelAttribute,
        vocabulary: vocabulary,
        terms: newTerms
      }, function(err, terms) {
        if (err) {
          sails.log.error('Error on update model terms', err);
          return res.serverError();
        }

        return res.ok(terms);
      })

    });

  }

};
