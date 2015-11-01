/**
 * Widget category-menu main file
 *
 * See https://github.com/wejs/we-core/blob/master/lib/class/Widget.js for all Widget prototype functions
 */

module.exports = function categoryMenuWidget(projectPath, Widget) {
  var widget = new Widget('category-menu', __dirname);

  widget.afterSave = function htmlWidgetafterSave(req, res, next) {
    req.body.configuration = {
      selectedVocabulary: req.body.selectedVocabulary,
      class: req.body.class
    };

    return next();
  }

  widget.viewMiddleware = function viewMiddleware(widget, req, res, next) {
    req.we.db.models.term.findAll({
      vocabularyName: widget.configuration.selectedVocabulary,
      limit: '25'
    }).then(function (t){
      widget.terms = t;
      next();
    }).catch(next);
  }

  widget.formMiddleware = function formMiddleware(req, res, next) {
    req.we.db.models.vocabulary.findAll({
      attributes: ['id', 'name']
    }).then(function(vocabularies){
      res.locals.vocabularies = vocabularies;
      next();
    }).catch(next);
  }

  return widget;
};