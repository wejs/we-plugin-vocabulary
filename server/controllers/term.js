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
    if (!res.locals.currentVocabulary) return next();

    res.locals.query.where.vocabularyName = res.locals.currentVocabulary.name;
    findTerms(req, res, next);
  },

  findOne: function findOne(req, res, next) {
    if (!res.locals.data) return next();

    res.locals.data.loadRelatedRecords(res.locals.query, function (err, r){
      if (err) return next(err);

      res.locals.relatedModels = r.rows;
      res.locals.metadata.relatedModelsCount = r.count;

      return res.ok();
    });
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
