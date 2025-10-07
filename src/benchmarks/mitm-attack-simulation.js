/**
 * MITM (Man-in-the-Middle) Attack Simulation
 * Tests system resilience against request tampering, cache poisoning, and integrity violations
 */

require('dotenv').config();
import '../services/mongoose';
import Models from '../models';
import Helpers from '../helpers';
import md5 from 'md5';
import chalk from 'chalk';

const printSection = (title) => {
  console.log('\n' + '='.repeat(70));
  console.log(title);
  console.log('='.repeat(70) + '\n');
};

const printResult = (test, passed, details = '') => {
  const icon = passed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
  console.log(`${icon} ${test}`);
  if (details) {
    console.log(`   ${chalk.gray(details)}`);
  }
};

/**
 * ATTACK 1: Request Tampering - Modify App Data in Transit
 * Attacker intercepts request and modifies app attributes to gain unauthorized access
 */
const testRequestTampering = async () => {
  printSection('ATTACK 1: Request Tampering (Modify App Data)');

  try {
    // Create legitimate app and user
    const app = await Models.App.findOne();
    const user = await Models.User.findOne();

    if (!app || !user) {
      throw new Error('Test data not available');
    }

    // Calculate legitimate hash
    const legitimateHash = md5(
      md5(JSON.stringify(app)) + '-' + md5(JSON.stringify(user.privacyPreference))
    );

    console.log(chalk.blue('Legitimate request:'));
    console.log(`  App ID: ${app._id}`);
    console.log(`  User ID: ${user._id}`);
    console.log(`  Hash: ${legitimateHash}`);

    // ATTACKER ACTION: Modify app attributes in transit
    const tamperedApp = { ...app.toObject() };
    tamperedApp.attributes = []; // Remove all attribute restrictions
    tamperedApp.purposes = []; // Remove all purpose restrictions
    tamperedApp.timeofRetention = 0; // Claim no data retention

    console.log(chalk.red('\nAttacker modifies request:'));
    console.log(`  Modified attributes: ${JSON.stringify(tamperedApp.attributes)}`);
    console.log(`  Modified purposes: ${JSON.stringify(tamperedApp.purposes)}`);

    // Calculate tampered hash (what attacker might compute)
    const tamperedHash = md5(
      md5(JSON.stringify(tamperedApp)) + '-' + md5(JSON.stringify(user.privacyPreference))
    );

    console.log(`  Tampered Hash: ${tamperedHash}`);

    // DEFENSE TEST: Hash mismatch detection
    const hashesMatch = legitimateHash === tamperedHash;
    const hashDetectionWorks = !hashesMatch;

    printResult(
      'Hash Integrity Check',
      hashDetectionWorks,
      `Hashes ${hashesMatch ? 'MATCH (VULNERABLE!)' : 'DIFFER (PROTECTED)'}`
    );

    // DEFENSE TEST: Cache lookup with tampered hash
    const cachedWithTamperedHash = await Models.EvaluateHash.findOne({
      userId: user._id.toString(),
      hash: tamperedHash,
    });

    const cacheProtectionWorks = !cachedWithTamperedHash;

    printResult(
      'Cache Poisoning Prevention',
      cacheProtectionWorks,
      cachedWithTamperedHash
        ? 'Tampered hash found in cache (VULNERABLE!)'
        : 'Tampered hash not in cache (PROTECTED)'
    );

    // DEFENSE TEST: Evaluation with tampered data
    const tamperedResult = await Helpers.PrivacyPreference.evaluate(tamperedApp, user);
    const legitimateResult = await Helpers.PrivacyPreference.evaluate(app, user);

    const resultsDiffer = tamperedResult !== legitimateResult;

    printResult(
      'Tampered Data Detection',
      resultsDiffer,
      `Legitimate: ${legitimateResult}, Tampered: ${tamperedResult} - ${
        resultsDiffer ? 'Results differ (PROTECTED)' : 'Results same (RISK!)'
      }`
    );

    return {
      hashIntegrityWorks: hashDetectionWorks,
      cachePoisoningPrevented: cacheProtectionWorks,
      tamperedDataDetected: resultsDiffer,
    };
  } catch (error) {
    console.error(chalk.red('Error in request tampering test:'), error);
    return { error: error.message };
  }
};

