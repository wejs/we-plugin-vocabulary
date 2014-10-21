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

  /**
   * Set model tags
   *
   * @param {[type]}   options object with modelId, modelName, terms, attribute,  vocabulary
   * @param {Function} cb      [description]
   */
  setModelTags: function(options, cb) {
    var newTermsIds = [];
    var salvedTermsId = [];

    var query = {};

    var allTermsText = [];

    for (var i = options.terms.length - 1; i >= 0; i--) {
      if( options.terms[i].isNew ) {
        newTermsIds.push( options.terms[i].id );
      } else {
        salvedTermsId.push(options.terms[i].id);
      }

      allTermsText.push(options.terms[i].text);
    }

    query.text = allTermsText;

    if (options.vocabulary) {
      query.vocabulary = options.vocabulary
    } else {
      query.vocabulary = null;
    }

    // check if terms exists on db in vocabulary
    Term.find(query)
    .exec(function (err, alreadySalvedTerms) {

      alreadySalvedTerms.forEach(function (alreadySalvedTerm) {
        for (var i = options.terms.length - 1; i >= 0; i--) {
          if( options.terms[i].text === alreadySalvedTerm.text) {
            options.terms.splice(i-1, 1);
            break;
          }
        }
      });

      // delete id and isNew frag and set creator for new terms
      var newTerms = options.terms.map(function (term) {
        delete term.id;
        delete term.isNew;
        term.creator = options.creator;
        term.vocabulary = options.vocabulary;
        return term;
      });

      Term.create(newTerms)
        .exec(function(err, results) {
        if(err) return cb(err);

        sails.log.verbose('New terms', results);

        alreadySalvedTerms.concat(results);

        return  Term.asscModelWithTerm(options, alreadySalvedTerms, cb);
      })
    })

  },

  /**
   * Associate one term with model and atribbute
   *
   * @param  {object}   options     options object with modelId, modelName, attribute,  vocabulary
   * @param  {array}   salvedTerms  terms salved in DB
   * @param  {Function} cb          callback
   */
  asscModelWithTerm: function(options, salvedTerms, cb) {
    // get termIds
    var salvedTermsIds = salvedTerms.map(function(term){
      return term.id;
    })

    return TermModelAssoc.find({
      modelId: options.modelId,
      modelName: options.modelName,
      modelAttribute: options.attribute,
      termId: salvedTermsIds
    })
    .exec(function (err, terms) {
      if (err) return cb(err);
      // split alread salved associations
      terms.forEach(function (term) {
        var index = salvedTermsIds.indexOf(term.modelId);
        sails.log.warn('vai cortar o index:', index);
        salvedTermsIds.splice(index, 1);
        sails.log.warn('cortou:', salvedTermsIds);
      })

      var assocsToCreate = salvedTermsIds.map(function(id){
        return {
          creator: options.creator,
          modelId: options.modelId,
          modelName: options.modelName,
          modelAttribute: options.attribute,
          termId: id
        }
      })
      // save new associations
      return TermModelAssoc.create(assocsToCreate)
      .exec(function (err, result) {
        if(err) return cb(err);

        sails.log.verbose('Created TermModelAssoc:', result);

        var ids = [];
        ids = salvedTerms.map(function (t) {
          return ids.push(t.id);
        });

        // return salvedTerms array
        return cb(null, salvedTerms, ids);
      });
    })
  },

  findModelTags: function (options, cb) {
    TermModelAssoc.find({
      modelId: options.modelId,
      modelName: options.modelName,
      modelAttribute: options.modelAttribute
    })
    .populate('termId')
    .exec(function(err, termAssocs) {
      if(err) return cb(err);

      var ids = [];

      var terms = termAssocs.map(function (assoc) {
        ids.push(assoc.termId.id);
        return assoc.termId;
      });

      cb(null, terms, ids);
    });
  }
};
