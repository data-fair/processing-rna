const fs = require('fs-extra')
const path = require('path')
const util = require('util')
const execFile = util.promisify(require('child_process').execFile)
const pump = util.promisify(require('pump'))

const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'décembre']
const url = 'https://www.data.gouv.fr/api/1/datasets/'
const nomenclature = 'https://data.orleans-metropole.fr/api/explore/v2.1/catalog/datasets/rna-associations-nomenclature-waldec/exports/json'

// the resource urls come from remote content, only keep a safe file name
const safeFileName = (resourceUrl) => {
  const fileName = path.basename(new URL(resourceUrl).pathname).replace(/[^a-zA-Z0-9._-]/g, '_')
  if (!fileName || /^\.+$/.test(fileName)) throw new Error(`nom de fichier invalide : ${resourceUrl}`)
  return fileName
}

module.exports = async (processingConfig, tmpDir, axios, log) => {
  await log.step('Téléchargement des données')

  await log.info('Filtrage des dernières données')
  const json = await axios.get(url + encodeURIComponent(processingConfig.datasetID) + '/', { maxRedirects: 5 })
  const filtre = []
  const data = json.data.resources
  const year = new Date().getFullYear()
  const month = months[new Date().getMonth()]
  log.info(`Mois en cours : ${month} ${year}, Recherche des données correspondantes`)
  for (let i = 0; i < data.length; i++) {
    if (data[i].title.toLowerCase().includes(year) && data[i].title.toLowerCase().includes(month)) {
      filtre.push(data[i].url)
    }
  }
  if (filtre.length === 0) {
    await log.info('Aucun jeu de données trouvé, récupération des dernières données')
    filtre.push(data[0].url)
    filtre.push(data[1].url)
    await log.info('Dernier jeu de données en date : ' + data[0].title)
  }
  await log.info(`Nombres fichies trouvés : ${filtre.length}`)
  await log.info('Téléchargement des fichiers...')

  let res
  for (let i = 0; i < filtre.length; i++) {
    const fileName = safeFileName(filtre[i])
    const file = path.join(tmpDir, fileName)
    await log.info(`Téléchargement du fichier ${fileName}...`)
    try {
      res = await axios.get(filtre[i], { responseType: 'stream', maxRedirects: 5 })
    } catch (err) {
      await log.error(`Téléchargement du fichier ${fileName} a échoué`)
      await log.error(err)
      throw new Error(JSON.stringify(err, null, 2))
    }
    await fs.ensureFile(file)
    await pump(res.data, fs.createWriteStream(file))
    await log.info('Téléchargement terminé')
    await log.info(`Décompression du fichier ${fileName}...`)
    try {
      await execFile('unzip', ['-o', file, '-d', path.join(tmpDir, fileName.split('.')[0])])
    } catch (err) {
      log.warning('Impossible d\'extraire l\'archive, le fichier est peut-être déjà extrait')
    }
    await log.info('Décompression terminée')
    await fs.remove(file)
  }

  await log.info('Téléchargement des nomenclatures')
  const nomenclatureRes = await axios.get(nomenclature, { responseType: 'stream', maxRedirects: 5 })
  const nomenclatureFile = path.join(tmpDir, '/nomenclature.json')
  await fs.ensureFile(nomenclatureFile)
  await pump(nomenclatureRes.data, fs.createWriteStream(nomenclatureFile))
  await log.info('Téléchargement terminé')
}
