
module.exports = {
  schema: true,
  attributes: {
    // term creator
    creator: {
      model: 'User',
      required: true
    },
    text: {
      type: 'string',
      required: true,
      unique: true
    },
    description: {
      type: 'text'
    }
  },

  validateAndCreateTags: function(tags, creatorId, cb) {
    if (!tags) return cb(null, []);

    var queries = [];
    var textsSearching = {};

    for (var i = 0; i < tags.length; i++) {
      if (typeof tags[i] == 'object' ) {
        if (tags[i].id && Number(tags[i].id)) {
          // change it to use the id
          tags[i] = tags[i].id;
        } else if (tags[i].text ) {
          if (!textsSearching[tags[i].text]) {
            textsSearching[tags[i].text] = true;
            queries.push(Tag.checkIfTagExistsInDbOrCreate.bind(null, tags[i].text, tags, creatorId, i));
          } else {
            tags[i] = null;
          }
        } else {
          return cb('Invalid tag type for:' +
            JSON.stringify(tags[i]));
        }
      } else if(Number(tags[i])) {
        // is number / id
        // is id then allow sails handle this relationship
      } else if(typeof tags[i] == 'string') {
        // is string / the tag text
        if (!textsSearching[tags[i]]) {
          textsSearching[tags[i]] = true;
          queries.push(Tag.checkIfTagExistsInDbOrCreate.bind(null, tags[i], tags, creatorId, i));
        } else {
          tags[i] = null;
        }
      } else {
        return cb('Invalid tag type for:' +
          JSON.stringify(tags[i]));
      }
    }
    async.parallel(queries, function(err) {
      cb(err, _.difference(tags, [null, undefined]));
    });
  },

  checkIfTagExistsInDbOrCreate: function checkIfTagExistsInDbOrCreate(text, tags, creatorId, i, done) {
    // TODO change this check to be only one query, one "createIfNotExists"
    Tag.create({
      creator: creatorId,
      text: text
    }).exec(function(err, newTerm) {
      if(err) {
        // Node.js do queries in async mode then they may create one record after run
        //   this Tag.create query then check if the error returned is tag already exists
        if(checkIfIsAlreadyExistsError(err)) {
          return Tag.findOneByText(text).exec(function(err2, term) {
             if (err2) return done(err2);
             if (!term) return done(err);
            tags[i] = term.id;
            done();
          });
        }
        // else is a  unknow error
        return done(err);
      }
      if(!newTerm) return done('checkIfTagExistsInDbOrCreate: Something wrong happend in tag term creation');
      tags[i] = newTerm.id;
      // else the term is valid, then do nothing ...
      done();
    })
  }
}

/**
 * Helper to check if err is a term already exists error
 *
 * @param  {object} err Waterline Error object
 * @return {boolean}
 */
function checkIfIsAlreadyExistsError(err) {
  if (  err.invalidAttributes &&
    err.invalidAttributes.text &&
    err.invalidAttributes.text[0] &&
    err.invalidAttributes.text[0].rule &&
    err.invalidAttributes.text[0].rule === 'unique'
  ) {
    return true;
  }
  return false;
}