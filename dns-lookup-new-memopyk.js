
#!/usr/bin/env node

const dns = require('dns');
const { promisify } = require('util');

// Promisify DNS functions
const lookup = promisify(dns.lookup);
const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);
const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);
const resolveNs = promisify(dns.resolveNs);

async function performDNSLookup(domain) {
  console.log(`🔍 DNS Lookup for: ${domain}\n`);
  
  try {
    // Basic lookup (A record)
    console.log('📍 A Record (IPv4):');
    try {
      const { address, family } = await lookup(domain);
      console.log(`   IP: ${address} (IPv${family})`);
    } catch (error) {
      console.log(`   ❌ No A record found: ${error.message}`);
    }

    // IPv4 records
    console.log('\n🌐 IPv4 Addresses:');
    try {
      const addresses = await resolve4(domain);
      addresses.forEach((addr, index) => {
        console.log(`   ${index + 1}. ${addr}`);
      });
    } catch (error) {
      console.log(`   ❌ No IPv4 records: ${error.message}`);
    }

    // IPv6 records
    console.log('\n🌐 IPv6 Addresses:');
    try {
      const addresses = await resolve6(domain);
      addresses.forEach((addr, index) => {
        console.log(`   ${index + 1}. ${addr}`);
      });
    } catch (error) {
      console.log(`   ❌ No IPv6 records: ${error.message}`);
    }

    // CNAME records
    console.log('\n🔗 CNAME Records:');
    try {
      const cnames = await resolveCname(domain);
      cnames.forEach((cname, index) => {
        console.log(`   ${index + 1}. ${cname}`);
      });
    } catch (error) {
      console.log(`   ❌ No CNAME records: ${error.message}`);
    }

    // MX records (mail servers)
    console.log('\n📧 MX Records:');
    try {
      const mxRecords = await resolveMx(domain);
      mxRecords.forEach((mx, index) => {
        console.log(`   ${index + 1}. ${mx.exchange} (priority: ${mx.priority})`);
      });
    } catch (error) {
      console.log(`   ❌ No MX records: ${error.message}`);
    }

    // TXT records
    console.log('\n📝 TXT Records:');
    try {
      const txtRecords = await resolveTxt(domain);
      txtRecords.forEach((txt, index) => {
        console.log(`   ${index + 1}. ${txt.join('')}`);
      });
    } catch (error) {
      console.log(`   ❌ No TXT records: ${error.message}`);
    }

    // NS records (name servers)
    console.log('\n🏛️  Name Servers:');
    try {
      const nsRecords = await resolveNs(domain);
      nsRecords.forEach((ns, index) => {
        console.log(`   ${index + 1}. ${ns}`);
      });
    } catch (error) {
      console.log(`   ❌ No NS records: ${error.message}`);
    }

    console.log('\n✅ DNS lookup completed!');
    
  } catch (error) {
    console.error(`❌ DNS lookup failed: ${error.message}`);
  }
}

// Perform lookup for new.memopyk.com
performDNSLookup('new.memopyk.com');
