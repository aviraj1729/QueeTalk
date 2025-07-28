import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Emulate __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const rootDir = process.argv[2] || __dirname;
const outputFile = "source_files.jsx";
const validExtensions = [".js", ".ts", ".tsx"];

// ✅ Only these folders or files will be included (relative to rootDir)
const includeList = ["src/"];

// Utility: Normalize paths
function normalizePath(p) {
  return p.split(path.sep).join("/");
}

// Recursive function to collect valid files
function collectIncludedFiles(basePaths) {
  const resultFiles = [];

  for (const entry of basePaths) {
    const fullPath = path.join(rootDir, entry);

    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️  Skipping non-existent path: ${entry}`);
      continue;
    }

    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Walk directory recursively
      const stack = [fullPath];
      while (stack.length) {
        const current = stack.pop();
        const contents = fs.readdirSync(current);

        for (const item of contents) {
          const itemPath = path.join(current, item);
          const itemStat = fs.statSync(itemPath);

          if (itemStat.isDirectory()) {
            stack.push(itemPath);
          } else if (validExtensions.includes(path.extname(item))) {
            resultFiles.push(itemPath);
          }
        }
      }
    } else if (validExtensions.includes(path.extname(entry))) {
      resultFiles.push(fullPath);
    }
  }

  return resultFiles;
}

function writeToFile(files) {
  let output = "";

  for (const file of files) {
    const relativePath = path.relative(rootDir, file);
    const content = fs.readFileSync(file, "utf-8");
    output += `// ${relativePath}\n${content}\n\n\n\n`;
  }

  fs.writeFileSync(path.join(__dirname, outputFile), output, "utf-8");
  console.log(
    `✅ Written ${files.length} files from includeList to ${outputFile}`,
  );
}

const files = collectIncludedFiles(includeList);
writeToFile(files);
