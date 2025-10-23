/* eslint-disable */

const { EDITABLE_PATHS, OMITTED_PATHS } = require("./config.js");

const _isEditableFile = (path) => {
  return (
    EDITABLE_PATHS.some((v) => path.includes(v)) &&
    !OMITTED_PATHS.some((v) => path.includes(v))
  );
};

module.exports = {
  _isEditableFile,
};
