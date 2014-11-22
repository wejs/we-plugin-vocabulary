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

  getRelatedRecords: function(options, cb) {
    // if dont have terms to check related content return null
    if ( _.isEmpty(options.terms) ) return cb(null, null);

    var relatedTerms = options.terms.map(function(term){
      return term.id;
    });

    var termsString = relatedTerms.join();

    var sql = 'SELECT DISTINCT TMA.modelId FROM termmodelassoc TMA ' +
      'WHERE TMA.`modelId`!=' + options.modelId + ' ';
    if (termsString) {
      sql += 'AND TMA.`termId` in (' + termsString;
    }

    sql += ') ' +
      'AND TMA.`modelName`="' + options.modelName + '" ' +
      ' ORDER BY RAND() ' +
      'LIMIT 4;';

    return TermModelAssoc.query(sql, function(err, recordsIds) {
      if(err) return cb(err);
      return cb(null, recordsIds);
    })
  },

  /**
   * Get model term atribute Name
   * @param  {object} Model sails.models.model
   * @return {array}       model atribute name array
   */
  getTermAtributesNameFromModel: function(Model) {
    if (! Model.terms) {
      // this model dont have terms
      return [];
    }

    return Object.keys(Model.terms);
  },

  getAttributeConfig: function(model, modelAttribute) {
    if (!sails.config.term[model] ||
      !sails.config.term[model][modelAttribute]
    ) {
      // this model dont have terms
      return sails.config.term.defaultConfig;
    }

    return sails.config.term[model][modelAttribute];
  },


  /**
   * Associate one term with model and atribbute
   *
   * @param  {object}   options     options object with modelId, modelName, attribute,  vocabulary
   * @param  {array}   salvedTerms  terms salved in DB
   * @param  {Function} cb          callback
   */
  asscModelWithTerm: function(options, salvedTerms, cb) {
    var salvedTermsIds = [];
    if (_.isEmpty(salvedTerms)) {
      salvedTermsIds = [];
      searchForTermAssocs(null, [])
    } else {
      // get termIds
      salvedTermsIds = salvedTerms.map(function(term){
        return term.id;
      })

      return TermModelAssoc.find({
        modelId: options.modelId,
        modelName: options.modelName,
        modelAttribute: options.modelAttribute,
        termId: salvedTermsIds
      })
      .exec(searchForTermAssocs)
    }


    function searchForTermAssocs(err, terms) {
      if (err) return cb(err);
      // split alread salved associations
      terms.forEach(function (term) {
        var index = salvedTermsIds.indexOf(term.modelId);
        salvedTermsIds.splice(index, 1);
      })

      var assocsToCreate = salvedTermsIds.map(function(id){
        return {
          creator: options.creator,
          modelId: options.modelId,
          modelName: options.modelName,
          modelAttribute: options.modelAttribute,
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
    }
  },

  deleteAsscModelWithTerm: function(options, termIds, cb) {
    return TermModelAssoc.destroy({
      modelId: options.modelId,
      modelName: options.modelName,
      modelAttribute: options.modelAttribute,
      termId: termIds
    })
    .exec(cb);
  },

  findModelTerms: function (options, cb) {
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
  },

  updateModelTermAssoc: function(options, cb) {
    var newTerms = options.terms;

    var fieldConfig = Term.getAttributeConfig(options.modelName, options.modelAttribute);

    options.vocabulary = fieldConfig.vid;

    Term.findModelTerms({
      modelId: options.modelId,
      modelName: options.modelName,
      modelAttribute: options.modelAttribute
    }, function (err, terms, tids) {
      if (err) return cb(err);

      var parsedTerms;

      if (fieldConfig.type === 'taxonomy' ) {
        parsedTerms = Term.taxonomyParseTerms(newTerms, terms);
      } else {
        parsedTerms = Term.folksonomyParseTerms(newTerms, terms);
      }

      var queries = [];
      var modelTerms = parsedTerms.termsSalved;
      // if has one or more term to remove ...
      if (!_.isEmpty(parsedTerms.termsIdsToDelete)) {
        queries.push( function deleteTermsAssoc(cb) {
          return Term.deleteAsscModelWithTerm({
            modelId: options.modelId,
            modelName: options.modelName,
            modelAttribute: options.modelAttribute
          }, parsedTerms.termsIdsToDelete , function afterDeleteTermAssoc(err, result) {
            if (err) {
              sails.log.error('Error on deleteTermsAssoc', err);
              return cb(err);
            }

            sails.log.verbose('terms removed', result);
            return cb();
          })
        });
      }

      if (fieldConfig.type === 'taxonomy' ) {
        queries.push( function saveCategoriesAssoc(cb) {
          Term.taxonomyAssocTerms(
            options,
            parsedTerms.termsToAdd,
          function (err, terms, tids) {
            if ( err ) return cb(err);

            modelTerms = modelTerms.concat(terms);
            return cb();
          });
        });
      } else {
        queries.push( function saveTermsAssoc(cb) {
          Term.folksonomyAssocTerms(
            options,
            parsedTerms.termsToAdd,
          function (err, terms, tids) {
            if ( err ) return cb(err);
            modelTerms = modelTerms.concat(terms);
            return cb();
          });
        });
      }

      return async.series(queries, function(err) {
        if (err) return cb(err);
        return cb(null, modelTerms);
      });

    })
  },

  folksonomyAssocTerms: function(options, terms, cb) {

    if (_.isEmpty(terms) ) {
      afterGetTermsFromDB(null, []);
    } else {
      var query = {};

      var termsToAdd = terms.map(function(term){
        return term.text;
      });

      query.text = termsToAdd;

      if (options.vocabulary) {
        query.vocabulary = options.vocabulary
      } else {
        query.vocabulary = null;
      }
      Term.find(query)
      .exec(afterGetTermsFromDB)
    }

    function afterGetTermsFromDB(err, alreadySalvedTerms) {
      if ( err ) return cb(err);

      if ( alreadySalvedTerms ) {
        for (var j = alreadySalvedTerms.length - 1; j >= 0; j--) {
          for (var i = terms.length - 1; i >= 0; i--) {
            if( terms[i].text === alreadySalvedTerms[j].text) {
              terms.splice(i, 1);
            }
          }
        }
      }

      // delete id and isNew frag and set creator for new terms
      // lets use one object to ensures that dont have duplicated terms
      var newTerms = {};
      for (var l = terms.length - 1; l >= 0; l--) {
        delete terms[l].id;
        delete terms[l].isNew;
        terms[l].creator = options.creator;
        terms[l].vocabulary = options.vocabulary;
        newTerms[terms[l].text] = terms[l];
      }
      // convert to array after create
      newTerms = _.toArray(newTerms);

      //return;
      return Term.create(newTerms)
        .exec(function(err, results) {
        if(err) return cb(err);

        sails.log.verbose('New terms', results);

        alreadySalvedTerms = alreadySalvedTerms.concat(results);

        return Term.asscModelWithTerm(options, alreadySalvedTerms, cb);
      })
    }
  },

  taxonomyAssocTerms: function(options, terms, cb) {

    var tids = [];

    if (terms) {
      tids = terms.map(function(term){
        if (term.id) {
          return term.id;
        }
        return term;
      });
    }


    // ensure that the terms exists in db
    return Term.find({
        id: tids,
        vocabulary: options.vocabulary
      })
      .exec(function (err, terms) {
        if (err) {
          sails.log.error('Term:taxonomyAssocTerms: Error on find term');
          return cb(err);
        }

        if (_.isEmpty(terms)) return cb(null,[]);

        var assocsToCreate = terms.map(function(term){
          return {
            creator: options.creator,
            modelId: options.modelId,
            modelName: options.modelName,
            modelAttribute: options.modelAttribute,
            termId: term.id
          }
        })

        // save new associations
        return TermModelAssoc.create(assocsToCreate)
        .exec(function (err, result) {
          if (err) {
            sails.log.error('Term:taxonomyAssocTerms:TermModelAssoc.create')
            return cb(err);
          }

          sails.log.verbose('Created TermModelAssoc:', result);

          var ids = [];
          ids = terms.map(function (t) {
            return ids.push(t.id);
          });

          // return salvedTerms array
          return cb(null, terms, ids);
        });
      })

  },

  folksonomyParseTerms: function(newTerms, salvedTerms) {
    var termsIdsToDelete = [];
    var termsToAdd = {};
    var termsSalved = {};

    for (var i = newTerms.length - 1; i >= 0; i--) {

      var isNew = true;

      for (var j = salvedTerms.length - 1; j >= 0; j--) {
        // skip if is salved
        if ( newTerms[i].text ===  salvedTerms[j].text) {
          termsSalved[salvedTerms[j].text] = salvedTerms[j];
          salvedTerms[j].willContinue = true;
          isNew = false;
          break;
        }
      }

      if (isNew) {
        termsToAdd[newTerms[i].text] = newTerms[i];
      }
    }

    termsSalved = _.toArray(termsSalved);
    termsToAdd = _.toArray(termsToAdd);

    // get terms ids to remove from model
    for (var l = salvedTerms.length - 1; l >= 0; l--) {
      if (!salvedTerms[l].willContinue) {
        termsIdsToDelete.push(salvedTerms[l].id);
      }
    }

    return {
      termsIdsToDelete: termsIdsToDelete,
      termsToAdd: termsToAdd,
      termsSalved: termsSalved
    }
  },
  taxonomyParseTerms: function(newTerms, salvedTerms) {
    var termsIdsToDelete = [];
    var termsToAdd = [];
    var termsSalved = [];

    if (!newTerms) {
      newTerms = [];
    }

    for (var i = newTerms.length - 1; i >= 0; i--) {

      var isNew = true;

      for (var j = salvedTerms.length - 1; j >= 0; j--) {
        // skip if is salved
        if ( newTerms[i] ===  salvedTerms[j].id) {
          termsSalved.push(salvedTerms[j]);

          salvedTerms[j].willContinue = true;

          isNew = false;
          break;
        }

      }

      if (isNew) {
        termsToAdd.push(newTerms[i]);
      }
    }

    // get terms ids to remove from model
    for (var l = salvedTerms.length - 1; l >= 0; l--) {
      if (!salvedTerms[l].willContinue) {
        termsIdsToDelete.push(salvedTerms[l].id);
      }
    }

    return {
      termsIdsToDelete: termsIdsToDelete,
      // taxonomy dont add new terms
      termsToAdd: termsToAdd,
      termsSalved: termsSalved
    }
  }
};
