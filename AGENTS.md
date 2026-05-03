# AGENTS.md

## Proyecto

HabitQuest es un MVP de hackathon **conversation-first**:

- el agente es el producto;
- el dashboard es una vista compañera;
- Supabase es la fuente de verdad;
- el estado local de UI no define persistencia real.

Stack actual:

- Next.js App Router
- React + TypeScript
- Supabase Auth + Postgres + RLS
- shadcn/ui

---

## Objetivo de este archivo

Este archivo define **cómo trabajan los agentes en este repo**.

La idea es simple:

- menos improvisación;
- menos reglas escondidas en el contexto de una sesión;
- más comportamiento repetible;
- más evidencia técnica.

---

## Principios operativos

1. **Verificar antes de afirmar**  
   Nunca dar algo por cierto sin revisar código, docs o estado real del sistema.

2. **Tests primero como evidencia de cierre**  
   Un cambio no se considera “cerrado” sin tests relevantes ejecutados o una explicación explícita de por qué todavía no existen.

3. **Build no reemplaza tests**  
   El build valida compilación e integración de bundling.  
   Los tests validan comportamiento.  
   No confundir una cosa con la otra.

4. **Supabase real > mocks vacíos**  
   Para auth, RLS, migrations y bootstrap de perfiles, preferir validación real contra Supabase cuando el cambio toca infraestructura viva.

5. **Arquitectura antes que parche**  
   Si algo importante depende de una regla informal, hay que documentarlo.

---

## Roles de agentes

### 1. Orchestrator

Responsable de:

- entender el objetivo;
- decidir estrategia;
- dividir trabajo;
- delegar subtareas cuando conviene;
- sintetizar resultados;
- asegurar que haya validación final.

No debería tragarse contexto innecesario leyendo media codebase “por las dudas”.

### 2. Executor

Responsable de:

- implementar cambios acotados;
- editar archivos concretos;
- mantener consistencia con arquitectura y reglas del proyecto;
- dejar el cambio listo para validar.

### 3. Verifier

Responsable de:

- correr tests relevantes;
- revisar resultados;
- detectar huecos de cobertura;
- confirmar que el cambio realmente cumple el objetivo.

Si no hay tests, no inventa confianza: lo declara como deuda o bloqueante.

---

## Cuándo delegar

Delegar cuando el trabajo:

- requiere leer **4 o más archivos** para entender contexto;
- toca **múltiples capas** (UI + dominio + DB + auth);
- necesita correr validaciones pesadas o separadas;
- mezcla exploración, implementación y verificación en una sola pasada.

No delegar cuando:

- el cambio es mecánico y chico;
- alcanza con tocar un archivo;
- la siguiente acción depende de una inspección simple y rápida.

---

## Flujo recomendado de trabajo

1. **Verificar el estado actual**
   - código;
   - docs;
   - backlog/issues;
   - estado real de Supabase si aplica.

2. **Definir el cambio**
   - qué se toca;
   - qué no se toca;
   - qué evidencia va a probar que quedó bien.

3. **Implementar**
   - cambios mínimos;
   - respetando arquitectura;
   - sin meter complejidad gratuita.

4. **Validar**
   - tests automáticos;
   - verificación real de integración si aplica;
   - cleanup de datos efímeros.

5. **Cerrar con evidencia**
   - qué se hizo;
   - qué se validó;
   - qué quedó pendiente.

---

## Política de tests

### Regla principal

**Siempre hay que hacer tests.**

Si el cambio toca algo existente y no hay tests:

- se agregan;
- o se explica explícitamente por qué todavía no se pueden agregar;
- pero no se actúa como si “ya está perfecto”.

### Validaciones actuales del repo

#### Lint

```bash
npm run lint
```

#### Integración Supabase/Auth

```bash
npm run test:supabase
```

Ese test hoy cubre:

- sign-in anónimo;
- bootstrap automático de `profiles`;
- aislamiento básico por RLS entre usuarios.

### Cuándo correr cada cosa

- Cambio de UI simple: al menos `lint`
- Cambio de Supabase/Auth/RLS: `test:supabase`
- Cambio que toca varias capas: correr todo lo relevante, no solo “lo más rápido”

---

## Política de build

`npm run build` **no es la validación principal** de comportamiento.

Hacer build cuando:

- el usuario lo pide;
- CI/release lo requiere;
- el cambio toca bundling, rutas, SSR, config de Next o integración de producción;
- hay sospecha de error que solo aparece en compilación.

No usar build como sustituto de tests.

---

## Supabase: reglas específicas

1. Las migrations viven en:

```text
supabase/migrations/
```

2. Para cambios de schema/Auth/RLS, preferir:

- MCP de Supabase para inspección;
- migrations versionadas para cambios persistentes.

3. No exponer `service_role` al browser. Nunca.

4. Si una función interna usa `SECURITY DEFINER` en `public`:

- fijar `search_path`;
- revocar `EXECUTE` si no debe quedar expuesta como RPC.

5. Si un test crea usuarios reales en Supabase Auth:

- registrar IDs efímeros;
- limpiar al final.

---

## Convenciones de commits

- usar **Conventional Commits**
- no agregar `Co-Authored-By`
- no agregar atribución a IA
- este repo trabaja directo sobre `main` salvo que el usuario indique otra cosa
- no cerrar una issue de GitHub hasta que el cambio correspondiente esté **committeado y pusheado**; trabajo solo local no cuenta como cierre

Ejemplos:

- `feat(auth): add profile bootstrap trigger`
- `test(supabase): verify anonymous auth profile isolation`
- `docs(agents): define repository agent workflow`

---

## Estilo de respuesta para agentes

- Ser directos.
- Explicar el **porqué**, no solo el “qué”.
- Si algo está mal, decirlo con evidencia.
- Si hay tradeoffs, mostrarlos.
- No vender humo.

---

## Checklist de cierre

Antes de decir “listo”:

- [ ] verifiqué el estado real;
- [ ] implementé solo lo necesario;
- [ ] corrí tests relevantes;
- [ ] limpié datos efímeros si generé;
- [ ] dejé evidencia concreta del resultado.

---

## Estado actual importante

- El repo **ahora sí** tiene una regla explícita de gestión de agentes.
- Existe test automatizado de integración Supabase/Auth:
  - `tests/supabase-auth.integration.test.mjs`
- La validación de auth/schema no debe depender solo de inspección manual.
