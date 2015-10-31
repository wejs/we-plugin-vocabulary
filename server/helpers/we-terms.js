/**
 * We tag helper
 *
 * usage: {{we-terms term vocabularyName="Category"}}
 */

module.exports = function(we) {
  /**
   * Render one terms list
   * @param  {Array} terms
   * @return {String}
   */
  return function render(terms) {
    var options = arguments[arguments.length-1];
    var html = '', vocabularyName;

    var attributes = [];
    // pass helper attributes to link element
    for (var attributeName in options.hash) {
      attributes.push(attributeName + '="' + options.hash[attributeName] + '"');
    }

    vocabularyName = options.hash.vocabularyName || 'Tags';

    html += '<ul class="tags" >';

    if (terms) {
      for (var i = 0; i < terms.length; i++) {
        html += '<li><a class="term-link" href="/vocabulary/'+vocabularyName+'/'+terms[i]+'">'+terms[i]+'</a></li>';
      }
    }

    html += '</ul>';
    return new we.hbs.SafeString(html);
  }
}
