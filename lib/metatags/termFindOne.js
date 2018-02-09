function termFindOne(req, res, next) {
  if (!res.locals.data) return next();
  const we = req.we;

  const siteName = (we.systemSettings.siteName || we.config.appName);
  const hostname = we.config.hostname;

  res.locals.metatag +=
    '<meta property="og:url" content="'+hostname+req.urlBeforeAlias+'" />'+
    '<meta property="og:title" content="'+res.locals.title+'" />' +
    '<meta property="og:site_name" content="'+siteName+'" />'+
    '<meta property="og:type" content="article" />'+
    '<meta content="'+siteName+'" itemprop="name">';

  // canonical url alias
  if (req.urlAlias && req.urlAlias.alias) {
    res.locals.metatag += '<link rel="canonical" href="'+req.urlAlias.alias+'" />';
  }

  let description = '';

  if (res.locals.data.description) {
    description = we.utils
                    .string(res.locals.data.description)
                    .stripTags()
                    .truncate(220).s;
  } else if (we.systemSettings.siteDescription) {
    description = we.utils
                      .string(we.systemSettings.siteDescription)
                      .stripTags()
                      .truncate(200).s;
  }

  res.locals.metatag += '<meta property="og:description" content="'+
    description+
  '" />';
  res.locals.metatag += '<meta content="'+description+'" name="description">';
  res.locals.metatag += '<meta content="'+description+'" name="twitter:description">';

  let imgURL = '';
  let imgWidth = '1200';
  let imgHeight = '630';

  if (res.locals.data.featuredImage && res.locals.data.featuredImage[0]) {
    let img = res.locals.data.featuredImage[0];

    imgURL = hostname+img.urls.large;

    imgWidth = '640';
    imgHeight = '400';

    res.locals.metatag +=
      '<meta property="og:image" content="'+imgURL+'" />'+
      '<meta property="og:image:type" content="'+img.mime+'" />';
  } else if (we.systemSettings.ogImageUrlOriginal) {
    const imageUrl = we.systemSettings.ogImageUrlOriginal;

    imgURL = hostname+imageUrl;

    res.locals.metatag +=
      '<meta property="og:image" content="'+hostname+imageUrl+'" />';
  }

  // add google pagemap
  res.locals.metatag += `<!--
  <PageMap>
     <DataObject type="document">
        <Attribute name="title">${res.locals.title}</Attribute>
        <Attribute name="description">${description}</Attribute>
        <Attribute name="last_update">${res.locals.data.updatedAt}</Attribute>
     </DataObject>
     <DataObject type="thumbnail">
        <Attribute name="src" value="${imgURL}" />
        <Attribute name="height" value="${imgHeight}" />
        <Attribute name="width" value="${imgWidth}" />
     </DataObject>
  </PageMap>
  -->`;

  if (res.locals.data.tags && res.locals.data.tags.length) {
    res.locals.metatag +=
      '<meta name="keywords" content="'+res.locals.data.tags.join(',')+'" />';
  } else if (we.systemSettings.metatagKeywords) {
    res.locals.metatag +=
      '<meta name="keywords" content="'+we.systemSettings.metatagKeywords+'" />';
  }

  next();
}

module.exports = termFindOne;