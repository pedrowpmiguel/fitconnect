// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Provide a safe scrollIntoView for tests
if (typeof global !== 'undefined' && global.HTMLElement && !global.HTMLElement.prototype.scrollIntoView) {
	global.HTMLElement.prototype.scrollIntoView = function() {};
}
