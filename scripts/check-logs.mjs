import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import fs from 'fs';

const configStr = fs.readFileSync('./firebase-applet-config.json', 'utf-8');
const config = JSON.parse(configStr);

const app = initializeApp(config);
const db = getFirestore(app);

async function checkLogs() {
  try {
    const q = query(collection(db, 'sentinel_logs'), orderBy('Timestamp', 'desc'), limit(5));
    const snap = await getDocs(q);
    snap.docs.forEach(d => {
      console.log('--- LOG ---');
      console.log(d.data().DTC_Code);
      console.log(d.data().message);
      console.log(d.data().Stack_Trace);
    });
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

checkLogs();
