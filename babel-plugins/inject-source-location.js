/* eslint-disable */

const { EDITABLE_ELEMENTS } = require("./config.js");
const { _isEditableFile } = require("./utils.js");

module.exports = function ({ types: t }) {
  return {
    visitor: {
      JSXOpeningElement(path, state) {
        const openingName = path.node.name;
        const filename = state.file.opts.filename || "unknown";

        const loc = path.node.loc;
        if (!loc) return;

        const line = loc.start.line;
        const column = loc.start.column;
        const location = `${filename}:${line}:${column}`;

        if (!openingName || openingName.type !== "JSXIdentifier") return;
        const elementName = openingName.name;
        if (!_isEditableFile(filename)) return;

        path.node.attributes.push(
          t.jsxAttribute(
            t.jsxIdentifier("__sourceLocation"),
            t.stringLiteral(location)
          )
        );

        path.node.attributes.push(
          t.jsxAttribute(
            t.jsxIdentifier("__trace"),
            t.jsxExpressionContainer(
              t.arrayExpression([
                t.spreadElement(
                  t.logicalExpression(
                    "||",
                    t.memberExpression(
                      t.logicalExpression(
                        "||",
                        t.identifier("arguments[0]"),
                        t.arrayExpression([])
                      ), // parent props object
                      t.identifier("__trace")
                    ),
                    t.arrayExpression([]) // fallback to empty array if undefined
                  )
                ),
                t.stringLiteral(location), // current element location
              ])
            )
          )
        );
      },
    },
  };
};
