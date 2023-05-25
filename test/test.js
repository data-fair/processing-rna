process.env.NODE_ENV = 'test'
const config = require('config')
const testUtils = require('@data-fair/processings-test-utils')
const rnaProcessing = require('../index.js')

describe('RNA', function () {
  it('should download, process files and upload a csv on the staging', async function () {
    this.timeout(1000000)
    const context = testUtils.context({
      pluginConfig: {
      },
      processingConfig: {
        clearFiles: false,
        datasetMode: 'create',
        dataset: { title: 'RNA test' },
        datasetID: 'repertoire-national-des-associations',
        forceUpdate: false
      },
      tmpDir: 'data/'
    }, config, false)
    await rnaProcessing.run(context)
  })
})
