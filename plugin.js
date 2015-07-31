/**
 * Plugin.js file, set configs, routes, hooks and events here
 *
 * see http://wejs.org/docs/we/extend.plugin
 */
var async = require('async');
var _ = require('lodash');

module.exports = function loadPlugin(projectPath, Plugin) {
  var plugin = new Plugin(__dirname);
  // set plugin configs
  plugin.setConfigs({
    permissions: {
      'find_term': {
        'group': 'term',
        'title': 'Find terms',
        'description': 'Find and find all terms'
      },
      'create_term': {
        'group': 'term',
        'title': 'Create one term',
        'description': 'Create one new term'
      },
      'update_term': {
        'group': 'term',
        'title': 'Update one term',
        'description': 'Update one new term'
      },
      'delete_term': {
        'group': 'term',
        'title': 'Delete one term',
        'description': 'Delete one term record'
      },
      'find_vocabulary': {
        'group': 'vocabulary',
        'title': 'Find vocabularys',
        'description': 'Find and find all vocabularys'
      },
      'create_vocabulary': {
        'group': 'vocabulary',
        'title': 'Create one vocabulary',
        'description': 'Create one new vocabulary'
      },
      'update_vocabulary': {
        'group': 'vocabulary',
        'title': 'Update one vocabulary',
        'description': 'Update one new vocabulary'
      },
      'delete_vocabulary': {
        'group': 'vocabulary',
        'title': 'Delete one vocabulary',
        'description': 'Delete one vocabulary record'
      }
    }
  });
  // ser plugin routes
  plugin.setRoutes({
    // Term
    'get /api/v1/term-texts': {
      controller    : 'term',
      action        : 'findTermTexts',
      model         : 'term',
      responseType  : 'json'
    },
    'get /term/:id([0-9]+)': {
      controller    : 'term',
      action        : 'findOne',
      model         : 'term',
      permission    : 'find_term'
    },
    'get /term': {
      controller    : 'term',
      action        : 'find',
      model         : 'term',
      permission    : 'find_term'
    },
    'post /term': {
      controller    : 'term',
      action        : 'create',
      model         : 'term',
      permission    : 'create_term'
    },
    'put /term/:id([0-9]+)': {
      controller    : 'term',
      action        : 'update',
      model         : 'term',
      permission    : 'update_term'
    },
    'delete /term/:id([0-9]+)': {
      controller    : 'term',
      action        : 'destroy',
      model         : 'term',
      permission    : 'delete_term'
    },

    // vocabulary
    'get /vocabulary/:id([0-9]+)': {
      controller    : 'vocabulary',
      action        : 'findOne',
      model         : 'vocabulary',
      permission    : 'find_vocabulary'
    },

    'get /vocabulary': {
      controller    : 'vocabulary',
      action        : 'find',
      model         : 'vocabulary',
      permission    : 'find_vocabulary'
    },
    'post /vocabulary': {
      controller    : 'vocabulary',
      action        : 'create',
      model         : 'vocabulary',
      permission    : 'create_vocabulary'
    },
    'put /vocabulary/:id([0-9]+)': {
      controller    : 'vocabulary',
      action        : 'update',
      model         : 'vocabulary',
      permission    : 'update_vocabulary'
    },
    'delete /vocabulary/:id([0-9]+)': {
      controller    : 'vocabulary',
      action        : 'destroy',
      model         : 'vocabulary',
      permission    : 'delete_vocabulary'
    }
  });

  // use before instance to set sequelize virtual fields for term fields
  plugin.hooks.on('we:models:before:instance', function(we, done) {
    var f, cfgs;
    var models = we.db.modelsConfigs;
    for (var modelName in models) {
      if (models[modelName].options && models[modelName].options.termFields) {

        for (f in models[modelName].options.termFields) {
          // set field configs
          cfgs = _.clone(models[modelName].options.termFields[f]);
          cfgs.type = we.db.Sequelize.VIRTUAL;
          // set virtual setter
          cfgs.set = we.term.getSetTermTag(f, cfgs.onlyLowercase);
          // set form field html
          cfgs.formFieldType = (cfgs.canCreate? 'vocabulary/tag' : 'vocabulary/category');
          // set virtual fields for term fields if now exists
          if (!models[modelName].definition[f]) {
            models[modelName].definition[f] = cfgs;
          } else {
            we.log.verbose('Cant set virtual field for field tag:', f);
          }
        }
      }
    }
    done();
  });

   // after define all models add term field hooks in models how have terms
  plugin.hooks.on('we:models:set:joins', function(we, done) {
    var models = we.db.models;
    for (var modelName in models) {
      var termFields = we.term.getModelTermFields(we.db.modelsConfigs[modelName]);

      if ( _.isEmpty(termFields) ) continue;

      models[modelName]
      .addHook('afterFind', 'loadTerms', function afterFind(r, opts, done) {
        var Model = this;
        if ( _.isArray(r) ) {
          async.eachSeries(r, function (r1, next) {
            we.term.afterFindRecord.bind(Model)(r1, opts, next);
          }, done);
        } else {
          we.term.afterFindRecord.bind(Model)(r, opts, done) ;
        }
      })

      models[modelName].addHook('afterCreate', 'createTerms', we.term.afterCreatedRecord);
      models[modelName].addHook('afterUpdate', 'updateTerms', we.term.afterUpdatedRecord);
      models[modelName].addHook('afterDestroy', 'destroyTerms', we.term.afterDeleteRecord);
    }

    done();
  });


  plugin.events.on('we:after:load:plugins', function (we) {
    var db = we.db;
    var log = we.log;

    var term = {};

    term.getModelTermFields = function(Model) {
      if (!Model.options || !Model.options.termFields) return null;
      return Model.options.termFields;
    }

    term.saveModelTerms = function saveModelTerms(modelName, modelId, req, fieldName, isTags, cb) {
      return db.models.modelsterms.create({
        modelName: modelName,
        modelId: modelId,
        field: fieldName,
        isTags: true
      }).then(function(terms) {
        return cb(null, terms);
      });
    }
    term.createModelTerms = function createModelTerms(terms, modelName, modelId, fieldName, fieldConfig, done) {
      var salvedTerms = [];

      async.eachSeries(terms, function (term, nextTerm){
        var query;

        if (fieldConfig.onlyLowercase) term = term.toLowerCase();

        if (fieldConfig.canCreate) {
          query = db.models.term.findOrCreate({
            where: {
              text: term,
              vocabularyName: fieldConfig.vocabularyName
            },
            defaults: {
              text: term,
              vocabularyName: fieldConfig.vocabularyName
            }
          });
        } else {
          query = db.models.term.find({
            where: {
              text: term,
              vocabularyName: fieldConfig.vocabularyName
            }
          });
        }

        query.then(function (result) {
          if ( _.isEmpty(result) ) {
            log.verbose(
              'term.on:createdResponse: Cant create the term assoc:', term, fieldName, fieldConfig.vocabularyName
            );
            return nextTerm();
          }

          var termObj;
          if (_.isArray(result)) {
            termObj = result[0];
          } else {
            termObj = result;
          }

          return db.models.modelsterms.create({
            modelName: modelName,
            modelId: modelId,
            field: fieldName,
            isTag: fieldConfig.canCreate,
            termId: termObj.id,
            vocabularyName: fieldConfig.vocabularyName
          }).then(function () {
            salvedTerms.push(termObj.text);
            return nextTerm();
          });
        });
      }, function(err) {
        if (err) return done(err);
        return done(null, salvedTerms);
      });
    }

    // virtual fields
    term.getSetTermTag = function getSetTermTag(fieldName, onlyLowercase) {
      if (onlyLowercase) {
        return function setTermTag(val) {
          if (typeof val === 'string') {
            this.setDataValue(fieldName, [val.toLowerCase()]);
          } else if ( _.isArray(val) ) {
            this.setDataValue(fieldName, val.map(function (v) {
              return v.toLowerCase();
            }));
          }
        }
      } else {
        return function setTermTag(val) {
          if (typeof val === 'string') {
            this.setDataValue(fieldName, [val]);
          } else {
            this.setDataValue(fieldName, val);
          }
        }
      }
    }

    term.afterCreatedRecord = function afterCreatedRecord(r, opts, done) {
      var functions = [];
      var Model = this;

      var termFields = term.getModelTermFields(this);
      if (!termFields) return done();

      var fieldNames = Object.keys(termFields);

      fieldNames.forEach(function (fieldName) {
        if (_.isEmpty(r.get(fieldName))) return;

        functions.push(function (next) {
          term.createModelTerms(
            r.get(fieldName),
            Model.name,
            r.id,
            fieldName,
            termFields[fieldName],
          function afterSaveModelTerms(err, terms) {
            if(err) return next(err);
            r.set(fieldName, terms);
            return next();
          });
        });
      });
      async.series(functions, done);
    }
    /**
     * Load record terms after find record
     */
    term.afterFindRecord = function afterFindRecord(r, opts, done) {

      var functions = [];
      var Model = this;
      // found 0 results
      if (!r) return done();

      var termFields = term.getModelTermFields(this);
      if (!termFields) return done();

      if (!r._salvedModelTerms) r._salvedModelTerms = {};
      if (!r._salvedTerms) r._salvedTerms = {};

      var fieldNames = Object.keys(termFields);
      // for each field
      fieldNames.forEach(function (fieldName) {
        functions.push(function (next) {
          return db.models.modelsterms.findAll({
            where: { modelName: Model.name, modelId: r.id, field: fieldName },
            attributes: ['id'],
            include: [{ all: true,  attributes: ['text'] }]
          }).then(function (modelterms) {
            if (_.isEmpty(modelterms)) return next();
            // save models terms assoc as cache
            r._salvedModelTerms[fieldName] = modelterms;

            var terms = modelterms.map(function (modelterm) {
              return modelterm.get().term.get().text;
            });
            r.set(fieldName, terms);
            // salved terms cache
            r._salvedTerms[fieldName] = terms;
            return next();
          }).catch(next);
        });
      });

      async.series(functions, done);
    }

    term.afterDeleteRecord = function deletedResponse(r, opts, done) {
      var Model = this;

      db.models.modelsterms.destroy({
        where: {
          modelName: Model.name,
          modelId: r.id
        }
      }).then(function (result) {
        log.debug('Deleted ' + result + ' terms from record with id: ' + r.id);
        return done();
      }).catch(done);
    };

    term.afterUpdatedRecord = function updatedResponse(r, opts, done) {
      var Model = this;

      var termFields = term.getModelTermFields(this);
      if (!termFields) return done();

      var fieldNames = Object.keys(termFields);
      async.eachSeries(fieldNames, function (fieldName, nextField) {
        // check if user whant update this field
        if (opts.fields.indexOf(fieldName) === -1) return nextField();

        var salvedmodelterms = (r._salvedModelTerms[fieldName] || []);
        var salvedTerms = (r._salvedTerms[fieldName] || []);
        var termsToDelete = [];
        var termsToSave = _.clone( r.get(fieldName) );

        async.series([
          // check if one of the new terms is salved
          function checkIfNeedsToSaveOrDelete(done) {
            for (var i = salvedTerms.length - 1; i >= 0; i--) {
              if (r.get(fieldName).indexOf(salvedTerms[i]) === -1) {
                // delete
                // model term to delete array
                termsToDelete.push(salvedTerms[i]);
                salvedTerms.splice(salvedTerms.indexOf(salvedTerms[i]), 1);
              } else {
                termsToSave.splice(termsToSave.indexOf(termsToSave[i]), 1);
              }
            }
            done();
          },
          // delete removed terms
          function deleteTerms(done) {
            if (_.isEmpty(termsToDelete)) return done();

            async.each(termsToDelete, function (termToDelete, next) {
              var objToDelete;
              for (var i = salvedmodelterms.length - 1; i >= 0; i--) {
                if (salvedmodelterms[i].get('term').get('text') === termToDelete) {
                  objToDelete = salvedmodelterms[i];
                  break;
                }
              }

              if (!objToDelete) {
                log.warn('deleteTerms: Associated term not found for delete: ', termToDelete);
                return next();
              }

              objToDelete.destroy().then( function (r) {
                salvedmodelterms.splice(i, 1);
                next();
              }).catch(next);
            }, done);
          },
          // save new terms
          function saveTerms(done) {
            if (_.isEmpty(termsToSave)) return done();
            term.createModelTerms(
              termsToSave,
              Model.name, r.id,
              fieldName,
              termFields[fieldName],
            function afterSaveModelTerms(err, terms) {
              if(err) return done(err);
              salvedTerms = salvedTerms.concat(terms);
              return done();
            });
          },
          function setRecordTerms(done) {
            r.set[fieldName] = salvedTerms;
            done();
          }
        ], nextField);
      }, function (err) {
        if (err) return done(err);
        return done();
      });
    }

    term.loadModelTerms =  function loadModelTerms(record, fieldName, modelName, next) {
      return db.models.modelsterms.findAll({
        where: { modelName: modelName, modelId: record.id, field: fieldName },
        attributes: ['id'],
        include: [{ all: true,  attributes: ['text'] }]
      }).then(function (modelterms) {
        if (_.isEmpty(modelterms)) return next();

        var terms = modelterms.map(function (modelterm) {
          return modelterm.get().term.get().text;
        });

        record[fieldName] = terms;
        return next();
      }).catch(next);
    }

    we.term = term;
  });

  return plugin;
};