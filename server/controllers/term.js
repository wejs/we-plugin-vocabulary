/**
 * term Controller
 *
 * @module    :: Controller
 * @description :: Contains logic for handling requests.
 */
module.exports = {
  create(req, res) {
    if (!res.locals.template) res.locals.template = res.locals.model + '/' + 'create';

    if (!res.locals.data) res.locals.data = {};

    if (req.method === 'POST') {
      if (req.isAuthenticated()) req.body.creatorId = req.user.id;

      // set temp record for use in validation errors
      req.we.utils._.merge(res.locals.data, req.body);

      return res.locals.Model
      .create(req.body)
      .then(function afterCreate(record) {
        res.locals.data = record;
        res.created();
        return null;
      })
      .catch(res.queryError);
    } else {
      if (!res.locals.currentVocabulary) return res.notFound();

      res.locals.data.vocabularyName = res.locals.currentVocabulary.name;
      res.ok();
    }
  },

  find(req, res, next) {
    if (!res.locals.currentVocabulary) return next();
    res.locals.query.where.vocabularyName = res.locals.currentVocabulary.name;
    findTerms(req, res, next);
  },

  findOne(req, res, next) {
    if (!res.locals.data) return next();

    res.locals.data
    .loadRelatedRecords(res.locals.query, (err, r)=> {
      if (err) return next(err);

      res.locals.relatedModels = r.rows;
      res.locals.metadata.relatedModelsCount = r.count;

      return res.ok();
    });
  },

  findOneTermContent(req, res, next) {
    if (
      !req.params.modelName ||
      !req.we.db.models[ req.params.modelName ]
    ) {
      return res.notFound();
    }

    res.locals.id = req.params.termId;
    res.locals.loadCurrentRecord = true;

    res.locals.template = resolveTermContentAltTemplate(req, res);

    req.we.db.models.term.contextLoader(req, res, (err)=> {
      if (err) return next(err);
      res.locals.query.modelName = req.params.modelName;
      req.we.controllers.term.findOne(req, res, next);
      return null;
    });
  },

  findTermTexts(req, res) {
    res.locals.query.attributes = ['text'];

    if (!res.locals.query.where.vocabularyName) {
      res.locals.query.where.vocabularyName = req.query.vocabularyName;
    }

    res.locals.Model
    .findAndCountAll(res.locals.query)
    .then(function afterFindAndCount(record) {

      res.status(200).send({
        term: record.rows.map( (record)=> {
          return record.text;
        }),
        meta: {
          count: record.count
        }
      });

      return null;
    })
    .catch(res.queryError);
  }
};

function resolveTermContentAltTemplate(req, res) {
  const theme = res.getTheme();
  // alternative templates

  let altTpl = 'term/findOne-'+'term'+res.locals.id+'-'+req.params.modelName;
  if ( theme && theme.templates[altTpl] ) {
    return altTpl;
  }

  altTpl = 'term/findOne-'+req.params.modelName;
  if ( theme && theme.templates[altTpl] ) {
    return altTpl;
  }

  return res.locals.template;
}

function findTerms(req, res, next) {
  return res.locals.Model
  .findAndCountAll(res.locals.query)
  .then(function afterFindAndCount(record) {
    if (!record) {
      next();
      return null;
    }

    res.locals.metadata.count = record.count;
    res.locals.data = record.rows;

    res.ok();

    return null;
  })
  .catch(res.queryError);
}
