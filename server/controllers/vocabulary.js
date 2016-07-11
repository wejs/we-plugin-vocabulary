/**
 * VocabularyController
 *
 * @module    :: Controller
 * @description :: Contains logic for handling requests.
 */
module.exports = {
  getTagUsageCount: function getTagUsageCount(req, res, next) {
    if (!res.locals.currentVocabulary) return next()

    res.locals.currentVocabulary
    .getTagUsageCount()
    .spread(function afterGetTagUsage(result) {
      res.send(result)

      return null;
    })
    .catch(next);
  }
};