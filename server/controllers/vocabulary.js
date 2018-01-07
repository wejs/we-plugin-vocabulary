/**
 * VocabularyController
 *
 * @module    :: Controller
 * @description :: Contains logic for handling requests.
 */
module.exports = {
  getTagUsageCount(req, res, next) {
    if (!res.locals.currentVocabulary) return next();

    res.locals.currentVocabulary
    .getTagUsageCount()
    .spread(function afterGetTagUsage(result) {
      res.send(result);

      return null;
    })
    .catch(next);
  },

  /**
   * findOne Vocabulary
   *
   * Record is preloaded in context loader by default and is avaible as res.locals.data
   *
   * @param  {Object} req express.js request
   * @param  {Object} res express.js response
   */
  findOne(req, res, next) {
    if (!res.locals.data) {
      return next();
    }
    // by default record is preloaded in context load
    res.ok();
  },
};