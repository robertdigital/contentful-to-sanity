const prettier = require('prettier')
const upperFirst = require('lodash/upperFirst')
const defaultsDeep = require('lodash/defaultsDeep')

const schemaTemplate = `
import createSchema from 'part:@sanity/base/schema-creator'
__IMPORTS__

export default createSchema({
  name: 'default',
  types: [__TYPES__]
})
`

const defaultPrettierOptions = {
  semi: false,
  singleQuote: true,
  bracketSpacing: false
}

function createSanitySchema(types, options = {}) {
  const typeNames = types.map(type => upperFirst(type.name))
  const typeImports = typeNames.map(generateImport).join('\n')
  const typeArray = typeNames.join(', ')
  const prettierOptions = Object.assign({}, defaultPrettierOptions, options.prettierOptions)
  const schemaContent = schemaTemplate
    .replace(/__TYPES__/, typeArray)
    .replace(/__IMPORTS__/, typeImports)

  return types
    .map(type => ({
      path: `${upperFirst(type.name)}.js`,
      content: format(generateSchemaForType(type))
    }))
    .concat({
      path: 'schema.js',
      content: format(schemaContent)
    })

  function format(content) {
    return prettier.format(content, prettierOptions)
  }
}

function generateSchemaForType(type) {
  const blockPreview =
    type.preview &&
    type.fields.find(field => field.name === type.preview.select.title).type === 'array'

  if (!blockPreview) {
    return `export default ${JSON.stringify(type, null, 2)}`
  }

  const prepareMethod = `values => {
    const getFirstText = block => block.children && block.children[0] && block.children[0].text
    const block = values.title.find(getFirstText)
    return {title: block && getFirstText(block)}
  }`

  const preparedType = defaultsDeep({preview: {prepare: '__PREPARE__'}}, type)
  const typeContent = `export default ${JSON.stringify(preparedType, null, 2)}`
  return typeContent.replace(/["']__PREPARE__["']/, prepareMethod)
}

function generateImport(typeName) {
  return `import ${typeName} from './${typeName}'`
}

module.exports = createSanitySchema
