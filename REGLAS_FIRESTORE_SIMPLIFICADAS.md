# 🔥 Reglas de Firestore SIMPLIFICADAS - Para que Funcione TODO

## ⚠️ IMPORTANTE: Usa estas reglas TEMPORALMENTE

Estas reglas permiten todo para que funcione el registro y la edición de perfil. **Úsalas solo para desarrollo/pruebas**.

## ✅ Reglas que Funcionan AHORA

Copia y pega estas reglas en Firebase Console > Firestore Database > Reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ⚠️ TEMPORAL: Permitir todo para desarrollo
    // Esto permite registro público, lectura y edición de perfiles
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## 📝 Pasos para Aplicar

1. Ve a: https://console.firebase.google.com/project/apuesta-7c52d/firestore
2. Haz clic en la pestaña **Reglas**
3. **BORRA TODO** lo que hay actualmente
4. Pega las reglas de arriba
5. Haz clic en **Publicar**
6. Espera 30 segundos
7. Recarga la página y prueba crear cuenta/editar perfil

## ✅ Después de Aplicar

- ✅ Podrás crear cuentas sin problemas
- ✅ Podrás editar tu perfil
- ✅ El admin podrá editar usuarios
- ✅ Todo funcionará

## 🔒 Reglas Más Seguras (Para Después)

Una vez que todo funcione, puedes usar reglas más seguras del archivo `REGLAS_FIRESTORE_CORREGIDAS.md`, pero primero asegúrate de que todo funciona con estas reglas temporales.
