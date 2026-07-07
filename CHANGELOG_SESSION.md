# Cambios realizados (06-07 Julio 2026)

## Pendiente en Supabase (SQL Editor)
Ejecutar en orden:

```sql
-- 1. Columna observaciones (si no se ejecutó antes)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS observaciones TEXT;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- 2. Columna DNI
ALTER TABLE campers ADD COLUMN IF NOT EXISTS dni TEXT;
```

## Cómo continuar desde otra PC
```bash
git clone https://github.com/hugoarcuri/campamento.git
cd campamento
npm install
# Crear .env.local con las credenciales de Supabase (URL + anon key)
npm run build   # verificar que compila
```

## Resumen de funcionalidades agregadas

### Inscriptos
- Checkbox de selección (columna izquierda con editar/eliminar)
- Editar inscripto en modal
- Eliminar con ConfirmDialog
- Exportar a Excel (.xlsx)
- Columna Promo (Septiembre/Noviembre/Enero)
- Columna DNI
- Filtros: búsqueda por nombre/email/iglesia, filtro por estado de saldo
- Observaciones editable inline

### Pagos (por inscripto)
- Tabla agrupada por inscripto con saldo acumulado
- Promo auto-determinada según fecha de pago
- Exportar a Excel
- Observaciones editable inline
- Filas más compactas (text-xs, py-1.5), montos en negrita
- Eliminar pago con ConfirmDialog

### General
- ConfirmDialog reemplaza todos los window.confirm
- Static export para GitHub Pages
