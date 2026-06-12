# Reglas de acceso del Índice de Competitividad Empresarial

El archivo `firestore.rules` permite que:

- Cada empresa autenticada consulte únicamente su propio registro.
- Cada empresa consulte y guarde únicamente sus propios autodiagnósticos.
- Cada empresa consulte sus observaciones y agregue observaciones con rol de empresa.
- Una cuenta administrativa autenticada consulte y gestione la información institucional.

## Publicar las reglas

Desde `C:\Coparmex`, ejecutar:

```powershell
npx firebase login
npx firebase deploy --only firestore:rules
```

## Consideración del panel administrativo

El panel administrativo actual valida sus credenciales localmente en el navegador. Para que
Firestore pueda reconocerlo de forma segura, la cuenta `admin@coparmexnld.org.mx` deberá
iniciar sesión mediante Firebase Authentication o recibir el atributo administrativo
correspondiente.

No se recomienda abrir públicamente las colecciones para conservar el funcionamiento del
panel administrativo local.

## Verificación pública por folio

La regla de lectura directa de empresas se mantiene temporalmente para conservar el flujo
actual de "Obtener acceso". Como mejora posterior, esta verificación deberá realizarse
mediante una función de servidor o un directorio público con información limitada.