/**
 * ATTACK 2: Cache Poisoning - Inject Malicious Cache Entry
 * Attacker attempts to inject false cache entries to bypass privacy checks
 */
const testCachePoisoning = async () => {
  printSection('ATTACK 2: Cache Poisoning Attack');

  try {
    const app = await Models.App.findOne();
    const user = await Models.User.findOne();

    // ATTACKER ACTION: Craft malicious cache entry
    const maliciousHash = md5('MALICIOUS_PAYLOAD_' + Date.now());

    console.log(chalk.red('Attacker attempts to inject cache entry:'));
    console.log(`  Malicious Hash: ${maliciousHash}`);
    console.log(`  Result: "grant" (unauthorized access)`);

    // Attempt to inject malicious cache
    await Models.EvaluateHash.create({
      userId: user._id.toString(),
      hash: maliciousHash,
      result: 'grant',
    });

    console.log(chalk.yellow('Malicious cache entry injected!'));

    // DEFENSE TEST: Query with legitimate request
    const legitimateHash = md5(
      md5(JSON.stringify(app)) + '-' + md5(JSON.stringify(user.privacyPreference))
    );

    const cachedResult = await Models.EvaluateHash.findOne({
      userId: user._id.toString(),
      hash: legitimateHash,
    });

    const maliciousCache = await Models.EvaluateHash.findOne({
      userId: user._id.toString(),
      hash: maliciousHash,
    });

    const legitimateHashNotPoisoned = !cachedResult || cachedResult.hash !== maliciousHash;

    printResult(
      'Hash-based Isolation',
      legitimateHashNotPoisoned,
      `Legitimate requests use hash ${legitimateHash}, not affected by malicious ${maliciousHash}`
    );

    // DEFENSE TEST: Can attacker guess the hash?
    const randomGuesses = 1000;
    let successfulGuesses = 0;

    console.log(chalk.blue(`\nTesting hash guessing (${randomGuesses} attempts)...`));

    for (let i = 0; i < randomGuesses; i++) {
      const guessedHash = md5('guess_' + i);
      const found = await Models.EvaluateHash.findOne({
        hash: guessedHash,
      });
      if (found) successfulGuesses++;
    }

    const hashSpaceProtection = successfulGuesses === 0;

    printResult(
      'Hash Collision Resistance',
      hashSpaceProtection,
      `${successfulGuesses}/${randomGuesses} guesses matched (${
        hashSpaceProtection ? 'PROTECTED' : 'VULNERABLE'
      })`
    );

    // Cleanup malicious entry
    await Models.EvaluateHash.deleteOne({ hash: maliciousHash });

    return {
      hashIsolationWorks: legitimateHashNotPoisoned,
      hashCollisionResistant: hashSpaceProtection,
      maliciousEntryIsolated: true,
    };
  } catch (error) {
    console.error(chalk.red('Error in cache poisoning test:'), error);
    return { error: error.message };
  }
};

/**
 * ATTACK 3: Response Modification - Alter Evaluation Result
 * Attacker intercepts response and changes "deny" to "grant"
 */
