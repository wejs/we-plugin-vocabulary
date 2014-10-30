/**
 * (1) Core middleware
 *
 * Middleware included with `app.use` is run first, before the router
 */


/**
 * (2) Static routes
 *
 * This object routes static URLs to handler functions--
 * In most cases, these functions are actions inside of your controllers.
 * For convenience, you can also connect routes directly to views or external URLs.
 *
 */

module.exports.routes = {
  // update model tags
  'post /api/v1/:modelName/:modelId/:modelAttribute/': {
    controller: 'TermController',
    action: 'updateModelTerms'
  }
}