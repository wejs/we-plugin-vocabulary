/**
 * TermModel
 *
 * @module      :: Model
 * @description :: [Add info about you model here]
 *
 */
var async = require('async');
var _ = require('lodash');

module.exports = {
  schema: true,
  attributes: {
    // term creator
    creator: {
      model: 'User',
      required: true
    },
    text: {
      type: 'string',
      required: true
    },
    description: {
      type: 'text'
    },
    order: {
      type: 'boolean',
      defaultsTo: 0
    },
    // in vocabulary:
    vocabulary: {
      model: 'vocabulary'
    }
  },

  afterDestroy: function(record, cb) {
    //sails.log.warn('Term:afterDestroy', record);
    cb();
  },
  // TODO update to the new api
  // getRelatedRecords: function(options, cb) {
  //   // if dont have terms to check related content return null
  //   if ( _.isEmpty(options.terms) ) return cb(null, null);

  //   var relatedTerms = options.terms.map(function(term){
  //     return term.id;
  //   });

  //   var termsString = relatedTerms.join();

  //   var sql = 'SELECT DISTINCT TMA.modelId FROM termmodelassoc TMA ' +
  //     'WHERE TMA.`modelId`!=' + options.modelId + ' ';
  //   if (termsString) {
  //     sql += 'AND TMA.`termId` in (' + termsString;
  //   }

  //   sql += ') ' +
  //     'AND TMA.`modelName`="' + options.modelName + '" ' +
  //     ' ORDER BY RAND() ' +
  //     'LIMIT 4;';

  //   return TermModelAssoc.query(sql, function(err, recordsIds) {
  //     if(err) return cb(err);
  //     return cb(null, recordsIds);
  //   })
  // },

  // getAttributeConfig: function(model, modelAttribute) {
  //   if (!sails.config.term[model] ||
  //     !sails.config.term[model][modelAttribute]
  //   ) {
  //     // this model dont have terms
  //     return sails.config.term.defaultConfig;
  //   }

  //   return sails.config.term[model][modelAttribute];
  // }
};
