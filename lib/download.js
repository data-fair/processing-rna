const fs = require('fs-extra')
const path = require('path')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const pump = util.promisify(require('pump'))

const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const url = 'https://www.data.gouv.fr/api/1/datasets/'

module.exports = async (processingConfig, tmpDir, axios, log) => {
  await log.step('Téléchargement des données')

  await log.info('Filtrage des dernières données')
  const json = await axios.get(url + processingConfig.datasetID + '/')
  const filtre = []
  const data = json.data.resources
  const year = new Date().getFullYear()
  const month = months[new Date().getMonth()]
  log.info(`Mois en cours : ${month} ${year}, Recherche des données correspondantes`)
  for (let i = 0; i < data.length; i++) {
    if (data[i].title.includes(year) && data[i].title.includes(month)) {
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
    const fileName = path.basename(filtre[i])
    const file = path.join(tmpDir, fileName)
    await log.info(`Téléchargement du fichier ${fileName}...`)
    try {
      res = await axios.get(filtre[i], { responseType: 'stream' })
    } catch (err) {
      await log.error(`Téléchargement du fichier ${fileName} a échoué`)
      await log.error(err)
      throw new Error(JSON.stringify(err, null, 2))
    }
    await fs.ensureFile(file)
    await pump(res.data, fs.createWriteStream(file))
    await log.info('Téléchargement terminé')
    // Try to prevent weird bug with NFS by forcing syncing file before reading it
    const fd = await fs.open(file, 'r')
    await fs.fsync(fd)
    await fs.close(fd)
    await log.info(`Décompression du fichier ${fileName}...`)
    try {
      await exec(`unzip -o ${file} -d ${tmpDir + '/' + fileName.split('.')[0]}`)
    } catch (err) {
      log.warning('Impossible d\'extraire l\'archive, le fichier est peut-être déjà extrait')
    }
    await log.info('Décompression terminée')
    await fs.remove(file)
  }
}
