/**
 * term Controller
 *
 * @module    :: Controller
 * @description :: Contains logic for handling requests.
 */
module.exports = {
  create: function create(req, res) {
    if (!res.locals.template) res.locals.template = res.locals.model + '/' + 'create';

    if (!res.locals.data) res.locals.data = {};

    req.we.utils._.merge(res.locals.data, req.query);

    if (req.method === 'POST') {
      if (req.isAuthenticated()) req.body.creatorId = req.user.id;

      // set temp record for use in validation errors
      res.locals.data = req.query;
      req.we.utils._.merge(res.locals.data, req.body);

      return res.locals.Model.create(req.body)
      .then(function (record) {
        res.locals.data = record;
        res.created();
      }).catch(res.queryError);
    } else {
      if (!req.params.vocabularyId) return res.notFound();

      req.we.db.models.vocabulary.findById(req.params.vocabularyId)
      .then(function (v){
        if (!v) return res.notFound();

        res.locals.data = req.query;
        res.locals.data.vocabularyName = v.name;
        res.ok();
      }).catch(res.queryError);
    }
  },
  find: function findAll(req, res, next) {
    if (req.params.vocabularyId) {
      if (
        req.params.vocabularyId == 0 ||
        req.params.vocabularyId == 'null'
      ) {
        res.locals.query.where.vocabularyName = null;
        findTerms(req, res, next);
      } else {
        // check if related vocabulary exists
        req.we.db.models.vocabulary
        .findById(req.params.vocabularyId)
        .then(function (v){
          if (!v) return res.notFound();

          res.locals.query.where.vocabularyName = v.name;

          findTerms(req, res, next);
        }).catch(res.queryError);
      }


    } else {
      findTerms(req, res, next);
    }
  },

  findTermTexts: function(req, res) {
    res.locals.query.attributes = ['text'];

    res.locals.Model.findAndCountAll(res.locals.query)
    .then(function(record) {
      return res.status(200).send({
        term: record.rows.map(function (record) {
          return record.text;
        }),
        meta: {
          count: record.count
        }
      });
    });
  }
};


function findTerms(req, res, next) {
  return res.locals.Model.findAndCountAll(res.locals.query)
  .then(function (record) {
    if (!record) return next();

    res.locals.metadata.count = record.count;
    res.locals.data = record.rows;

    return res.ok();
  });
}
