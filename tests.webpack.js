/*
 Test path configuration file
 */
const testsContext = require.context('./tests', true, /tests\.js$/);
testsContext.keys().forEach(testsContext);
