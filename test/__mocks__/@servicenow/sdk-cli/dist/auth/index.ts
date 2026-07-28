// Manual mock for @servicenow/sdk-cli/dist/auth/index.js
export const getCredentials = jest.fn(() => Promise.resolve({
  type: 'basic',
  username: 'test-user',
  password: 'test-password',
  instanceUrl: 'https://test.service-now.com'
}))

