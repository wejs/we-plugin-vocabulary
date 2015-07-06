/**
 * We tag helper
 *
 * usage: {{we-terms term}}
 */

module.exports = function(we) {
  /**
   * Render one terms list
   * @param  {Array} terms
   * @return {String}
   */
  return function render(terms) {
    var options = arguments[arguments.length-1];
    var html = '';

    var attributes = [];
    // pass helper attributes to link element
    for (var attributeName in options.hash) {
      attributes.push(attributeName + '="' + options.hash[attributeName] + '"');
    }

    html += '<ul class="tags" >';

    if (terms) {
      for (var i = 0; i < terms.length; i++) {
        html += '<li><a class="term-link" href="#">'+terms[i]+'</a></li>';
      }
    }

    html += '</ul>';
    return html;
  }
}

// we-tag.hbs

// <ul class="tags">
//   <li><a href="#">tag</a></li>
//   <li><a href="#">tag name</a></li>

// </ul>
