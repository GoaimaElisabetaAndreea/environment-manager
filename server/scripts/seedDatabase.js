require('dotenv').config({ path: '../.env' });
const { admin, db } = require('../config/firebase');
const { faker } = require('@faker-js/faker');

const USERS_TO_CREATE = 5;
const ENVIRONMENTS_PER_USER = 2;

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    const createdUsers = [];

    for (let i = 0; i < USERS_TO_CREATE; i++) {
      const email = faker.internet.email();
      const password = 'password123'; 
      const displayName = faker.person.fullName();

      try {
        const userRecord = await admin.auth().createUser({
          email: email,
          password: password,
          displayName: displayName,
        });

        createdUsers.push(userRecord);
        console.log(`Created User [${i + 1}/${USERS_TO_CREATE}]: ${email} (Pass: ${password})`);
      } catch (e) {
        console.error(`Error creating user ${email}:`, e.message);
      }
    }

    for (const user of createdUsers) {
      console.log(`   Populating data for: ${user.email}...`);

      for (let j = 0; j < ENVIRONMENTS_PER_USER; j++) {
    
        const envData = {
          name: `${faker.commerce.productAdjective()} ${faker.science.unit()}`, 
          userId: user.uid,
          wikiContent: `# Welcome to ${faker.word.noun()}\n\n${faker.lorem.paragraphs(2)}`,
          quickLinks: [
            {
              title: 'Grafana Dashboard',
              url: faker.internet.url(),
              description: 'Monitoring logs',
              username: 'admin',
              password: 'safe_password'
            },
            {
              title: 'Jenkins CI',
              url: faker.internet.url(),
              description: 'Build pipeline'
            }
          ],
          createdAt: new Date().toISOString()
        };

        const envRef = await db.collection('environments').add(envData);

        await db.collection('ssh_keys').add({
          envId: envRef.id,
          userId: user.uid,
          title: `Web Server ${j + 1}`,
          alias: `web-${j + 1}`,
          value: `ssh -i ~/.ssh/id_rsa root@${faker.internet.ip()}`,
          createdAt: new Date().toISOString()
        });

        await db.collection('commands').add({
          envId: envRef.id,
          title: 'Restart Service',
          description: 'Restarts the main web service',
          template: 'systemctl restart nginx',
          flags: ['-v'],
          createdAt: new Date().toISOString()
        });
      }
    }

    console.log('\nDatabase seeding completed successfully!');
  } catch (error) {
    console.error('Fatal error during seeding:', error);
  }
}

seed();