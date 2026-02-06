/**
 * server/test.js - Stability & Load Test Script (Fixed)
 * Run: node server/test.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

function httpRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'NodeTestClient/1.0',
                'Host': 'localhost'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    console.error(`[HTTP_DEBUG] JSON Parse Error on ${path}: ${data.substring(0, 100)}...`);
                    resolve({ status: res.statusCode, data: null, raw: data });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTest() {
    console.log('--- Stability Test Started ---');

    // 1. Test Health
    console.log('[Test 1] Health Check...');
    let res = await httpRequest('GET', '/health');
    if (res.status !== 200 || !res.data) throw new Error('Health check failed or empty response');
    console.log('[PASS] Server is healthy.');

    // 2. Start Session
    console.log('[Test 2] Start Level Test...');
    res = await httpRequest('POST', '/api/level-test/start', { userId: 'test_user_01' });

    // DEBUG: Inspect raw structure
    if (!res.data || !res.data.success) {
        console.error(`[FAIL_DEBUG] Start Response: ${res.raw || 'No Data'}`);
        throw new Error('Start session failed: Invalid response structure');
    }

    // Safe extraction (API returns data inside data.data based on curl)
    // Actually curl showed: {"success":true,"data":{"session_id":...}}
    // So res.data.data.session_id
    const sessionInfo = res.data.data;
    if (!sessionInfo.session_id) throw new Error('session_id missing in response');
    const sessionId = sessionInfo.session_id;

    console.log(`[PASS] Session started: ${sessionId}`);

    // 3. Submit Answers (Simulate 5 questions)
    console.log('[Test 3] Submitting answers...');
    for (let i = 0; i < 5; i++) {
        // Use a local var for the answer request to not overwrite sessionId var if needed
        // But we need sessionId var. We don't overwrite it in the loop below.
        res = await httpRequest('POST', '/api/level-test/answer', {
            session_id: sessionId,
            question_id: `q_${i+1}`,
            answer: 'Option A'
        });

        if (res.status !== 200) throw new Error(`Question ${i+1} failed with status ${res.status}`);
        // API might return {success: true, data: {status: "completed"}} or {success: true, data: {next_question: ...}}
        // We don't strictly check res.data.data.session_id here as it might be omitted in subsequent steps
        // but we assume it works if status is 200.
    }
    console.log('[PASS] All answers submitted.');

    // 4. Check Completion
    // Note: The loop above overwrote `res`. We need the result of the LAST submission.
    // If the loop finished, `res` holds the result of the 5th submission.
    // If the 5th submission completed the test, res.data.data.status should be 'completed'.

    if (!res.data || !res.data.data) {
        throw new Error('Final check failed: No data in last response');
    }

    // The API returns the final result in data.data
    const finalResult = res.data.data;
    if (finalResult.status !== 'completed') throw new Error(`Completion status mismatch. Expected 'completed', got '${finalResult.status}'`);
    console.log('[PASS] Test completed successfully.');
    console.log(`[RESULT] Score: ${finalResult.total_score}/${finalResult.max_score}`);

    console.log('--- Stability Test Passed ---');
}

runTest().catch(err => {
    console.error(`[FAIL] ${err.message}`);
    console.error(err.stack);
    process.exit(1);
});
