/**
 * VocabularyController
 *
 * @module    :: Controller
 * @description :: Contains logic for handling requests.
 */
module.exports = {
  getTagUsageCount: function(req, res, next) {
    if (!res.locals.currentVocabulary) return next();
    res.locals.currentVocabulary.getTagUsageCount()
    .spread(function (result) {
      res.send(result);
    }).catch(next);
  }
};