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

    // Change url ids to vocabulary and term texts:
    if (
      req.params.vocabularyId != res.locals.data.vocabularyName ||
      res.locals.id != res.locals.data.text
    ) {
      if (req.params.modelName) {
        return res.goTo(
          '/vocabulary/'+res.locals.data.vocabularyName+'/term/'+res.locals.data.text+'/'+req.params.modelName
        );
      } else {
        return res.goTo('/vocabulary/'+res.locals.data.vocabularyName+'/term/'+res.locals.data.text);
      }
    }

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

    res.locals.template = resolveTermContentAltTemplate(req, res);
    res.locals.query.modelName = req.params.modelName;

    if (!res.locals.data) return next();

    // Change url ids to vocabulary and term texts:
    if (
      req.params.vocabularyId != res.locals.data.vocabularyName ||
      res.locals.id != res.locals.data.text
    ) {
      if (req.params.modelName) {
        return res.goTo(
          '/vocabulary/'+res.locals.data.vocabularyName+'/term/'+res.locals.data.text+'/'+req.params.modelName
        );
      } else {
        return res.goTo('/vocabulary/'+res.locals.data.vocabularyName+'/term/'+res.locals.data.text);
      }
    }

    res.locals.data
    .loadRelatedRecords(res.locals.query, (err, r)=> {
      if (err) return next(err);

      res.locals.relatedModels = r.rows;
      res.locals.metadata.relatedModelsCount = r.count;

      return res.ok();
    });

    return null;
  },

  findTermTexts(req, res) {
    res.locals.query.attributes = ['text'];

    if (!res.locals.query.where.vocabularyName) {
      res.locals.query.where.vocabularyName = req.query.vocabularyName;
    }

    if (req.query.term && !req.query.text) {
      req.query.text = req.query.term;
    }

    if (req.query.text) {
      res.locals.query.where.text = {
        $like: req.query.text + '%'
      };
    }

    res.locals.Model
    .findAndCountAll(res.locals.query)
    .then(function afterFindAndCount(record) {

      res.status(200).send({
        term: record.rows.map( (record)=> {
          return record.text;
        }),
        meta: { count: record.count }
      });

      return null;
    })
    .catch(res.queryError);
  }
};

function resolveTermContentAltTemplate(req, res) {
  const theme = res.getTheme();
  const tn = res.locals.theme || ''; // theme name
  // alternative templates
  let altTpl = '';

  let tpls = req.we.view.templateCache;
  if (req.we.env != 'prod') {
    if (theme && theme.templates) {
      tpls = theme.templates;
    } else {
      tpls = {};
    }
  }

  if (res.locals.data) {
    if (res.locals.data.text) {
      const nst = req.we.utils.string(res.locals.data.text).slugify().s;
      altTpl = 'term/findOne-'+'term-'+nst+'-'+req.params.modelName;
      if ( tpls[altTpl] ) return altTpl;
      if ( tpls[tn+'/'+altTpl] ) return altTpl;
    }

    if (res.locals.data.id) {
      altTpl = 'term/findOne-'+'term'+res.locals.data.id+'-'+req.params.modelName;
      if ( tpls[altTpl] ) return altTpl;
      if ( tpls[tn+'/'+altTpl] ) return altTpl;
    }
  }

  altTpl = 'term/findOne-'+'term'+res.locals.id+'-'+req.params.modelName;
  if ( tpls[altTpl] ) return altTpl;
  if ( tpls[tn+'/'+altTpl] ) return altTpl;

  altTpl = 'term/findOne-'+req.params.modelName;
  if ( tpls[altTpl] ) return altTpl;
  if ( tpls[tn+'/'+altTpl] ) return altTpl;

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
