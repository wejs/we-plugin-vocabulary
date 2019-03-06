/**
 * Widget category-menu main file
 *
 * See https://github.com/wejs/we-core/blob/master/lib/class/Widget.js for all Widget prototype functions
 */

module.exports = function categoryMenuWidget(projectPath, Widget) {
  const widget = new Widget('category-menu', __dirname);

  widget.beforeSave = function htmlWidgetBeforeSave(req, res, next) {
    req.body.configuration = {
      selectedVocabulary: req.body.selectedVocabulary,
      class: req.body.class,
      limit: Number(req.body.limit) || 10
    };

    return next();
  };

  widget.viewMiddleware = function viewMiddleware(widget, req, res, next) {
    req.we.db.models.term
    .findAll({
      where: {
        vocabularyName: widget.configuration.selectedVocabulary
      },
      limit: Number(widget.configuration.limit) || 25
    })
    .then( (t)=> {
      widget.terms = t;
      next();

      return null;
    })
    .catch(next);
  };

  widget.formMiddleware = function formMiddleware(req, res, next) {
    req.we.db.models.vocabulary
    .findAll({
      attributes: ['id', 'name']
    })
    .then( (vocabularies)=> {
      res.locals.vocabularies = vocabularies;
      next();

      return null;
    })
    .catch(next);
  };

  return widget;
};