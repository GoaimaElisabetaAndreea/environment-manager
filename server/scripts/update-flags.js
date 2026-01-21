const fs = require('fs');
const path = require('path');

const URL = 'https://raw.githubusercontent.com/withfig/autocomplete/master/src/curl.ts';

const OUTPUT_PATH = path.join(__dirname, '../../client/src/assets/curl-flags.json');
const ASSETS_DIR = path.dirname(OUTPUT_PATH);

async function fetchAndParseFlags() {
    console.log('Downloading curl definitions...');
    
    try {
        const response = await fetch(URL);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const text = await response.text();

        const flags = [];
        const regex = /name:\s*(?:\[\s*((?:"-[^"]*"(?:\s*,\s*)?)+)\s*\]|["'](-[^"']+)["'])(?:[^}]*?)description:\s*["']([^"']+)["']/g;

        let match;
        while ((match = regex.exec(text)) !== null) {

            let rawNames = match[1] || match[2];
            let description = match[3];

            const names = rawNames.replace(/['"]/g, '').split(',').map(s => s.trim());
            
            const value = names[0]; 
            const label = `${names.join(', ')} - ${description}`;

            if (value.startsWith('-')) {
                flags.push({
                    value: value,    
                    label: label,    
                    description: description
                });
            }
        }

        if (!fs.existsSync(ASSETS_DIR)){
            fs.mkdirSync(ASSETS_DIR, { recursive: true });
        }

        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(flags, null, 2));
        
        console.log(`Success! Generated ${flags.length} flags in:`);
        console.log(OUTPUT_PATH);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

fetchAndParseFlags();