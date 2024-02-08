const fs = require('fs-extra')
const path = require('path')
const { parse } = require('csv-parse/sync')
const csvStringify = require('csv-stringify/sync').stringify
const iconv = require('iconv-lite')
const schema = require('./schema.json')

const parserOpts = { delimiter: ';' }
const fields = schema.map((field) => field.key)
let items = []
const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

const codeRegex = function (code) {
  const regex = /^\d{5}$/
  if (regex.test(code)) {
    return code
  } else {
    return ''
  }
}

const laneTypeDictionary = {
  rue: 'Rue',
  bd: 'Boulevard',
  av: 'Avenue',
  pl: 'Place',
  all: 'Allée',
  chem: 'Chemin',
  imp: 'Impasse',
  sq: 'Square',
  ld: 'Lieu-dit',
  res: 'Résidence',
  trav: 'Traverse',
  rte: 'Route',
  parc: 'Parc',
  zone: 'Zone',
  quai: 'Quai',
  cour: 'Cours',
  pont: 'Pont',
  espl: 'Esplanade',
  clos: 'Clos',
  vl: 'Village',
  lot: 'Lotissement',
  cit: 'Cité',
  quar: 'Quartier',
  prom: 'Promenade',
  pas: 'Passage',
  moul: 'Moulin',
  parv: 'Parvis',
  sent: 'Sente',
  mont: 'Montée',
  rpt: 'Rond-point',
  vill: 'Villa',
  port: 'Port',
  fort: 'Fort'
}

const getLaneType = (lane) => {
  for (const keyword in laneTypeDictionary) {
    if (lane.includes(keyword)) {
      return laneTypeDictionary[keyword]
    }
  }
}

