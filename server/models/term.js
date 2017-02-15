/**
 * TermModel
 *
 * @module      :: Model
 * @description :: [Add info about you model here]
 *
 */

module.exports = function Model(we) {
  // set sequelize model define and options
  return {
    definition: {
      text: {
        type: we.db.Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: we.db.Sequelize.TEXT
      },
      vocabularyName: {
        type: we.db.Sequelize.STRING,
        defaultValue: 'Tags',
        allowNull: false
      }
    },
    associations: {},
    options: {
      titleField: 'text',
      classMethods: {
        /**
         * Context loader, preload current request record and related data
         *
         * @param  {Object}   req  express.js request
         * @param  {Object}   res  express.js response
         * @param  {Function} done callback
         */
        contextLoader(req, res, done) {
          if (!res.locals.id || !res.locals.loadCurrentRecord) return done();

          let where = {};
          // need to check if is id to skip postgreql error if search for texts in number
          if (Number(res.locals.id) ) {
            where = {
              $or: { id: res.locals.id, text: res.locals.id }
            };
          } else {
            where = { text: res.locals.id };
          }

          return this.findOne({
            where: where,
            include: [{ all: true }]
          })
          .nodeify(function afterFindTerm (err, record) {
            if (err) return done(err);

            res.locals.data = record;
            if (record && record.dataValues.creatorId && req.isAuthenticated()) {
              // ser role owner
              if (record.isOwner(req.user.id)) {
                if(req.userRoleNames.indexOf('owner') === -1 ) req.userRoleNames.push('owner');
              }
            }

            done();
            return null;
          });
        }
      },
      instanceMethods: {
        /**
         *et url path instance method
         *
         * @return {String} url path
         */
        getUrlPath() {
          return we.router.urlTo(
            this.$modelOptions.name.singular + '.findOne', [this.vocabularyName, this.text]
          );
        },

        loadRelatedRecords(opts, cb) {
          return we.db.models.modelsterms
          .findAndCountAll({
            where: { termId: this.id },
            order: [['modelId', 'DESC']],
            limit: opts.limit,
            offset: opts.offset
          })
          .then(function afterLoadRelatedRecords (r) {

            we.utils.async.each(r.rows, (modelsterms, next)=> {
              modelsterms.loadRelatedRecord(next);
            }, (err)=> {
              cb(err, r);
            });

            return r;
          })
          .catch(cb);
        }
      },
      hooks: {
        afterDestroy(record, opts, done) {
          done();
          if (record && record.id) {
            // remove model associations in term
            we.db.models.modelsterms
            .destroy({
              where: {
                $or: [
                  { termId: record.id },
                  { termId: null }
                ]
              }
            });
          }
        }
      }
    }
  };
};