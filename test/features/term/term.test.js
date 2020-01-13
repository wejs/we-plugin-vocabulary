const assert = require('assert'),
  request = require('supertest'),
  helpers = require('we-test-tools').helpers,
  stubs = require('we-test-tools').stubs;

let http, we, async,_;
let salvedPage, salvedUser, salvedUserPassword, salvedVocabulary, savedTerms;

describe('termFeature', function () {
  before(function (done) {
    http = helpers.getHttp();
    we = helpers.getWe();
    async = we.utils.async;
    _ = we.utils._;

    async.series([
      function (done) {
        var userStub = stubs.userStub();
        helpers.createUser(userStub, function(err, user) {
          if (err) {
            we.log.error(err);
            return done(err);
          }

          salvedUser = user;
          salvedUserPassword = userStub.password;
          done();
          return null;
        });
      },
      function createVocabulary(done) {
        var vocabularyStub = stubs.vocabularyStub(salvedUser.id);
        vocabularyStub.name = 'Category';
        we.db.models.vocabulary
        .findOrCreate({
          where: { name: 'Category' },
          defaults: vocabularyStub
        })
        .spread(function (v) {
          salvedVocabulary = v;
          done();
          return null;
        })
        .catch(done);
      },
      function createTerms(done) {
        let termsStub = stubs.termsStub(
          salvedUser.id, salvedVocabulary.name
        );
        we.db.models.term.bulkCreate(termsStub)
        .then(function() {
          return we.db.models.term
          .findAll()
          .then(function(ts) {
            savedTerms = ts;
            done();
          });
        })
        .catch((err)=> {
          console.error(err);
          done(err);
        });
      },
      function createPages(done) {
        let pageStub = stubs.pageStub(salvedUser.id);
        we.db.models.content.create(pageStub)
        .then(function (p) {
          salvedPage = p;
          done();
        })
        .catch(done);
      }
    ], done);
  });

  describe('find', function () {
    it('get /content route should find pages with salved tags and categories', function(done){

      request(http)
      .get('/content')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        assert.equal(200, res.status);
        assert(res.body.content);
        assert( _.isArray(res.body.content) , 'page not is array');
        assert(res.body.meta);

        let hasPageTags = false;
        res.body.content.forEach(function(page) {
          if (page.id === salvedPage.id) {
            if (_.isEqual(page.tags, salvedPage.dataValues.tags) ) {
              hasPageTags = true;
            }
          }
        });
        assert(hasPageTags, 'Dont has page tags!');

        done();
      });
    });

    it('get /term-texts?vocabularyName should find term texts', function(done){

      request(http)
      .get('/api/v1/term-texts?vocabularyName=Category')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        assert.equal(200, res.status);
        assert(res.body.term);
        assert( _.isArray(res.body.term) , 'term not is array');
        assert(res.body.meta);

        assert(res.body.meta.count);

        res.body.term.forEach(function(term) {
          assert( typeof term === 'string' );
        });

        done();
      });
    });

    it('get /vocabulary should return a vocabulary list', function(done){
      request(http)
      .get('/vocabulary')
      .set('Accept', 'application/json')
      .expect(200)
      .end(function (err, res) {
        if (err) {
          console.error(res.text);
          return done(err);
        }

        assert(res.body.vocabulary);
        assert( _.isArray(res.body.vocabulary) , 'vocabulary not is array');
        assert(res.body.meta);

        assert(res.body.meta.count);

        done();
      });
    });

    it('get /vocabulary/:id should return a one vocabulary', function(done){
      request(http)
      .get('/vocabulary/' + salvedVocabulary.id)
      .set('Accept', 'application/json')
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        assert(res.body.vocabulary);
        assert.equal(res.body.vocabulary.id, salvedVocabulary.id);
        assert.equal(res.body.vocabulary.name, salvedVocabulary.name);
        done();
      });
    });

  });

  describe('create', function () {

    it('post /content create one page record with tags', function(done) {
      var pageStub = stubs.pageStub(salvedUser.id);

      request(http)
      .post('/content')
      .send(pageStub)
      .set('Accept', 'application/json')
      .end(function (err, res) {
        if (err) return done(err);

        assert.equal(201, res.status);
        assert(res.body.content);
        assert(res.body.content.title, pageStub.title);
        assert(res.body.content.about, pageStub.about);
        assert(res.body.content.body, pageStub.body);

        let hasAllTags = true;
        for (let i = pageStub.tags.length - 1; i >= 0; i--) {
          if ( res.body.content.tags.indexOf(pageStub.tags[i].toLowerCase()) == -1 ) {
            hasAllTags = false;
            break;
          }
        }
        assert(hasAllTags, 'Have all tags');

        done();
      });
    });
  });

  describe('update', function () {
    it('put /content/:id should upate page terms and return page with new terms', function(done){
      var newTitle = 'my new title';
      var newTags = [ 'futebol', 'ze ramalho', 'valderrama' ];
      var newCategories = [ 'Universe', 'Saúde' ];

      request(http)
      .put('/content/' + salvedPage.id)
      .send({
        title: newTitle,
        tags: newTags,
        categories: newCategories
      })
      .expect(200)
      .set('Accept', 'application/json')
      .end(function (err, res) {
        if (err) {
          console.log(res.text);
          return done(err);
        }

        assert.equal(200, res.status);
        assert(res.body.content);
        assert(res.body.content.title, newTitle);
        salvedPage.title = newTitle;

        we.db.models.modelsterms
        .findAll({
          where: {
            modelName: 'content',
            modelId: salvedPage.id,
            field: 'tags'
          },
          include: [{ all: true,  attributes: ['text'] }]
        })
        .then(function (result) {
          let terms = result.map(function(modelterm) {
            return modelterm.get().term.get().text;
          });

          assert( _.isEqual(newTags, terms) );

          done();
        })
        .catch(done);
      });
    });
  });

  describe('destroy', function () {
    it('delete /content/:id should delete one page and all related modelsterms assoc', function(done){

      request(http)
      .delete('/content/' + salvedPage.id)
      .set('Accept', 'application/json')
      .expect(204)
      .end(function (err, res) {
        if (err) return done(err);

        we.db.models.modelsterms
        .findAll({
          where: {
            modelName: 'content',
            modelId: salvedPage.id,
            field: 'tags'
          }
        })
        .then(function(result) {
          assert(_.isEmpty(result));
          done();
          return null;
        });
      })
    });
  });
});