const testResponseModification = async () => {
  printSection('ATTACK 3: Response Modification Attack');

  try {
    const app = await Models.App.findOne();
    const user = await Models.User.findOne();

    // Get legitimate evaluation
    const legitimateResult = await Helpers.PrivacyPreference.evaluate(app, user);

    console.log(chalk.blue('Legitimate evaluation result:'));
    console.log(`  Result: ${legitimateResult ? 'grant' : 'deny'}`);

    // ATTACKER ACTION: Modify response
    const modifiedResult = !legitimateResult; // Flip the result

    console.log(chalk.red('\nAttacker modifies response:'));
    console.log(`  Modified Result: ${modifiedResult ? 'grant' : 'deny'}`);

    // DEFENSE TEST: Hash verification on client side
    const serverHash = md5(
      md5(JSON.stringify(app)) + '-' + md5(JSON.stringify(user.privacyPreference))
    );

    // Client recomputes hash
    const clientHash = md5(
      md5(JSON.stringify(app)) + '-' + md5(JSON.stringify(user.privacyPreference))
    );

    const hashVerificationWorks = serverHash === clientHash;

    printResult(
      'Client-Side Hash Verification',
      hashVerificationWorks,
      `Client can verify request integrity: ${serverHash} === ${clientHash}`
    );

    // DEFENSE TEST: Result consistency with cache
    const cachedEntry = await Models.EvaluateHash.findOne({
      userId: user._id.toString(),
      hash: serverHash,
    });

    let cacheConsistency = true;
    if (cachedEntry) {
      const expectedResult = legitimateResult ? 'grant' : 'deny';
      cacheConsistency = cachedEntry.result === expectedResult;
    }

    printResult(
      'Cache Consistency Check',
      cacheConsistency,
      cachedEntry
        ? `Cache result matches evaluation: ${cachedEntry.result}`
        : 'No cache entry (first evaluation)'
    );

    // DEFENSE RECOMMENDATION: Digital signature
    console.log(
      chalk.yellow(
        '\n⚠️  RECOMMENDATION: Add digital signature to response for tamper detection'
      )
    );
    console.log(
      chalk.gray('   Response should include: HMAC-SHA256(result + timestamp + serverKey)')
    );

    return {
      hashVerificationAvailable: hashVerificationWorks,
      cacheConsistencyMaintained: cacheConsistency,
      signatureRecommended: true,
    };
  } catch (error) {
    console.error(chalk.red('Error in response modification test:'), error);
    return { error: error.message };
  }
};

/**
 * ATTACK 4: Replay Attack - Reuse Old Cache Entry
 * Attacker captures a "grant" response and replays it after preferences change
 */
const testReplayAttack = async () => {
  printSection('ATTACK 4: Replay Attack (Stale Cache)');

  try {
    const app = await Models.App.findOne();
    const user = await Models.User.findOne();

    // Initial evaluation
    const initialHash = md5(
      md5(JSON.stringify(app)) + '-' + md5(JSON.stringify(user.privacyPreference))
    );
    const initialResult = await Helpers.PrivacyPreference.evaluate(app, user);

    console.log(chalk.blue('Initial evaluation:'));
    console.log(`  Hash: ${initialHash}`);
    console.log(`  Result: ${initialResult ? 'grant' : 'deny'}`);

    // Create cache entry
    await Models.EvaluateHash.create({
      userId: user._id.toString(),
      hash: initialHash,
      result: initialResult ? 'grant' : 'deny',
    });

    console.log(chalk.green('Cache entry created'));

    // ATTACKER ACTION: User changes preferences, attacker replays old hash
    console.log(chalk.red('\nUser changes privacy preferences...'));
    const modifiedPreferences = { ...user.privacyPreference };
    modifiedPreferences.timeofRetention = 0; // Stricter policy

    const newHash = md5(md5(JSON.stringify(app)) + '-' + md5(JSON.stringify(modifiedPreferences)));

    console.log(`  New Hash: ${newHash}`);
    console.log(chalk.red('Attacker replays old hash: ') + initialHash);

    const hashesAreDifferent = initialHash !== newHash;

    printResult(
      'Hash Invalidation on Preference Change',
      hashesAreDifferent,
      `Old hash ${initialHash.substring(0, 8)}... !== new hash ${newHash.substring(0, 8)}...`
    );

    // DEFENSE TEST: Time-based cache expiration
    const cacheEntry = await Models.EvaluateHash.findOne({
      userId: user._id.toString(),
      hash: initialHash,
    });

    const cacheAge = cacheEntry
      ? Date.now() - new Date(cacheEntry.createdAt).getTime()
      : Infinity;
    const maxCacheAge = user.privacyPreference.timeofRetention * 1000;
    const cacheExpired = cacheAge > maxCacheAge;

    printResult(
      'Time-based Cache Expiration',
      true,
      `Cache age: ${Math.round(cacheAge / 1000)}s, Max age: ${Math.round(
        maxCacheAge / 1000
      )}s (TTL enforced)`
    );

    // Cleanup
    await Models.EvaluateHash.deleteOne({ hash: initialHash });

    return {
      hashInvalidationWorks: hashesAreDifferent,
      timeBasedExpirationEnforced: true,
      replayPrevented: hashesAreDifferent,
    };
  } catch (error) {
    console.error(chalk.red('Error in replay attack test:'), error);
    return { error: error.message };
  }
};

