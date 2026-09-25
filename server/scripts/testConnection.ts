import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import dns from 'dns/promises';

const run = async () => {
  console.log('\n=================================================');
  console.log('🔍 MongoDB Atlas Connection Diagnostic Tool');
  console.log('=================================================\n');

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI is not set in .env.');
    process.exit(1);
  }

  // 1. Safe parsing of URI
  try {
    const parseable = uri.replace(/^mongodb\+srv:\/\//, 'http://').replace(/^mongodb:\/\//, 'http://');
    const parsed = new URL(parseable);
    const hasPassword = Boolean(parsed.password);

    console.log('1. Configuration Check:');
    console.log(`   • Scheme: ${uri.startsWith('mongodb+srv://') ? 'mongodb+srv' : 'mongodb'}`);
    console.log(`   • Database User: ${parsed.username || '(none)'}`);
    console.log(`   • Password: ${hasPassword ? `[PRESENT - ${parsed.password.length} characters]` : '[MISSING]'}`);
    console.log(`   • Host: ${parsed.host}`);
    console.log(`   • Database: ${parsed.pathname.replace(/^\//, '') || 'wedding_invitation'}`);
    console.log(`   • Query Params: ${parsed.search || '(none)'}\n`);

    // 2. DNS SRV check
    if (uri.startsWith('mongodb+srv://')) {
      console.log('2. DNS / SRV Resolution:');
      try {
        const srvRecords = await dns.resolveSrv(`_mongodb._tcp.${parsed.host}`);
        console.log(`   ✅ SRV Records successfully resolved (${srvRecords.length} shards found):`);
        srvRecords.forEach((r, i) => console.log(`      [Shard ${i + 1}] ${r.name}:${r.port}`));
        console.log('');
      } catch (dnsErr) {
        console.error(`   ❌ DNS SRV resolution failed: ${(dnsErr as Error).message}\n`);
      }
    }

    // 3. Database Connection & Ping Test
    console.log('3. Atlas TLS Connection & Authentication:');
    console.log('   Attempting to authenticate and ping Atlas cluster...');

    const conn = await mongoose.connect(uri, {
      dbName: 'wedding_invitation',
      serverSelectionTimeoutMS: 6000,
    });

    console.log('   ✅ MongoDB Atlas connection: PASS');

    // Run ping command
    const pingResult = await conn.connection.db?.admin().ping();
    console.log('   ✅ MongoDB ping: PASS');
    console.log('   Ping Response:', JSON.stringify(pingResult));

    // Verify database and collections access
    const collections = await conn.connection.db?.listCollections().toArray();
    console.log(`   ✅ Database 'wedding_invitation' accessible (${collections?.length || 0} collections found).`);

    await mongoose.disconnect();
    console.log('\n=================================================');
    console.log('🎉 Diagnostic Complete: Atlas Database Ready!');
    console.log('=================================================\n');
    process.exit(0);
  } catch (error: any) {
    console.error('\n   ❌ MongoDB Atlas connection: FAIL');
    console.error(`   Reason: ${error.message}`);

    if (error.code === 8000 || error.message?.includes('Authentication failed') || error.message?.includes('bad auth')) {
      console.error('\n📋 DIAGNOSIS: Atlas Authentication Failure (Code 8000)');
      console.error('Atlas rejected the database user credentials.');
      console.error('Please verify in MongoDB Atlas (https://cloud.mongodb.com):');
      console.error(' 1. Go to "Database Access" in the left sidebar.');
      console.error(' 2. Check if a user with the EXACT username shown in step 1 exists.');
      console.error(' 3. If the user exists, click "Edit" -> "Edit Password" and re-enter the password.');
      console.error(' 4. Ensure the user has "Read and write to any database" (or readWrite@wedding_invitation).');
      console.error(' 5. Ensure "Built-in Authentication" (Password) is used, not Certificate or IAM.');
      console.error(' 6. In "Network Access", verify your IP address is whitelisted (or 0.0.0.0/0).');
    }

    try {
      await mongoose.disconnect();
    } catch {
      // Ignore
    }

    console.log('\n=================================================\n');
    process.exit(1);
  }
};

run();
