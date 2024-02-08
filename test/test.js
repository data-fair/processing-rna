process.env.NODE_ENV = 'test'
const config = require('config')
const assert = require('assert').strict
const rnaProcessing = require('../index.js')

describe('RNA', function () {
  it('should expose a plugin config schema for super admins', async () => {
    const schema = require('../plugin-config-schema.json')
    assert.ok(schema)
  })

  it('should expose a processing config schema for users', async () => {
    const schema = require('../processing-config-schema.json')
    assert.equal(schema.type, 'object')
  })

  it('should download, process files and upload a csv on the staging', async function () {
    this.timeout(1000000)

    const testsUtils = await import('@data-fair/lib/processings/tests-utils.js')
    const context = testsUtils.context({
      pluginConfig: {
      },
      processingConfig: {
        clearFiles: false,
        datasetMode: 'create',
        dataset: { title: 'RNA test' },
        datasetID: 'repertoire-national-des-associations',
        forceUpdate: false,
        filter: '56'
      },
      tmpDir: 'data/'
    }, config, false)
    await rnaProcessing.run(context)
  })
})
