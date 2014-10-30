/**
 * VocabularyController
 *
 * @module    :: Controller
 * @description :: Contains logic for handling requests.
 */

// we.js controller utils
var actionUtil = require('we-helpers').actionUtil;
var util = require('util');

module.exports = {
  // add your plugin controllers here

  findOne: function findOneRecord (req, res) {
    var sails = req._sails;

    var Model = sails.models.vocabulary;
    var pk = actionUtil.requirePk(req);

    var query = Model.findOne(pk);
    //query = actionUtil.populateEach(query, req.options);
    query.exec(function found(err, matchingRecord) {
      if (err) return res.serverError(err);
      if(!matchingRecord) return res.notFound('No record found with the specified `id`.');
      /*
      if (sails.hooks.pubsub && req.isSocket) {
        Model.subscribe(req, matchingRecord);
        actionUtil.subscribeDeep(req, matchingRecord);
      }
      */

      res.send({
        vocabulary: matchingRecord
      });
    });

  }
};
