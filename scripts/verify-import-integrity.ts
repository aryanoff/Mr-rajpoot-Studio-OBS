import fs from 'fs';
import path from 'path';

interface ImportIssue {
  file: string;
  importPath: string;
  line: number;
  reason: string;
}

const issues: ImportIssue[] = [];
const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css'];

function resolveImport(sourceFile: string, importPath: string): boolean {
  if (!importPath.startsWith('.')) {
    // Package or alias import (e.g. 'react', 'lucide-react', '@tanstack/react-query')
    return true;
  }

  const dir = path.dirname(sourceFile);
  const targetBase = path.resolve(dir, importPath);

  // Direct file check
  if (fs.existsSync(targetBase) && fs.statSync(targetBase).isFile()) {
    return true;
  }

  // File with extensions
  for (const ext of extensions) {
    const fullPath = targetBase + ext;
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      return true;
    }
  }

  // Directory with index file
  if (fs.existsSync(targetBase) && fs.statSync(targetBase).isDirectory()) {
    for (const ext of extensions) {
      const indexPath = path.join(targetBase, `index${ext}`);
      if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
        return true;
      }
    }
  }

  return false;
}

function scanFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Match: import ... from "..." or import "..." or export ... from "..."
  const importRegex = /(?:import|export)\s+(?:(?:[\w*\s{},$]+)\s+from\s+)?['"]([^'"]+)['"]/g;

  lines.forEach((lineText, idx) => {
    // Skip comments
    const trimmed = lineText.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*')) return;

    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(lineText)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('.')) {
        const resolved = resolveImport(filePath, importPath);
        if (!resolved) {
          issues.push({
            file: filePath,
            importPath,
            line: idx + 1,
            reason: `Target file or module does not exist on disk relative to ${filePath}`,
          });
        }
      }
    }
  });
}

function walkDir(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        walkDir(fullPath);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      scanFile(fullPath);
    }
  }
}

console.log("======================================================================");
console.log("MR RAJPOOT STUDIO OBS 24/7 — GLOBAL IMPORT INTEGRITY AUDIT");
console.log("======================================================================\n");

const srcRoot = path.resolve('./src');
walkDir(srcRoot);

if (issues.length === 0) {
  console.log("✓ 100% IMPORT INTEGRITY VERIFIED: All local relative imports across src/ resolve cleanly to real disk files.");
  process.exit(0);
} else {
  console.error(`✗ FOUND ${issues.length} UNRESOLVED IMPORTS:`);
  issues.forEach((iss, i) => {
    console.error(`\n[${i + 1}] ${iss.file}:${iss.line}`);
    console.error(`    Import: "${iss.importPath}"`);
    console.error(`    Reason: ${iss.reason}`);
  });
  process.exit(1);
}
