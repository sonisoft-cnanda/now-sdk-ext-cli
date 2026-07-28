/**
 * Example Parameterized Script for ServiceNow
 * 
 * This script demonstrates the parameter replacement feature.
 * 
 * Parameters:
 *   {username}    - ServiceNow username to query
 *   {table}       - Table name to query
 *   {limit}       - Maximum number of records to return
 *   {active}      - Boolean filter for active records
 * 
 * Usage:
 *   nex exec global ./parameterized-example.js \
 *     --auth dev \
 *     --params '{"username":"admin","table":"sys_user","limit":5,"active":true}'
 */

gs.info('=== Parameterized Script Execution ===');
gs.info('Username: {username}');
gs.info('Table: {table}');
gs.info('Limit: {limit}');
gs.info('Active filter: {active}');
gs.info('=====================================');

// Query the specified table
var gr = new GlideRecord('{table}');

// Apply active filter if specified
if ('{active}' === 'true') {
  gr.addQuery('active', true);
}

// Set limit
gr.setLimit({limit});
gr.query();

gs.info('');
gs.info('Query Results:');

var count = 0;
while (gr.next()) {
  count++;
  gs.info(count + '. ' + gr.getValue('name') + ' (' + gr.getValue('sys_id') + ')');
}

gs.info('');
gs.info('Total records found: ' + count);
gs.info('Query for user: {username} completed');

