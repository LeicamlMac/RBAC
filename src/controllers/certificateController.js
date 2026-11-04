const certificateService = require('../services/certificateService');

async function issue(req, res) {
  const cert = await certificateService.issue(req.params.id, req.user);
  if (req.validatedQuery.format === 'html') {
    res.set('Content-Disposition', `attachment; filename="certificado-${cert.code}.html"`);
    return res.type('html').send(certificateService.toHtml(cert));
  }
  return res.json(cert);
}

module.exports = { issue };
