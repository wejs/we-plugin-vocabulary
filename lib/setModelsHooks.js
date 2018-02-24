module.exports = function setModelsHooks(we) {
  const db = we.db,
    log = we.log,
    term = {};

  term.getModelTermFields = function(Model) {
    if (!Model || !Model.options || !Model.options.termFields) return null;
    return Model.options.termFields;
  };

  term.saveModelTerms = function saveModelTerms(modelName, modelId, req, fieldName, isTags, cb) {
    return db.models.modelsterms
    .create({
      modelName: modelName,
      modelId: modelId,
      field: fieldName,
      isTags: true
    })
    .then( (terms)=> {
      cb(null, terms);
      return null;
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
          nextTerm();
          return null;
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
    }, (err)=> {
      if (err) {
        done(err);
      } else {
        done(null, salvedTerms);
      }

      return null;
    });
  };

  // virtual fields
  term.getSetTermTag = function getSetTermTag(fieldName, onlyLowercase) {
    if (onlyLowercase) {
      return function setTermTag(val) {
        if (typeof val === 'string') {
          this.setDataValue(fieldName, [val.toLowerCase()]);
        } else if ( we.utils._.isArray(val) ) {
          this.setDataValue(fieldName, val.map( (v)=> {
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

  term.afterCreatedRecord = function(r) {
    return new Promise( (resolve, reject)=> {
      const functions = [],
        Model = this;

      let termFields = term.getModelTermFields(this);
      if (!termFields) return resolve();

      let fieldNames = Object.keys(termFields);

      fieldNames.forEach(function (fieldName) {
        if (we.utils._.isEmpty(r.get(fieldName))) return null;

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
            next();
            return null;
          });
        });
      });
      we.utils.async.series(functions, (err)=> {
        if (err) return reject(err);
        resolve();
      });
    });
  };

  /**
   * Load record terms after find record
   */
  term.afterFindRecord = function(r) {
    return new Promise( (resolve, reject)=> {
      const functions = [],
        Model = this;
      // found 0 results
      if (!r) return resolve();

      const termFields = term.getModelTermFields(this);
      if (!termFields) return resolve();

      if (!r._salvedModelTerms) r._salvedModelTerms = {};
      if (!r._salvedTerms) r._salvedTerms = {};

      let fieldNames = Object.keys(termFields);
      // for each field
      fieldNames.forEach(function (fieldName) {
        functions.push(function (next) {
          return db.models.modelsterms
          .findAll({
            where: { modelName: Model.name, modelId: r.id, field: fieldName },
            attributes: ['id'],
            include: [{
              model: db.models.term,
              as: 'term',
              attributes: ['id', 'text', 'vocabularyName']
            }]
          })
          .then( (modelterms)=> {
            if (we.utils._.isEmpty(modelterms)) {
              next();
              return null;
            }
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

      we.utils.async.series(functions, (err)=> {
        if (err) return reject(err);
        resolve();
      });
    });
  };

  term.afterDeleteRecord = function(r) {
    return new Promise( (resolve, reject)=> {
      const Model = this;

      db.models.modelsterms
      .destroy({
        where: {
          modelName: Model.name,
          modelId: r.id
        }
      })
      .then( (result)=> {
        log.debug('Deleted ' + result + ' terms from record with id: ' + r.id);
        resolve();
        return null;
      })
      .catch(reject);
    });
  };

  term.afterUpdatedRecord = function(r, opts) {
    return new Promise( (resolve, reject)=> {
      const Model = this;

      let termFields = term.getModelTermFields(this);
      if (!termFields) {
        resolve();
        return null;
      }

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
            if (we.utils._.isEmpty(termsToSave)) {
              done();
              return null;
            }
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
        if (err) return reject(err);
        return resolve();
      });
    });

  };

  term.loadModelTerms =  function loadModelTerms(record, fieldName, modelName, next) {
    return db.models.modelsterms.findAll({
      where: { modelName: modelName, modelId: record.id, field: fieldName },
      attributes: ['id'],
      include: [{
        model: db.models.term,
        as: 'term',
        attributes: ['id', 'text', 'vocabularyName']
      }]
    })
    .then( (modelterms)=> {
      if (we.utils._.isEmpty(modelterms)) {
        next();
        return null;
      }

      const terms = modelterms.map( (modelterm)=> {
        return modelterm.get().term.get().text;
      });

      record[fieldName] = terms;
      next();

      return null;
    })
    .catch(next);
  };

  we.term = term;
};