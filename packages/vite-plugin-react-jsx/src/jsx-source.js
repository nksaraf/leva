const { declare } = require('@babel/helper-plugin-utils')
const { types: t } = require('@babel/core')

module.exports = declare((api) => {
  api.assertVersion(7)

  const visitor = {
    JSXOpeningElement(path, state) {
      console.log(process.env.NODE_ENV)
      if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') return

      const location = path.container.openingElement.loc

      // The element was generated and doesn't have location information
      if (!location) return

      // ignore React.Fragment
      if (
        path.container.openingElement.name &&
        path.container.openingElement.name.object &&
        path.container.openingElement.name.property &&
        path.container.openingElement.name.object.name === 'React' &&
        path.container.openingElement.name.property.name === 'Fragment'
      ) {
        return
      }

      const attributes = path.container.openingElement.attributes
      let openingElement = path.container.openingElement.name
      const objProp = [
        t.objectProperty(t.stringLiteral('sourceFilename'), t.stringLiteral(state.filename)),
        t.objectProperty(t.stringLiteral('sourceLineStart'), t.stringLiteral(location.start.line.toString())),
        t.objectProperty(t.stringLiteral('sourceLineEnd'), t.stringLiteral(location.end.line.toString())),
        t.objectProperty(
          t.stringLiteral('sourceElement'),
          t.stringLiteral(
            openingElement.type === 'JSXMemberExpression'
              ? openingElement.object.name + '.' + openingElement.property.name
              : path.container.openingElement.name.name ?? path.container.openingElement.name.value
          )
        ),
      ]
      attributes.push(t.jsxAttribute(t.jsxIdentifier('source'), t.jsxExpressionContainer(t.objectExpression(objProp))))
    },
  }

  return {
    name: 'transform-react-jsx-source-data-attributes',
    visitor,
  }
})