module.exports = async (proccesingConfig, tmpDir, log) => {
  await log.step('Traitement des données')
  await log.info('Conversion des nomenclatures')
  const nomenclature = await fs.readJson(path.join(tmpDir, 'nomenclature.json'))
  const nomenclatureObject = {}
  for (const object of nomenclature) {
    const newObject = {
      parentName: object.objet_social_parent_lib,
      name: object.objet_social_lib
    }
    nomenclatureObject[object.objet_social_id] = newObject
  }
  await log.info('Conversion terminée')

  const writeStream = await fs.openSync(path.join(tmpDir, 'Répertoire National des Associations.csv'), 'w')

  const files = await fs.readdir(tmpDir)
  await fs.writeSync(writeStream, csvStringify(items, { delimiter: ';', header: true, columns: fields }))
  for (const file in files) {
    const pathToFile = path.join(tmpDir, files[file])
    if (fs.lstatSync(pathToFile).isDirectory()) {
      await log.info('Traitement de l\'archive ' + files[file])
      const tmpFiles = await fs.readdir(path.join(tmpDir, files[file]))
      const csvFiles = []
      for (const tmpFile in tmpFiles) {
        if (proccesingConfig.filter) {
          if (tmpFiles[tmpFile].split('_dpt_')[1].split('.')[0] === proccesingConfig.filter) {
            csvFiles.push(tmpFiles[tmpFile])
          }
        } else {
          csvFiles.push(tmpFiles[tmpFile])
        }
      }
      for (const csvFile in csvFiles) {
        await log.info('Traitement du fichier ' + csvFiles[csvFile])
        const source = csvFiles[csvFile].slice(0, 10)
        const data = iconv.decode(await fs.readFileSync(path.join(tmpDir, files[file], csvFiles[csvFile])), 'iso-8859-1')
        const lines = parse(data, parserOpts)
        lines.shift()
        if (source.includes('waldec')) {
          for (const line of lines) {
            let dateCreation
            let datePublication
            let dateDeclaration
            let dateDissolution
            if (!line[5].toString().includes('0001-01-01')) {
              dateCreation = new Date(line[5])
            }
            if (!line[6].toString().includes('0001-01-01')) {
              dateDeclaration = new Date(line[6])
            }
            if (!line[7].toString().includes('0001-01-01')) {
              datePublication = new Date(line[7])
            }
            if (!line[8].toString().includes('0001-01-01')) {
              dateDissolution = new Date(line[8])
            }
            const objet = line[13].toString().length > 3 ? line[13] : ''
            let adresseSiege
            if (line[20] !== '') {
              adresseSiege = line[17].replace('.', '') + ' ' + getLaneType(line[19].toLowerCase()) + ' ' + line[20]
              if (line[16] !== '') {
                adresseSiege = adresseSiege + ', ' + line[16]
              }
            } else if (line[16] !== '') {
              adresseSiege = line[16]
            } else if (line[21] !== '_') {
              if (line[21].includes('_')) {
                adresseSiege = line[21].replace('_', '')
              } else {
                adresseSiege = line[21]
              }
            } else {
              adresseSiege = ''
            }
            if (adresseSiege.startsWith(', ')) {
              adresseSiege = adresseSiege.replace(/^, /, '')
            } else if (adresseSiege.endsWith(', ')) {
              adresseSiege = adresseSiege.replace(/, $/, '')
            }
            
            const adresseGestion = line[28] + (line[28] !== '' ? ', ' : '') + line[26] + ' ' + line[27]
            const dateMAJ = new Date(line[38])

            const item = [
              line[0],
              line[1],
              line[2],
              line[3],
              line[4],
              dateCreation ? `${dateCreation.getDate().toString().padStart(2, 0)}/${months[dateCreation.getMonth()]}/${dateCreation.getFullYear()}` : '',
              dateDeclaration ? `${dateDeclaration.getDate().toString().padStart(2, 0)}/${months[dateDeclaration.getMonth()]}/${dateDeclaration.getFullYear()}` : '',
              datePublication ? `${datePublication.getDate().toString().padStart(2, 0)}/${months[datePublication.getMonth()]}/${datePublication.getFullYear()}` : '',
              dateDissolution ? `${dateDissolution.getDate().toString().padStart(2, 0)}/${months[dateDissolution.getMonth()]}/${dateDissolution.getFullYear()}` : '',
              line[9],
              line[10],
              line[11],
              line[12],
              objet,
              line[14],
              line[15],
              nomenclatureObject[line[14]] ? nomenclatureObject[line[14]].parentName : '',
              nomenclatureObject[line[14]] ? nomenclatureObject[line[14]].name : '',
              adresseSiege.trim(),
              line[21].replace('_', ''),
              codeRegex(line[22]),
              codeRegex(line[23]),
              line[24],
              line[25],
              adresseGestion.trim(),
              line[29],
              codeRegex(line[30]),
              line[31],
              line[32],
              line[33],
              line[34],
              line[35],
              line[36],
              line[37],
              `${dateMAJ.getDate().toString().padStart(2, 0)}/${months[dateMAJ.getMonth()]}/${dateMAJ.getFullYear()} à ${dateMAJ.getHours().toString().padStart(2, 0)}h${dateMAJ.getMinutes().toString().padStart(2, 0)}`,
              source
            ]
            items.push(item)
          }
        } else if (source.includes('import')) {
          for (const line of lines) {
            let dateCreation
            let datePublication
            if (!line[4].toString().includes('0001-01-01')) {
              dateCreation = new Date(line[4])
            }
            if (!line[5].toString().includes('0001-01-01')) {
              datePublication = new Date(line[5])
            }
            let objet = ''
            if (line[9].toString().length > 3) {
              objet = line[9]
            }
            const dateMAJ = new Date(line[23])
            let adresseSiege = line[12].trim() + ', ' + line[13].trim()
            if (adresseSiege.startsWith(', ')) {
              adresseSiege = adresseSiege.replace(/^, /, '')
            } else if (adresseSiege.endsWith(', ')) {
              adresseSiege = adresseSiege.replace(/, $/, '')
            }

            const item = [
              line[0],
              line[1],
              line[2],
              line[22],
              line[3],
              dateCreation ? `${dateCreation.getDate().toString().padStart(2, 0)}/${months[dateCreation.getMonth()]}/${dateCreation.getFullYear()}` : '',
              '',
              datePublication ? `${datePublication.getDate().toString().padStart(2, 0)}/${months[datePublication.getMonth()]}/${datePublication.getFullYear()}` : '',
              '',
              line[6],
              line[7],
              line[8],
              '',
              objet,
              line[10],
              line[11],
              nomenclatureObject[line[10]] ? nomenclatureObject[line[10]].parentName : '',
              nomenclatureObject[line[10]] ? nomenclatureObject[line[10]].name : '',
              adresseSiege.trim(),
              '',
              codeRegex(line[17]),
              codeRegex(line[15]),
              line[16],
              '',
              '',
              '',
              '',
              '',
              '',
              line[18],
              line[19],
              '',
              line[20],
              line[21],
              `${dateMAJ.getDate().toString().padStart(2, 0)}/${months[dateMAJ.getMonth()]}/${dateMAJ.getFullYear()} à ${dateMAJ.getHours().toString().padStart(2, 0)}h${dateMAJ.getMinutes().toString().padStart(2, 0)}`,
              source
            ]
            items.push(item)
          }
        }
        await fs.writeSync(writeStream, csvStringify(items, { delimiter: ';', header: false, columns: fields }))
        items = []
      }
    }
  }
}
