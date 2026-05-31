const fs = require('fs');

function extractPdfText(filePath) {
    const buf = fs.readFileSync(filePath);
    const text = buf.toString('latin1');
    // Extraire streams de texte PDF bruts
    const streams = [];
    let idx = 0;
    while (idx < text.length) {
        const start = text.indexOf('stream\n', idx);
        if (start === -1) break;
        const end = text.indexOf('endstream', start);
        if (end === -1) break;
        streams.push(text.substring(start + 7, end));
        idx = end + 9;
    }
    
    // Extraire les chaines entre parenthèses (texte PDF encodé)
    const chunks = [];
    const re = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
    let m;
    let fullText = streams.join(' ');
    while ((m = re.exec(fullText)) !== null) {
        let s = m[1]
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\\\/g, '\\');
        if (s.trim().length > 0) chunks.push(s);
    }
    return chunks.join(' ').trim();
}

console.log('=== VIGNETTE TARIF ===');
const v = extractPdfText('VIGNETTE TARIF.pdf');
console.log(v.substring(0, 5000));

console.log('\n=== VISITE TECHNIQUE TARIF ===');
const vt = extractPdfText('VISITE TECHNIQUE TARIF.pdf');
console.log(vt.substring(0, 5000));
