/**
 * Global teardown for integration tests
 * Runs once after all test suites complete
 */

module.exports = async () => {
  console.log('\n🧹 Global Teardown: Cleaning up...\n');
  console.log('✅ Global Teardown Complete\n');
};