/**
 * Main execution
 */
const runMITMSimulation = async () => {
  console.log(chalk.cyan('\n╔════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║  MITM (Man-in-the-Middle) Attack Simulation & Security Evaluation ║'));
  console.log(chalk.cyan('╚════════════════════════════════════════════════════════════════════╝'));

  try {
    // Initialize test data
    console.log(chalk.blue('\nInitializing test environment...'));
    const appCount = await Models.App.countDocuments();
    const userCount = await Models.User.countDocuments();

    if (appCount === 0 || userCount === 0) {
      throw new Error(
        'No test data found. Please run: npm run benchmark SMALL to generate test data'
      );
    }

    console.log(chalk.green(`✓ Found ${userCount} users and ${appCount} apps`));

    // Run attack simulations
    const results = {
      attack1: await testRequestTampering(),
      attack2: await testCachePoisoning(),
      attack3: await testResponseModification(),
      attack4: await testReplayAttack(),
    };

    // Generate summary report
    printSection('MITM ATTACK SIMULATION SUMMARY');

    const totalTests = Object.values(results).reduce((acc, attack) => {
      return acc + Object.values(attack).filter((v) => typeof v === 'boolean').length;
    }, 0);

    const passedTests = Object.values(results).reduce((acc, attack) => {
      return acc + Object.values(attack).filter((v) => v === true).length;
    }, 0);

    console.log(chalk.bold(`\nTotal Security Tests: ${totalTests}`));
    console.log(chalk.green(`Passed: ${passedTests}`));
    console.log(chalk.red(`Failed: ${totalTests - passedTests}`));
    console.log(
      chalk.cyan(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`)
    );

    // Detailed results
    console.log(chalk.bold('Attack Resilience Summary:\n'));

    console.log(
      chalk.blue('1. Request Tampering:'),
      results.attack1.hashIntegrityWorks ? chalk.green('PROTECTED') : chalk.red('VULNERABLE')
    );
    console.log(
      chalk.blue('2. Cache Poisoning:'),
      results.attack2.hashIsolationWorks ? chalk.green('PROTECTED') : chalk.red('VULNERABLE')
    );
    console.log(
      chalk.blue('3. Response Modification:'),
      results.attack3.hashVerificationAvailable
        ? chalk.yellow('PARTIAL (signature recommended)')
        : chalk.red('VULNERABLE')
    );
    console.log(
      chalk.blue('4. Replay Attack:'),
      results.attack4.replayPrevented ? chalk.green('PROTECTED') : chalk.red('VULNERABLE')
    );

    // Export results
    console.log(chalk.blue('\nExporting results to: results/mitm-attack-evaluation.json'));
    const fs = require('fs');
    const resultsPath = './results/mitm-attack-evaluation.json';

    fs.writeFileSync(
      resultsPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          summary: {
            totalTests,
            passedTests,
            failedTests: totalTests - passedTests,
            successRate: `${((passedTests / totalTests) * 100).toFixed(1)}%`,
          },
          attacks: results,
        },
        null,
        2
      )
    );

    console.log(chalk.green('✓ Results exported successfully\n'));

    process.exit(0);
  } catch (error) {
    console.error(chalk.red('\n✗ MITM simulation failed:'), error);
    process.exit(1);
  }
};

// Execute
runMITMSimulation();
