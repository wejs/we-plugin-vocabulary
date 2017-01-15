/**
 * Plugin.js file, set configs, routes, hooks and events here
 *
 * see http://wejs.org/docs/we/extend.plugin
 */
module.exports = function loadPlugin(projectPath, Plugin) {
  const plugin = new Plugin(__dirname);
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

  // // admin vocabulary resource
  // plugin.setResource({
  //   namePrefix: 'admin.',
  //   name: 'vocabulary',
  //   namespace: '/admin',
  //   templateFolderPrefix: 'admin/'
  // });
  // // terms admin resource
  // plugin.setResource({
  //   namePrefix: 'admin.',
  //   parent: 'admin.vocabulary',
  //   name: 'term',
  //   templateFolderPrefix: 'admin/'
  // });

  plugin.setResource({
    name: 'vocabulary',
    routeId: ':vocabularyId'
  });
  plugin.setResource({
    name: 'term',
    routeId: ':termId'
  });

  // set plugin routes
  plugin.setRoutes({
    // 'get /vocabulary': {
    //   resourceName: 'vocabulary',
    //   name: 'vocabulary.find',
    //   action: 'find',
    //   controller: 'vocabulary',
    //   model: 'vocabulary',
    //   template: 'vocabulary/find',
    //   permission: 'find_vocabulary',
    //   titleHandler: 'i18n',
    //   titleI18n: 'vocabulary.find',
    //   breadcrumbHandler: 'find'
    // },
    // 'get /vocabulary/:vocabularyId': {
    //   paramIgit dName: 'vocabularyId',
    //   resourceName: 'vocabulary',
    //   name: 'vocabulary.findOne',
    //   action: 'findOne',
    //   controller: 'vocabulary',
    //   model: 'vocabulary',
    //   template: 'vocabulary/findOne',
    //   permission: 'find_vocabulary',
    //   titleHandler: 'recordField',
    //   titleField: 'name',
    //   breadcrumbHandler: 'findOne'
    // },
    // 'get /vocabulary/:vocabularyId/term': {
    //   resourceName: 'term',
    //   name: 'term.find',
    //   action: 'find',
    //   controller: 'term',
    //   model: 'term',
    //   template: 'term/find',
    //   permission: 'find_term',
    //   titleHandler: 'i18n',
    //   titleI18n: 'term.find',
    //   // default search
    //   search: {
    //     text:  {
    //       parser: 'startsWith',
    //       target: {
    //         type: 'field',
    //         field: 'text'
    //       }
    //     },
    //     vocabularyName: {
    //       parser: 'equal',
    //       target: {
    //         type: 'field',
    //         field: 'vocabularyName'
    //       }
    //     }
    //   },
    //   breadcrumbHandler: 'find'
    // },
    // 'get /vocabulary/:vocabularyId/term/:termId': {
    //   paramIdName: 'termId',
    //   resourceName: 'term',
    //   name: 'term.findOne',
    //   action: 'findOne',
    //   controller: 'term',
    //   model: 'term',
    //   template: 'term/findOne',
    //   permission: 'find_term',
    //   titleHandler: 'recordField',
    //   titleField: 'text',
    //   breadcrumbHandler: 'findOne'
    // },
    // Term
    'get /api/v1/term-texts': {
      controller    : 'term',
      action        : 'findTermTexts',
      model         : 'term',
      responseType  : 'json'
    },

    'get /vocabulary/:vocabularyId/tag-clound': {
      controller    : 'vocabulary',
      action        : 'getTagUsageCount',
      model         : 'term',
      responseType  : 'json'
    }
  });

  plugin.hooks.on('we-plugin-menu:after:set:core:menus', function (data, done) {
    const we = data.req.we;
    // set admin menu
    if (data.res.locals.isAdmin) {
      data.res.locals.adminMenu.addLink({
        id: 'admin.vocabulary',
        text: '<i class="fa fa-tags"></i> '+
          data.req.__('vocabulary.find'),
        href: we.router.urlTo( 'admin.vocabulary.find', [], we),
        weight: 10
      });
    }

    done();
  });

  plugin.paramVocabularyIdMD = function paramVocabularyIdMD (req, res, next, id) {
    let where = {};
    // need to check if is id to skip postgreql error if search for texts in number
    if (Number(id) ) {
      where = {
        $or: { id: id, name: id }
      };
    } else {
      where = { name: id };
    }

    plugin.we.db.models.vocabulary.findOne({
      where: where
    })
    .then(function afterLoadVocabulary(v) {
      if (!v) return res.notFound();
      res.locals.currentVocabulary = v;
      req.params.vocabularyName = v.name;
      next();

      return null;
    })
    .catch(next);
  };

  plugin.events.on('we:express:set:params', function(data) {
    // load vocabulary related to term
    data.express.param('vocabularyId', plugin.paramVocabularyIdMD);
  });

  // use before instance to set sequelize virtual fields for term fields
  plugin.hooks.on('we:models:before:instance', function (we, done) {
    let f, cfgs;
    const models = we.db.modelsConfigs;
    for (var modelName in models) {

      if (models[modelName].options && models[modelName].options.termFields) {

        for (f in models[modelName].options.termFields) {
          // set the default vocabularyName
          if (!models[modelName].options.termFields[f].vocabularyName)
            models[modelName].options.termFields[f].vocabularyName = 'Tags';
          // set field configs
          cfgs = we.utils._.clone(models[modelName].options.termFields[f]);
          cfgs.type = we.db.Sequelize.VIRTUAL;
          // set virtual setter
          cfgs.set = we.term.getSetTermTag(f, cfgs.onlyLowercase);
          // set form field html
          cfgs.formFieldType =  cfgs.formFieldType || (cfgs.canCreate? 'vocabulary/tag' : 'vocabulary/category');
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
  plugin.hooks.on('we:models:set:joins', function (we, done) {
    const models = we.db.models;

    for (let modelName in models) {
      const termFields = we.term.getModelTermFields(we.db.modelsConfigs[modelName]);

      if ( we.utils._.isEmpty(termFields) ) continue;

      models[modelName]
      .addHook('afterFind', 'loadTerms', function afterFind(r, opts, done) {
        const Model = this;
        if ( we.utils._.isArray(r) ) {
          we.utils.async.eachSeries(r, function (r1, next) {
            we.term.afterFindRecord.bind(Model)(r1, opts, next);
          }, done);
        } else {
          we.term.afterFindRecord.bind(Model)(r, opts, done) ;
        }
      });

      models[modelName].addHook('afterCreate', 'createTerms', we.term.afterCreatedRecord);
      models[modelName].addHook('afterUpdate', 'updateTerms', we.term.afterUpdatedRecord);
      models[modelName].addHook('afterDestroy', 'destroyTerms', we.term.afterDeleteRecord);
    }

    done();
  });


  plugin.events.on('we:after:load:plugins', function (we) {
    const db = we.db,
      log = we.log,
      term = {};

    term.getModelTermFields = function(Model) {
      if (!Model || !Model.options || !Model.options.termFields) return null;
      return Model.options.termFields;
    };

    term.saveModelTerms = function saveModelTerms(modelName, modelId, req, fieldName, isTags, cb) {
      return db.models.modelsterms.create({
        modelName: modelName,
        modelId: modelId,
        field: fieldName,
        isTags: true
      }).then(function(terms) {
        return cb(null, terms);
      });
    };

    term.createModelTerms = function createModelTerms(terms, modelName, modelId, fieldName, fieldConfig, done) {
      const salvedTerms = [];

      we.utils.async.eachSeries(terms, function (term, nextTerm){
        let query;

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
          if ( we.utils._.isEmpty(result) ) {
            log.verbose(
              'term.on:createdResponse: Cant create the term assoc:', term, fieldName, fieldConfig.vocabularyName
            );
            return nextTerm();
          }

          let termObj;
          if (we.utils._.isArray(result)) {
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
          })
          .then(function () {
            salvedTerms.push(termObj.text);
            nextTerm();

            return null;
          })
          .catch(nextTerm);
        });
      }, function (err) {
        if (err) return done(err);
        return done(null, salvedTerms);
      });
    };

    // virtual fields
    term.getSetTermTag = function getSetTermTag(fieldName, onlyLowercase) {
      if (onlyLowercase) {
        return function setTermTag(val) {
          if (typeof val === 'string') {
            this.setDataValue(fieldName, [val.toLowerCase()]);
          } else if ( we.utils._.isArray(val) ) {
            this.setDataValue(fieldName, val.map(function (v) {
              return v.toLowerCase();
            }));
          }
        };
      } else {
        return function setTermTag(val) {
          if (typeof val === 'string') {
            this.setDataValue(fieldName, [val]);
          } else {
            this.setDataValue(fieldName, val);
          }
        };
      }
    };

    term.afterCreatedRecord = function afterCreatedRecord(r, opts, done) {
      const functions = [],
        Model = this;

      let termFields = term.getModelTermFields(this);
      if (!termFields) return done();

      let fieldNames = Object.keys(termFields);

      fieldNames.forEach(function (fieldName) {
        if (we.utils._.isEmpty(r.get(fieldName))) return;

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
      we.utils.async.series(functions, done);
    };

    /**
     * Load record terms after find record
     */
    term.afterFindRecord = function afterFindRecord(r, opts, done) {

      const functions = [],
        Model = this;
      // found 0 results
      if (!r) return done();

      const termFields = term.getModelTermFields(this);
      if (!termFields) return done();

      if (!r._salvedModelTerms) r._salvedModelTerms = {};
      if (!r._salvedTerms) r._salvedTerms = {};

      let fieldNames = Object.keys(termFields);
      // for each field
      fieldNames.forEach(function (fieldName) {
        functions.push(function (next) {
          return db.models.modelsterms.findAll({
            where: { modelName: Model.name, modelId: r.id, field: fieldName },
            attributes: ['id'],
            include: [{ all: true,  attributes: ['id', 'text', 'vocabularyName'] }]
          })
          .then(function (modelterms) {
            if (we.utils._.isEmpty(modelterms)) return next();
            // save models terms assoc as cache
            r._salvedModelTerms[fieldName] = modelterms;

            const terms = modelterms.map( (modelterm)=> {
              return modelterm.get().term.get().text;
            });
            r.set(fieldName, terms);
            // salved terms cache
            r._salvedTerms[fieldName] = terms;
            next();

            return null;
          })
          .catch(next);
        });
      });

      we.utils.async.series(functions, done);
    };

    term.afterDeleteRecord = function deletedResponse(r, opts, done) {
      const Model = this;

      db.models.modelsterms.destroy({
        where: {
          modelName: Model.name,
          modelId: r.id
        }
      })
      .then(function (result) {
        log.debug('Deleted ' + result + ' terms from record with id: ' + r.id);
        done();

        return null;
      })
      .catch(done);
    };

    term.afterUpdatedRecord = function updatedResponse(r, opts, done) {
      const Model = this;

      let termFields = term.getModelTermFields(this);
      if (!termFields) return done();

      let fieldNames = Object.keys(termFields);
      we.utils.async.eachSeries(fieldNames, function (fieldName, nextField) {
        // check if user whant update this field
        if (opts.fields.indexOf(fieldName) === -1) return nextField();

        const fieldConfig = termFields[fieldName];

        let salvedTerms = (r._salvedTerms[fieldName] || []);
        let termsToSave = we.utils._.clone( r.get(fieldName) );

        we.utils.async.series([
          // Cleanup
          function cleanupOldRecordTags(done) {
            we.db.models.modelsterms
            .destroy({
              where: {
                modelName: r.getModelName(),
                modelId: r.id,
                field: fieldName,
                vocabularyName: fieldConfig.vocabularyName
              }
            })
            .then( ()=> {
              done();
              return null;
            })
            .catch(done);
          },
          // save new terms
          function saveTerms(done) {
            if (we.utils._.isEmpty(termsToSave)) return done();
            term.createModelTerms(
              termsToSave,
              Model.name, r.id,
              fieldName,
              termFields[fieldName],
            function afterSaveModelTerms(err, terms) {
              if(err) return done(err);

              salvedTerms = terms;
              return done();
            });
          },
          function setRecordTerms(done) {
            r.setDataValue(fieldName, salvedTerms);
            done();
          }
        ], nextField);
      }, function (err) {
        if (err) return done(err);
        return done();
      });
    };

    term.loadModelTerms =  function loadModelTerms(record, fieldName, modelName, next) {
      return db.models.modelsterms.findAll({
        where: { modelName: modelName, modelId: record.id, field: fieldName },
        attributes: ['id'],
        include: [{ all: true,  attributes: ['id', 'text', 'vocabularyName'] }]
      })
      .then(function (modelterms) {
        if (we.utils._.isEmpty(modelterms)) return next();

        const terms = modelterms.map(function (modelterm) {
          return modelterm.get().term.get().text;
        });

        record[fieldName] = terms;
        next();

        return null;
      })
      .catch(next);
    };

    we.term = term;
  });

  return plugin;
};