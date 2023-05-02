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
        dataset: { title: 'Répertoire national des Associations 2' },
        datasetID: 'repertoire-national-des-associations',
        filter: '56', // Département du Morbihan
        forceUpdate: false
      },
      tmpDir: 'data/'
    }, config, false)
    await rnaProcessing.run(context)
  })
})

describe('RNA', function () {
  it('should download, process files and update a dataset on the staging', async function () {
    this.timeout(1000000)
    const context = testUtils.context({
      pluginConfig: {
      },
      processingConfig: {
        clearFiles: false,
        datasetMode: 'update',
        dataset: { id: 'repertoire-national-des-associations2', title: 'Répertoire national des Associations 2' },
        datasetID: 'repertoire-national-des-associations',
        filter: '44', // Département de la Loire-Atlantique
        forceUpdate: false
      },
      tmpDir: 'data/'
    }, config, false)
    await rnaProcessing.run(context)
  })
})
