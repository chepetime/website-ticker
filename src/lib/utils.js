const handleTextInput = (field, min = 0) => {
  return typeof field === 'string' && field.trim().length >= min ? field.trim() : false;
};

const handleTextInputValid = (field, valid) => {
  return typeof field === 'string' && valid.indexOf(field) > -1 ? field : false;
};

const handleTextBoolean = field => {
  return typeof field === 'boolean' && field === true;
};

const handleArrayInput = (field, min = 0) => {
  return typeof field === 'object' && field instanceof Array && field.length > min ? field : false;
};

const handleNumberInput = (field, min = 1, max = 5) => {
  return typeof field === 'number' && field > min && field <= max ? field : false;
};

const handleObjectInput = field => {
  return typeof field === 'object' && field !== null ? field : false;
};

module.exports = {
  handleTextInput,
  handleTextBoolean,
  handleTextInputValid,
  handleArrayInput,
  handleNumberInput,
  handleObjectInput,
};
