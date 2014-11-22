var _ = require('lodash');
module.exports.models = {
  types: {
    tag: function(values, err) {
      if(err) return err;

      sails.log.warn('values',values, JSON.stringify( this) )
      // only save unique tags
      this.tags = _.uniq(values);
      return values;
    }
  }
}