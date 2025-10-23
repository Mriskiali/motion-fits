/* eslint-disable */

const _path = require("path");
const { PAGES_PATH, EDITABLE_ELEMENTS } = require("./config.js");
const { _isEditableFile } = require("./utils.js");

const _getRelativePath = (filename, path) => {
  return _path.relative(_path.dirname(filename), _path.join(__dirname, path));
};

const _hasImport = (t, p, importPath) => {
  return p.node.body.some((node) => {
    return t.isImportDeclaration(node) && node.source.value === importPath;
  });
};

const _addImportStatement = (t, p, identifier, importPath) => {
  if (_hasImport(t, p, importPath)) return;

  const importDecl = t.importDeclaration(
    [t.importDefaultSpecifier(t.identifier(identifier))],
    t.stringLiteral(importPath) // 👈 adjust path here
  );
  p.unshiftContainer("body", importDecl);
};

const addEditableElementImport = (t, path, state) => {
  const filename = state.file.opts.filename || "";
  if (!_isEditableFile(filename)) return;

  const importPath = _getRelativePath(filename, "react/EditableElement_");
  _addImportStatement(t, path, "EditableElement_", importPath);
};

const addEditableWrapperImport = (t, path, state) => {
  const filename = state.file.opts.filename || "";
  if (!_isEditableFile(filename)) return;

  const importPath = _getRelativePath(filename, "react/withEditableWrapper_");
  _addImportStatement(t, path, "withEditableWrapper_", importPath);
};

const wrapElementsInEdit = (t, path, state) => {
  const openingName = path.node.openingElement.name;
  if (!openingName || openingName.type !== "JSXIdentifier") return;

  const elementName = openingName.name;
  if (!EDITABLE_ELEMENTS.includes(elementName)) return;

  // avoid double wrapping
  if (
    path.parentPath.isJSXElement() &&
    path.parentPath.node.openingElement.name.type === "JSXIdentifier" &&
    path.parentPath.node.openingElement.name.name === "EditableElement_"
  ) {
    return;
  }

  const openingElement = t.jsxOpeningElement(
    t.jsxIdentifier("EditableElement_"),
    [],
    false
  );
  const closingElement = t.jsxClosingElement(
    t.jsxIdentifier("EditableElement_")
  );

  const wrapped = t.jsxElement(
    openingElement,
    closingElement,
    [t.cloneNode(path.node, true)], // deep clone
    false
  );

  path.replaceWith(t.cloneNode(wrapped, true));
};

const wrapExportWithEditableWrapper = (t, path) => {
  path.traverse({
    ExportDefaultDeclaration(exportPath) {
      const declaration = exportPath.node.declaration;

      if (t.isIdentifier(declaration)) {
        exportPath.replaceWith(
          t.exportDefaultDeclaration(
            t.callExpression(t.identifier("withEditableWrapper_"), [
              declaration,
            ])
          )
        );
      } else if (t.isFunctionDeclaration(declaration)) {
        const id = declaration.id;

        // Keep function, but export wrapped
        exportPath.replaceWithMultiple([
          declaration,
          t.exportDefaultDeclaration(
            t.callExpression(t.identifier("withEditableWrapper_"), [id])
          ),
        ]);
      }
    },
  });
};

module.exports = function ({ types: t }) {
  return {
    visitor: {
      Program(path, state) {
        const filename = state.file.opts.filename || "";
        addEditableElementImport(t, path, state);

        if (filename.includes(PAGES_PATH) && filename.endsWith("_layout.tsx")) {
          addEditableWrapperImport(t, path, state);
          wrapExportWithEditableWrapper(t, path);
        }
      },
      JSXElement(path, state) {
        const filename = state.file.opts.filename || "";

        if (_isEditableFile(filename)) {
          wrapElementsInEdit(t, path);
        }
      },
    },
  };
};
