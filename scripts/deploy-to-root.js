// Script para copiar archivos compilados a la raíz después del build
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const distDir = './dist';
const rootDir = './';

function copyRecursive(src, dest) {
  const entries = readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    
    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

try {
  console.log('📦 Copiando archivos de dist/ a la raíz...');
  
  // Copiar index.html
  copyFileSync(join(distDir, 'index.html'), join(rootDir, 'index.html'));
  console.log('✅ index.html copiado');
  
  // Copiar assets
  if (statSync(join(distDir, 'assets')).isDirectory()) {
    copyRecursive(join(distDir, 'assets'), join(rootDir, 'assets'));
    console.log('✅ assets/ copiado');
  }
  
  // Copiar vite.svg si existe
  try {
    copyFileSync(join(distDir, 'vite.svg'), join(rootDir, 'vite.svg'));
    console.log('✅ vite.svg copiado');
  } catch (e) {
    // Ignorar si no existe
  }
  
  // Copiar .htaccess si existe
  try {
    copyFileSync(join(rootDir, '.htaccess'), join(rootDir, '.htaccess'));
  } catch (e) {
    // Ignorar si no existe
  }
  
  console.log('✅ Archivos copiados exitosamente a la raíz');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
