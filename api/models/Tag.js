
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
    Tag.findOneByText(text).exec(function(err, term) {
      if (err) return done(err);

      if (term) {
        // term exists only swap by id
        tags[i] = term.id;
        return done();
      }

      Tag.create({
        creator: creatorId,
        text: text
      }).exec(function(err, newTerm) {
        if(err) return done(err);
        if(!newTerm) return done('checkIfTagExistsInDbOrCreate: Something wrong happend in tag term creation');
        tags[i] = newTerm.id;
        // else the term is valid, then do nothing ...
        done();
      })
    });
  }
}