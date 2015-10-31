/**
 * TermModel
 *
 * @module      :: Model
 * @description :: [Add info about you model here]
 *
 */

module.exports = function Model(we) {
  // set sequelize model define and options
  var model = {
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
        contextLoader: function contextLoader(req, res, done) {
          if (!res.locals.id || !res.locals.loadCurrentRecord) return done();

          return this.findOne({
            where: {
              $or: { id: res.locals.id, text: res.locals.id }
            },
            include: [{ all: true }]
          }).then(function (record) {
            res.locals.data = record;
            if (record && record.dataValues.creatorId && req.isAuthenticated()) {
              // ser role owner
              if (record.isOwner(req.user.id)) {
                if(req.userRoleNames.indexOf('owner') === -1 ) req.userRoleNames.push('owner');
              }
            }

            return done();
          })
        }
      },
      instanceMethods: {
        /**
         *et url path instance method
         *
         * @return {String} url path
         */
        getUrlPath: function getUrlPath() {
          return we.router.urlTo(
            this.__options.name.singular + '.findOne', [this.vocabularyName, this.text]
          );
        },

        loadRelatedRecords: function loadRelatedRecords(opts, cb) {
          we.db.models.modelsterms.findAndCountAll({
            where: { termId: this.id },
            order: [['modelId', 'DESC']],
            limit: opts.limit,
            offset: opts.offset
          }).then(function (r){
            we.utils.async.each(r.rows, function (modelsterms, next){
              modelsterms.loadRelatedRecord(next)
            }, function (err){
              cb(err, r);
            });
          }).catch(cb);
        }
      },
      hooks: {}
    }
  }
  return model;
}