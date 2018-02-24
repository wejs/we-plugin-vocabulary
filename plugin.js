/**
 * Plugin.js file, set configs, routes, hooks and events here
 *
 * see http://wejs.org/docs/we/extend.plugin
 */
module.exports = function loadPlugin(projectPath, Plugin) {
  const plugin = new Plugin(__dirname);
  const Op = plugin.we.Op;

  // set plugin configs
  plugin.setConfigs({
    permissions: {
      'find_term': {
        'group': 'term',
        'title': 'Find terms',
        'description': 'Find and find all terms'
      },
      'create_term': {
        'group': 'term',
        'title': 'Create one term',
        'description': 'Create one new term'
      },
      'update_term': {
        'group': 'term',
        'title': 'Update one term',
        'description': 'Update one new term'
      },
      'delete_term': {
        'group': 'term',
        'title': 'Delete one term',
        'description': 'Delete one term record'
      },
      'find_vocabulary': {
        'group': 'vocabulary',
        'title': 'Find vocabularys',
        'description': 'Find and find all vocabularys'
      },
      'create_vocabulary': {
        'group': 'vocabulary',
        'title': 'Create one vocabulary',
        'description': 'Create one new vocabulary'
      },
      'update_vocabulary': {
        'group': 'vocabulary',
        'title': 'Update one vocabulary',
        'description': 'Update one new vocabulary'
      },
      'delete_vocabulary': {
        'group': 'vocabulary',
        'title': 'Delete one vocabulary',
        'description': 'Delete one vocabulary record'
      }
    }
  });

  plugin.setResource({
    name: 'vocabulary',
    routeId: ':vocabularyId'
  });
  plugin.setResource({
    parent: 'vocabulary',
    name: 'term',
    routeId: ':termId',
    findOne: {
      metatagHandler: 'termFindOne'
    },
    findAll: {
      metatagHandler: 'termFindAll'
    }
  });

  // set plugin routes
  plugin.setRoutes({
    // Term
    'get /api/v1/term-texts': {
      controller    : 'term',
      action        : 'findTermTexts',
      model         : 'term',
      responseType  : 'json'
    },
    'get /vocabulary/:vocabularyId/tag-clound': {
      controller    : 'vocabulary',
      action        : 'getTagUsageCount',
      model         : 'term',
      responseType  : 'json'
    },

    'get /vocabulary/:vocabularyId/term/:termId/:modelName': {
      controller    : 'term',
      action        : 'findOneTermContent',
      model         : 'term',
      template      : 'term/findOne',
      titleHandler  : 'recordField',
      itemTitleHandler  : 'recordField',
      titleField    : 'text',
      loadCurrentRecord: true,
      paramIdName: 'termId',
      metatagHandler: 'termFindOne'
    }
  });

  plugin.hooks.on('we-plugin-menu:after:set:core:menus', function (data, done) {
    const we = data.req.we;
    // set admin menu
    if (data.res.locals.isAdmin) {
      data.res.locals.adminMenu.addLink({
        id: 'admin.vocabulary',
        text: '<i class="fa fa-tags"></i> '+
          data.req.__('vocabulary.find'),
        href: we.router.urlTo( 'admin.vocabulary.find', [], we),
        weight: 10
      });
    }

    done();
  });

  plugin.paramVocabularyIdMD = function paramVocabularyIdMD (req, res, next, id) {
    let where = {};
    // need to check if is id to skip postgreql error if search for texts in number
    if (Number(id) ) {
      where = {
        [Op.or]: { id: id, name: id }
      };
    } else {
      where = { name: id };
    }

    plugin.we.db.models.vocabulary
    .findOne({
      where: where
    })
    .then(function afterLoadVocabulary(v) {
      if (!v) {
        res.notFound();
        return null;
      }
      res.locals.currentVocabulary = v;
      req.params.vocabularyName = v.name;
      next();

      return null;
    })
    .catch(next);
  };

  plugin.events.on('we:express:set:params', function(data) {
    // load vocabulary related to term
    data.express.param('vocabularyId', plugin.paramVocabularyIdMD);
  });

  // use before instance to set sequelize virtual fields for term fields
  plugin.hooks.on('we:models:before:instance', function (we, done) {
    let f, cfgs;
    const models = we.db.modelsConfigs;
    for (let modelName in models) {

      if (models[modelName].options && models[modelName].options.termFields) {

        for (f in models[modelName].options.termFields) {
          // set the default vocabularyName
          if (!models[modelName].options.termFields[f].vocabularyName)
            models[modelName].options.termFields[f].vocabularyName = 'Tags';
          // set field configs
          cfgs = we.utils._.clone(models[modelName].options.termFields[f]);
          cfgs.type = we.db.Sequelize.VIRTUAL;
          // set virtual setter
          cfgs.set = we.term.getSetTermTag(f, cfgs.onlyLowercase);
          // set form field html
          cfgs.formFieldType =  cfgs.formFieldType || (cfgs.canCreate? 'vocabulary/tag' : 'vocabulary/category');
          // set virtual fields for term fields if now exists
          if (!models[modelName].definition[f]) {
            models[modelName].definition[f] = cfgs;
          } else {
            we.log.verbose('Cant set virtual field for field tag:', f);
          }
        }
      }

    }
    done();
  });

   // after define all models add term field hooks in models how have terms
  plugin.hooks.on('we:models:set:joins', function (we, done) {
    const models = we.db.models;

    for (let modelName in models) {
      if (!we.db.modelsConfigs[modelName]) continue;

      const termFields = we.term.getModelTermFields(we.db.modelsConfigs[modelName]);

      if ( we.utils._.isEmpty(termFields) ) continue;

      models[modelName]
      .addHook('afterFind', 'loadTerms', (r, opts)=> {
        if (!r) return r;
        return new Promise( (resolve, reject)=> {
          const Model = we.db.models[modelName];
          if ( we.utils._.isArray(r) ) {
            we.utils.async.eachSeries(r, function (r1, next) {
              we.term.afterFindRecord.bind(Model)(r1, opts)
                .then( ()=> { next(); })
                .catch(next);
            }, (err)=> {
              if (err) return reject(err);
              resolve();
            });
          } else {
            we.term.afterFindRecord
            .bind(Model)(r, opts)
            .then(resolve)
            .catch(reject);
          }
        });
      });

      models[modelName].addHook('afterCreate', 'createTerms', we.term.afterCreatedRecord);
      models[modelName].addHook('afterUpdate', 'updateTerms', we.term.afterUpdatedRecord);
      models[modelName].addHook('afterDestroy', 'destroyTerms', we.term.afterDeleteRecord);
    }

    done();
  });

  plugin.addTermContentContext = function addTermContentContext (we) {
    we.router.singleRecordActions.push('findOneTermContent');
  };

  plugin.setMetatagHandlers = function setMetatagHandlers(we) {
    if (we.router.metatag) {
      we.router.metatag.add('termFindAll', require('./lib/metatags/termFindAll.js'));
      we.router.metatag.add('termFindOne', require('./lib/metatags/termFindOne.js'));
    }
  };

  plugin.events.on('we:after:load:plugins', plugin.setMetatagHandlers);
  plugin.events.on('we:after:load:plugins', require('./lib/setModelsHooks.js'));
  plugin.events.on('we:after:load:plugins', plugin.addTermContentContext);

  return plugin;
};