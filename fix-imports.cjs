const fs = require('fs');
const path = require('path');

const serviceMap = {
  'authService': 'auth',
  'playerService': 'auth',
  'presenceService': 'auth',
  'serviceAction': 'core',
  'serviceLogger': 'core',
  'storageService': 'core',
  'gameService': 'game',
  'questionService': 'game',
  'reactionService': 'game',
  'scoreService': 'game',
  'roomCommandService': 'room',
  'roomFlowService': 'room',
  'roomService': 'room'
};

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

const files = getAllFiles('.');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // 1. Absolute imports: @/lib/services/ServiceName -> @/lib/services/subdir/ServiceName
  for (const [service, subdir] of Object.entries(serviceMap)) {
    const regex = new RegExp(`@/lib/services/${service}`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, `@/lib/services/${subdir}/${service}`);
      changed = true;
    }
  }

  // 2. Relative imports in lib/services/[subdir]/*.ts
  if (file.includes('lib\\services\\')) {
    const parts = file.split(path.sep);
    const currentSubdir = parts[parts.length - 2];
    
    for (const [service, targetSubdir] of Object.entries(serviceMap)) {
      // Look for imports like './ServiceName' or '../ServiceName' (if it was previously at lib/services)
      // Actually, they were all './ServiceName' when they were in lib/services.
      // Now they are in lib/services/[subdir]/, so './ServiceName' only works if targetSubdir === currentSubdir.
      
      const relativeRegex = new RegExp(`from '\\.\\/${service}'`, 'g');
      const relativeRegex2 = new RegExp(`from "\\.\\/${service}"`, 'g');
      
      if (targetSubdir === currentSubdir) {
        // Keep as is
      } else {
        const replacement = `from '../${targetSubdir}/${service}'`;
        if (relativeRegex.test(content)) {
          content = content.replace(relativeRegex, replacement);
          changed = true;
        }
        if (relativeRegex2.test(content)) {
          content = content.replace(relativeRegex2, replacement.replace(/'/g, '"'));
          changed = true;
        }
      }
    }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated imports in ${file}`);
  }
});

// 3. Fix app/room/[roomId]/ relative imports
const roomFiles = getAllFiles('app/room/[roomId]');
const roomSubdirs = ['components', 'hooks', 'modals', 'phases'];

// Mapping of filename to its new subdir
const roomFileMap = {};
roomSubdirs.forEach(sd => {
  const sdPath = path.join('app', 'room', '[roomId]', sd);
  if (fs.existsSync(sdPath)) {
    fs.readdirSync(sdPath).forEach(f => {
      if (f.endsWith('.ts') || f.endsWith('.tsx')) {
        roomFileMap[f.replace(/\.tsx?$/, '')] = sd;
      }
    });
  }
});

roomFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const parts = file.split(path.sep);
  const currentSubdir = parts[parts.length - 2];
  if (!roomSubdirs.includes(currentSubdir)) return; // Only process files inside the subdirs

  for (const [name, targetSubdir] of Object.entries(roomFileMap)) {
    // Look for './Name' or '../Name' or '../../Name'
    // If it was in app/room/[roomId]/, it would have been './Name'
    const regex = new RegExp(`from ['"]\\.\\/${name}['"]`, 'g');
    if (regex.test(content)) {
      let replacement;
      if (targetSubdir === currentSubdir) {
        replacement = `'./${name}'`;
      } else {
        replacement = `'../${targetSubdir}/${name}'`;
      }
      content = content.replace(regex, `from ${replacement}`);
      changed = true;
    }
    
    // Also handle types or other imports that might be relative
    // If it was '../../lib/firebase' from app/room/[roomId]/, now it should be '../../../lib/firebase'
    if (content.includes("'../../lib/firebase'")) {
        content = content.replace(/'\.\.\/\.\.\/lib\/firebase'/g, "'../../../lib/firebase'");
        changed = true;
    }
    if (content.includes('"../../lib/firebase"')) {
        content = content.replace(/"\.\.\/\.\.\/lib\/firebase"/g, '"../../../lib/firebase"');
        changed = true;
    }
    if (content.includes("'@/app/common/")) {
        // Absolute path, no change needed
    }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated room imports in ${file}`);
  }
});

// 4. functions/src/index.ts fix
const indexPath = 'functions/src/index.ts';
if (fs.existsSync(indexPath)) {
    let content = fs.readFileSync(indexPath, 'utf8');
    content = content.replace(/'\.\/presence'/g, "'./presence/presence'");
    content = content.replace(/'\.\/roomCleanup'/g, "'./room/roomCleanup'");
    content = content.replace(/'\.\/roomCommands'/g, "'./room/roomCommands'");
    content = content.replace(/'\.\/replayFlow'/g, "'./game/replayFlow'");
    content = content.replace(/'\.\/forceLeave'/g, "'./room/forceLeave'");
    fs.writeFileSync(indexPath, content, 'utf8');
    console.log(`Updated ${indexPath}`);
}
