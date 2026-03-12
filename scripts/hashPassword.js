// Script simple para generar hash de contraseña
// Ejecutar: node scripts/hashPassword.js

import bcrypt from 'bcryptjs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Ingresa la contraseña a hashear: ', async (password) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    console.log('\n✅ Hash generado:');
    console.log(hash);
    console.log('\nCopia este hash y úsalo en Firebase Firestore para el campo "password"');
    console.log('Tipo de campo: string');
    
    rl.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    rl.close();
  }
});
